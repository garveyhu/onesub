"""add_is_hot_to_plans

Revision ID: 4fa323b7ace6
Revises: b2c3d4e5f6a7
Create Date: 2026-03-11 23:15:58.175244

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4fa323b7ace6'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('plans', sa.Column('is_hot', sa.Boolean(), nullable=True, comment='是否热门/首页展示'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('plans', 'is_hot')
