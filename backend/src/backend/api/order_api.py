import csv
import io
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.complex.audit import log_audit
from backend.complex.auth.oauth import get_current_user
from backend.complex.database import get_db
from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.complex.response.result import Result
from backend.models.order import Order
from backend.models.user import User
from backend.modules.order.schemas.order_dto import OrderAdminUpdateDTO, OrderCreateDTO, OrderVO
from backend.modules.order.service.order_service import OrderService

router = APIRouter(prefix="/order", tags=["订单"])


class BatchIdsDTO(BaseModel):
    ids: List[int]
    status: Optional[str] = None
    admin_remark: Optional[str] = None


def _check_admin(user: User):
    if not user.is_admin:
        raise CustomException(ResultCode.FORBIDDEN, "仅管理员可操作")


# ---- 管理员接口（必须放在 /{order_id} 之前，否则路由冲突） ----


@router.get("/admin/list")
def admin_list_orders(
    username: Optional[str] = Query(None, description="按用户名筛选"),
    order_no: Optional[str] = Query(None, description="按订单号筛选"),
    status: Optional[str] = Query(None, description="按状态筛选"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员：所有订单（支持筛选）"""
    _check_admin(current_user)
    orders = OrderService.list_all(
        db, 
        username_filter=username, 
        order_no_filter=order_no,
        status_filter=status
    )
    result = []
    for o in orders:
        vo = OrderVO.model_validate(o)
        vo.username = getattr(o, "username", None)
        result.append(vo)
    return Result.ok(result)


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
    log_audit(db, current_user.id, current_user.username, "确认收款", "order", order_id)
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
    log_audit(db, current_user.id, current_user.username, f"更新订单状态为{dto.status}", "order", order_id)
    return Result.ok(OrderVO.model_validate(order))


@router.get("/admin/export")
def admin_export_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员：导出订单 CSV"""
    _check_admin(current_user)
    orders = OrderService.list_all(db)

    output = io.StringIO()
    output.write('\ufeff')  # BOM for Excel
    writer = csv.writer(output)
    writer.writerow(["订单号", "用户名", "套餐", "原价", "优惠码", "优惠金额", "实付", "状态", "创建时间", "管理员备注"])
    for o in orders:
        writer.writerow([
            o.order_no,
            getattr(o, 'username', ''),
            o.plan_name,
            o.amount,
            o.coupon_code or '',
            o.discount_amount,
            o.actual_amount,
            o.status,
            o.created_at.strftime('%Y-%m-%d %H:%M:%S') if o.created_at else '',
            o.admin_remark or '',
        ])

    output.seek(0)
    log_audit(db, current_user.id, current_user.username, "导出订单CSV", "order")
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=orders.csv"},
    )


@router.post("/admin/batch-confirm")
def admin_batch_confirm(
    dto: BatchIdsDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员：批量确认收款"""
    _check_admin(current_user)
    count = 0
    for oid in dto.ids:
        try:
            OrderService.confirm_paid(db, oid, dto.admin_remark)
            count += 1
        except Exception:
            pass
    log_audit(db, current_user.id, current_user.username, f"批量确认收款 {count} 笔", "order")
    return Result.ok({"confirmed": count})


@router.post("/admin/batch-status")
def admin_batch_status(
    dto: BatchIdsDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员：批量更新状态"""
    _check_admin(current_user)
    if not dto.status:
        raise CustomException(ResultCode.FAIL, "请指定状态")
    count = 0
    for oid in dto.ids:
        try:
            OrderService.update_status(db, oid, dto.status, dto.admin_remark)
            count += 1
        except Exception:
            pass
    log_audit(db, current_user.id, current_user.username, f"批量更新 {count} 笔订单为 {dto.status}", "order")
    return Result.ok({"updated": count})


# ---- 用户接口 ----


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
