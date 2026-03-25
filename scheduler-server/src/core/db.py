"""
这个文件负责数据库连接和 Session 管理。
第一阶段默认使用 SQLite。
"""
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine, event, inspect, text
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

is_sqlite = settings.database_url.startswith("sqlite")
connect_args = (
    {
        "check_same_thread": False,
        # callback 写入和消息写入会并发打到同一个 SQLite 文件，给它明确的等待窗口，
        # 避免默认超短等待把正常争用直接放大成 "database is locked"。
        "timeout": 30,
    }
    if is_sqlite
    else {}
)
engine = create_engine(settings.database_url, echo=False, future=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


if is_sqlite:
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_connection, _connection_record) -> None:
        cursor = dbapi_connection.cursor()
        try:
            # WAL 更适合我们现在这种“读多写多 + callback 并发补写”的场景。
            cursor.execute("PRAGMA journal_mode=WAL;")
            cursor.execute("PRAGMA synchronous=NORMAL;")
            cursor.execute("PRAGMA foreign_keys=ON;")
            cursor.execute("PRAGMA busy_timeout=30000;")
        finally:
            cursor.close()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_runtime_schema() -> None:
    """
    第一阶段还没接 Alembic，这里只做非常小的启动期补丁，
    避免已有 SQLite 开发库因为缺少新列而直接报错。
    """
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    if "tasks" not in table_names:
        return

    columns = {column["name"] for column in inspector.get_columns("tasks")}
    statements: list[str] = []

    # 旧开发库最开始没有 parent_task_id，这里只补我们当前确实需要的列和索引，
    # 不把启动阶段偷偷演变成一套复杂迁移系统。
    if "parent_task_id" not in columns:
        statements.append("ALTER TABLE tasks ADD COLUMN parent_task_id VARCHAR(64)")
        statements.append("CREATE INDEX IF NOT EXISTS ix_tasks_parent_task_id ON tasks (parent_task_id)")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
