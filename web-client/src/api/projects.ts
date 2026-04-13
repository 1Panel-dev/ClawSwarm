import { apiClient } from "@/api/client";
import type {
    DocumentTemplateCreatePayloadApi,
    DocumentTemplateReadApi,
    DocumentTemplateUpdatePayloadApi,
    ProjectCreatePayloadApi,
    ProjectDetailReadApi,
    ProjectDocumentCreatePayloadApi,
    ProjectDocumentReadApi,
    ProjectDocumentUpdatePayloadApi,
    ProjectReadApi,
    ProjectUpdatePayloadApi,
} from "@/types/api/project-management";

export async function fetchProjects(): Promise<ProjectReadApi[]> {
    const response = await apiClient.get<ProjectReadApi[]>("/api/projects");
    return response.data;
}

export async function createProject(payload: ProjectCreatePayloadApi): Promise<ProjectDetailReadApi> {
    const response = await apiClient.post<ProjectDetailReadApi>("/api/projects", payload);
    return response.data;
}

export async function updateProject(projectId: string, payload: ProjectUpdatePayloadApi): Promise<ProjectReadApi> {
    const response = await apiClient.put<ProjectReadApi>(`/api/projects/${projectId}`, payload);
    return response.data;
}

export async function fetchProjectDetail(projectId: string): Promise<ProjectDetailReadApi> {
    const response = await apiClient.get<ProjectDetailReadApi>(`/api/projects/${projectId}`);
    return response.data;
}

export async function fetchProjectDocuments(projectId: string): Promise<ProjectDocumentReadApi[]> {
    const response = await apiClient.get<ProjectDocumentReadApi[]>(`/api/projects/${projectId}/documents`);
    return response.data;
}

export async function fetchProjectDocument(projectId: string, documentId: string): Promise<ProjectDocumentReadApi> {
    const response = await apiClient.get<ProjectDocumentReadApi>(`/api/projects/${projectId}/documents/${documentId}`);
    return response.data;
}

export async function createProjectDocument(
    projectId: string,
    payload: ProjectDocumentCreatePayloadApi,
): Promise<ProjectDocumentReadApi> {
    const response = await apiClient.post<ProjectDocumentReadApi>(`/api/projects/${projectId}/documents`, payload);
    return response.data;
}

export async function updateProjectDocument(
    projectId: string,
    documentId: string,
    payload: ProjectDocumentUpdatePayloadApi,
): Promise<ProjectDocumentReadApi> {
    const response = await apiClient.put<ProjectDocumentReadApi>(
        `/api/projects/${projectId}/documents/${documentId}`,
        payload,
    );
    return response.data;
}

export async function deleteProjectDocument(projectId: string, documentId: string): Promise<void> {
    await apiClient.delete(`/api/projects/${projectId}/documents/${documentId}`);
}

export async function fetchDocumentTemplates(): Promise<DocumentTemplateReadApi[]> {
    const response = await apiClient.get<DocumentTemplateReadApi[]>("/api/document-templates");
    return response.data;
}

export async function createDocumentTemplate(
    payload: DocumentTemplateCreatePayloadApi,
): Promise<DocumentTemplateReadApi> {
    const response = await apiClient.post<DocumentTemplateReadApi>("/api/document-templates", payload);
    return response.data;
}

export async function fetchDocumentTemplate(templateId: string): Promise<DocumentTemplateReadApi> {
    const response = await apiClient.get<DocumentTemplateReadApi>(`/api/document-templates/${templateId}`);
    return response.data;
}

export async function updateDocumentTemplate(
    templateId: string,
    payload: DocumentTemplateUpdatePayloadApi,
): Promise<DocumentTemplateReadApi> {
    const response = await apiClient.put<DocumentTemplateReadApi>(`/api/document-templates/${templateId}`, payload);
    return response.data;
}

export async function deleteDocumentTemplate(templateId: string): Promise<void> {
    await apiClient.delete(`/api/document-templates/${templateId}`);
}
