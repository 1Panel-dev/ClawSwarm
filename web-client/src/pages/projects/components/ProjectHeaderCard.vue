<template>
  <div class="page-card project-header-card">
    <div class="project-header-card__header">
      <div class="project-header-card__main">
        <div class="project-header-card__title-row">
          <el-tooltip :content="t('common.back')" placement="top">
            <el-button link :icon="Back" @click="$emit('back')" size="large" type="primary"/>
          </el-tooltip>
          <h1 class="page-section-title project-header-card__title">{{ project.name }}</h1>
        </div>
        <p v-if="project.description" class="project-header-card__description">{{ project.description }}</p>
        <p class="project-header-card__meta">
          <span>{{ project.currentProgress }}</span>
          <span>{{ formatDateTime(project.updatedAt) }}</span>
        </p>
      </div>
      <div class="project-header-card__actions">
        <el-tooltip placement="left-start" effect="light">
          <template #content>
            <pre class="project-header-card__copy-preview">{{ projectInfoMarkdown }}</pre>
          </template>
          <el-button @click="copyProjectInfo">{{ t("projects.copyProjectInfo") }}</el-button>
        </el-tooltip>
        <el-button @click="$emit('edit')">{{ t("common.edit") }}</el-button>
        <el-button type="danger" @click="$emit('delete', project)">{{ t("common.delete") }}</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Back } from "@element-plus/icons-vue";
import { computed } from "vue";
import { useI18n } from "@/composables/useI18n";
import type { ProjectDetailOutput } from "@/types/view/project-management";
import { formatServerDateTime } from "@/utils/datetime";

const props = defineProps<{
    project: ProjectDetailOutput;
}>();

defineEmits<{
    back: [];
    edit: [];
    delete: [project: ProjectDetailOutput];
}>();

const { t } = useI18n();
const projectInfoMarkdown = computed(formatProjectInfoMarkdown);

function formatDateTime(value: string) {
    return formatServerDateTime(value, "zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

async function copyProjectInfo() {
    await navigator.clipboard.writeText(projectInfoMarkdown.value);
    ElMessage.success(t("conversation.copied"));
}

function formatProjectInfoMarkdown() {
    return [
        "# 📦 项目基本信息",
        "",
        `> **项目名称**：${props.project.name}`,
        `> **项目描述**：${props.project.description}`,
        "> **仓库地址**：",
        "",
        "# 👥 项目成员",
        "",
        formatMemberInfoMarkdown(),
        "",
        "# 📚 项目文档",
        "",
        formatDocumentInfoMarkdown(),
    ].join("\n");
}

function formatMemberInfoMarkdown() {
    const members = props.project.members.length
      ? props.project.members
      : [{ agentKey: "", csId: "", openclaw: "", role: "" }];
    return members.map((member, index) => [
        `## 🧑 成员${index + 1}`,
        "",
        `> **Agent Key**：${member.agentKey}`,
        `> **CS ID**：${member.csId}`,
        `> **角色名称**：${member.role}`,
        "> **角色描述**：",
    ].join("\n")).join("\n\n");
}

function formatDocumentInfoMarkdown() {
    const documents = props.project.documents.filter((document) => !document.isCore);
    const documentItems = documents.length
      ? documents
      : [{ id: "", name: "" }];
    return documentItems.map((document, index) => [
        `## 📄 文档 ${index + 1}`,
        "",
        `> **文档名称**：${document.name}`,
        `> **文档链接**：${document.id ? buildDocumentReadLink(document.id) : ""}`,
    ].join("\n")).join("\n\n");
}

function buildDocumentReadLink(documentId: string) {
    return `clawswarm://projects/${props.project.id}/documents/${documentId}`;
}
</script>

<style scoped>
.project-header-card {
  gap: 0;
  height: 102px;
  max-height: 102px;
}

.project-header-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.project-header-card__main {
  min-width: 0;
}

.project-header-card__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.project-header-card__title {
  margin: 0;
}

.project-header-card__description {
  margin: 0 0 8px;
  color: var(--color-text-secondary);
  line-height: 1.65;
}

.project-header-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.project-header-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.project-header-card__copy-preview {
  max-width: 520px;
  max-height: 360px;
  margin: 0;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--color-text-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 960px) {
  .project-header-card__header {
    flex-direction: column;
    align-items: stretch;
  }

  .project-header-card__actions {
    justify-content: flex-end;
  }
}
</style>
