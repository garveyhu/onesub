from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.complex.auth.oauth import get_current_user
from backend.complex.database import get_db
from backend.complex.response.result import Result
from backend.models.user import User
from backend.modules.user.schemas.user_dto import UserUpdateDTO, UserVO
from backend.modules.user.service.user_service import UserService

router = APIRouter(prefix="/user", tags=["用户"])


@router.get("")
def list_users(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    users = UserService.list(db)
    return Result.ok([UserVO.model_validate(u) for u in users])


@router.get("/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    return Result.ok(UserVO.model_validate(current_user))


@router.post("/{user_id}/update")
def update_user(
    user_id: int,
    dto: UserUpdateDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = UserService.update(db, user_id, dto)
    return Result.ok(UserVO.model_validate(user))


@router.post("/{user_id}/delete")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    UserService.delete(db, user_id)
    return Result.ok()
