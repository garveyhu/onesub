import json

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from backend.complex.auth.oauth import get_current_user
from backend.complex.database import get_db
from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.complex.response.result import Result
from backend.models.plan import Plan
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


@router.post("/admin/import")
async def admin_import_plans(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员：从 JSON 文件导入套餐（按名称 upsert）"""
    _check_admin(current_user)
    content = await file.read()
    try:
        plans_data = json.loads(content)
    except json.JSONDecodeError:
        raise CustomException(ResultCode.FAIL, "JSON 格式错误")

    if not isinstance(plans_data, list):
        raise CustomException(ResultCode.FAIL, "JSON 应为套餐数组")

    count = 0
    for p in plans_data:
        existing = db.query(Plan).filter(Plan.name == p["name"]).first()
        features_str = json.dumps(p.get("features", []), ensure_ascii=False)
        if existing:
            existing.description = p.get("description", existing.description)
            existing.provider = p.get("provider", existing.provider)
            existing.duration_days = p.get("duration_days", existing.duration_days)
            existing.price = p.get("price", existing.price)
            existing.original_price = p.get("original_price", existing.original_price)
            existing.features = features_str
            existing.is_active = p.get("is_active", existing.is_active)
            existing.is_hot = p.get("is_hot", existing.is_hot)
            existing.sort_order = p.get("sort_order", existing.sort_order)
        else:
            plan = Plan(
                name=p["name"],
                description=p.get("description"),
                provider=p.get("provider", ""),
                duration_days=p.get("duration_days", 30),
                price=p["price"],
                original_price=p.get("original_price"),
                features=features_str,
                is_active=p.get("is_active", True),
                is_hot=p.get("is_hot", False),
                sort_order=p.get("sort_order", 0),
            )
            db.add(plan)
        count += 1

    db.commit()
    return Result.ok({"imported": count})


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
