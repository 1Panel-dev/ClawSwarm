<template>
  <section class="page-card project-header-card">
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
      <el-button @click="$emit('edit')">{{ t("common.edit") }}</el-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Back } from "@element-plus/icons-vue";
import { useI18n } from "@/composables/useI18n";
import type { ProjectDetailView } from "@/types/view/project-management";
import { formatServerDateTime } from "@/utils/datetime";

defineProps<{
    project: ProjectDetailView;
}>();

defineEmits<{
    back: [];
    edit: [];
}>();

const { t } = useI18n();

function formatDateTime(value: string) {
    return formatServerDateTime(value, "zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}
</script>

<style scoped>
.project-header-card {
  gap: 0;
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

@media (max-width: 960px) {
  .project-header-card__header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
