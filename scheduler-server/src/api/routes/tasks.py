"""
这个文件负责第一阶段任务 API。

当前先提供最小闭环：
1. 查询任务列表。
2. 创建任务。
3. 完成任务。
4. 终止任务。

这样 web-client 的任务页就能先接真实后端，
而不是一直停留在前端本地示例数据。
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.api.deps import db_session
from src.models.agent_profile import AgentProfile
from src.models.openclaw_instance import OpenClawInstance
from src.models.task import Task
from src.models.task_event import TaskEvent
from src.schemas.task import (
    TaskActionPayload,
    TaskAssigneeRead,
    TaskCommentCreate,
    TaskCommentResult,
    TaskCreate,
    TaskDeleteResult,
    TaskRead,
    TaskTimelineEntryRead,
)

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskRead])
def list_tasks(
    status: str = Query(default="all"),
    keyword: str = Query(default=""),
    db: Session = Depends(db_session),
) -> list[TaskRead]:
    # 顶层列表只返回父任务/独立任务，子任务挂在 children 里，
    # 这样前端既能按层级渲染，也不会在顶层重复显示一份子任务。
    query = select(Task).where(Task.parent_task_id.is_(None))
    if status != "all":
        query = query.where(Task.status == status)

    tasks = list(db.scalars(query.order_by(Task.updated_at.desc(), Task.id.desc())))
    if keyword.strip():
        lowered = keyword.strip().lower()
        tasks = [
            task
            for task in tasks
            if lowered in task.title.lower()
            or lowered in task.description.lower()
            or lowered in " ".join(_load_tags(task.tags_json)).lower()
        ]

    return [_build_task_read(db, task) for task in tasks]


@router.post("", response_model=TaskRead)
def create_task(payload: TaskCreate, db: Session = Depends(db_session)) -> TaskRead:
    instance = db.get(OpenClawInstance, payload.assignee_instance_id)
    agent = db.get(AgentProfile, payload.assignee_agent_id)
    if not instance or not agent:
        raise HTTPException(status_code=404, detail="instance or agent not found")

    if payload.parent_task_id and payload.children:
        raise HTTPException(status_code=400, detail="child task creation cannot include nested children")

    parent_task: Task | None = None
    if payload.parent_task_id:
        parent_task = db.get(Task, payload.parent_task_id)
        if not parent_task:
            raise HTTPException(status_code=404, detail="parent task not found")
        if parent_task.parent_task_id is not None:
            raise HTTPException(status_code=400, detail="third-level tasks are not supported")

    now = datetime.now(timezone.utc)
    task = Task(
        id=f"task_{uuid.uuid4().hex[:24]}",
        parent_task_id=payload.parent_task_id,
        title=payload.title.strip(),
        description=payload.description.strip(),
        priority=payload.priority,
        status="in_progress",
        source="server",
        assignee_instance_id=instance.id,
        assignee_agent_id=agent.id,
        tags_json=json.dumps(_normalize_tags(payload.tags), ensure_ascii=False),
        comment_count=1,
        started_at=now,
        ended_at=None,
    )
    db.add(task)
    db.add(
        TaskEvent(
            id=f"taskevt_{uuid.uuid4().hex[:24]}",
            task_id=task.id,
            type="system",
            label="任务已创建",
            content=f"系统已将任务分配给 Agent[{agent.display_name}]。",
            at=now,
        )
    )
    if payload.children:
        # 第一阶段只允许“父 + 子”两级，所以子任务沿用父任务的执行人，
        # 不在这里再开放跨 Agent 指派或更深层拆分。
        for child in payload.children:
            child_task = Task(
                id=f"task_{uuid.uuid4().hex[:24]}",
                parent_task_id=task.id,
                title=child.title.strip(),
                description=child.description.strip(),
                priority=child.priority,
                status="in_progress",
                source="server",
                assignee_instance_id=instance.id,
                assignee_agent_id=agent.id,
                tags_json=json.dumps(_normalize_tags(child.tags), ensure_ascii=False),
                comment_count=1,
                started_at=now,
                ended_at=None,
            )
            db.add(child_task)
            db.add(
                TaskEvent(
                    id=f"taskevt_{uuid.uuid4().hex[:24]}",
                    task_id=child_task.id,
                    type="system",
                    label="任务已创建",
                    content=f"系统已将任务分配给 Agent[{agent.display_name}]。",
                    at=now,
                )
            )
    db.commit()
    db.refresh(task)
    return _build_task_read(db, task)


@router.post("/{task_id}/comments", response_model=TaskCommentResult)
def append_task_comment(task_id: str, payload: TaskCommentCreate, db: Session = Depends(db_session)) -> TaskCommentResult:
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="task not found")

    now = datetime.now(timezone.utc)
    event = TaskEvent(
        id=f"taskevt_{uuid.uuid4().hex[:24]}",
        task_id=task.id,
        type=_normalize_author_type(payload.author_type),
        label=_label_for_author_type(payload.author_type),
        content=payload.comment.strip(),
        at=now,
    )
    task.comment_count += 1
    task.updated_at = now
    db.add(event)
    db.commit()
    db.refresh(task)

    return TaskCommentResult(
        task_id=task.id,
        comment_count=task.comment_count,
        latest_entry=TaskTimelineEntryRead(
            id=event.id,
            type=event.type,
            label=event.label,
            content=event.content,
            at=event.at,
        ),
    )


@router.post("/{task_id}/complete", response_model=TaskRead)
def complete_task(task_id: str, payload: TaskActionPayload, db: Session = Depends(db_session)) -> TaskRead:
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="task not found")
    if task.status != "in_progress":
        raise HTTPException(status_code=400, detail="task is not in progress")

    now = datetime.now(timezone.utc)
    task.status = "completed"
    task.ended_at = now
    task.updated_at = now
    task.comment_count += 1
    db.add(
        TaskEvent(
            id=f"taskevt_{uuid.uuid4().hex[:24]}",
            task_id=task.id,
            type="system",
            label="任务已完成",
            content=payload.comment.strip() if payload.comment and payload.comment.strip() else "任务已完成，等待后续结果确认。",
            at=now,
        )
    )
    db.commit()
    db.refresh(task)
    return _build_task_read(db, task)


@router.post("/{task_id}/terminate", response_model=TaskRead)
def terminate_task(task_id: str, payload: TaskActionPayload, db: Session = Depends(db_session)) -> TaskRead:
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="task not found")
    if task.status != "in_progress":
        raise HTTPException(status_code=400, detail="task is not in progress")

    now = datetime.now(timezone.utc)
    task.status = "terminated"
    task.ended_at = now
    task.updated_at = now
    task.comment_count += 1
    db.add(
        TaskEvent(
            id=f"taskevt_{uuid.uuid4().hex[:24]}",
            task_id=task.id,
            type="system",
            label="任务已终止",
            content=payload.comment.strip() if payload.comment and payload.comment.strip() else "任务已终止，等待新的需求安排。",
            at=now,
        )
    )
    db.commit()
    db.refresh(task)
    return _build_task_read(db, task)


@router.delete("/{task_id}", response_model=TaskDeleteResult)
def delete_task(task_id: str, db: Session = Depends(db_session)) -> TaskDeleteResult:
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="task not found")

    # 删除父任务时同步删除它的直接子任务。
    # 这里故意只做一层，和当前“两级任务”约束保持一致。
    child_tasks = list(db.scalars(select(Task).where(Task.parent_task_id == task.id).order_by(Task.id.asc())))
    delete_ids = [child.id for child in child_tasks] + [task.id]
    deleted_child_count = len(child_tasks)

    db.query(TaskEvent).filter(TaskEvent.task_id.in_(delete_ids)).delete(synchronize_session=False)
    db.query(Task).filter(Task.id.in_(delete_ids)).delete(synchronize_session=False)
    db.commit()

    return TaskDeleteResult(task_id=task_id, deleted=True, deleted_child_count=deleted_child_count)


def _build_task_read(db: Session, task: Task) -> TaskRead:
    instance = db.get(OpenClawInstance, task.assignee_instance_id)
    agent = db.get(AgentProfile, task.assignee_agent_id)
    timeline = list(
        db.scalars(select(TaskEvent).where(TaskEvent.task_id == task.id).order_by(TaskEvent.at.asc(), TaskEvent.id.asc()))
    )
    # 读模型时把直接子任务一并组回去，前端就不需要自己再做一次 parent/child join。
    child_tasks = list(db.scalars(select(Task).where(Task.parent_task_id == task.id).order_by(Task.created_at.asc(), Task.id.asc())))
    return TaskRead(
        id=task.id,
        parent_task_id=task.parent_task_id,
        title=task.title,
        description=task.description,
        priority=task.priority,
        status=task.status,
        source=task.source,
        assignee=TaskAssigneeRead(
            instance_id=task.assignee_instance_id,
            instance_name=instance.name if instance else f"实例 {task.assignee_instance_id}",
            agent_id=task.assignee_agent_id,
            agent_name=agent.display_name if agent else f"Agent {task.assignee_agent_id}",
            role_name=agent.role_name if agent else None,
        ),
        tags=_load_tags(task.tags_json),
        started_at=task.started_at,
        ended_at=task.ended_at,
        comment_count=task.comment_count,
        created_at=task.created_at,
        updated_at=task.updated_at,
        timeline=[
            TaskTimelineEntryRead(
                id=entry.id,
                type=entry.type,
                label=entry.label,
                content=entry.content,
                at=entry.at,
            )
            for entry in timeline
        ],
        children=[_build_task_read(db, child) for child in child_tasks],
    )


def _normalize_tags(tags: list[str]) -> list[str]:
    return [tag.strip() for tag in tags if tag and tag.strip()]


def _load_tags(raw: str) -> list[str]:
    try:
        value = json.loads(raw)
        if isinstance(value, list):
            return [str(item) for item in value]
    except Exception:
        pass
    return []


def _normalize_author_type(value: str) -> str:
    if value in {"system", "user", "agent"}:
        return value
    return "agent"


def _label_for_author_type(value: str) -> str:
    normalized = _normalize_author_type(value)
    if normalized == "user":
        return "用户评论"
    if normalized == "system":
        return "系统记录"
    return "Agent 更新"
