from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.complex.auth.oauth import get_current_user
from backend.complex.database import get_db
from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.complex.response.result import Result
from backend.models.invite_reward import InviteReward
from backend.models.user import User
from backend.modules.invite.service.invite_service import InviteService

router = APIRouter(prefix="/invite", tags=["邀请"])


def _check_admin(user: User) -> None:
    if not user.is_admin:
        raise CustomException(ResultCode.FORBIDDEN, "仅管理员可操作")


@router.get("/overview")
def get_invite_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取当前用户邀请总览。"""
    return Result.ok(InviteService.build_overview(db, current_user))


@router.get("/admin/list")
def admin_list_rewards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员查看邀请奖励记录。"""
    _check_admin(current_user)
    items = (
        db.query(InviteReward)
        .order_by(InviteReward.created_at.desc())
        .all()
    )
    return Result.ok(
        [
            {
                "id": item.id,
                "inviterUserId": item.inviter_user_id,
                "inviteeUserId": item.invitee_user_id,
                "orderId": item.order_id,
                "rewardType": item.reward_type,
                "rewardAmount": item.reward_amount,
                "couponCode": item.coupon_code,
                "createdAt": item.created_at,
            }
            for item in items
        ]
    )
