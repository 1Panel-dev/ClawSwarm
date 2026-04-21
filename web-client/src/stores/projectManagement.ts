import { defineStore } from "pinia";

import {
    createProject as createProjectRequest,
    createProjectDocument as createProjectDocumentRequest,
    deleteProject as deleteProjectRequest,
    deleteProjectDocument as deleteProjectDocumentRequest,
    fetchProjectDetail,
    fetchProjectDocument,
    fetchProjects,
    updateProject as updateProjectRequest,
    updateProjectDocument as updateProjectDocumentRequest,
} from "@/api/projects";
import type {
    ProjectCreateInput,
    ProjectDetailOutput,
    ProjectDocumentCreateInput,
    ProjectDocumentUpdateInput,
    ProjectDocumentOutput,
    ProjectUpdateInput,
    ProjectOutput,
} from "@/types/view/project-management";

function toProjectSummaryFromDetail(item: ProjectDetailOutput): ProjectOutput {
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

function replaceProject(items: ProjectOutput[], nextItem: ProjectOutput): ProjectOutput[] {
    const found = items.some((item) => item.id === nextItem.id);
    const nextItems = found ? items.map((item) => (item.id === nextItem.id ? nextItem : item)) : [nextItem, ...items];
    return nextItems.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

function replaceDocument(items: ProjectDocumentOutput[], nextItem: ProjectDocumentOutput): ProjectDocumentOutput[] {
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

export const useProjectManagementStore = defineStore("projectManagement", {
    state: () => ({
        projects: [] as ProjectOutput[],
        activeProject: null as ProjectDetailOutput | null,
        activeDocumentId: null as string | null,
        loadingProjects: false,
        loadingProjectDetail: false,
        submittingProject: false,
        submittingDocument: false,
        projectsError: "",
    }),
    getters: {
        activeDocument(state): ProjectDocumentOutput | null {
            return state.activeProject?.documents.find((item) => item.id === state.activeDocumentId) ?? null;
        },
    },
    actions: {
        async loadProjects() {
            this.loadingProjects = true;
            this.projectsError = "";
            try {
                this.projects = await fetchProjects();
            } catch (error) {
                this.projectsError = error instanceof Error ? error.message : String(error);
            } finally {
                this.loadingProjects = false;
            }
        },
        async loadProjectDetail(projectId: string) {
            this.loadingProjectDetail = true;
            try {
                this.activeProject = await fetchProjectDetail(projectId);
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
            const item = await fetchProjectDocument(this.activeProject.id, this.activeDocumentId);
            this.activeProject.documents = replaceDocument(this.activeProject.documents, item);
        },
        async createProject(payload: ProjectCreateInput) {
            this.submittingProject = true;
            try {
                const detail = await createProjectRequest(payload);
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
                const item = await updateProjectRequest(projectId, payload);
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
        async deleteProject(projectId: string) {
            this.submittingProject = true;
            try {
                await deleteProjectRequest(projectId);
                this.projects = this.projects.filter((item) => item.id !== projectId);
                if (this.activeProject?.id === projectId) {
                    this.activeProject = null;
                    this.activeDocumentId = null;
                }
            } finally {
                this.submittingProject = false;
            }
        },
        async createDocument(projectId: string, payload: ProjectDocumentCreateInput) {
            this.submittingDocument = true;
            try {
                const item = await createProjectDocumentRequest(projectId, payload);
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
                const item = await updateProjectDocumentRequest(projectId, documentId, payload);
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
        selectDocument(documentId: string | null) {
            this.activeDocumentId = documentId;
        },
    },
});
