import uuid

import bcrypt
from sqlalchemy.orm import Session

from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.models.user import User
from backend.modules.user.schemas.user_dto import UserCreateDTO, UserUpdateDTO


def _hash_password(password: str) -> str:
    """哈希密码，自动截断到 72 字节（bcrypt 限制）"""
    pwd_bytes = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode("utf-8")


def _verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    pwd_bytes = plain_password.encode("utf-8")[:72]
    return bcrypt.checkpw(pwd_bytes, hashed_password.encode("utf-8"))


def _normalize_username(username: str) -> str:
    """标准化用户名并拒绝空白值。"""
    normalized = username.strip()
    if not normalized:
        raise CustomException(ResultCode.FAIL, "用户名不能为空")
    return normalized


def _normalize_email(email: str | None) -> str | None:
    """标准化邮箱，空字符串统一视为未设置。"""
    if email is None:
        return None
    normalized = email.strip()
    return normalized or None


class UserService:
    @staticmethod
    def _generate_invite_code(db: Session) -> str:
        """生成唯一邀请码。"""
        while True:
            code = uuid.uuid4().hex[:8].upper()
            exists = db.query(User.id).filter(User.invite_code == code).first()
            if not exists:
                return code

    @staticmethod
    def list(db: Session, username_filter: str = None) -> list[User]:
        """查询用户列表。"""
        query = db.query(User)
        if username_filter:
            query = query.filter(User.username.contains(username_filter))
        return query.order_by(User.id.asc()).all()

    @staticmethod
    def hash_password(password: str) -> str:
        """对明文密码做 bcrypt 哈希。"""
        return _hash_password(password)

    @staticmethod
    def get_by_id(db: Session, user_id: int) -> User:
        """按 ID 获取用户。"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise CustomException(ResultCode.NOT_FOUND, f"用户 {user_id} 不存在")
        return user

    @staticmethod
    def get_by_username(db: Session, username: str) -> User:
        """按用户名获取用户。"""
        return db.query(User).filter(User.username == username).first()

    @staticmethod
    def get_by_invite_code(db: Session, invite_code: str) -> User | None:
        """按邀请码获取邀请人。"""
        return db.query(User).filter(User.invite_code == invite_code.upper()).first()

    @staticmethod
    def create(db: Session, dto: UserCreateDTO) -> User:
        """创建用户并绑定邀请关系。"""
        username = _normalize_username(dto.username)
        email = _normalize_email(dto.email)

        existing = db.query(User).filter(User.username == username).first()
        if existing:
            raise CustomException(ResultCode.FAIL, f"用户名 {username} 已存在")

        inviter_id = None
        if dto.invite_code:
            inviter = UserService.get_by_invite_code(db, dto.invite_code)
            if not inviter:
                raise CustomException(ResultCode.FAIL, "邀请码无效")
            inviter_id = inviter.id

        user = User(
            username=username,
            password_hash=_hash_password(dto.password),
            email=email,
            inviter_id=inviter_id,
            invite_code=UserService._generate_invite_code(db),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update(db: Session, user_id: int, dto: UserUpdateDTO) -> User:
        """更新用户信息。"""
        user = UserService.get_by_id(db, user_id)
        fields_set = dto.model_fields_set

        if "username" in fields_set and dto.username is not None:
            username = _normalize_username(dto.username)
            exists = (
                db.query(User.id)
                .filter(User.username == username, User.id != user_id)
                .first()
            )
            if exists:
                raise CustomException(ResultCode.FAIL, "用户名已存在")
            user.username = username
        if "password" in fields_set and dto.password is not None:
            user.password_hash = _hash_password(dto.password)
        if "email" in fields_set:
            user.email = _normalize_email(dto.email)
        if "is_active" in fields_set and dto.is_active is not None:
            user.is_active = dto.is_active
        if "subscription_expires_at" in fields_set:
            user.subscription_expires_at = dto.subscription_expires_at
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def delete(db: Session, user_id: int) -> None:
        """删除用户。"""
        user = UserService.get_by_id(db, user_id)
        db.delete(user)
        db.commit()

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """校验密码是否匹配。"""
        return _verify_password(plain_password, hashed_password)
