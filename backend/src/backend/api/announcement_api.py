from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.complex.audit import log_audit
from backend.complex.auth.oauth import get_current_user
from backend.complex.database import get_db
from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.complex.response.result import Result
from backend.models.announcement import Announcement
from backend.models.user import User

router = APIRouter(prefix="/announcement", tags=["公告"])


class AnnouncementDTO(BaseModel):
    title: str = Field(description="标题")
    content: Optional[str] = Field(None, description="内容")
    type: str = Field("info", description="类型: info/warning/success")
    is_active: bool = Field(True, description="是否显示")
    sort_order: int = Field(0, description="排序")


class AnnouncementUpdateDTO(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    type: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


# ---- 公开接口 ----


@router.get("")
def list_active_announcements(db: Session = Depends(get_db)):
    """获取当前有效公告"""
    items = (
        db.query(Announcement)
        .filter(Announcement.is_active)
        .order_by(Announcement.sort_order.asc(), Announcement.created_at.desc())
        .all()
    )
    return Result.ok([_to_vo(a) for a in items])


# ---- 管理员接口 ----


@router.get("/admin/list")
def admin_list(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _check_admin(current_user)
    items = db.query(Announcement).order_by(Announcement.created_at.desc()).all()
    return Result.ok([_to_vo(a) for a in items])


@router.post("/admin/create")
def admin_create(
    dto: AnnouncementDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_admin(current_user)
    item = Announcement(
        title=dto.title,
        content=dto.content,
        type=dto.type,
        is_active=dto.is_active,
        sort_order=dto.sort_order,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    log_audit(db, current_user.id, current_user.username, "创建公告", "announcement", item.id, dto.title)
    return Result.ok(_to_vo(item))


@router.post("/admin/{announcement_id}/update")
def admin_update(
    announcement_id: int,
    dto: AnnouncementUpdateDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_admin(current_user)
    item = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not item:
        raise CustomException(ResultCode.NOT_FOUND, "公告不存在")
    for field, value in dto.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    log_audit(db, current_user.id, current_user.username, "更新公告", "announcement", item.id, dto.title or item.title)
    return Result.ok(_to_vo(item))


@router.post("/admin/{announcement_id}/delete")
def admin_delete(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_admin(current_user)
    item = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not item:
        raise CustomException(ResultCode.NOT_FOUND, "公告不存在")
    title = item.title
    db.delete(item)
    db.commit()
    log_audit(db, current_user.id, current_user.username, "删除公告", "announcement", announcement_id, title)
    return Result.ok()


def _check_admin(user: User):
    if not user.is_admin:
        raise CustomException(ResultCode.FORBIDDEN, "仅管理员可操作")


def _to_vo(a: Announcement) -> dict:
    return {
        "id": a.id,
        "title": a.title,
        "content": a.content,
        "type": a.type,
        "is_active": a.is_active,
        "sort_order": a.sort_order,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }
