from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TicketVO(BaseModel):
    """工单响应对象。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    subject: str
    content: str
    status: str
    admin_reply: Optional[str] = None
    replied_at: Optional[datetime] = None
    username: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class TicketCreateDTO(BaseModel):
    """创建工单。"""

    subject: str = Field(description="工单标题", min_length=2, max_length=200)
    content: str = Field(description="工单内容", min_length=5)


class TicketReplyDTO(BaseModel):
    """管理员回复工单。"""

    admin_reply: str = Field(description="管理员回复", min_length=2)
    status: str = Field("replied", description="回复后的状态")


class TicketStatusDTO(BaseModel):
    """更新工单状态。"""

    status: str = Field(description="工单状态")
