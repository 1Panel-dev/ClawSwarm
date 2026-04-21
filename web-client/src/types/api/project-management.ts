export interface ProjectMemberResponse {
    agent_key: string;
    cs_id: string;
    openclaw: string;
    role: string;
}

export interface ProjectDocumentResponse {
    id: string;
    project_id: string;
    name: string;
    category: string;
    content: string;
    is_core: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface ProjectResponse {
    id: string;
    name: string;
    description: string;
    current_progress: string;
    members: ProjectMemberResponse[];
    created_at: string;
    updated_at: string;
}

export interface ProjectDetailResponse extends ProjectResponse {
    documents: ProjectDocumentResponse[];
}

export interface AgentReadableProjectDocumentResponse {
    projectId: string;
    documentId: string;
    name: string;
    category: string;
    content: string;
    updatedAt: string;
}
