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
    status: str
    payment_method: Optional[str] = None
    paid_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    remark: Optional[str] = None
    created_at: datetime


class OrderCreateDTO(BaseModel):
    """创建订单"""

    plan_id: int = Field(description="套餐 ID")
    remark: Optional[str] = Field(None, description="备注")
