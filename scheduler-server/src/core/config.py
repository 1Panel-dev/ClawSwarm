"""
这个文件负责读取服务启动配置。
当前第一阶段只保留最小配置集合，避免还没跑通就过度设计。
"""
from pydantic import BaseModel
import os


def _env_flag(name: str, default: bool) -> bool:
    """
    把环境变量解析成布尔值。
    这样 .env.dev 里既可以写 1/0，也可以写 true/false。
    """
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


class Settings(BaseModel):
    app_env: str = os.getenv("APP_ENV", "development")
    app_host: str = os.getenv("APP_HOST", "127.0.0.1")
    app_port: int = int(os.getenv("APP_PORT", "8080"))
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./data/app.db")
    default_channel_account_id: str = os.getenv("DEFAULT_CHANNEL_ACCOUNT_ID", "default")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    # 远程联调阶段，OpenClaw 的 channel 走的是自签证书 HTTPS。
    # 这里保留一个显式开关，避免把 verify=False 写死在业务代码里。
    channel_allow_insecure_tls: bool = _env_flag("CHANNEL_ALLOW_INSECURE_TLS", False)


settings = Settings()
