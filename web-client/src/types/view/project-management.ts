export type ProjectDocumentCategory =
    | "需求"
    | "设计"
    | "接口"
    | "前端"
    | "后端"
    | "测试"
    | "其他";

export const PROJECT_DOCUMENT_CATEGORIES: ProjectDocumentCategory[] = [
    "需求",
    "设计",
    "接口",
    "前端",
    "后端",
    "测试",
    "其他",
];

export interface ProjectMemberView {
    agentKey: string;
    csId: string;
    openclaw: string;
}

export interface ProjectDocumentView {
    id: string;
    projectId: string;
    name: string;
    category: string;
    content: string;
    isCore: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

export interface ProjectView {
    id: string;
    name: string;
    description: string;
    currentProgress: string;
    members: ProjectMemberView[];
    createdAt: string;
    updatedAt: string;
}

export interface ProjectDetailView extends ProjectView {
    documents: ProjectDocumentView[];
}

export interface DocumentTemplateView {
    id: string;
    name: string;
    description: string;
    category: string;
    content: string;
    isBuiltin: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ProjectCreatePayload {
    name: string;
    description: string;
    currentProgress: string;
    members: ProjectMemberView[];
}

export interface ProjectUpdatePayload extends ProjectCreatePayload {}

export interface ProjectDocumentCreatePayload {
    name?: string;
    category?: string;
    content?: string;
    templateId?: string;
}

export interface ProjectDocumentUpdatePayload {
    name: string;
    category: string;
    content: string;
}

export interface DocumentTemplateCreatePayload {
    name: string;
    description: string;
    category: string;
    content: string;
}

export interface DocumentTemplateUpdatePayload extends DocumentTemplateCreatePayload {}
