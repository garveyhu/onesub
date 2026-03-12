import uuid

from sqlalchemy.orm import Session

from backend.complex.site_setting_util import (
    PUBLIC_SITE_URL,
    get_bool_setting,
    get_float_setting,
    get_setting,
)
from backend.models.coupon import Coupon
from backend.models.invite_reward import InviteReward
from backend.models.order import Order
from backend.models.user import User
from backend.modules.invite.schemas.invite_dto import InviteOverviewVO, InviteRewardVO


class InviteService:
    @staticmethod
    def settle_reward(db: Session, order: Order) -> InviteReward | None:
        """在被邀请用户首个成交订单完成后发放奖励。"""
        user = db.query(User).filter(User.id == order.user_id).first()
        if not user or not user.inviter_id:
            return None
        if not get_bool_setting(db, "invite_reward_enabled", True):
            return None

        reward_exists = (
            db.query(InviteReward.id).filter(InviteReward.order_id == order.id).first()
        )
        if reward_exists:
            return None

        confirmed_count = (
            db.query(Order.id)
            .filter(
                Order.user_id == user.id,
                Order.id != order.id,
                Order.status.in_(["paid", "processing", "completed", "refunded"]),
            )
            .count()
        )
        if confirmed_count > 0:
            return None

        inviter = db.query(User).filter(User.id == user.inviter_id).first()
        if not inviter:
            return None

        reward_type = get_setting(db, "invite_reward_mode", "coupon").strip().lower()
        reward_amount = get_float_setting(db, "invite_reward_amount", 20.0)
        coupon_code = None
        if reward_type == "cash":
            inviter.reward_balance += reward_amount
        else:
            reward_type = "coupon"
            coupon_code = f"INVITE{uuid.uuid4().hex[:8].upper()}"
            db.add(
                Coupon(
                    code=coupon_code,
                    discount_amount=reward_amount,
                    max_uses=1,
                    used_count=0,
                    is_active=True,
                )
            )

        reward = InviteReward(
            inviter_user_id=inviter.id,
            invitee_user_id=user.id,
            order_id=order.id,
            reward_type=reward_type,
            reward_amount=reward_amount,
            coupon_code=coupon_code,
        )
        db.add(reward)
        db.flush()
        return reward

    @staticmethod
    def build_overview(db: Session, current_user: User) -> InviteOverviewVO:
        """构造当前用户的邀请总览。"""
        rewards = (
            db.query(InviteReward, User.username)
            .join(User, User.id == InviteReward.invitee_user_id)
            .filter(InviteReward.inviter_user_id == current_user.id)
            .order_by(InviteReward.created_at.desc())
            .all()
        )
        reward_list: list[InviteRewardVO] = []
        for reward, username in rewards:
            item = InviteRewardVO.model_validate(reward)
            item.invitee_username = username
            reward_list.append(item)

        invited_user_count = (
            db.query(User.id).filter(User.inviter_id == current_user.id).count()
        )
        public_base_url = get_setting(db, "public_base_url", PUBLIC_SITE_URL)
        invite_link = (
            f"{public_base_url.rstrip('/')}/login?tab=register&invite={current_user.invite_code}"
        )
        return InviteOverviewVO(
            invite_code=current_user.invite_code,
            invite_link=invite_link,
            reward_balance=current_user.reward_balance,
            reward_count=len(reward_list),
            total_reward_amount=round(sum(item.reward_amount for item in reward_list), 2),
            invited_user_count=invited_user_count,
            rewards=reward_list,
        )
