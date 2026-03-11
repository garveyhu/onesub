from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from .config.inventory import DatabaseSettings

db_url = DatabaseSettings.get_url()

if DatabaseSettings.is_sqlite():
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False},
        pool_size=5,
        max_overflow=10,
    )
else:
    engine = create_engine(
        db_url,
        pool_size=10,
        max_overflow=20,
        pool_timeout=60,
        pool_recycle=3600,
        pool_pre_ping=True,
    )

Base = declarative_base()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI 依赖注入用数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
