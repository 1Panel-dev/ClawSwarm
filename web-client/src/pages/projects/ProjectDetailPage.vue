<template>
  <div class="page-container">
    <ProjectHeaderCard
      v-if="project"
      :project="project"
      @back="router.push('/projects')"
      @edit="projectDrawerVisible = true"
    />

    <div class="project-workspace">
      <ProjectDocumentList
        class="project-workspace__sidebar"
        :documents="project?.documents ?? []"
        :selected-id="store.activeDocumentId"
        @select="handleSelectDocument"
        @create="openDocumentDrawer"
      />

      <ProjectDocumentViewer
        class="project-workspace__content"
        :project-id="project?.id ?? ''"
        :document="store.activeDocument"
        :saving="store.submittingDocument"
        @save="handleSaveDocument"
        @delete="handleDeleteDocument"
        @dirty-change="viewerDirty = $event"
      />
    </div>

    <ProjectCreateDrawer
      :visible="projectDrawerVisible"
      :project="project"
      :submitting="store.submittingProject"
      @update:visible="projectDrawerVisible = $event"
      @submit="handleUpdateProject"
    />

    <DocumentCreateDrawer
      :visible="documentDrawerVisible"
      :templates="store.templates"
      :submitting="store.submittingDocument"
      @update:visible="documentDrawerVisible = $event"
      @submit="handleCreateDocument"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";

import DocumentCreateDrawer from "@/pages/projects/components/DocumentCreateDrawer.vue";
import ProjectCreateDrawer from "@/pages/projects/components/ProjectCreateDrawer.vue";
import ProjectDocumentList from "@/pages/projects/components/ProjectDocumentList.vue";
import ProjectDocumentViewer from "@/pages/projects/components/ProjectDocumentViewer.vue";
import ProjectHeaderCard from "@/pages/projects/components/ProjectHeaderCard.vue";
import { useProjectManagementStore } from "@/stores/projectManagement";
import type { ProjectDocumentCreateInput, ProjectDocumentUpdateInput, ProjectUpdateInput } from "@/types/view/project-management";
import { useI18n } from "@/composables/useI18n";

const store = useProjectManagementStore();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const project = computed(() => store.activeProject);
const projectId = computed(() => String(route.params.projectId || ""));
const projectDrawerVisible = ref(false);
const documentDrawerVisible = ref(false);
const viewerDirty = ref(false);

async function loadProject() {
    if (!projectId.value) {
        return;
    }
    await Promise.all([
        store.loadProjectDetail(projectId.value),
        store.loadTemplates(),
    ]);
}

onMounted(loadProject);
watch(projectId, loadProject);

async function confirmDiscardIfNeeded() {
    if (!viewerDirty.value) {
        return true;
    }
    await ElMessageBox.confirm(
        t("projects.unsavedDocumentConfirm"),
        t("common.confirm"),
        {
            type: "warning",
            confirmButtonText: t("common.confirm"),
            cancelButtonText: t("common.cancel"),
        },
    );
    return true;
}

async function handleSelectDocument(documentId: string) {
    try {
        await confirmDiscardIfNeeded();
        store.selectDocument(documentId);
    } catch {
        return;
    }
}

function openDocumentDrawer() {
    documentDrawerVisible.value = true;
}

async function handleCreateDocument(payload: ProjectDocumentCreateInput) {
    if (!projectId.value) {
        return;
    }
    try {
        await store.createDocument(projectId.value, payload);
        documentDrawerVisible.value = false;
    } catch (error) {
        ElMessage.error(error instanceof Error ? error.message : String(error));
    }
}

async function handleSaveDocument(payload: ProjectDocumentUpdateInput) {
    if (!projectId.value || !store.activeDocumentId) {
        return;
    }
    try {
        await store.updateDocument(projectId.value, store.activeDocumentId, payload);
        viewerDirty.value = false;
        ElMessage.success(t("common.saved"));
    } catch (error) {
        ElMessage.error(error instanceof Error ? error.message : String(error));
    }
}

async function handleDeleteDocument(documentId: string) {
    if (!projectId.value) {
        return;
    }
    try {
        await store.deleteDocument(projectId.value, documentId);
        ElMessage.success(t("common.deleted"));
    } catch (error) {
        ElMessage.error(error instanceof Error ? error.message : String(error));
    }
}

async function handleUpdateProject(payload: ProjectUpdateInput) {
    if (!projectId.value) {
        return;
    }
    try {
        await store.updateProject(projectId.value, payload);
        projectDrawerVisible.value = false;
        ElMessage.success(t("common.saved"));
    } catch (error) {
        ElMessage.error(error instanceof Error ? error.message : String(error));
    }
}

onBeforeRouteLeave(async () => confirmDiscardIfNeeded());
</script>

<style scoped>
.project-workspace {
  display: grid;
  grid-template-columns: minmax(280px, 320px) minmax(0, 1fr);
  gap: 12px;
  min-height: 0;
}

.project-workspace__sidebar,
.project-workspace__content {
  min-height: 0;
}

@media (max-width: 1080px) {
  .project-workspace {
    grid-template-columns: 1fr;
  }
}
</style>
