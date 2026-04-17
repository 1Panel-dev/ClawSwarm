<template>
  <section class="page-card document-list-card">
    <div class="document-list-card__header">
      <h2 class="page-section-title">{{ t("projects.documents") }}</h2>
      <el-button type="primary" @click="$emit('create')">{{ t("projects.addDocument") }}</el-button>
    </div>

    <div class="document-list">
      <button
        v-for="item in coreDocuments"
        :key="item.id"
        class="document-list__item"
        :class="{ 'document-list__item--active': item.id === selectedId }"
        type="button"
        @click="$emit('select', item.id)"
      >
        <span class="document-list__name">{{ item.name }}</span>
      </button>

      <div
        v-for="group in groupedDocuments"
        :key="group.category"
        class="document-list__group"
      >
        <button class="document-list__group-header" type="button" @click="toggleGroup(group.category)">
          <span class="document-list__group-line"></span>
          <span class="document-list__group-name">{{ group.category }}</span>
          <span class="document-list__group-toggle">{{ isGroupExpanded(group.category) ? "▾" : "▸" }}</span>
          <span class="document-list__group-line"></span>
        </button>
        <div v-if="isGroupExpanded(group.category)" class="document-list__group-body">
          <button
            v-for="item in group.items"
            :key="item.id"
            class="document-list__item"
            :class="{ 'document-list__item--active': item.id === selectedId }"
            type="button"
            @click="$emit('select', item.id)"
          >
            <span class="document-list__name">{{ item.name }}</span>
          </button>
        </div>
      </div>

      <el-empty
        v-if="!documents.length"
        :description="t('projects.noDocuments')"
        :image-size="84"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive } from "vue";

import { useI18n } from "@/composables/useI18n";
import type { ProjectDocumentOutput } from "@/types/view/project-management";

const props = defineProps<{
    documents: ProjectDocumentOutput[];
    selectedId: string | null;
}>();

defineEmits<{
    select: [documentId: string];
    create: [];
}>();

const { t } = useI18n();
const STORAGE_KEY = "clawswarm.projectDocumentGroups.expanded";
const expandedGroups = reactive<Record<string, boolean>>(loadExpandedGroups());

const coreDocuments = computed(() => props.documents.filter((item) => item.isCore));
const groupedDocuments = computed(() => {
    const groups = new Map<string, ProjectDocumentOutput[]>();
    for (const item of props.documents.filter((doc) => !doc.isCore)) {
      if (!groups.has(item.category)) {
        groups.set(item.category, []);
      }
      groups.get(item.category)?.push(item);
    }
    return Array.from(groups.entries()).map(([category, items]) => ({ category, items }));
});

function toggleGroup(category: string) {
    expandedGroups[category] = !isGroupExpanded(category);
    saveExpandedGroups();
}

function isGroupExpanded(category: string) {
    return expandedGroups[category] ?? true;
}

function loadExpandedGroups() {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      if (!value) {
        return {};
      }
      return JSON.parse(value) as Record<string, boolean>;
    } catch {
      return {};
    }
}

function saveExpandedGroups() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expandedGroups));
    } catch {
      // 浏览器隐私模式或存储满时，保留本次页面内的展开状态即可。
    }
}
</script>

<style scoped>
.document-list-card {
  grid-template-rows: auto minmax(0, 1fr);
  gap: 10px;
  height: 100%;
  min-height: 0;
}

.document-list-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.document-list {
  display: grid;
  gap: 4px;
  align-content: start;
  min-height: 0;
  overflow: auto;
}

.document-list__group {
  display: grid;
  gap: 2px;
}

.document-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
}

.document-list__group-header {
  display: grid;
  grid-template-columns: minmax(12px, 1fr) auto auto minmax(12px, 1fr);
  align-items: center;
  gap: 6px;
  width: 100%;
  min-height: 22px;
  padding: 2px 4px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.document-list__item:hover {
  background: color-mix(in srgb, var(--color-accent) 6%, white);
}

.document-list__group-header:hover .document-list__group-name,
.document-list__group-header:hover .document-list__group-toggle {
  color: var(--color-accent);
}

.document-list__group-line {
  height: 1px;
  background: var(--color-border);
}

.document-list__group-name {
  font-size: 0.78rem;
  line-height: 1;
  white-space: nowrap;
}

.document-list__group-toggle {
  font-size: 0.72rem;
  line-height: 1;
}

.document-list__item--active {
  background: color-mix(in srgb, var(--color-accent) 12%, white);
  color: var(--color-accent);
}

.document-list__group-body {
  display: grid;
  gap: 2px;
}

.document-list__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.95rem;
}

</style>
