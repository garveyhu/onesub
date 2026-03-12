from datetime import datetime, timedelta, timezone

from sqlalchemy import Column, DateTime, Float, Integer, String, text

from backend.complex.database import Base


class InviteReward(Base):
    __tablename__ = "invite_rewards"

    id = Column(Integer, primary_key=True, autoincrement=True)
    inviter_user_id = Column(Integer, nullable=False, index=True, comment="邀请人用户 ID")
    invitee_user_id = Column(Integer, nullable=False, index=True, comment="被邀请人用户 ID")
    order_id = Column(Integer, nullable=False, unique=True, index=True, comment="奖励来源订单 ID")
    reward_type = Column(String(20), nullable=False, comment="奖励类型: cash/coupon")
    reward_amount = Column(Float, nullable=False, comment="奖励金额")
    coupon_code = Column(String(50), nullable=True, comment="奖励优惠码")

    created_at = Column(
        DateTime(timezone=True),
        server_default=text("(datetime('now', '+08:00'))"),
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=text("(datetime('now', '+08:00'))"),
        onupdate=lambda: datetime.now(tz=timezone(timedelta(hours=8))),
    )
