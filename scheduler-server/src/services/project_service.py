"""项目主信息相关的 service。"""

from __future__ import annotations

import json

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.project import Project
from src.models.project_document import ProjectDocument
from src.schemas.common import dump_model
from src.schemas.project_management import ProjectCreate, ProjectDetailRead, ProjectMember, ProjectRead, ProjectUpdate
from src.services.document_template_service import DEFAULT_CATEGORY, PROJECT_INTRO_TEMPLATE_NAME, get_project_intro_template_content


def normalize_project_members(members: list[ProjectMember]) -> list[ProjectMember]:
    """按 cs_id 去重并保持原顺序。"""
    seen: set[str] = set()
    normalized: list[ProjectMember] = []
    for item in members:
        cs_id = item.cs_id.strip().upper()
        if cs_id in seen:
            raise HTTPException(status_code=400, detail=f"duplicate project member cs_id: {cs_id}")
        seen.add(cs_id)
        normalized.append(
            ProjectMember(
                agent_key=item.agent_key.strip(),
                cs_id=cs_id,
                openclaw=item.openclaw.strip(),
                role=item.role.strip(),
            )
        )
    return normalized


def serialize_project_members(members: list[ProjectMember]) -> str:
    return json.dumps([dump_model(item) for item in normalize_project_members(members)], ensure_ascii=False)


def deserialize_project_members(raw: str | None) -> list[ProjectMember]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    members: list[ProjectMember] = []
    for item in parsed:
        if not isinstance(item, dict):
            continue
        members.append(ProjectMember(**item))
    return normalize_project_members(members)


def build_project_read(item: Project) -> ProjectRead:
    members = deserialize_project_members(item.members_json)
    return ProjectRead(
        id=item.id,
        name=item.name,
        description=item.description,
        current_progress=item.current_progress,
        members=members,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def get_project(db: Session, project_id: str) -> Project:
    """读取单个项目。"""
    item = db.get(Project, project_id)
    if not item:
        raise HTTPException(status_code=404, detail="project not found")
    return item


def list_projects(db: Session) -> list[ProjectRead]:
    """按更新时间倒序返回项目卡片列表。"""
    items = list(db.scalars(select(Project).order_by(Project.updated_at.desc(), Project.id.desc())))
    return [build_project_read(item) for item in items]


def create_project(db: Session, payload: ProjectCreate) -> ProjectDetailRead:
    """创建项目，并自动补上默认核心文档。"""
    data = dump_model(payload)
    data.pop("members", None)
    project = Project(**data, members_json=serialize_project_members(payload.members))
    db.add(project)
    db.flush()

    db.add(
        ProjectDocument(
            project_id=project.id,
            name=PROJECT_INTRO_TEMPLATE_NAME,
            category=DEFAULT_CATEGORY,
            content=get_project_intro_template_content(db),
            is_core=True,
            sort_order=0,
        )
    )
    db.commit()
    db.refresh(project)
    return get_project_detail(db, project.id)


def update_project(db: Session, project_id: str, payload: ProjectUpdate) -> ProjectRead:
    """更新项目基础信息。"""
    item = get_project(db, project_id)
    payload_data = dump_model(payload)
    payload_data.pop("members", None)
    for field, value in payload_data.items():
        setattr(item, field, value)
    item.members_json = serialize_project_members(payload.members)
    db.commit()
    db.refresh(item)
    return build_project_read(item)


def get_project_detail(db: Session, project_id: str) -> ProjectDetailRead:
    """读取项目详情与当前文档列表。"""
    item = get_project(db, project_id)
    documents = list(
        db.scalars(
            select(ProjectDocument)
            .where(ProjectDocument.project_id == project_id)
            .order_by(ProjectDocument.is_core.desc(), ProjectDocument.sort_order.asc(), ProjectDocument.updated_at.desc())
        )
    )
    data = build_project_read(item)
    return ProjectDetailRead(**dump_model(data), documents=documents)
