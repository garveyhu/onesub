import asyncio
from datetime import date

from loguru import logger

from backend.complex.database import SessionLocal
from backend.complex.site_setting_util import get_bool_setting, get_int_setting
from backend.complex.system.ops_util import (
    build_business_report,
    create_sqlite_backup,
    send_business_report_email,
)
from backend.complex.time_util import now_cst
from backend.modules.order.service.order_service import OrderService

_last_backup_slot: str | None = None
_last_daily_report_date: date | None = None
_last_weekly_report_key: str | None = None


def _run_job(job) -> None:
    """用独立数据库会话运行后台任务。"""
    db = SessionLocal()
    try:
        job(db)
    except Exception as exc:
        logger.exception(exc)
    finally:
        db.close()


def _run_auto_cancel_job(db) -> None:
    """清理已超时未支付订单。"""
    cancelled = OrderService.cancel_expired_orders(db)
    if cancelled > 0:
        logger.info(f"Auto cancelled {cancelled} expired orders.")


def _run_backup_job(db) -> None:
    """在命中配置时间槽时备份数据库。"""
    global _last_backup_slot

    if not get_bool_setting(db, "backup_enabled", False):
        return

    interval_hours = max(get_int_setting(db, "backup_interval_hours", 24), 1)
    now = now_cst()
    if now.hour % interval_hours != 0:
        return

    slot = now.strftime("%Y%m%d%H")
    if _last_backup_slot == slot:
        return

    backup = create_sqlite_backup(db)
    if backup:
        _last_backup_slot = slot
        logger.info(f"SQLite backup created: {backup['path']}")


def _run_report_job(db) -> None:
    """按日/周调度发送经营报告。"""
    global _last_daily_report_date, _last_weekly_report_key

    if not get_bool_setting(db, "email_notification_enabled", False):
        return

    now = now_cst()
    target_hour = get_int_setting(db, "report_send_hour", 9)
    if now.hour != target_hour:
        return

    if get_bool_setting(db, "report_daily_enabled", False):
        if _last_daily_report_date != now.date():
            report = build_business_report(db, days=1)
            sent = send_business_report_email(db, report, "OneSub 每日经营报告")
            if sent:
                _last_daily_report_date = now.date()

    if get_bool_setting(db, "report_weekly_enabled", False) and now.weekday() == 0:
        week_key = f"{now.year}-W{now.isocalendar().week}"
        if _last_weekly_report_key != week_key:
            report = build_business_report(db, days=7)
            sent = send_business_report_email(db, report, "OneSub 每周经营报告")
            if sent:
                _last_weekly_report_key = week_key


async def _loop(interval_seconds: int, job) -> None:
    """重复执行后台任务，单次失败不影响后续轮询。"""
    while True:
        _run_job(job)
        await asyncio.sleep(interval_seconds)


def start_runtime_tasks() -> list[asyncio.Task]:
    """启动应用级后台任务。"""
    return [
        asyncio.create_task(_loop(600, _run_auto_cancel_job)),
        asyncio.create_task(_loop(3600, _run_backup_job)),
        asyncio.create_task(_loop(600, _run_report_job)),
    ]


async def stop_runtime_tasks(tasks: list[asyncio.Task]) -> None:
    """停止应用级后台任务。"""
    for task in tasks:
        task.cancel()
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)
