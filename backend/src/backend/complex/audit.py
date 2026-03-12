"""Audit logging utility for recording admin operations."""

from sqlalchemy.orm import Session

from backend.models.audit_log import AuditLog


def log_audit(
    db: Session,
    user_id: int,
    username: str,
    action: str,
    target_type: str = None,
    target_id: str = None,
    detail: str = None,
    ip: str = None,
):
    """Record an audit log entry."""
    entry = AuditLog(
        user_id=user_id,
        username=username,
        action=action,
        target_type=target_type,
        target_id=str(target_id) if target_id else None,
        detail=detail,
        ip=ip,
    )
    db.add(entry)
    db.commit()
