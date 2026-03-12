import os
import shutil
import smtplib
import sqlite3
from datetime import timedelta
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.complex.config.inventory import DatabaseSettings
from backend.complex.site_setting_util import (
    DEFAULT_BACKUP_DIRECTORY,
    get_bool_setting,
    get_int_setting,
    get_setting,
)
from backend.complex.time_util import now_cst
from backend.models.coupon import Coupon
from backend.models.order import Order
from backend.models.plan import Plan
from backend.models.site_setting import SiteSetting
from backend.models.ticket import Ticket
from backend.models.user import User


def create_sqlite_backup(
    db: Session,
    *,
    require_enabled: bool = True,
) -> dict[str, Any] | None:
    """使用 SQLite 原生 backup API 生成备份，更适合 Docker/NAS 场景。"""
    if not DatabaseSettings.is_sqlite():
        return None
    if require_enabled and not get_bool_setting(db, "backup_enabled", False):
        return None

    source = _resolve_sqlite_database_path()
    backup_directory = _resolve_backup_directory(db)
    backup_directory.mkdir(parents=True, exist_ok=True)
    if not source or not source.exists():
        return None

    filename = f"onesub-{now_cst().strftime('%Y%m%d-%H%M%S')}.db"
    target = backup_directory / filename
    _sqlite_backup(source, target)
    return {
        "filename": filename,
        "path": str(target),
        "directory": str(backup_directory),
        "size_bytes": target.stat().st_size,
        "created_at": now_cst().isoformat(),
    }


def list_backups(db: Session) -> list[dict[str, Any]]:
    """列出已生成的 SQLite 备份文件。"""
    backup_directory = _resolve_backup_directory(db)
    if not backup_directory.exists():
        return []

    items = []
    for path in sorted(backup_directory.glob("*.db"), reverse=True):
        items.append(
            {
                "name": path.name,
                "path": str(path),
                "size_bytes": path.stat().st_size,
                "updated_at": path.stat().st_mtime,
            }
        )
    return items[:20]


def get_health_snapshot(db: Session, started_at_iso: str) -> dict[str, Any]:
    """聚合基础运行健康信息，便于后台面板展示。"""
    database_path = _resolve_sqlite_database_path()
    backup_directory = _resolve_backup_directory(db)
    disk_root = _resolve_disk_usage_root(database_path, backup_directory)
    total, used, free = shutil.disk_usage(disk_root)

    return {
        "server_time": now_cst().isoformat(),
        "started_at": started_at_iso,
        "cpu_load": _get_cpu_load(),
        "memory": _get_memory_snapshot(),
        "disk": {
            "total_bytes": total,
            "used_bytes": used,
            "free_bytes": free,
            "usage_percent": round((used / total) * 100, 2) if total else 0,
        },
        "database": {
            "type": DatabaseSettings.get_type(),
            "path": str(database_path) if database_path else "",
            "settings": db.query(func.count(SiteSetting.id)).scalar() or 0,
            "users": db.query(func.count(User.id)).scalar() or 0,
            "orders": db.query(func.count(Order.id)).scalar() or 0,
            "plans": db.query(func.count(Plan.id)).scalar() or 0,
            "tickets": db.query(func.count(Ticket.id)).scalar() or 0,
            "coupons": db.query(func.count(Coupon.id)).scalar() or 0,
        },
        "backup": {
            "enabled": get_bool_setting(db, "backup_enabled", False),
            "directory": str(backup_directory),
            "directory_exists": backup_directory.exists(),
            "writable": _is_path_writable(backup_directory),
        },
    }


def build_business_report(db: Session, days: int = 1) -> dict[str, Any]:
    """生成经营报告摘要。"""
    since = now_cst() - timedelta(days=days)
    paid_statuses = ["paid", "processing", "completed", "refunded"]
    orders = (
        db.query(Order)
        .filter(Order.created_at >= since)
        .order_by(Order.created_at.desc())
        .all()
    )
    confirmed_orders = [item for item in orders if item.status in paid_statuses]
    coupon_orders = [item for item in confirmed_orders if item.coupon_code]
    top_plans: dict[str, dict[str, float | int]] = {}
    for item in confirmed_orders:
        plan_stats = top_plans.setdefault(
            item.plan_name or "未知套餐",
            {"count": 0, "revenue": 0.0},
        )
        plan_stats["count"] += 1
        plan_stats["revenue"] += item.actual_amount

    plan_rows = [
        {
            "plan_name": plan_name,
            "count": int(metrics["count"]),
            "revenue": round(float(metrics["revenue"]), 2),
        }
        for plan_name, metrics in sorted(
            top_plans.items(),
            key=lambda entry: float(entry[1]["revenue"]),
            reverse=True,
        )[:5]
    ]

    return {
        "period_days": days,
        "generated_at": now_cst().isoformat(),
        "new_users": db.query(func.count(User.id)).filter(User.created_at >= since).scalar()
        or 0,
        "new_orders": len(orders),
        "confirmed_orders": len(confirmed_orders),
        "new_revenue": round(sum(item.actual_amount for item in confirmed_orders), 2),
        "refund_amount": round(sum(item.refund_amount or 0 for item in orders), 2),
        "coupon_order_count": len(coupon_orders),
        "open_tickets": db.query(func.count(Ticket.id))
        .filter(Ticket.status.in_(["open", "processing"]))
        .scalar()
        or 0,
        "top_plans": plan_rows,
    }


