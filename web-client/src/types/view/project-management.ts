import type {
    DocumentTemplateResponse,
    ProjectDetailResponse,
    ProjectDocumentResponse,
    ProjectMemberResponse,
    ProjectResponse,
} from "@/types/api/project-management";
import type { Camelized } from "@/utils/case";

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

export type ProjectMemberOutput = Camelized<ProjectMemberResponse>;

export type ProjectDocumentOutput = Camelized<ProjectDocumentResponse>;

export type ProjectOutput = Camelized<ProjectResponse>;

export type ProjectDetailOutput = Camelized<ProjectDetailResponse>;

export type DocumentTemplateOutput = Camelized<DocumentTemplateResponse>;

export interface ProjectCreateInput {
    name: string;
    description: string;
    currentProgress: string;
    members: ProjectMemberOutput[];
}

export interface ProjectUpdateInput extends ProjectCreateInput {}

export interface ProjectDocumentCreateInput {
    name?: string;
    category?: string;
    content?: string;
    templateId?: string;
}

export interface ProjectDocumentUpdateInput {
    name: string;
    category: string;
    content: string;
}

export interface DocumentTemplateCreateInput {
    name: string;
    description: string;
    category: string;
    content: string;
}

export interface DocumentTemplateUpdateInput extends DocumentTemplateCreateInput {}
