"""项目文档读写相关的 service。"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.project import Project
from src.models.project_document import ProjectDocument
from src.schemas.common import validate_orm
from src.schemas.project_management import (
    AgentReadableProjectDocumentRead,
    ProjectDocumentCreate,
    ProjectDocumentRead,
    ProjectDocumentUpdate,
)
from src.services.project_service import get_project

DEFAULT_CATEGORY = "其他"


def _touch_project(project: Project) -> None:
    project.updated_at = datetime.now(timezone.utc)


def list_project_documents(db: Session, project_id: str) -> list[ProjectDocumentRead]:
    """返回项目下的文档列表。"""
    get_project(db, project_id)
    items = list(
        db.scalars(
            select(ProjectDocument)
            .where(ProjectDocument.project_id == project_id)
            .order_by(ProjectDocument.is_core.desc(), ProjectDocument.sort_order.asc(), ProjectDocument.updated_at.desc())
        )
    )
    return [validate_orm(ProjectDocumentRead, item) for item in items]


def get_project_document(db: Session, project_id: str, document_id: str) -> ProjectDocument:
    """读取项目下的单篇文档。"""
    get_project(db, project_id)
    item = db.scalar(
        select(ProjectDocument).where(
            ProjectDocument.project_id == project_id,
            ProjectDocument.id == document_id,
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="project document not found")
    return item


def get_project_document_read(db: Session, project_id: str, document_id: str) -> ProjectDocumentRead:
    """返回单篇文档的标准读取结构。"""
    return validate_orm(ProjectDocumentRead, get_project_document(db, project_id, document_id))


def get_agent_readable_project_document(db: Session, project_id: str, document_id: str) -> AgentReadableProjectDocumentRead:
    """返回 Agent 只读接口结构。"""
    item = get_project_document(db, project_id, document_id)
    return AgentReadableProjectDocumentRead(
        projectId=project_id,
        documentId=item.id,
        name=item.name,
        category=item.category,
        content=item.content,
        updatedAt=item.updated_at,
    )


def create_project_document(db: Session, project_id: str, payload: ProjectDocumentCreate) -> ProjectDocumentRead:
    """创建普通项目文档。"""
    project = get_project(db, project_id)
    item = ProjectDocument(
        project_id=project_id,
        name=(payload.name or "").strip(),
        category=(payload.category or DEFAULT_CATEGORY).strip() or DEFAULT_CATEGORY,
        content=payload.content or "",
        is_core=False,
        sort_order=len(list_project_documents(db, project_id)) + 10,
    )
    if not item.name:
        raise HTTPException(status_code=400, detail="document name is required")

    db.add(item)
    _touch_project(project)
    db.commit()
    db.refresh(item)
    return validate_orm(ProjectDocumentRead, item)


def update_project_document(
    db: Session,
    project_id: str,
    document_id: str,
    payload: ProjectDocumentUpdate,
) -> ProjectDocumentRead:
    """更新一篇项目文档。"""
    project = get_project(db, project_id)
    item = get_project_document(db, project_id, document_id)
    if item.is_core and payload.name.strip() != item.name:
        raise HTTPException(status_code=400, detail="core document name cannot be changed")

    item.name = payload.name.strip()
    item.category = payload.category.strip() or DEFAULT_CATEGORY
    item.content = payload.content
    _touch_project(project)
    db.commit()
    db.refresh(item)
    return validate_orm(ProjectDocumentRead, item)


def delete_project_document(db: Session, project_id: str, document_id: str) -> None:
    """删除一篇普通文档。"""
    project = get_project(db, project_id)
    item = get_project_document(db, project_id, document_id)
    if item.is_core:
        raise HTTPException(status_code=400, detail="core document cannot be deleted")
    db.delete(item)
    _touch_project(project)
    db.commit()