def send_business_report_email(db: Session, report: dict[str, Any], subject: str) -> bool:
    """使用 SMTP 发送经营报告。"""
    if not get_bool_setting(db, "email_notification_enabled", False):
        return False

    host = get_setting(db, "smtp_host")
    user = get_setting(db, "smtp_user")
    password = get_setting(db, "smtp_password")
    from_email = get_setting(db, "smtp_from_email")
    recipient = get_setting(db, "report_recipient_email")
    port = get_int_setting(db, "smtp_port", 465)
    if not all([host, user, password, from_email, recipient]):
        return False

    content = _format_report_text(report)
    message = MIMEText(content, "plain", "utf-8")
    message["Subject"] = subject
    message["From"] = from_email
    message["To"] = recipient

    with smtplib.SMTP_SSL(host, port, timeout=15) as smtp:
        smtp.login(user, password)
        smtp.sendmail(from_email, [recipient], message.as_string())
    return True


def _get_cpu_load() -> dict[str, float]:
    """读取系统负载，非 Unix 环境下返回 0。"""
    try:
        load1, load5, load15 = __import__("os").getloadavg()
        return {"load_1m": load1, "load_5m": load5, "load_15m": load15}
    except (AttributeError, OSError):
        return {"load_1m": 0, "load_5m": 0, "load_15m": 0}


def _get_memory_snapshot() -> dict[str, int | float]:
    """优先读取 Linux `/proc/meminfo`，否则返回空快照。"""
    meminfo = Path("/proc/meminfo")
    if not meminfo.exists():
        return {"total_bytes": 0, "available_bytes": 0, "usage_percent": 0}

    values: dict[str, int] = {}
    for line in meminfo.read_text(encoding="utf-8").splitlines():
        key, raw_value = line.split(":", 1)
        values[key] = int(raw_value.strip().split()[0]) * 1024

    total = values.get("MemTotal", 0)
    available = values.get("MemAvailable", 0)
    used = max(total - available, 0)
    return {
        "total_bytes": total,
        "available_bytes": available,
        "usage_percent": round((used / total) * 100, 2) if total else 0,
    }


def _format_report_text(report: dict[str, Any]) -> str:
    """将报告结果格式化为纯文本邮件内容。"""
    lines = [
        f"经营报告（最近 {report['period_days']} 天）",
        f"生成时间：{report['generated_at']}",
        f"新增用户：{report['new_users']}",
        f"新增订单：{report['new_orders']}",
        f"已确认订单：{report['confirmed_orders']}",
        f"新增收入：¥{report['new_revenue']}",
        f"退款金额：¥{report['refund_amount']}",
        f"优惠码订单：{report['coupon_order_count']}",
        f"待处理工单：{report['open_tickets']}",
        "",
        "Top 套餐：",
    ]
    for item in report["top_plans"]:
        lines.append(
            f"- {item['plan_name']}: {item['count']} 单 / ¥{item['revenue']}"
        )
    return "\n".join(lines)


def _resolve_sqlite_database_path() -> Path | None:
    """解析 SQLite 文件路径，兼容相对路径与容器工作目录。"""
    db_url = DatabaseSettings.get_url()
    if not db_url.startswith("sqlite:///"):
        return None
    return _resolve_runtime_path(db_url.replace("sqlite:///", "", 1))


def _resolve_backup_directory(db: Session) -> Path:
    """优先使用环境变量，其次使用站点配置，确保 NAS 可直接挂载。"""
    configured_path = (
        os.getenv("ONESUB_BACKUP_DIR", "").strip()
        or get_setting(db, "backup_directory", DEFAULT_BACKUP_DIRECTORY).strip()
        or DEFAULT_BACKUP_DIRECTORY
    )
    return _resolve_runtime_path(configured_path)


def _resolve_runtime_path(raw_path: str) -> Path:
    """将运行时路径转换为绝对路径，避免容器内相对路径混乱。"""
    path = Path(raw_path).expanduser()
    if path.is_absolute():
        return path
    return (Path.cwd() / path).resolve()


def _sqlite_backup(source: Path, target: Path) -> None:
    """通过 SQLite 原生备份接口复制数据库，避免直接拷贝产生不一致。"""
    with sqlite3.connect(source.as_posix()) as source_conn:
        with sqlite3.connect(target.as_posix()) as target_conn:
            source_conn.backup(target_conn)


def _resolve_disk_usage_root(database_path: Path | None, backup_directory: Path) -> Path:
    """尽量统计数据卷所在挂载点，而不是容器根文件系统。"""
    if database_path and database_path.exists():
        return database_path.parent
    if backup_directory.exists():
        return backup_directory
    return backup_directory.parent if backup_directory.parent.exists() else Path.cwd()


def _is_path_writable(path: Path) -> bool:
    """判断备份目录在当前容器里是否可写。"""
    check_path = path if path.exists() else path.parent
    try:
        check_path.mkdir(parents=True, exist_ok=True)
    except OSError:
        return False
    return os.access(check_path, os.W_OK)
