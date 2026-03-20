"""
这个文件负责数据库连接和 Session 管理。
第一阶段默认使用 SQLite。
"""
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from src.core.config import settings


Base = declarative_base()


def _prepare_sqlite_path(database_url: str) -> None:
    if database_url.startswith("sqlite:///"):
        raw = database_url.removeprefix("sqlite:///")
        path = Path(raw)
        if not path.is_absolute():
            path = Path.cwd() / path
        path.parent.mkdir(parents=True, exist_ok=True)


_prepare_sqlite_path(settings.database_url)

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, echo=False, future=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
