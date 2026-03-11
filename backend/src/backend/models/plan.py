from datetime import datetime, timedelta, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text, text

from backend.complex.database import Base


class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, comment="套餐名称")
    description = Column(Text, nullable=True, comment="套餐描述")
    provider = Column(String(50), nullable=False, comment="服务商 (claude/chatgpt/...)")
    duration_days = Column(Integer, nullable=False, default=30, comment="有效天数")
    price = Column(Float, nullable=False, comment="售价")
    original_price = Column(Float, nullable=True, comment="原价")
    features = Column(Text, nullable=True, comment="功能特性，JSON 数组字符串")
    is_active = Column(Boolean, default=True, comment="是否上架")
    sort_order = Column(Integer, default=0, comment="排序序号")

    created_at = Column(
        DateTime(timezone=True),
        server_default=text("(datetime('now', '+08:00'))"),
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=text("(datetime('now', '+08:00'))"),
        onupdate=lambda: datetime.now(tz=timezone(timedelta(hours=8))),
    )
