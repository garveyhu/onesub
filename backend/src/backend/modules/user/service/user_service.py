from passlib.context import CryptContext
from sqlalchemy.orm import Session

from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.models.user import User
from backend.modules.user.schemas.user_dto import UserCreateDTO, UserUpdateDTO

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserService:
    @staticmethod
    def list(db: Session) -> list[User]:
        return db.query(User).all()

    @staticmethod
    def get_by_id(db: Session, user_id: int) -> User:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise CustomException(ResultCode.NOT_FOUND, f"用户 {user_id} 不存在")
        return user

    @staticmethod
    def get_by_username(db: Session, username: str) -> User:
        return db.query(User).filter(User.username == username).first()

    @staticmethod
    def create(db: Session, dto: UserCreateDTO) -> User:
        existing = db.query(User).filter(User.username == dto.username).first()
        if existing:
            raise CustomException(ResultCode.FAIL, f"用户名 {dto.username} 已存在")

        user = User(
            username=dto.username,
            password_hash=pwd_context.hash(dto.password),
            email=dto.email,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update(db: Session, user_id: int, dto: UserUpdateDTO) -> User:
        user = UserService.get_by_id(db, user_id)
        if dto.username is not None:
            user.username = dto.username
        if dto.password is not None:
            user.password_hash = pwd_context.hash(dto.password)
        if dto.email is not None:
            user.email = dto.email
        if dto.is_active is not None:
            user.is_active = dto.is_active
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def delete(db: Session, user_id: int) -> None:
        user = UserService.get_by_id(db, user_id)
        db.delete(user)
        db.commit()

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)
