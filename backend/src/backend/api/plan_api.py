from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.complex.auth.oauth import get_current_user
from backend.complex.database import get_db
from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.complex.response.result import Result
from backend.models.user import User
from backend.modules.plan.schemas.plan_dto import (
    PlanCreateDTO,
    PlanUpdateDTO,
    PlanVO,
)
from backend.modules.plan.service.plan_service import PlanService

router = APIRouter(prefix="/plan", tags=["套餐"])


def _check_admin(user: User):
    if not user.is_admin:
        raise CustomException(ResultCode.FORBIDDEN, "仅管理员可操作")


@router.get("")
def list_plans(db: Session = Depends(get_db)):
    """获取可用套餐列表（公开）"""
    plans = PlanService.list_active(db)
    return Result.ok([PlanVO.from_orm_with_features(p) for p in plans])


# ---- 管理员接口 ----


@router.get("/admin/list")
def admin_list_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员：列出所有套餐（含已下架）"""
    _check_admin(current_user)
    plans = PlanService.list_all(db)
    return Result.ok([PlanVO.from_orm_with_features(p) for p in plans])


@router.post("/create")
def create_plan(
    dto: PlanCreateDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建套餐（管理员）"""
    _check_admin(current_user)
    plan = PlanService.create(db, dto)
    return Result.ok(PlanVO.from_orm_with_features(plan))


@router.post("/{plan_id}/update")
def update_plan(
    plan_id: int,
    dto: PlanUpdateDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新套餐（管理员）"""
    _check_admin(current_user)
    plan = PlanService.update(db, plan_id, dto)
    return Result.ok(PlanVO.from_orm_with_features(plan))


@router.post("/{plan_id}/delete")
def delete_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除套餐（管理员）"""
    _check_admin(current_user)
    PlanService.delete(db, plan_id)
    return Result.ok()
