export type TaskStatusApi = "in_progress" | "completed" | "terminated";
export type TaskPriorityApi = "low" | "medium" | "high" | "urgent";

export interface TaskAssigneeApi {
    instance_id: number;
    instance_name: string;
    agent_id: number;
    agent_name: string;
    role_name?: string | null;
}

export interface TaskTimelineEntryApi {
    id: string;
    type: "system" | "user" | "agent";
    label: string;
    content: string;
    at: string;
}

export interface TaskReadApi {
    id: string;
    title: string;
    description: string;
    priority: TaskPriorityApi;
    status: TaskStatusApi;
    source: "server" | "local-demo";
    assignee: TaskAssigneeApi;
    tags: string[];
    started_at: string;
    ended_at: string | null;
    created_at: string;
    updated_at: string;
    comment_count: number;
    timeline: TaskTimelineEntryApi[];
}
