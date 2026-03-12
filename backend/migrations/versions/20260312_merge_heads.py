"""merge_heads

Revision ID: 5c9385d25431
Revises: 1e5098f50801, 7c9a9c4b8d21
Create Date: 2026-03-12 13:56:38.255327

"""
from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = '5c9385d25431'
down_revision: Union[str, Sequence[str], None] = ('1e5098f50801', '7c9a9c4b8d21')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
