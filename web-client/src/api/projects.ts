import { apiClient } from "@/api/client";
import type {
    DocumentTemplateResponse,
    ProjectDetailResponse,
    ProjectDocumentResponse,
    ProjectResponse,
} from "@/types/api/project-management";
import type {
    DocumentTemplateCreateInput,
    DocumentTemplateUpdateInput,
    ProjectCreateInput,
    ProjectDocumentCreateInput,
    ProjectDocumentUpdateInput,
    ProjectUpdateInput,
} from "@/types/view/project-management";
import { snakeizeKeys } from "@/utils/case";

export async function fetchProjects(): Promise<ProjectResponse[]> {
    const response = await apiClient.get<ProjectResponse[]>("/api/projects");
    return response.data;
}

export async function createProject(payload: ProjectCreateInput): Promise<ProjectDetailResponse> {
    const response = await apiClient.post<ProjectDetailResponse>("/api/projects", snakeizeKeys(payload));
    return response.data;
}

export async function updateProject(projectId: string, payload: ProjectUpdateInput): Promise<ProjectResponse> {
    const response = await apiClient.put<ProjectResponse>(`/api/projects/${projectId}`, snakeizeKeys(payload));
    return response.data;
}

export async function fetchProjectDetail(projectId: string): Promise<ProjectDetailResponse> {
    const response = await apiClient.get<ProjectDetailResponse>(`/api/projects/${projectId}`);
    return response.data;
}

export async function fetchProjectDocuments(projectId: string): Promise<ProjectDocumentResponse[]> {
    const response = await apiClient.get<ProjectDocumentResponse[]>(`/api/projects/${projectId}/documents`);
    return response.data;
}

export async function fetchProjectDocument(projectId: string, documentId: string): Promise<ProjectDocumentResponse> {
    const response = await apiClient.get<ProjectDocumentResponse>(`/api/projects/${projectId}/documents/${documentId}`);
    return response.data;
}

export async function createProjectDocument(
    projectId: string,
    payload: ProjectDocumentCreateInput,
): Promise<ProjectDocumentResponse> {
    const response = await apiClient.post<ProjectDocumentResponse>(
        `/api/projects/${projectId}/documents`,
        snakeizeKeys(payload),
    );
    return response.data;
}

export async function updateProjectDocument(
    projectId: string,
    documentId: string,
    payload: ProjectDocumentUpdateInput,
): Promise<ProjectDocumentResponse> {
    const response = await apiClient.put<ProjectDocumentResponse>(
        `/api/projects/${projectId}/documents/${documentId}`,
        snakeizeKeys(payload),
    );
    return response.data;
}

export async function deleteProjectDocument(projectId: string, documentId: string): Promise<void> {
    await apiClient.delete(`/api/projects/${projectId}/documents/${documentId}`);
}

export async function fetchDocumentTemplates(): Promise<DocumentTemplateResponse[]> {
    const response = await apiClient.get<DocumentTemplateResponse[]>("/api/document-templates");
    return response.data;
}

export async function createDocumentTemplate(
    payload: DocumentTemplateCreateInput,
): Promise<DocumentTemplateResponse> {
    const response = await apiClient.post<DocumentTemplateResponse>("/api/document-templates", snakeizeKeys(payload));
    return response.data;
}

export async function fetchDocumentTemplate(templateId: string): Promise<DocumentTemplateResponse> {
    const response = await apiClient.get<DocumentTemplateResponse>(`/api/document-templates/${templateId}`);
    return response.data;
}

export async function updateDocumentTemplate(
    templateId: string,
    payload: DocumentTemplateUpdateInput,
): Promise<DocumentTemplateResponse> {
    const response = await apiClient.put<DocumentTemplateResponse>(
        `/api/document-templates/${templateId}`,
        snakeizeKeys(payload),
    );
    return response.data;
}

export async function deleteDocumentTemplate(templateId: string): Promise<void> {
    await apiClient.delete(`/api/document-templates/${templateId}`);
}
