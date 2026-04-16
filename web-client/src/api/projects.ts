import { apiClient } from "@/api/client";
import type {
    DocumentTemplateResponse,
    ProjectDetailResponse,
    ProjectDocumentResponse,
    ProjectResponse,
} from "@/types/api/project-management";
import type {
    DocumentTemplateCreateInput,
    DocumentTemplateOutput,
    DocumentTemplateUpdateInput,
    ProjectCreateInput,
    ProjectDetailOutput,
    ProjectDocumentCreateInput,
    ProjectDocumentOutput,
    ProjectDocumentUpdateInput,
    ProjectOutput,
    ProjectUpdateInput,
} from "@/types/view/project-management";
import { camelizeKeys, snakeizeKeys } from "@/utils/case";

export async function fetchProjects(): Promise<ProjectOutput[]> {
    const response = await apiClient.get<ProjectResponse[]>("/api/projects");
    return response.data.map(camelizeKeys);
}

export async function createProject(payload: ProjectCreateInput): Promise<ProjectDetailOutput> {
    const response = await apiClient.post<ProjectDetailResponse>("/api/projects", snakeizeKeys(payload));
    return camelizeKeys(response.data);
}

export async function updateProject(projectId: string, payload: ProjectUpdateInput): Promise<ProjectOutput> {
    const response = await apiClient.put<ProjectResponse>(`/api/projects/${projectId}`, snakeizeKeys(payload));
    return camelizeKeys(response.data);
}

export async function fetchProjectDetail(projectId: string): Promise<ProjectDetailOutput> {
    const response = await apiClient.get<ProjectDetailResponse>(`/api/projects/${projectId}`);
    return camelizeKeys(response.data);
}

export async function fetchProjectDocument(projectId: string, documentId: string): Promise<ProjectDocumentOutput> {
    const response = await apiClient.get<ProjectDocumentResponse>(`/api/projects/${projectId}/documents/${documentId}`);
    return camelizeKeys(response.data);
}

export async function createProjectDocument(
    projectId: string,
    payload: ProjectDocumentCreateInput,
): Promise<ProjectDocumentOutput> {
    const response = await apiClient.post<ProjectDocumentResponse>(
        `/api/projects/${projectId}/documents`,
        snakeizeKeys(payload),
    );
    return camelizeKeys(response.data);
}

export async function updateProjectDocument(
    projectId: string,
    documentId: string,
    payload: ProjectDocumentUpdateInput,
): Promise<ProjectDocumentOutput> {
    const response = await apiClient.put<ProjectDocumentResponse>(
        `/api/projects/${projectId}/documents/${documentId}`,
        snakeizeKeys(payload),
    );
    return camelizeKeys(response.data);
}

export async function deleteProjectDocument(projectId: string, documentId: string): Promise<void> {
    await apiClient.delete(`/api/projects/${projectId}/documents/${documentId}`);
}

export async function fetchDocumentTemplates(): Promise<DocumentTemplateOutput[]> {
    const response = await apiClient.get<DocumentTemplateResponse[]>("/api/document-templates");
    return response.data.map(camelizeKeys);
}

export async function createDocumentTemplate(
    payload: DocumentTemplateCreateInput,
): Promise<DocumentTemplateOutput> {
    const response = await apiClient.post<DocumentTemplateResponse>("/api/document-templates", snakeizeKeys(payload));
    return camelizeKeys(response.data);
}

export async function fetchDocumentTemplate(templateId: string): Promise<DocumentTemplateOutput> {
    const response = await apiClient.get<DocumentTemplateResponse>(`/api/document-templates/${templateId}`);
    return camelizeKeys(response.data);
}

export async function updateDocumentTemplate(
    templateId: string,
    payload: DocumentTemplateUpdateInput,
): Promise<DocumentTemplateOutput> {
    const response = await apiClient.put<DocumentTemplateResponse>(
        `/api/document-templates/${templateId}`,
        snakeizeKeys(payload),
    );
    return camelizeKeys(response.data);
}

export async function deleteDocumentTemplate(templateId: string): Promise<void> {
    await apiClient.delete(`/api/document-templates/${templateId}`);
}
