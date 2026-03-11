from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.complex.database import get_db
from backend.complex.response.result import Result
from backend.models.coupon import Coupon

router = APIRouter(prefix="/coupon", tags=["优惠码"])


class CouponCheckDTO(BaseModel):
    code: str = Field(description="优惠码")


class CouponInfoVO(BaseModel):
    code: str
    discount_amount: float
    remaining: int


@router.post("/check")
def check_coupon(
    dto: CouponCheckDTO,
    db: Session = Depends(get_db),
):
    """验证优惠码是否可用"""
    coupon = (
        db.query(Coupon)
        .filter(Coupon.code == dto.code, Coupon.is_active == True)
        .first()
    )
    if not coupon:
        return Result.fail(message="优惠码无效")
    if coupon.used_count >= coupon.max_uses:
        return Result.fail(message="优惠码已用完")
    return Result.ok(
        CouponInfoVO(
            code=coupon.code,
            discount_amount=coupon.discount_amount,
            remaining=coupon.max_uses - coupon.used_count,
        )
    )
