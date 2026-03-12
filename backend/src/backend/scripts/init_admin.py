"""
初始化脚本：
1. 创建默认管理员账号（如果不存在）
2. 从 config/plans.json 导入套餐（按名称 upsert）
"""

import json
from pathlib import Path

import bcrypt
from loguru import logger
from sqlalchemy.orm import Session

from backend.complex.database import SessionLocal
from backend.models.plan import Plan
from backend.models.user import User

DEFAULT_ADMIN_USERNAME = "Kerwin"
DEFAULT_ADMIN_PASSWORD = "Jhc_010510"
DEFAULT_ADMIN_EMAIL = "jinhaocong@outlook.com"

# plans.json 所在路径（相对于 backend/ 目录）
PLANS_CONFIG_PATH = Path(__file__).resolve().parents[3] / "config" / "plans.json"


def _hash_password(password: str) -> str:
    pwd_bytes = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode("utf-8")


def init_admin(db: Session):
    """检查并创建默认管理员账号"""
    existing_admin = db.query(User).filter(User.is_admin == True).first()
    if existing_admin:
        logger.info(f"管理员账号已存在: {existing_admin.username}，跳过")
        return

    admin = User(
        username=DEFAULT_ADMIN_USERNAME,
        password_hash=_hash_password(DEFAULT_ADMIN_PASSWORD),
        email=DEFAULT_ADMIN_EMAIL,
        is_active=True,
        is_admin=True,
    )
    db.add(admin)
    db.commit()
    logger.info(
        f"默认管理员已创建 — 用户名: {DEFAULT_ADMIN_USERNAME}  密码: {DEFAULT_ADMIN_PASSWORD}"
    )
    logger.warning("请尽快登录后修改默认密码！")


def init_plans(db: Session):
    """从 config/plans.json 导入套餐（按名称 upsert，已存在则跳过）"""
    if not PLANS_CONFIG_PATH.exists():
        logger.warning(f"套餐配置文件不存在: {PLANS_CONFIG_PATH}，跳过")
        return

    plans_data = json.loads(PLANS_CONFIG_PATH.read_text(encoding="utf-8"))
    created, skipped = 0, 0

    for p in plans_data:
        existing = db.query(Plan).filter(Plan.name == p["name"]).first()
        if existing:
            skipped += 1
            continue

        features_str = json.dumps(p.get("features", []), ensure_ascii=False)
        plan = Plan(
            name=p["name"],
            description=p.get("description"),
            provider=p.get("provider", ""),
            duration_days=p.get("duration_days", 30),
            price=p["price"],
            original_price=p.get("original_price"),
            features=features_str,
            is_active=p.get("is_active", True),
            is_hot=p.get("is_hot", False),
            sort_order=p.get("sort_order", 0),
        )
        db.add(plan)
        created += 1

    db.commit()
    logger.info(f"套餐初始化完成 — 新增: {created}，已存在跳过: {skipped}")


def main():
    db = SessionLocal()
    try:
        init_admin(db)
        init_plans(db)
    except Exception as e:
        db.rollback()
        logger.error(f"初始化失败: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
