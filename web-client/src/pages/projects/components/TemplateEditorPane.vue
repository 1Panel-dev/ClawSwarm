<template>
  <section v-loading="submitting ?? false" class="page-card template-editor-pane">
    <div v-if="template" class="template-editor-pane__header">
      <div>
        <h2 class="page-section-title">{{ draft.name || template.name }}</h2>
      </div>
      <div class="template-editor-pane__actions">
        <template v-if="editing">
          <el-button @click="previewingDraft = !previewingDraft">
            {{ previewingDraft ? t("common.edit") : t("projects.preview") }}
          </el-button>
          <el-button @click="cancelEditing">{{ t("common.cancel") }}</el-button>
          <el-button type="primary" :disabled="!isDirty" @click="saveTemplate">
            {{ t("common.save") }}
          </el-button>
        </template>
        <template v-else>
          <el-button @click="startEditing">{{ t("common.edit") }}</el-button>
          <el-button
            v-if="!template.isBuiltin"
            type="danger"
            plain
            @click="deleteTemplate"
          >
            {{ t("common.delete") }}
          </el-button>
        </template>
      </div>
    </div>

    <template v-if="template">
      <div v-if="editing && !previewingDraft" class="template-editor-pane__editor">
        <el-form label-position="top" class="template-editor-pane__form">
          <el-row :gutter="12">
            <el-col :xs="24" :sm="12">
              <el-form-item :label="t('projects.templateName')">
                <el-input v-model="draft.name" maxlength="200"/>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item :label="t('projects.documentCategory')">
                <el-select v-model="draft.category" style="width: 100%">
                  <el-option
                    v-for="category in PROJECT_DOCUMENT_CATEGORIES"
                    :key="category"
                    :label="category"
                    :value="category"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item :label="t('projects.templateDescription')">
            <el-input v-model="draft.description" maxlength="500"/>
          </el-form-item>
          <el-form-item :label="t('projects.templateContent')">
            <el-input v-model="draft.content" type="textarea" class="template-editor-pane__content-textarea"
                      :maxlength="30000"/>
          </el-form-item>
        </el-form>
      </div>
      <ProjectMarkdownPreview
        v-else
        class="template-editor-pane__preview"
        :content="editing ? draft.content : template.content"
      />
    </template>

    <el-empty v-else :description="t('projects.selectTemplate')" :image-size="90"/>
  </section>
</template>

<script setup lang="ts">
import {computed, reactive, ref, watch} from "vue";

import ProjectMarkdownPreview from "@/pages/projects/components/ProjectMarkdownPreview.vue";
import {useI18n} from "@/composables/useI18n";
import {
  PROJECT_DOCUMENT_CATEGORIES,
  type DocumentTemplateUpdateInput,
  type DocumentTemplateOutput
} from "@/types/view/project-management";

const props = defineProps<{
  template: DocumentTemplateOutput | null;
  submitting?: boolean;
}>();

const emit = defineEmits<{
  save: [payload: DocumentTemplateUpdateInput];
  delete: [templateId: string];
}>();

const {t} = useI18n();
const editing = ref(false);
const previewingDraft = ref(false);
const draft = reactive({
  name: "",
  description: "",
  category: "其他",
  content: "",
});

const isDirty = computed(() => {
  if (!props.template) {
    return false;
  }
  return (
    draft.name !== props.template.name
    || draft.description !== props.template.description
    || draft.category !== props.template.category
    || draft.content !== props.template.content
  );
});

watch(
  () => props.template,
  (template) => {
    editing.value = false;
    previewingDraft.value = false;
    draft.name = template?.name ?? "";
    draft.description = template?.description ?? "";
    draft.category = template?.category ?? "其他";
    draft.content = template?.content ?? "";
  },
  {immediate: true},
);

function startEditing() {
  if (!props.template) {
    return;
  }
  draft.name = props.template.name;
  draft.description = props.template.description;
  draft.category = props.template.category;
  draft.content = props.template.content;
  editing.value = true;
  previewingDraft.value = false;
}

function cancelEditing() {
  editing.value = false;
  previewingDraft.value = false;
}

function saveTemplate() {
  emit("save", {
    name: draft.name.trim(),
    description: draft.description.trim(),
    category: draft.category,
    content: draft.content,
  });
}

async function deleteTemplate() {
  if (!props.template) {
    return;
  }
  await ElMessageBox.confirm(
    t("projects.deleteTemplateConfirm", {name: props.template.name}),
    t("common.confirm"),
    {
      type: "warning",
      confirmButtonText: t("common.confirm"),
      cancelButtonText: t("common.cancel"),
    },
  );
  emit("delete", props.template.id);
}
</script>

<style scoped>
.template-editor-pane {
  min-height: 0;
  height: calc(100vh - 165px);
  max-height: calc(100vh - 165px);
  overflow: hidden;
  gap: 16px;
}

.template-editor-pane__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.template-editor-pane__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.template-editor-pane__editor {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.template-editor-pane__preview {
  min-height: 0;
  flex: 1;
  overflow: auto;
}

.template-editor-pane__form {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

@media (max-width: 960px) {
  .template-editor-pane {
    max-height: none;
    overflow: visible;
  }

  .template-editor-pane__header {
    flex-direction: column;
  }

  .template-editor-pane__actions {
    justify-content: flex-start;
  }
}

.template-editor-pane__content-textarea :deep(.el-textarea__inner) {
  min-height: calc(100vh - 420px) !important;
}
</style>
