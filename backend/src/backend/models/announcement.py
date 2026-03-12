from datetime import datetime, timedelta, timezone

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, text

from backend.complex.database import Base


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False, comment="公告标题")
    content = Column(Text, nullable=True, comment="公告内容")
    type = Column(
        String(20),
        nullable=False,
        default="info",
        comment="公告类型: info/warning/success",
    )
    is_active = Column(Boolean, default=True, comment="是否显示")
    sort_order = Column(Integer, default=0, comment="排序")

    created_at = Column(
        DateTime(timezone=True),
        server_default=text("(datetime('now', '+08:00'))"),
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=text("(datetime('now', '+08:00'))"),
        onupdate=lambda: datetime.now(tz=timezone(timedelta(hours=8))),
    )
