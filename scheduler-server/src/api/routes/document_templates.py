"""项目管理中的文档模板 API。"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.api.deps import db_session
from src.schemas.common import ApiMessage, validate_orm
from src.schemas.project_management import (
    DocumentTemplateCreate,
    DocumentTemplateRead,
    DocumentTemplateUpdate,
)
from src.services.document_template_service import (
    create_document_template,
    delete_document_template,
    get_document_template,
    list_document_templates,
    update_document_template,
)

router = APIRouter(prefix="/api/document-templates", tags=["document-templates"])


@router.get("", response_model=list[DocumentTemplateRead])
def list_templates(db: Session = Depends(db_session)) -> list[DocumentTemplateRead]:
    return list_document_templates(db)


@router.post("", response_model=DocumentTemplateRead)
def create_template(payload: DocumentTemplateCreate, db: Session = Depends(db_session)) -> DocumentTemplateRead:
    return create_document_template(db, payload)


@router.get("/{template_id}", response_model=DocumentTemplateRead)
def get_template(template_id: str, db: Session = Depends(db_session)) -> DocumentTemplateRead:
    return validate_orm(DocumentTemplateRead, get_document_template(db, template_id))


@router.put("/{template_id}", response_model=DocumentTemplateRead)
def update_template(
    template_id: str,
    payload: DocumentTemplateUpdate,
    db: Session = Depends(db_session),
) -> DocumentTemplateRead:
    return update_document_template(db, template_id, payload)


@router.delete("/{template_id}", response_model=ApiMessage)
def delete_template(template_id: str, db: Session = Depends(db_session)) -> ApiMessage:
    delete_document_template(db, template_id)
    return ApiMessage(message="ok")
