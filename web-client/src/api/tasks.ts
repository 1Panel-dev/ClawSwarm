import { apiClient } from "@/api/client";
import type { TaskReadApi } from "@/types/api/task";

export async function fetchTasks(params?: { status?: string; keyword?: string }): Promise<TaskReadApi[]> {
    const response = await apiClient.get<TaskReadApi[]>("/api/tasks", {
        params: {
            status: params?.status ?? "all",
            keyword: params?.keyword ?? "",
        },
    });
    return response.data;
}

export async function createTask(payload: {
    title: string;
    description: string;
    priority: string;
    tags: string[];
    assignee_instance_id: number;
    assignee_agent_id: number;
}): Promise<TaskReadApi> {
    const response = await apiClient.post<TaskReadApi>("/api/tasks", payload);
    return response.data;
}

export async function completeTask(taskId: string, comment?: string): Promise<TaskReadApi> {
    const response = await apiClient.post<TaskReadApi>(`/api/tasks/${taskId}/complete`, {
        comment,
    });
    return response.data;
}

export async function terminateTask(taskId: string, comment?: string): Promise<TaskReadApi> {
    const response = await apiClient.post<TaskReadApi>(`/api/tasks/${taskId}/terminate`, {
        comment,
    });
    return response.data;
}
