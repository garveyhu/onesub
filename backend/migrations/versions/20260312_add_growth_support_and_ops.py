"""add_growth_support_and_ops

Revision ID: 7c9a9c4b8d21
Revises: 4fa323b7ace6
Create Date: 2026-03-12 16:10:00.000000

"""

from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa


revision: str = "7c9a9c4b8d21"
down_revision: Union[str, Sequence[str], None] = "4fa323b7ace6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(
            sa.Column("subscription_expires_at", sa.DateTime(timezone=True), nullable=True)
        )
        batch_op.add_column(sa.Column("inviter_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("invite_code", sa.String(length=32), nullable=True))
        batch_op.add_column(
            sa.Column("reward_balance", sa.Float(), nullable=False, server_default="0")
        )
        batch_op.create_index("ix_users_inviter_id", ["inviter_id"], unique=False)
        batch_op.create_index("ix_users_invite_code", ["invite_code"], unique=True)

    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id FROM users")).fetchall()
    for row in rows:
        code = uuid.uuid4().hex[:8].upper()
        bind.execute(
            sa.text("UPDATE users SET invite_code = :code WHERE id = :id"),
            {"code": code, "id": row[0]},
        )

    with op.batch_alter_table("orders") as batch_op:
        batch_op.add_column(sa.Column("expire_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("payment_proof", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("progress_note", sa.Text(), nullable=True))
        batch_op.add_column(
            sa.Column(
                "refund_status",
                sa.String(length=20),
                nullable=False,
                server_default="none",
            )
        )
        batch_op.add_column(sa.Column("refund_reason", sa.Text(), nullable=True))
        batch_op.add_column(
            sa.Column("refund_amount", sa.Float(), nullable=False, server_default="0")
        )
        batch_op.add_column(sa.Column("refunded_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.create_index("ix_orders_expire_at", ["expire_at"], unique=False)

    op.create_table(
        "tickets",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False, comment="提交工单的用户 ID"),
        sa.Column("subject", sa.String(length=200), nullable=False, comment="工单标题"),
        sa.Column("content", sa.Text(), nullable=False, comment="工单内容"),
        sa.Column("status", sa.String(length=20), nullable=False, comment="工单状态"),
        sa.Column("admin_reply", sa.Text(), nullable=True, comment="管理员回复"),
        sa.Column("replied_at", sa.DateTime(timezone=True), nullable=True, comment="回复时间"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(datetime('now', '+08:00'))"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(datetime('now', '+08:00'))"),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_tickets_user_id"), "tickets", ["user_id"], unique=False)
    op.create_index(op.f("ix_tickets_status"), "tickets", ["status"], unique=False)

    op.create_table(
        "invite_rewards",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("inviter_user_id", sa.Integer(), nullable=False, comment="邀请人用户 ID"),
        sa.Column("invitee_user_id", sa.Integer(), nullable=False, comment="被邀请人用户 ID"),
        sa.Column("order_id", sa.Integer(), nullable=False, comment="奖励来源订单 ID"),
        sa.Column("reward_type", sa.String(length=20), nullable=False, comment="奖励类型"),
        sa.Column("reward_amount", sa.Float(), nullable=False, comment="奖励金额"),
        sa.Column("coupon_code", sa.String(length=50), nullable=True, comment="奖励优惠码"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(datetime('now', '+08:00'))"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(datetime('now', '+08:00'))"),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_invite_rewards_inviter_user_id"),
        "invite_rewards",
        ["inviter_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_invite_rewards_invitee_user_id"),
        "invite_rewards",
        ["invitee_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_invite_rewards_order_id"),
        "invite_rewards",
        ["order_id"],
        unique=True,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_invite_rewards_order_id"), table_name="invite_rewards")
    op.drop_index(
        op.f("ix_invite_rewards_invitee_user_id"),
        table_name="invite_rewards",
    )
    op.drop_index(
        op.f("ix_invite_rewards_inviter_user_id"),
        table_name="invite_rewards",
    )
    op.drop_table("invite_rewards")

    op.drop_index(op.f("ix_tickets_status"), table_name="tickets")
    op.drop_index(op.f("ix_tickets_user_id"), table_name="tickets")
    op.drop_table("tickets")

    with op.batch_alter_table("orders") as batch_op:
        batch_op.drop_index("ix_orders_expire_at")
        batch_op.drop_column("refunded_at")
        batch_op.drop_column("refund_amount")
        batch_op.drop_column("refund_reason")
        batch_op.drop_column("refund_status")
        batch_op.drop_column("progress_note")
        batch_op.drop_column("payment_proof")
        batch_op.drop_column("expire_at")

    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_index("ix_users_invite_code")
        batch_op.drop_index("ix_users_inviter_id")
        batch_op.drop_column("reward_balance")
        batch_op.drop_column("invite_code")
        batch_op.drop_column("inviter_id")
        batch_op.drop_column("subscription_expires_at")
