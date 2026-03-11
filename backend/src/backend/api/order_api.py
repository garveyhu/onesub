from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.complex.auth.oauth import get_current_user
from backend.complex.database import get_db
from backend.complex.response.result import Result
from backend.models.user import User
from backend.modules.order.schemas.order_dto import OrderCreateDTO, OrderVO
from backend.modules.order.service.order_service import OrderService

router = APIRouter(prefix="/order", tags=["订单"])


@router.post("/create")
def create_order(
    dto: OrderCreateDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建订单"""
    order = OrderService.create(db, current_user.id, dto)
    return Result.ok(OrderVO.model_validate(order))


@router.get("")
def list_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """我的订单列表"""
    orders = OrderService.list_by_user(db, current_user.id)
    return Result.ok([OrderVO.model_validate(o) for o in orders])


@router.get("/{order_id}")
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """订单详情"""
    order = OrderService.get_by_id(db, order_id)
    return Result.ok(OrderVO.model_validate(order))


@router.post("/{order_id}/cancel")
def cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """取消订单"""
    order = OrderService.cancel(db, order_id, current_user.id)
    return Result.ok(OrderVO.model_validate(order))
