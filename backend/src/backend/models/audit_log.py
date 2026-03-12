from sqlalchemy import Column, DateTime, Integer, String, Text, text

from backend.complex.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True, comment="操作人ID")
    username = Column(String(100), nullable=False, comment="操作人用户名")
    action = Column(String(50), nullable=False, comment="操作类型")
    target_type = Column(String(50), nullable=True, comment="目标类型: user/order/plan/coupon/announcement/setting")
    target_id = Column(String(50), nullable=True, comment="目标ID")
    detail = Column(Text, nullable=True, comment="操作详情")
    ip = Column(String(50), nullable=True, comment="IP地址")

    created_at = Column(
        DateTime(timezone=True),
        server_default=text("(datetime('now', '+08:00'))"),
    )
