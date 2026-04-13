<template>
  <div class="page-container">
    <section class="page-card page-container__body projects-tabs-card">
      <el-tabs v-model="activeTab" class="projects-tabs" @tab-change="handleTabChange">
        <el-tab-pane :label="t('projects.title')" name="projects" v-loading="store.loadingProjects">
          <div class="projects-pane">
            <section class="page-card projects-pane__panel">
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
                />
              </div>

              <el-empty v-else-if="!store.loadingProjects" :description="t('projects.emptyProjects')" :image-size="96"/>
            </section>
          </div>
        </el-tab-pane>

        <el-tab-pane :label="t('projects.templateLibrary')" name="templates" v-loading="store.loadingTemplates">
          <div class="template-pane">
            <div class="template-pane__body">
              <section class="page-card template-pane__sidebar">
                <header class="template-pane__toolbar">
                  <el-button type="primary" @click="createTemplateDrawerVisible = true">
                    {{ t("projects.createTemplate") }}
                  </el-button>
                  <el-button @click="store.loadTemplates()">
                    {{ t("common.refresh") }}
                  </el-button>
                </header>

                <div v-if="store.templatesError" class="projects-banner projects-banner--warning">
                  {{ store.templatesError }}
                </div>

                <div class="template-pane__list">
                  <button
                    v-for="template in store.templates"
                    :key="template.id"
                    class="template-pane__item"
                    :class="{ 'template-pane__item--active': template.id === selectedTemplateId }"
                    type="button"
                    @click="selectedTemplateId = template.id"
                  >
                    <span class="template-pane__item-name">{{ template.name }}</span>
                  </button>

                  <el-empty
                    v-if="!store.loadingTemplates && !store.templates.length"
                    :description="t('projects.selectTemplate')"
                    :image-size="84"
                  />
                </div>
              </section>

              <TemplateEditorPane
                :template="selectedTemplate"
                :submitting="store.submittingTemplate"
                @save="handleSaveTemplate"
                @delete="handleDeleteTemplate"
              />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </section>

    <ProjectCreateDrawer
      :visible="createProjectDrawerVisible"
      :submitting="store.submittingProject"
      @update:visible="createProjectDrawerVisible = $event"
      @submit="handleCreateProject"
    />

    <TemplateCreateDrawer
      :visible="createTemplateDrawerVisible"
      :submitting="store.submittingTemplate"
      @update:visible="createTemplateDrawerVisible = $event"
      @submit="handleCreateTemplate"
    />
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, ref, watch} from "vue";
import {useRoute, useRouter} from "vue-router";

import ProjectCard from "@/pages/projects/components/ProjectCard.vue";
import ProjectCreateDrawer from "@/pages/projects/components/ProjectCreateDrawer.vue";
import TemplateCreateDrawer from "@/pages/projects/components/TemplateCreateDrawer.vue";
import TemplateEditorPane from "@/pages/projects/components/TemplateEditorPane.vue";
import {useI18n} from "@/composables/useI18n";
import {useProjectManagementStore} from "@/stores/projectManagement";
import type {
  DocumentTemplateCreatePayload,
  DocumentTemplateUpdatePayload,
  ProjectCreatePayload,
} from "@/types/view/project-management";

const {t} = useI18n();
const route = useRoute();
const router = useRouter();
const store = useProjectManagementStore();

const activeTab = ref<"projects" | "templates">("projects");
const createProjectDrawerVisible = ref(false);
const createTemplateDrawerVisible = ref(false);
const selectedTemplateId = ref<string | null>(null);

const selectedTemplate = computed(
  () => store.templates.find((item) => item.id === selectedTemplateId.value) ?? null,
);

watch(
  () => route.query.tab,
  (tab) => {
    activeTab.value = tab === "templates" ? "templates" : "projects";
    if (activeTab.value === "templates") {
      void ensureTemplatesLoaded();
    }
  },
  {immediate: true},
);

onMounted(async () => {
  await store.loadProjects();
  if (activeTab.value === "templates") {
    await ensureTemplatesLoaded();
  }
});

async function ensureTemplatesLoaded() {
  await store.loadTemplates();
  selectedTemplateId.value = store.templates[0]?.id ?? null;
}

function handleTabChange(value: string | number) {
  if (value === "templates") {
    void ensureTemplatesLoaded();
    void router.replace({path: "/projects", query: {tab: "templates"}});
    return;
  }
  void router.replace({path: "/projects"});
}

function openProject(projectId: string) {
  router.push(`/projects/${projectId}`);
}

async function handleCreateProject(payload: ProjectCreatePayload) {
  try {
    const detail = await store.createProject(payload);
    createProjectDrawerVisible.value = false;
    await router.push(`/projects/${detail.id}`);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

async function handleCreateTemplate(payload: DocumentTemplateCreatePayload) {
  try {
    const item = await store.createTemplate(payload);
    selectedTemplateId.value = item.id;
    createTemplateDrawerVisible.value = false;
    activeTab.value = "templates";
    await router.replace({path: "/projects", query: {tab: "templates"}});
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

async function handleSaveTemplate(payload: DocumentTemplateUpdatePayload) {
  if (!selectedTemplateId.value) {
    return;
  }
  try {
    await store.updateTemplate(selectedTemplateId.value, payload);
    ElMessage.success(t("common.saved"));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

async function handleDeleteTemplate(templateId: string) {
  try {
    await store.deleteTemplate(templateId);
    selectedTemplateId.value = store.templates[0]?.id ?? null;
    ElMessage.success(t("common.deleted"));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}
</script>

<style scoped>
.projects-tabs-card {
  min-height: 0;
  border: none;
}

:deep(.projects-tabs > .el-tabs__content) {
  min-height: 0;
}

.projects-pane,
.template-pane {
  display: grid;
  gap: 12px;
}

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

.template-pane__body {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  gap: 12px;
  min-height: 0;
}

.template-pane__sidebar {
  display: grid;
  align-content: start;
  gap: 12px;
  min-height: 0;
  height: calc(100vh - 165px);
  max-height: calc(100vh - 165px);
  overflow: hidden;
}

.template-pane__toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.template-pane__list {
  display: grid;
  gap: 4px;
  align-content: start;
  min-height: 0;
  overflow: auto;
}

.template-pane__item {
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
}

.template-pane__item:hover {
  background: color-mix(in srgb, var(--color-accent) 6%, white);
}

.template-pane__item--active {
  background: color-mix(in srgb, var(--color-accent) 12%, white);
  color: var(--color-accent);
}

.template-pane__item-name {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.95rem;
}

@media (max-width: 1080px) {
  .template-pane__body {
    grid-template-columns: 1fr;
  }

  .template-pane__sidebar,
  .template-pane__list {
    max-height: none;
    overflow: visible;
  }
}
</style>
