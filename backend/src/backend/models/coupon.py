from datetime import datetime, timedelta, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, text

from backend.complex.database import Base


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(50), nullable=False, unique=True, index=True, comment="优惠码")
    discount_amount = Column(Float, nullable=False, comment="减免金额")
    max_uses = Column(Integer, nullable=False, default=1, comment="最大使用次数")
    used_count = Column(Integer, nullable=False, default=0, comment="已使用次数")
    is_active = Column(Boolean, default=True, comment="是否启用")

    created_at = Column(
        DateTime(timezone=True),
        server_default=text("(datetime('now', '+08:00'))"),
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=text("(datetime('now', '+08:00'))"),
        onupdate=lambda: datetime.now(tz=timezone(timedelta(hours=8))),
    )
