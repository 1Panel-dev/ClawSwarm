<template>
  <button class="project-card" type="button" @click="$emit('open', project.id)">
    <div class="project-card__header">
      <h3 class="project-card__title">{{ project.name }}</h3>
      <span class="project-card__updated">{{ formatDateTime(project.updatedAt) }}</span>
    </div>
    <p v-if="project.description" class="project-card__description">{{ project.description }}</p>
    <div class="project-card__progress">
      <div class="project-card__progress-label">{{ t("projects.currentProgress") }}</div>
      <div class="project-card__progress-value">{{ project.currentProgress }}</div>
    </div>
    <div class="project-card__footer">
      <span>{{ project.members.length }}</span>
    </div>
  </button>
</template>

<script setup lang="ts">
import { useI18n } from "@/composables/useI18n";
import type { ProjectOutput } from "@/types/view/project-management";
import { formatServerDateTime } from "@/utils/datetime";

defineProps<{
    project: ProjectOutput;
}>();

defineEmits<{
    open: [projectId: string];
}>();

const { t } = useI18n();

function formatDateTime(value: string) {
    return formatServerDateTime(value, "zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}
</script>

<style scoped>
.project-card {
  display: grid;
  gap: 12px;
  width: 100%;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.project-card:hover {
  border-color: color-mix(in srgb, var(--color-accent) 35%, var(--color-border));
  transform: translateY(-1px);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
}

.project-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.project-card__title {
  margin: 0;
  font-size: 1.06rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.project-card__updated,
.project-card__footer {
  color: var(--color-text-secondary);
  font-size: 0.86rem;
}

.project-card__description {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.65;
}

.project-card__progress {
  display: grid;
  gap: 6px;
  padding: 12px;
  border-radius: 12px;
  background: #f6f8fb;
}

.project-card__progress-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.project-card__progress-value {
  color: var(--color-text-primary);
  line-height: 1.65;
}
</style>
