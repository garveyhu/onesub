from contextvars import ContextVar
from typing import Any, Optional

_user_id: ContextVar[Optional[int]] = ContextVar("user_id", default=None)
_current_user: ContextVar[Any] = ContextVar("current_user", default=None)


class RequestContext:
    """请求上下文管理器（ContextVar 实现，异步安全）"""

    @staticmethod
    def get_user_id() -> Optional[int]:
        return _user_id.get()

    @staticmethod
    def set_user_id(user_id: Optional[int]) -> None:
        _user_id.set(user_id)

    @staticmethod
    def get_current_user() -> Any:
        return _current_user.get()

    @staticmethod
    def set_current_user(user: Any) -> None:
        _current_user.set(user)
        if hasattr(user, "id"):
            _user_id.set(user.id)

    @staticmethod
    def clear() -> None:
        _user_id.set(None)
        _current_user.set(None)
