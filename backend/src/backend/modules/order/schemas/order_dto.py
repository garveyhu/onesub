from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class OrderVO(BaseModel):
    """订单视图对象"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    order_no: str
    user_id: int
    plan_id: int
    plan_name: Optional[str] = None
    amount: float
    coupon_code: Optional[str] = None
    discount_amount: float = 0
    actual_amount: float
    status: str
    payment_method: Optional[str] = None
    paid_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    remark: Optional[str] = None
    admin_remark: Optional[str] = None
    username: Optional[str] = None
    created_at: datetime


class OrderCreateDTO(BaseModel):
    """创建订单"""

    plan_id: int = Field(description="套餐 ID")
    coupon_code: Optional[str] = Field(None, description="优惠码")
    remark: Optional[str] = Field(None, description="备注")


class OrderAdminUpdateDTO(BaseModel):
    """管理员更新订单"""

    status: Optional[str] = Field(None, description="状态")
    admin_remark: Optional[str] = Field(None, description="管理员备注")
