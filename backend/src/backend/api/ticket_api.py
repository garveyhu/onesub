from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.complex.auth.oauth import get_current_user
from backend.complex.database import get_db
from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.complex.response.result import Result
from backend.models.user import User
from backend.modules.ticket.schemas.ticket_dto import (
    TicketCreateDTO,
    TicketReplyDTO,
    TicketStatusDTO,
    TicketVO,
)
from backend.modules.ticket.service.ticket_service import TicketService

router = APIRouter(prefix="/ticket", tags=["工单"])


def _check_admin(user: User) -> None:
    if not user.is_admin:
        raise CustomException(ResultCode.FORBIDDEN, "仅管理员可操作")


@router.get("")
def list_my_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取当前用户工单列表。"""
    items = TicketService.list_by_user(db, current_user.id)
    return Result.ok([TicketVO.model_validate(item) for item in items])


@router.post("")
def create_ticket(
    dto: TicketCreateDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建工单。"""
    ticket = TicketService.create(db, current_user, dto)
    return Result.ok(TicketVO.model_validate(ticket))


@router.post("/{ticket_id}/status")
def update_ticket_status(
    ticket_id: int,
    dto: TicketStatusDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """用户关闭自己的工单，或管理员更新工单状态。"""
    ticket = TicketService.update_status(
        db,
        ticket_id,
        dto.status,
        None if current_user.is_admin else current_user.id,
    )
    return Result.ok(TicketVO.model_validate(ticket))


@router.get("/admin/list")
def admin_list_tickets(
    status: Optional[str] = Query(None, description="工单状态"),
    username: Optional[str] = Query(None, description="用户名"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员查看工单列表。"""
    _check_admin(current_user)
    items = TicketService.list_all(db, status=status, username=username)
    result = []
    for item in items:
        ticket_vo = TicketVO.model_validate(item)
        ticket_vo.username = getattr(item, "username", None)
        result.append(ticket_vo)
    return Result.ok(result)


@router.post("/admin/{ticket_id}/reply")
def admin_reply_ticket(
    ticket_id: int,
    dto: TicketReplyDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员回复工单。"""
    _check_admin(current_user)
    ticket = TicketService.reply(db, ticket_id, dto)
    return Result.ok(TicketVO.model_validate(ticket))
