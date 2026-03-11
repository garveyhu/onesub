import json
from typing import Optional

from fastapi import APIRouter, Depends, UploadFile, File
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.complex.auth.oauth import get_current_user
from backend.complex.database import get_db
from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.complex.response.result import Result
from backend.models.coupon import Coupon
from backend.models.user import User

router = APIRouter(prefix="/coupon", tags=["优惠码"])


def _check_admin(user: User):
    if not user.is_admin:
        raise CustomException(ResultCode.FORBIDDEN, "仅管理员可操作")


# ---- DTO ----


class CouponCheckDTO(BaseModel):
    code: str = Field(description="优惠码")


class CouponCreateDTO(BaseModel):
    code: str = Field(description="优惠码")
    discount_amount: float = Field(description="减免金额")
    max_uses: int = Field(1, description="最大使用次数")
    is_active: bool = Field(True, description="是否启用")


class CouponUpdateDTO(BaseModel):
    code: Optional[str] = Field(None)
    discount_amount: Optional[float] = Field(None)
    max_uses: Optional[int] = Field(None)
    is_active: Optional[bool] = Field(None)


class CouponInfoVO(BaseModel):
    code: str
    discount_amount: float
    remaining: int


class CouponVO(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    code: str
    discount_amount: float
    max_uses: int
    used_count: int
    is_active: bool


# ---- 公开接口 ----


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


# ---- 管理员接口 ----


@router.get("/admin/list")
def admin_list_coupons(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员：列出所有优惠码"""
    _check_admin(current_user)
    coupons = db.query(Coupon).order_by(Coupon.id.desc()).all()
    return Result.ok([CouponVO.model_validate(c) for c in coupons])


@router.post("/admin/create")
def admin_create_coupon(
    dto: CouponCreateDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员：创建优惠码"""
    _check_admin(current_user)
    existing = db.query(Coupon).filter(Coupon.code == dto.code).first()
    if existing:
        raise CustomException(ResultCode.FAIL, f"优惠码 {dto.code} 已存在")
    coupon = Coupon(
        code=dto.code,
        discount_amount=dto.discount_amount,
        max_uses=dto.max_uses,
        is_active=dto.is_active,
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return Result.ok(CouponVO.model_validate(coupon))


@router.post("/admin/{coupon_id}/update")
def admin_update_coupon(
    coupon_id: int,
    dto: CouponUpdateDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员：更新优惠码"""
    _check_admin(current_user)
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise CustomException(ResultCode.NOT_FOUND, "优惠码不存在")
    for field, value in dto.model_dump(exclude_unset=True).items():
        setattr(coupon, field, value)
    db.commit()
    db.refresh(coupon)
    return Result.ok(CouponVO.model_validate(coupon))


@router.post("/admin/{coupon_id}/delete")
def admin_delete_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员：删除优惠码"""
    _check_admin(current_user)
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise CustomException(ResultCode.NOT_FOUND, "优惠码不存在")
    db.delete(coupon)
    db.commit()
    return Result.ok()


@router.post("/admin/import")
async def admin_import_coupons(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员：从 JSON 文件导入优惠码（按 code upsert）"""
    _check_admin(current_user)
    content = await file.read()
    try:
        coupons_data = json.loads(content)
    except json.JSONDecodeError:
        raise CustomException(ResultCode.FAIL, "JSON 格式错误")

    if not isinstance(coupons_data, list):
        raise CustomException(ResultCode.FAIL, "JSON 应为优惠码数组")

    count = 0
    for c in coupons_data:
        existing = db.query(Coupon).filter(Coupon.code == c["code"]).first()
        if existing:
            if "discount_amount" in c:
                existing.discount_amount = c["discount_amount"]
            if "max_uses" in c:
                existing.max_uses = c["max_uses"]
            if "is_active" in c:
                existing.is_active = c["is_active"]
        else:
            coupon = Coupon(
                code=c["code"],
                discount_amount=c.get("discount_amount", 0),
                max_uses=c.get("max_uses", 1),
                is_active=c.get("is_active", True),
            )
            db.add(coupon)
        count += 1

    db.commit()
    return Result.ok({"imported": count})
