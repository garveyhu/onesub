from datetime import datetime, timedelta, timezone

from sqlalchemy import Column, DateTime, Integer, String, Text, text

from backend.complex.database import Base


class SiteSetting(Base):
    __tablename__ = "site_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(100), nullable=False, unique=True, index=True, comment="配置键")
    value = Column(Text, nullable=True, comment="配置值")
    description = Column(String(200), nullable=True, comment="配置说明")

    updated_at = Column(
        DateTime(timezone=True),
        server_default=text("(datetime('now', '+08:00'))"),
        onupdate=lambda: datetime.now(tz=timezone(timedelta(hours=8))),
    )
