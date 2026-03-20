from datetime import datetime

from pydantic import BaseModel, ConfigDict


class OrmModel(BaseModel):
    """
    所有响应 schema 的基类。

    这里统一开启 from_attributes，让 SQLAlchemy ORM 对象可以直接喂给 Pydantic 2。
    """
    model_config = ConfigDict(from_attributes=True)


class ApiMessage(BaseModel):
    message: str


class TimestampedModel(OrmModel):
    created_at: datetime
    updated_at: datetime


def dump_model(model: BaseModel, *, exclude_unset: bool = False) -> dict:
    """
    统一兼容 Pydantic 不同版本的导出方法。
    """
    if hasattr(model, "model_dump"):
        return model.model_dump(exclude_unset=exclude_unset)
    return model.dict(exclude_unset=exclude_unset)


def validate_orm(schema_cls: type[BaseModel], obj):
    """
    统一兼容 ORM -> schema 的校验入口。
    """
    if hasattr(schema_cls, "model_validate"):
        return schema_cls.model_validate(obj)
    return schema_cls.from_orm(obj)
