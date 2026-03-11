from typing import Generic, List, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PageParams(BaseModel):
    """分页查询参数（通过 Depends() 注入）"""

    page: int = Field(1, ge=1, description="页码，从 1 开始")
    page_size: int = Field(10, ge=1, le=100, description="每页数量，最大 100")


class PageResult(BaseModel, Generic[T]):
    """分页查询结果（包裹在 Result.ok() 中返回）"""

    items: List[T] = Field(default_factory=list, description="数据列表")
    total: int = Field(0, description="总记录数")
    page: int = Field(1, description="当前页码")
    page_size: int = Field(10, description="每页数量")
