"""
这个文件负责最基础的服务健康检查。

第一阶段里它主要用于：
1. 本地开发时确认 FastAPI 已启动。
2. 部署后给反向代理、容器探针或人工联调提供一个最小可用检查点。
"""
from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health() -> dict[str, bool]:
    # 这里故意保持最小返回结构，避免把数据库或外部依赖检查耦合进最基础探针。
    return {"ok": True}
