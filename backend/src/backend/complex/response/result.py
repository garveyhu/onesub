from typing import Generic, Optional, TypeVar

from pydantic import BaseModel, Field

from .code import ResultCode

T = TypeVar("T")


class Result(BaseModel, Generic[T]):
    success: bool = Field(..., description="操作是否成功")
    code: int = Field(..., description="状态码")
    message: str = Field(..., description="响应消息")
    data: Optional[T] = Field(None, description="响应数据")

    class Config:
        arbitrary_types_allowed = True

    @classmethod
    def ok(cls, data: Optional[T] = None):
        return cls(
            success=True,
            code=ResultCode.SUCCESS.code,
            message=ResultCode.SUCCESS.message,
            data=data,
        )

    @classmethod
    def fail(cls, message: str = ResultCode.FAIL.message, data: Optional[T] = None):
        return cls(success=False, code=ResultCode.FAIL.code, message=message, data=data)

    @classmethod
    def create(cls, success: bool, data: Optional[T] = None, message: str = ""):
        code = ResultCode.SUCCESS.code if success else ResultCode.FAIL.code
        return cls(success=success, code=code, message=message, data=data)
