"""项目管理相关的 HTTP 路由。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.api.deps import db_session
from src.models.openclaw_instance import OpenClawInstance
from src.schemas.common import ApiMessage
from src.schemas.project_management import (
    AgentReadableProjectDocumentRead,
    ProjectCreate,
    ProjectDetailRead,
    ProjectDocumentCreate,
    ProjectDocumentRead,
    ProjectDocumentUpdate,
    ProjectRead,
    ProjectUpdate,
)
from src.services.project_document_service import (
    create_project_document,
    delete_project_document,
    get_agent_readable_project_document,
    get_project_document_read,
    list_project_documents,
    update_project_document,
)
from src.services.project_service import create_project, get_project_detail, list_projects, update_project

router = APIRouter(prefix="/api/projects", tags=["projects"])
agent_router = APIRouter(prefix="/api/v1/clawswarm/projects", tags=["projects"])


@router.get("", response_model=list[ProjectRead])
def list_projects_route(db: Session = Depends(db_session)) -> list[ProjectRead]:
    return list_projects(db)


@router.post("", response_model=ProjectDetailRead)
def create_project_route(payload: ProjectCreate, db: Session = Depends(db_session)) -> ProjectDetailRead:
    return create_project(db, payload)


@router.get("/{project_id}", response_model=ProjectDetailRead)
def get_project_detail_route(project_id: str, db: Session = Depends(db_session)) -> ProjectDetailRead:
    return get_project_detail(db, project_id)


@router.put("/{project_id}", response_model=ProjectRead)
def update_project_route(project_id: str, payload: ProjectUpdate, db: Session = Depends(db_session)) -> ProjectRead:
    return update_project(db, project_id, payload)


@router.get("/{project_id}/documents", response_model=list[ProjectDocumentRead])
def list_project_documents_route(project_id: str, db: Session = Depends(db_session)) -> list[ProjectDocumentRead]:
    return list_project_documents(db, project_id)


@router.get("/{project_id}/documents/{document_id}", response_model=ProjectDocumentRead)
def get_project_document_route(
    project_id: str,
    document_id: str,
    db: Session = Depends(db_session),
) -> ProjectDocumentRead:
    return get_project_document_read(db, project_id, document_id)


@router.post("/{project_id}/documents", response_model=ProjectDocumentRead)
def create_project_document_route(
    project_id: str,
    payload: ProjectDocumentCreate,
    db: Session = Depends(db_session),
) -> ProjectDocumentRead:
    return create_project_document(db, project_id, payload)


@router.put("/{project_id}/documents/{document_id}", response_model=ProjectDocumentRead)
def update_project_document_route(
    project_id: str,
    document_id: str,
    payload: ProjectDocumentUpdate,
    db: Session = Depends(db_session),
) -> ProjectDocumentRead:
    return update_project_document(db, project_id, document_id, payload)


@router.delete("/{project_id}/documents/{document_id}", response_model=ApiMessage)
def delete_project_document_route(project_id: str, document_id: str, db: Session = Depends(db_session)) -> ApiMessage:
    delete_project_document(db, project_id, document_id)
    return ApiMessage(message="ok")


@agent_router.get("/{project_id}/documents/{document_id}", response_model=AgentReadableProjectDocumentRead)
def get_agent_project_document_route(
    project_id: str,
    document_id: str,
    request: Request,
    db: Session = Depends(db_session),
) -> AgentReadableProjectDocumentRead:
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")

    token = auth_header.removeprefix("Bearer ").strip()
    instance = db.scalar(select(OpenClawInstance).where(OpenClawInstance.callback_token == token))
    if not instance:
        raise HTTPException(status_code=401, detail="unknown callback token")

    return get_agent_readable_project_document(db, project_id, document_id)
