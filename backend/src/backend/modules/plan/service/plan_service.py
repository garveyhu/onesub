import json

from sqlalchemy.orm import Session

from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.models.plan import Plan
from backend.modules.plan.schemas.plan_dto import PlanCreateDTO, PlanUpdateDTO


class PlanService:
    @staticmethod
    def list_active(db: Session) -> list[Plan]:
        """获取所有上架套餐（按 sort_order 排序）"""
        return (
            db.query(Plan)
            .filter(Plan.is_active == True)
            .order_by(Plan.sort_order.asc())
            .all()
        )

    @staticmethod
    def list_all(db: Session) -> list[Plan]:
        """获取所有套餐（管理员）"""
        return db.query(Plan).order_by(Plan.sort_order.asc()).all()

    @staticmethod
    def get_by_id(db: Session, plan_id: int) -> Plan:
        plan = db.query(Plan).filter(Plan.id == plan_id).first()
        if not plan:
            raise CustomException(ResultCode.NOT_FOUND, f"套餐 {plan_id} 不存在")
        return plan

    @staticmethod
    def create(db: Session, dto: PlanCreateDTO) -> Plan:
        plan = Plan(
            name=dto.name,
            description=dto.description,
            provider=dto.provider,
            duration_days=dto.duration_days,
            price=dto.price,
            original_price=dto.original_price,
            features=json.dumps(dto.features, ensure_ascii=False)
            if dto.features
            else None,
            is_active=dto.is_active,
            sort_order=dto.sort_order,
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)
        return plan

    @staticmethod
    def update(db: Session, plan_id: int, dto: PlanUpdateDTO) -> Plan:
        plan = PlanService.get_by_id(db, plan_id)
        for field, value in dto.model_dump(exclude_unset=True).items():
            if field == "features" and value is not None:
                setattr(plan, field, json.dumps(value, ensure_ascii=False))
            else:
                setattr(plan, field, value)
        db.commit()
        db.refresh(plan)
        return plan

    @staticmethod
    def delete(db: Session, plan_id: int) -> None:
        plan = PlanService.get_by_id(db, plan_id)
        db.delete(plan)
        db.commit()
