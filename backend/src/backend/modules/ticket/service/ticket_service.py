from sqlalchemy.orm import Session

from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.complex.time_util import now_cst
from backend.models.ticket import Ticket
from backend.models.user import User
from backend.modules.ticket.schemas.ticket_dto import (
    TicketCreateDTO,
    TicketReplyDTO,
)


class TicketService:
    @staticmethod
    def create(db: Session, current_user: User, dto: TicketCreateDTO) -> Ticket:
        """创建用户工单。"""
        ticket = Ticket(
            user_id=current_user.id,
            subject=dto.subject.strip(),
            content=dto.content.strip(),
            status="open",
        )
        db.add(ticket)
        db.commit()
        db.refresh(ticket)
        return ticket

    @staticmethod
    def list_by_user(db: Session, user_id: int) -> list[Ticket]:
        """查询当前用户工单。"""
        return (
            db.query(Ticket)
            .filter(Ticket.user_id == user_id)
            .order_by(Ticket.created_at.desc())
            .all()
        )

    @staticmethod
    def list_all(db: Session, status: str | None = None, username: str | None = None) -> list[Ticket]:
        """查询后台工单列表，支持状态和用户名筛选。"""
        query = db.query(Ticket, User.username).join(User, User.id == Ticket.user_id)
        if status:
            query = query.filter(Ticket.status == status)
        if username:
            query = query.filter(User.username.contains(username))
        result = []
        for ticket, ticket_username in query.order_by(Ticket.created_at.desc()).all():
            ticket.username = ticket_username  # type: ignore[attr-defined]
            result.append(ticket)
        return result

    @staticmethod
    def get_by_id(db: Session, ticket_id: int) -> Ticket:
        """按 ID 获取工单。"""
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            raise CustomException(ResultCode.NOT_FOUND, "工单不存在")
        return ticket

    @staticmethod
    def reply(db: Session, ticket_id: int, dto: TicketReplyDTO) -> Ticket:
        """管理员回复工单。"""
        ticket = TicketService.get_by_id(db, ticket_id)
        ticket.admin_reply = dto.admin_reply.strip()
        ticket.status = dto.status
        ticket.replied_at = now_cst()
        db.commit()
        db.refresh(ticket)
        return ticket

    @staticmethod
    def update_status(db: Session, ticket_id: int, status: str, user_id: int | None = None) -> Ticket:
        """更新工单状态，用户侧仅允许操作自己的工单。"""
        ticket = TicketService.get_by_id(db, ticket_id)
        if user_id is not None and ticket.user_id != user_id:
            raise CustomException(ResultCode.FORBIDDEN, "无权操作此工单")
        ticket.status = status
        db.commit()
        db.refresh(ticket)
        return ticket
