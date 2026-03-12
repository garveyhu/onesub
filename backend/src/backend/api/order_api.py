import csv
import io
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.complex.auth.oauth import get_current_user
from backend.complex.database import get_db
from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.complex.response.result import Result
from backend.models.user import User
from backend.modules.order.schemas.order_dto import (
    OrderAdminUpdateDTO,
    OrderCreateDTO,
    OrderPaymentProofDTO,
    OrderRefundDTO,
    OrderVO,
)
from backend.modules.order.service.order_service import OrderService

router = APIRouter(prefix="/order", tags=["订单"])


class BatchIdsDTO(BaseModel):
    ids: List[int]
    status: Optional[str] = None
    admin_remark: Optional[str] = None
    progress_note: Optional[str] = None


def _check_admin(user: User) -> None:
    if not user.is_admin:
        raise CustomException(ResultCode.FORBIDDEN, "仅管理员可操作")


@router.get("/admin/list")
def admin_list_orders(
    username: Optional[str] = Query(None, description="按用户名筛选"),
    order_no: Optional[str] = Query(None, description="按订单号筛选"),
    status: Optional[str] = Query(None, description="按状态筛选"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员查看订单列表。"""
    _check_admin(current_user)
    orders = OrderService.list_all(
        db,
        username_filter=username,
        order_no_filter=order_no,
        status_filter=status,
    )
    result = []
    for item in orders:
        order_vo = OrderVO.model_validate(item)
        order_vo.username = getattr(item, "username", None)
        result.append(order_vo)
    return Result.ok(result)


@router.post("/admin/{order_id}/confirm")
def admin_confirm_order(
    order_id: int,
    dto: OrderAdminUpdateDTO | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员确认收款。"""
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
    """管理员更新订单状态。"""
    _check_admin(current_user)
    order = OrderService.update_status(
        db,
        order_id,
        dto.status or "processing",
        dto.admin_remark,
        dto.progress_note,
    )
    return Result.ok(OrderVO.model_validate(order))


@router.post("/admin/{order_id}/refund")
def admin_refund_order(
    order_id: int,
    dto: OrderRefundDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员处理退款。"""
    _check_admin(current_user)
    order = OrderService.refund(
        db,
        order_id,
        dto.refund_reason,
        dto.refund_amount,
        dto.admin_remark,
    )
    return Result.ok(OrderVO.model_validate(order))


@router.get("/admin/export")
def admin_export_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """导出订单 CSV。"""
    _check_admin(current_user)
    orders = OrderService.list_all(db)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "订单号",
            "用户名",
            "套餐",
            "支付方式",
            "实付金额",
            "状态",
            "退款金额",
            "支付截止时间",
            "创建时间",
        ]
    )
    for item in orders:
        writer.writerow(
            [
                item.order_no,
                getattr(item, "username", ""),
                item.plan_name,
                item.payment_method,
                item.actual_amount,
                item.status,
                item.refund_amount,
                item.expire_at.strftime("%Y-%m-%d %H:%M:%S") if item.expire_at else "",
                item.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            ]
        )
    output.seek(0)
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
    """管理员批量确认收款。"""
    _check_admin(current_user)
    count = 0
    for order_id in dto.ids:
        try:
            OrderService.confirm_paid(db, order_id, dto.admin_remark)
            count += 1
        except Exception:
            continue
    return Result.ok({"confirmed": count})


@router.post("/admin/batch-status")
def admin_batch_status(
    dto: BatchIdsDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员批量更新订单状态。"""
    _check_admin(current_user)
    if not dto.status:
        raise CustomException(ResultCode.FAIL, "请指定状态")
    count = 0
    for order_id in dto.ids:
        try:
            OrderService.update_status(
                db,
                order_id,
                dto.status,
                dto.admin_remark,
                dto.progress_note,
            )
            count += 1
        except Exception:
            continue
    return Result.ok({"updated": count})


@router.post("/create")
def create_order(
    dto: OrderCreateDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建订单。"""
    order = OrderService.create(db, current_user.id, dto)
    return Result.ok(OrderVO.model_validate(order))


@router.get("")
def list_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取当前用户订单列表。"""
    orders = OrderService.list_by_user(db, current_user.id)
    return Result.ok([OrderVO.model_validate(item) for item in orders])


@router.get("/{order_id}")
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取订单详情。"""
    order = OrderService.get_detail(db, order_id, current_user)
    return Result.ok(OrderVO.model_validate(order))


@router.post("/{order_id}/proof")
def submit_payment_proof(
    order_id: int,
    dto: OrderPaymentProofDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """提交支付凭证。"""
    order = OrderService.submit_payment_proof(
        db,
        order_id,
        current_user.id,
        dto.payment_proof,
    )
    return Result.ok(OrderVO.model_validate(order))


@router.post("/{order_id}/cancel")
def cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """取消订单。"""
    order = OrderService.cancel(db, order_id, current_user.id)
    return Result.ok(OrderVO.model_validate(order))
