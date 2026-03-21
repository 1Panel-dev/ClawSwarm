/**
 * 任务模块当前先使用前端本地结构把页面骨架搭起来，
 * 后续接真实后端接口时，尽量沿用这一层 ViewModel，
 * 避免页面组件直接绑定后端原始字段。
 */

export type TaskStatus = "in_progress" | "completed" | "terminated";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskSource = "local-demo" | "server";

export interface TaskAssigneeView {
    instanceId: number;
    instanceName: string;
    agentId: number;
    agentName: string;
    roleName?: string | null;
}

export interface TaskTimelineEntryView {
    id: string;
    type: "system" | "user" | "agent";
    label: string;
    content: string;
    at: string;
}

export interface TaskView {
    id: string;
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    source: TaskSource;
    assignee: TaskAssigneeView;
    tags: string[];
    startedAt: string;
    endedAt: string | null;
    createdAt: string;
    updatedAt: string;
    commentCount: number;
    timeline: TaskTimelineEntryView[];
}

export interface TaskFilterState {
    keyword: string;
    status: TaskStatus | "all";
    priority: TaskPriority | "all";
}

export interface TaskCreatePayload {
    title: string;
    description: string;
    priority: TaskPriority;
    tags: string[];
    assignee: TaskAssigneeView;
}
