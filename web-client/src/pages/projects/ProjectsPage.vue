<template>
  <div class="page-container">
    <section v-loading="store.loadingProjects" class="page-card page-container__body projects-pane__panel">
      <header class="projects-toolbar">
        <div class="projects-toolbar__actions">
          <el-button type="primary" @click="createProjectDrawerVisible = true">
            {{ t("projects.createProject") }}
          </el-button>
          <el-button @click="store.loadProjects()">
            {{ t("common.refresh") }}
          </el-button>
        </div>
      </header>

      <div v-if="store.projectsError" class="projects-banner projects-banner--warning">
        {{ store.projectsError }}
      </div>

      <div v-if="store.projects.length" class="projects-grid">
        <ProjectCard
          v-for="project in store.projects"
          :key="project.id"
          :project="project"
          @open="openProject"
          @delete="confirmDeleteProject"
        />
      </div>

      <el-empty v-else-if="!store.loadingProjects" :description="t('projects.emptyProjects')" :image-size="96"/>
    </section>

    <ProjectCreateDrawer
      :visible="createProjectDrawerVisible"
      :submitting="store.submittingProject"
      @update:visible="createProjectDrawerVisible = $event"
      @submit="handleCreateProject"
    />
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref} from "vue";
import {useRouter} from "vue-router";

import ProjectCard from "@/pages/projects/components/ProjectCard.vue";
import ProjectCreateDrawer from "@/pages/projects/components/ProjectCreateDrawer.vue";
import {useI18n} from "@/composables/useI18n";
import {useProjectManagementStore} from "@/stores/projectManagement";
import type { ProjectCreateInput, ProjectOutput } from "@/types/view/project-management";

const {t} = useI18n();
const router = useRouter();
const store = useProjectManagementStore();

const createProjectDrawerVisible = ref(false);

onMounted(async () => {
  await store.loadProjects();
});

function openProject(projectId: string) {
  router.push(`/projects/${projectId}`);
}

async function handleCreateProject(payload: ProjectCreateInput) {
  try {
    const detail = await store.createProject(payload);
    createProjectDrawerVisible.value = false;
    await router.push(`/projects/${detail.id}`);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

async function confirmDeleteProject(project: ProjectOutput) {
  try {
    await ElMessageBox.confirm(
      t("projects.deleteProjectConfirm", {name: project.name}),
      t("common.confirm"),
      {
        type: "warning",
        confirmButtonText: t("common.confirm"),
        cancelButtonText: t("common.cancel"),
      },
    );
    await store.deleteProject(project.id);
    ElMessage.success(t("common.deleted"));
  } catch (error) {
    if (error === "cancel" || error === "close") {
      return;
    }
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}
</script>

<style scoped>
.projects-pane__panel {
  min-height: 0;
  height: calc(100vh - 165px);
  max-height: calc(100vh - 165px);
}

.projects-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.projects-toolbar__actions {
  display: flex;
  gap: 8px;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.projects-banner {
  padding: 12px 14px;
  border-radius: 12px;
}

.projects-banner--warning {
  background: #fff7e6;
  color: #8a5a00;
}

.projects-empty {
  padding: 18px 0;
  color: var(--color-text-secondary);
}
</style>
