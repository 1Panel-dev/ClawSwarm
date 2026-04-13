export interface ProjectMemberApi {
    agent_key: string;
    cs_id: string;
    openclaw: string;
}

export interface ProjectDocumentReadApi {
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

export interface ProjectReadApi {
    id: string;
    name: string;
    description: string;
    current_progress: string;
    members: ProjectMemberApi[];
    member_count: number;
    created_at: string;
    updated_at: string;
}

export interface ProjectDetailReadApi extends ProjectReadApi {
    documents: ProjectDocumentReadApi[];
}

export interface DocumentTemplateReadApi {
    id: string;
    name: string;
    description: string;
    category: string;
    content: string;
    is_builtin: boolean;
    created_at: string;
    updated_at: string;
}

export interface AgentReadableProjectDocumentReadApi {
    projectId: string;
    documentId: string;
    name: string;
    category: string;
    content: string;
    updatedAt: string;
}

export interface ProjectCreatePayloadApi {
    name: string;
    description: string;
    current_progress: string;
    members: ProjectMemberApi[];
}

export interface ProjectUpdatePayloadApi extends ProjectCreatePayloadApi {}

export interface ProjectDocumentCreatePayloadApi {
    name?: string | null;
    category?: string | null;
    content?: string | null;
    template_id?: string | null;
}

export interface ProjectDocumentUpdatePayloadApi {
    name: string;
    category: string;
    content: string;
}

export interface DocumentTemplateCreatePayloadApi {
    name: string;
    description: string;
    category: string;
    content: string;
}

export interface DocumentTemplateUpdatePayloadApi extends DocumentTemplateCreatePayloadApi {}
