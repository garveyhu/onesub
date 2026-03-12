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
    expire_at: Optional[datetime] = None
    payment_proof: Optional[str] = None
    progress_note: Optional[str] = None
    refund_status: str = "none"
    refund_reason: Optional[str] = None
    refund_amount: float = 0
    refunded_at: Optional[datetime] = None
    remark: Optional[str] = None
    admin_remark: Optional[str] = None
    username: Optional[str] = None
    created_at: datetime


class OrderCreateDTO(BaseModel):
    """创建订单"""

    plan_id: int = Field(description="套餐 ID")
    coupon_code: Optional[str] = Field(None, description="优惠码")
    remark: Optional[str] = Field(None, description="备注")
    payment_method: str = Field("alipay", description="支付方式")


class OrderAdminUpdateDTO(BaseModel):
    """管理员更新订单"""

    status: Optional[str] = Field(None, description="状态")
    admin_remark: Optional[str] = Field(None, description="管理员备注")
    progress_note: Optional[str] = Field(None, description="开通进度")


class OrderRefundDTO(BaseModel):
    """管理员退款请求。"""

    refund_reason: str = Field(description="退款原因", min_length=2)
    refund_amount: Optional[float] = Field(None, description="退款金额")
    admin_remark: Optional[str] = Field(None, description="管理员备注")


class OrderPaymentProofDTO(BaseModel):
    """用户提交支付凭证。"""

    payment_proof: str = Field(description="支付凭证", min_length=2)
