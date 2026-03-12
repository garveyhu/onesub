from sqlalchemy import Boolean, Column, DateTime, Integer, String, text

from backend.complex.database import Base


class LoginLog(Base):
    __tablename__ = "login_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=True, index=True, comment="用户ID（失败时可能为空）")
    username = Column(String(100), nullable=False, comment="登录用户名")
    ip = Column(String(50), nullable=True, comment="登录IP")
    user_agent = Column(String(500), nullable=True, comment="浏览器UA")
    success = Column(Boolean, nullable=False, default=True, comment="是否成功")
    fail_reason = Column(String(200), nullable=True, comment="失败原因")

    created_at = Column(
        DateTime(timezone=True),
        server_default=text("(datetime('now', '+08:00'))"),
    )
