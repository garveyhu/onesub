from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class InviteRewardVO(BaseModel):
    """邀请奖励响应对象。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    inviter_user_id: int
    invitee_user_id: int
    order_id: int
    reward_type: str
    reward_amount: float
    coupon_code: Optional[str] = None
    created_at: datetime
    invitee_username: Optional[str] = None


class InviteOverviewVO(BaseModel):
    """邀请总览响应。"""

    invite_code: str = Field(description="当前用户邀请码")
    invite_link: str = Field(description="邀请链接")
    reward_balance: float = Field(description="返利余额")
    reward_count: int = Field(description="奖励次数")
    total_reward_amount: float = Field(description="累计奖励金额")
    invited_user_count: int = Field(description="已邀请用户数")
    rewards: list[InviteRewardVO] = Field(description="奖励记录")
