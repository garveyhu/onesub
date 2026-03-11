"""add_coupons_and_update_orders

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-11 19:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 创建 coupons 表
    op.create_table('coupons',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False, comment='优惠码'),
        sa.Column('discount_amount', sa.Float(), nullable=False, comment='减免金额'),
        sa.Column('max_uses', sa.Integer(), nullable=False, comment='最大使用次数'),
        sa.Column('used_count', sa.Integer(), nullable=False, comment='已使用次数'),
        sa.Column('is_active', sa.Boolean(), nullable=True, comment='是否启用'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text("(datetime('now', '+08:00'))"), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text("(datetime('now', '+08:00'))"), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_coupons_code'), 'coupons', ['code'], unique=True)

    # orders 表新增列
    with op.batch_alter_table('orders') as batch_op:
        batch_op.add_column(sa.Column('coupon_code', sa.String(length=50), nullable=True, comment='使用的优惠码'))
        batch_op.add_column(sa.Column('discount_amount', sa.Float(), nullable=False, server_default='0', comment='优惠减免金额'))
        batch_op.add_column(sa.Column('actual_amount', sa.Float(), nullable=True, comment='实付金额'))
        batch_op.add_column(sa.Column('admin_remark', sa.Text(), nullable=True, comment='管理员备注'))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('orders') as batch_op:
        batch_op.drop_column('admin_remark')
        batch_op.drop_column('actual_amount')
        batch_op.drop_column('discount_amount')
        batch_op.drop_column('coupon_code')
    op.drop_index(op.f('ix_coupons_code'), table_name='coupons')
    op.drop_table('coupons')
