import { defineStore } from "pinia";

import {
    createDocumentTemplate as createDocumentTemplateRequest,
    createProject as createProjectRequest,
    createProjectDocument as createProjectDocumentRequest,
    deleteDocumentTemplate as deleteDocumentTemplateRequest,
    deleteProjectDocument as deleteProjectDocumentRequest,
    fetchDocumentTemplate,
    fetchDocumentTemplates,
    fetchProjectDetail,
    fetchProjectDocument,
    fetchProjects,
    updateDocumentTemplate as updateDocumentTemplateRequest,
    updateProject as updateProjectRequest,
    updateProjectDocument as updateProjectDocumentRequest,
} from "@/api/projects";
import {
    toProjectDetailView,
    toProjectDocumentView,
    toProjectView,
    toTemplateView,
} from "@/stores/projectManagementMappers";
import type {
    DocumentTemplateCreateInput,
    DocumentTemplateUpdateInput,
    DocumentTemplateView,
    ProjectCreateInput,
    ProjectDetailView,
    ProjectDocumentCreateInput,
    ProjectDocumentUpdateInput,
    ProjectDocumentView,
    ProjectUpdateInput,
    ProjectView,
} from "@/types/view/project-management";

function toProjectSummaryFromDetail(item: ProjectDetailView): ProjectView {
    return {
        id: item.id,
        name: item.name,
        description: item.description,
        currentProgress: item.currentProgress,
        members: item.members,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    };
}

