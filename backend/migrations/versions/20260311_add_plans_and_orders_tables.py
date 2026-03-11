"""add_plans_and_orders_tables

Revision ID: a1b2c3d4e5f6
Revises: dbf6966f4e5c
Create Date: 2026-03-11 18:26:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'dbf6966f4e5c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('plans',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False, comment='套餐名称'),
        sa.Column('description', sa.Text(), nullable=True, comment='套餐描述'),
        sa.Column('provider', sa.String(length=50), nullable=False, comment='服务商'),
        sa.Column('duration_days', sa.Integer(), nullable=False, comment='有效天数'),
        sa.Column('price', sa.Float(), nullable=False, comment='售价'),
        sa.Column('original_price', sa.Float(), nullable=True, comment='原价'),
        sa.Column('features', sa.Text(), nullable=True, comment='功能特性 JSON'),
        sa.Column('is_active', sa.Boolean(), nullable=True, comment='是否上架'),
        sa.Column('sort_order', sa.Integer(), nullable=True, comment='排序序号'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text("(datetime('now', '+08:00'))"), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text("(datetime('now', '+08:00'))"), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('orders',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('order_no', sa.String(length=64), nullable=False, comment='订单号'),
        sa.Column('user_id', sa.Integer(), nullable=False, comment='用户 ID'),
        sa.Column('plan_id', sa.Integer(), nullable=False, comment='套餐 ID'),
        sa.Column('plan_name', sa.String(length=100), nullable=True, comment='套餐名称快照'),
        sa.Column('amount', sa.Float(), nullable=False, comment='订单金额'),
        sa.Column('status', sa.String(length=20), nullable=False, comment='订单状态'),
        sa.Column('payment_method', sa.String(length=20), nullable=True, comment='支付方式'),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True, comment='支付时间'),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True, comment='完成时间'),
        sa.Column('remark', sa.Text(), nullable=True, comment='备注'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text("(datetime('now', '+08:00'))"), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text("(datetime('now', '+08:00'))"), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_orders_order_no'), 'orders', ['order_no'], unique=True)
    op.create_index(op.f('ix_orders_user_id'), 'orders', ['user_id'], unique=False)
    op.create_index(op.f('ix_orders_plan_id'), 'orders', ['plan_id'], unique=False)
    op.create_index(op.f('ix_orders_status'), 'orders', ['status'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_orders_status'), table_name='orders')
    op.drop_index(op.f('ix_orders_plan_id'), table_name='orders')
    op.drop_index(op.f('ix_orders_user_id'), table_name='orders')
    op.drop_index(op.f('ix_orders_order_no'), table_name='orders')
    op.drop_table('orders')
    op.drop_table('plans')
