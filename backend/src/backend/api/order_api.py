from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.complex.auth.oauth import get_current_user
from backend.complex.database import get_db
from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.complex.response.result import Result
from backend.models.user import User
from backend.modules.order.schemas.order_dto import OrderAdminUpdateDTO, OrderCreateDTO, OrderVO
from backend.modules.order.service.order_service import OrderService

router = APIRouter(prefix="/order", tags=["订单"])


@router.post("/create")
def create_order(
    dto: OrderCreateDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建订单（支持优惠码）"""
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


# ---- 管理员接口 ----


def _check_admin(user: User):
    if not user.is_admin:
        raise CustomException(ResultCode.FORBIDDEN, "仅管理员可操作")


@router.get("/admin/list")
def admin_list_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员：所有订单"""
    _check_admin(current_user)
    orders = OrderService.list_all(db)
    return Result.ok([OrderVO.model_validate(o) for o in orders])


@router.post("/admin/{order_id}/confirm")
def admin_confirm_order(
    order_id: int,
    dto: OrderAdminUpdateDTO = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员：确认收款"""
    _check_admin(current_user)
    remark = dto.admin_remark if dto else None
    order = OrderService.confirm_paid(db, order_id, remark)
    return Result.ok(OrderVO.model_validate(order))


@router.post("/admin/{order_id}/status")
def admin_update_status(
    order_id: int,
    dto: OrderAdminUpdateDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员：更新状态"""
    _check_admin(current_user)
    order = OrderService.update_status(db, order_id, dto.status, dto.admin_remark)
    return Result.ok(OrderVO.model_validate(order))
