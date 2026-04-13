<template>
  <div class="page-container">
    <section v-loading="loading" class="page-card document-read-page">
      <header class="document-read-page__header">
        <div>
          <h1 class="page-section-title">{{ document?.name || t("projects.selectDocument") }}</h1>
          <p class="document-read-page__meta">{{ document?.category ?? "-" }}</p>
        </div>
      </header>

      <ProjectMarkdownPreview v-if="document" :content="document.content" />
      <el-empty v-else-if="!loading" :description="t('projects.selectDocument')" :image-size="90" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import ProjectMarkdownPreview from "@/pages/projects/components/ProjectMarkdownPreview.vue";
import { fetchProjectDocument } from "@/api/projects";
import type { ProjectDocumentResponse } from "@/types/api/project-management";
import { useI18n } from "@/composables/useI18n";

const route = useRoute();
const { t } = useI18n();
const document = ref<ProjectDocumentResponse | null>(null);
const loading = ref(false);

async function loadDocument() {
    const projectId = String(route.params.projectId || "");
    const documentId = String(route.params.documentId || "");
    if (!projectId || !documentId) {
        return;
    }
    loading.value = true;
    try {
        document.value = await fetchProjectDocument(projectId, documentId);
    } finally {
        loading.value = false;
    }
}

onMounted(loadDocument);
watch(() => [route.params.projectId, route.params.documentId], loadDocument);
</script>

<style scoped>
.document-read-page {
  min-height: 360px;
}

.document-read-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.document-read-page__meta,
.document-read-page__meta {
  color: var(--color-text-secondary);
}
</style>