function replaceProject(items: ProjectView[], nextItem: ProjectView): ProjectView[] {
    const found = items.some((item) => item.id === nextItem.id);
    const nextItems = found ? items.map((item) => (item.id === nextItem.id ? nextItem : item)) : [nextItem, ...items];
    return nextItems.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

function replaceDocument(items: ProjectDocumentView[], nextItem: ProjectDocumentView): ProjectDocumentView[] {
    const found = items.some((item) => item.id === nextItem.id);
    const nextItems = found ? items.map((item) => (item.id === nextItem.id ? nextItem : item)) : [...items, nextItem];
    return nextItems.sort((a, b) => {
        if (a.isCore !== b.isCore) {
            return a.isCore ? -1 : 1;
        }
        if (a.sortOrder !== b.sortOrder) {
            return a.sortOrder - b.sortOrder;
        }
        return a.updatedAt < b.updatedAt ? 1 : -1;
    });
}

function replaceTemplate(items: DocumentTemplateView[], nextItem: DocumentTemplateView): DocumentTemplateView[] {
    const found = items.some((item) => item.id === nextItem.id);
    const nextItems = found ? items.map((item) => (item.id === nextItem.id ? nextItem : item)) : [nextItem, ...items];
    return nextItems.sort((a, b) => {
        if (a.isBuiltin !== b.isBuiltin) {
            return a.isBuiltin ? -1 : 1;
        }
        return a.updatedAt < b.updatedAt ? 1 : -1;
    });
}

export const useProjectManagementStore = defineStore("projectManagement", {
    state: () => ({
        projects: [] as ProjectView[],
        templates: [] as DocumentTemplateView[],
        activeProject: null as ProjectDetailView | null,
        activeDocumentId: null as string | null,
        loadingProjects: false,
        loadingProjectDetail: false,
        loadingTemplates: false,
        submittingProject: false,
        submittingDocument: false,
        submittingTemplate: false,
        projectsError: "",
        templatesError: "",
    }),
    getters: {
        activeDocument(state): ProjectDocumentView | null {
            return state.activeProject?.documents.find((item) => item.id === state.activeDocumentId) ?? null;
        },
    },
    actions: {
        async loadProjects() {
            this.loadingProjects = true;
            this.projectsError = "";
            try {
                this.projects = (await fetchProjects()).map(toProjectView);
            } catch (error) {
                this.projectsError = error instanceof Error ? error.message : String(error);
            } finally {
                this.loadingProjects = false;
            }
        },
        async loadProjectDetail(projectId: string) {
            this.loadingProjectDetail = true;
            try {
                this.activeProject = toProjectDetailView(await fetchProjectDetail(projectId));
                this.activeDocumentId = this.activeProject.documents[0]?.id ?? null;
                this.projects = replaceProject(this.projects, toProjectSummaryFromDetail(this.activeProject));
            } finally {
                this.loadingProjectDetail = false;
            }
        },
        async refreshActiveDocument() {
            if (!this.activeProject || !this.activeDocumentId) {
                return;
            }
            const item = toProjectDocumentView(await fetchProjectDocument(this.activeProject.id, this.activeDocumentId));
            this.activeProject.documents = replaceDocument(this.activeProject.documents, item);
        },
        async createProject(payload: ProjectCreateInput) {
            this.submittingProject = true;
            try {
                const detail = toProjectDetailView(await createProjectRequest(payload));
                this.activeProject = detail;
                this.activeDocumentId = detail.documents[0]?.id ?? null;
                this.projects = replaceProject(this.projects, toProjectSummaryFromDetail(detail));
                return detail;
            } finally {
                this.submittingProject = false;
            }
        },
        async updateProject(projectId: string, payload: ProjectUpdateInput) {
            this.submittingProject = true;
            try {
                const item = toProjectView(await updateProjectRequest(projectId, payload));
                this.projects = replaceProject(this.projects, item);
                if (this.activeProject?.id === item.id) {
                    this.activeProject = {
                        ...this.activeProject,
                        ...item,
                    };
                }
                return item;
            } finally {
                this.submittingProject = false;
            }
        },
        async createDocument(projectId: string, payload: ProjectDocumentCreateInput) {
            this.submittingDocument = true;
            try {
                const item = toProjectDocumentView(await createProjectDocumentRequest(projectId, payload));
                if (this.activeProject?.id === projectId) {
                    this.activeProject.documents = replaceDocument(this.activeProject.documents, item);
                }
                this.activeDocumentId = item.id;
                return item;
            } finally {
                this.submittingDocument = false;
            }
        },
        async updateDocument(projectId: string, documentId: string, payload: ProjectDocumentUpdateInput) {
            this.submittingDocument = true;
            try {
                const item = toProjectDocumentView(await updateProjectDocumentRequest(projectId, documentId, payload));
                if (this.activeProject?.id === projectId) {
                    this.activeProject.documents = replaceDocument(this.activeProject.documents, item);
                }
                return item;
            } finally {
                this.submittingDocument = false;
            }
        },
        async deleteDocument(projectId: string, documentId: string) {
            this.submittingDocument = true;
            try {
                await deleteProjectDocumentRequest(projectId, documentId);
                if (this.activeProject?.id === projectId) {
                    this.activeProject.documents = this.activeProject.documents.filter((item) => item.id !== documentId);
                    if (this.activeDocumentId === documentId) {
                        this.activeDocumentId = this.activeProject.documents[0]?.id ?? null;
                    }
                }
            } finally {
                this.submittingDocument = false;
            }
        },
        async loadTemplates() {
            this.loadingTemplates = true;
            this.templatesError = "";
            try {
                this.templates = (await fetchDocumentTemplates()).map(toTemplateView);
            } catch (error) {
                this.templatesError = error instanceof Error ? error.message : String(error);
            } finally {
                this.loadingTemplates = false;
            }
        },
        async loadTemplate(templateId: string) {
            return toTemplateView(await fetchDocumentTemplate(templateId));
        },
        async createTemplate(payload: DocumentTemplateCreateInput) {
            this.submittingTemplate = true;
            try {
                const item = toTemplateView(await createDocumentTemplateRequest(payload));
                this.templates = replaceTemplate(this.templates, item);
                return item;
            } finally {
                this.submittingTemplate = false;
            }
        },
        async updateTemplate(templateId: string, payload: DocumentTemplateUpdateInput) {
            this.submittingTemplate = true;
            try {
                const item = toTemplateView(await updateDocumentTemplateRequest(templateId, payload));
                this.templates = replaceTemplate(this.templates, item);
                return item;
            } finally {
                this.submittingTemplate = false;
            }
        },
        async deleteTemplate(templateId: string) {
            this.submittingTemplate = true;
            try {
                await deleteDocumentTemplateRequest(templateId);
                this.templates = this.templates.filter((item) => item.id !== templateId);
            } finally {
                this.submittingTemplate = false;
            }
        },
        selectDocument(documentId: string | null) {
            this.activeDocumentId = documentId;
        },
    },
});
