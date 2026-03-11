import json
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PlanVO(BaseModel):
    """套餐视图对象"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None
    provider: str
    duration_days: int
    price: float
    original_price: Optional[float] = None
    features: Optional[list[str]] = None
    is_active: bool
    sort_order: int
    created_at: datetime

    @classmethod
    def from_orm_with_features(cls, plan):
        """从 ORM 对象创建，解析 features JSON"""
        data = {
            "id": plan.id,
            "name": plan.name,
            "description": plan.description,
            "provider": plan.provider,
            "duration_days": plan.duration_days,
            "price": plan.price,
            "original_price": plan.original_price,
            "features": json.loads(plan.features) if plan.features else [],
            "is_active": plan.is_active,
            "sort_order": plan.sort_order,
            "created_at": plan.created_at,
        }
        return cls(**data)


class PlanCreateDTO(BaseModel):
    """创建套餐"""

    name: str = Field(description="套餐名称")
    description: Optional[str] = Field(None, description="描述")
    provider: str = Field(description="服务商")
    duration_days: int = Field(30, description="有效天数")
    price: float = Field(description="售价")
    original_price: Optional[float] = Field(None, description="原价")
    features: Optional[list[str]] = Field(None, description="功能特性列表")
    is_active: bool = Field(True, description="是否上架")
    sort_order: int = Field(0, description="排序")


class PlanUpdateDTO(BaseModel):
    """更新套餐"""

    name: Optional[str] = Field(None)
    description: Optional[str] = Field(None)
    provider: Optional[str] = Field(None)
    duration_days: Optional[int] = Field(None)
    price: Optional[float] = Field(None)
    original_price: Optional[float] = Field(None)
    features: Optional[list[str]] = Field(None)
    is_active: Optional[bool] = Field(None)
    sort_order: Optional[int] = Field(None)
