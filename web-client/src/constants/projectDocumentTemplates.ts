import projectIntroContent from "@/project-document-templates/project-intro.md?raw";

export interface ProjectDocumentTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    content: string;
}

export const PROJECT_DOCUMENT_TEMPLATES: ProjectDocumentTemplate[] = [
    {
        id: "project-intro",
        name: "项目简介.md",
        description: "项目背景、目标与关键信息说明。",
        category: "其他",
        content: projectIntroContent,
    },
];
