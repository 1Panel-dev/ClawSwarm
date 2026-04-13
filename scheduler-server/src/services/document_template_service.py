"""项目管理文档模板相关的 service。"""

from __future__ import annotations

from typing import Final

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.document_template import DocumentTemplate
from src.schemas.common import dump_model, validate_orm
from src.schemas.project_management import (
    DocumentTemplateCreate,
    DocumentTemplateRead,
    DocumentTemplateUpdate,
)

PROJECT_INTRO_TEMPLATE_NAME: Final[str] = "项目简介.md"
DEFAULT_CATEGORY: Final[str] = "其他"

PROJECT_INTRO_TEMPLATE_CONTENT: Final[str] = """# 项目基本信息

> Agent 每次启动或接手项目时，先读取此文件了解项目概况。

**项目名称**：

**项目描述**：

**仓库地址**：

## 更新说明

- 项目创建或关键信息变更时更新
- 保持简洁，只保留必要信息

# 项目成员

> 每个成员一条记录，新增成员时在末尾追加。Agent 通过此文件确认自己和他人的身份与职责。

---

## 成员

**Agent Key**：

**CS ID**：

**角色名称**：

**角色描述**：

---

## 成员

**Agent Key**：

**CS ID**：

**角色名称**：

**角色描述**：

---

## 更新说明

- 成员加入或退出时更新
- 角色职责变更时及时修改角色描述

# 项目文档

> 一句话概述项目内主要文档的用途和范围。

## 概述



## 内容



## 元信息

**创建时间**：

**最后更新**：

**作者**：
"""

BUILTIN_TEMPLATE_DEFINITIONS: Final[list[dict[str, str]]] = [
    {
        "name": PROJECT_INTRO_TEMPLATE_NAME,
        "description": "项目默认核心文档骨架",
        "category": DEFAULT_CATEGORY,
        "content": PROJECT_INTRO_TEMPLATE_CONTENT,
    },
]


def ensure_builtin_document_templates(db: Session) -> None:
    """确保数据库里存在系统内置的文档模板。"""
    builtin_names = {item["name"] for item in BUILTIN_TEMPLATE_DEFINITIONS}
    existing = {
        item.name: item
        for item in db.scalars(select(DocumentTemplate).where(DocumentTemplate.is_builtin.is_(True))).all()
    }
    touched = False
    for name, item in existing.items():
        if name not in builtin_names:
            db.delete(item)
            touched = True
    for item in BUILTIN_TEMPLATE_DEFINITIONS:
        current = existing.get(item["name"])
        if current:
            if (
                current.description != item["description"]
                or current.category != item["category"]
                or current.content != item["content"]
                or not current.is_builtin
            ):
                current.description = item["description"]
                current.category = item["category"]
                current.content = item["content"]
                current.is_builtin = True
                touched = True
            continue
        db.add(
            DocumentTemplate(
                name=item["name"],
                description=item["description"],
                category=item["category"],
                content=item["content"],
                is_builtin=True,
            )
        )
        touched = True
    if touched:
        db.commit()


def list_document_templates(db: Session) -> list[DocumentTemplateRead]:
    """按“内置优先、更新时间倒序”返回模板列表。"""
    ensure_builtin_document_templates(db)
    items = list(
        db.scalars(
            select(DocumentTemplate).order_by(
                DocumentTemplate.is_builtin.desc(),
                DocumentTemplate.updated_at.desc(),
                DocumentTemplate.id.desc(),
            )
        )
    )
    return [validate_orm(DocumentTemplateRead, item) for item in items]


def get_document_template(db: Session, template_id: str) -> DocumentTemplate:
    """读取单条模板。"""
    item = db.get(DocumentTemplate, template_id)
    if not item:
        raise HTTPException(status_code=404, detail="document template not found")
    return item


def get_project_intro_template_content(db: Session) -> str:
    """返回项目简介默认骨架。"""
    ensure_builtin_document_templates(db)
    item = db.scalar(
        select(DocumentTemplate).where(DocumentTemplate.name == PROJECT_INTRO_TEMPLATE_NAME).order_by(
            DocumentTemplate.is_builtin.desc(),
            DocumentTemplate.updated_at.desc(),
        )
    )
    if item and item.content.strip():
        return item.content
    return PROJECT_INTRO_TEMPLATE_CONTENT


def create_document_template(db: Session, payload: DocumentTemplateCreate) -> DocumentTemplateRead:
    """创建一条用户模板。"""
    item = DocumentTemplate(**dump_model(payload), is_builtin=False)
    db.add(item)
    db.commit()
    db.refresh(item)
    return validate_orm(DocumentTemplateRead, item)


def update_document_template(db: Session, template_id: str, payload: DocumentTemplateUpdate) -> DocumentTemplateRead:
    """更新一条模板。"""
    item = get_document_template(db, template_id)
    for field, value in dump_model(payload).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return validate_orm(DocumentTemplateRead, item)


def delete_document_template(db: Session, template_id: str) -> None:
    """删除一条模板。"""
    item = get_document_template(db, template_id)
    if item.is_builtin:
        raise HTTPException(status_code=400, detail="builtin template cannot be deleted")
    db.delete(item)
    db.commit()
