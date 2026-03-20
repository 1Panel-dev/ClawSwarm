"""
这是 scheduler-server 的 FastAPI 入口。
它负责组装配置、数据库和全部第一阶段 API 路由。
"""
from fastapi import FastAPI

from src.api.routes import address_book, agents, callbacks, conversations, groups, health, instances
from src.core.db import Base, engine
import src.models  # noqa: F401


def create_app() -> FastAPI:
    app = FastAPI(title="Claw Team Scheduler Server", version="0.1.0")

    # 第一阶段先直接用 create_all 建表，后续再切换到 Alembic 管理迁移。
    Base.metadata.create_all(bind=engine)

    app.include_router(health.router)
    app.include_router(instances.router)
    app.include_router(agents.router)
    app.include_router(address_book.router)
    app.include_router(groups.router)
    app.include_router(conversations.router)
    app.include_router(callbacks.router)

    return app


app = create_app()
