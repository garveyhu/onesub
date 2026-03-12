from datetime import datetime, timedelta, timezone

from sqlalchemy import Column, DateTime, Integer, String, Text, text

from backend.complex.database import Base


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True, comment="提交工单的用户 ID")
    subject = Column(String(200), nullable=False, comment="工单标题")
    content = Column(Text, nullable=False, comment="工单内容")
    status = Column(
        String(20),
        nullable=False,
        default="open",
        index=True,
        comment="工单状态: open/processing/replied/closed",
    )
    admin_reply = Column(Text, nullable=True, comment="管理员回复")
    replied_at = Column(DateTime(timezone=True), nullable=True, comment="回复时间")

    created_at = Column(
        DateTime(timezone=True),
        server_default=text("(datetime('now', '+08:00'))"),
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=text("(datetime('now', '+08:00'))"),
        onupdate=lambda: datetime.now(tz=timezone(timedelta(hours=8))),
    )
