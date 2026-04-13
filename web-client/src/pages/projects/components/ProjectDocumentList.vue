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
      >111
        <button class="document-list__group-header" type="button" @click="toggleGroup(group.category)">
          <span>{{ group.category }}</span>
          <span>{{ expandedGroups[group.category] ? "−" : "+" }}</span>
        </button>
        <div v-if="expandedGroups[group.category]" class="document-list__group-body">
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
import { computed, reactive, watch } from "vue";

import { useI18n } from "@/composables/useI18n";
import type { ProjectDocumentView } from "@/types/view/project-management";

const props = defineProps<{
    documents: ProjectDocumentView[];
    selectedId: string | null;
}>();

defineEmits<{
    select: [documentId: string];
    create: [];
}>();

const { t } = useI18n();
const expandedGroups = reactive<Record<string, boolean>>({});

const coreDocuments = computed(() => props.documents.filter((item) => item.isCore));
const groupedDocuments = computed(() => {
    const groups = new Map<string, ProjectDocumentView[]>();
    for (const item of props.documents.filter((doc) => !doc.isCore)) {
      if (!groups.has(item.category)) {
        groups.set(item.category, []);
      }
      groups.get(item.category)?.push(item);
    }
    return Array.from(groups.entries()).map(([category, items]) => ({ category, items }));
});

watch(
    groupedDocuments,
    (groups) => {
      for (const group of groups) {
        if (!(group.category in expandedGroups)) {
          expandedGroups[group.category] = false;
        }
      }
    },
    { immediate: true },
);

function toggleGroup(category: string) {
    expandedGroups[category] = !expandedGroups[category];
}
</script>

<style scoped>
.document-list-card {
  gap: 10px;
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
}

.document-list__group {
  display: grid;
  gap: 2px;
}

.document-list__group-header,
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

.document-list__item:hover,
.document-list__group-header:hover {
  background: color-mix(in srgb, var(--color-accent) 6%, white);
}

.document-list__item--active {
  background: color-mix(in srgb, var(--color-accent) 12%, white);
  color: var(--color-accent);
}

.document-list__group-body {
  display: grid;
  gap: 2px;
  padding-left: 12px;
}

.document-list__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.95rem;
}

</style>
