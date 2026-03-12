from datetime import datetime, timedelta, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, text

from backend.complex.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    email = Column(String(200), nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False, comment="是否管理员")
    subscription_expires_at = Column(
        DateTime(timezone=True), nullable=True, comment="订阅到期时间"
    )
    inviter_id = Column(Integer, nullable=True, index=True, comment="邀请人用户 ID")
    invite_code = Column(String(32), nullable=False, unique=True, index=True, comment="邀请码")
    reward_balance = Column(Float, nullable=False, default=0, comment="返利余额")

    created_at = Column(
        DateTime(timezone=True),
        server_default=text("(datetime('now', '+08:00'))"),
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=text("(datetime('now', '+08:00'))"),
        onupdate=lambda: datetime.now(tz=timezone(timedelta(hours=8))),
    )
