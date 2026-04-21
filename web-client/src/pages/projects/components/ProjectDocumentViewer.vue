<template>
  <section v-loading="saving ?? false" class="page-card document-viewer">
    <div v-if="document" class="document-viewer__header">
      <div>
        <h2 class="page-section-title">{{ draft.name || document.name }}</h2>
      </div>
      <div class="document-viewer__actions">
        <el-button v-if="!editing" @click="copyDocumentLink">{{ t("projects.copyDocumentLink") }}</el-button>
        <template v-if="editing">
          <el-button @click="togglePreview">{{ previewingDraft ? t("common.edit") : t("projects.preview") }}</el-button>
          <el-button @click="cancelEditing">{{ t("common.cancel") }}</el-button>
          <el-button type="primary" :disabled="!isDirty" @click="saveDocument">
            {{ t("common.save") }}
          </el-button>
        </template>
        <template v-else>
          <el-button @click="startEditing">{{ t("common.edit") }}</el-button>
          <el-button
            v-if="!document.isCore"
            type="danger"
            plain
            @click="deleteDocument"
          >
            {{ t("common.delete") }}
          </el-button>
        </template>
      </div>
    </div>

    <template v-if="document">
      <div v-if="editing && !previewingDraft" class="document-viewer__editor">
        <el-form label-position="top" class="document-viewer__form">
          <el-row :gutter="12">
            <el-col :xs="24" :sm="12">
              <el-form-item :label="t('projects.documentName')">
                <el-input v-model="draft.name" maxlength="200" />
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
          <el-form-item :label="t('projects.templateContent')">
            <el-input
              v-model="draft.content"
              type="textarea"
              class="document-viewer__content-textarea"
              :maxlength="30000"
            />
          </el-form-item>
        </el-form>
      </div>
      <ProjectMarkdownPreview
        v-else
        class="document-viewer__preview"
        :content="editing ? draft.content : document.content"
      />
    </template>

    <el-empty v-else :description="t('projects.selectDocument')" :image-size="90" />
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";

import ProjectMarkdownPreview from "@/pages/projects/components/ProjectMarkdownPreview.vue";
import { useI18n } from "@/composables/useI18n";
import { PROJECT_DOCUMENT_CATEGORIES, type ProjectDocumentOutput, type ProjectDocumentUpdateInput } from "@/types/view/project-management";

const props = defineProps<{
    projectId: string;
    document: ProjectDocumentOutput | null;
    saving?: boolean;
}>();

const emit = defineEmits<{
    save: [payload: ProjectDocumentUpdateInput];
    delete: [documentId: string];
    dirtyChange: [dirty: boolean];
}>();

const { t } = useI18n();
const draft = reactive({
    name: "",
    category: "其他",
    content: "",
});
const editing = ref(false);
const previewingDraft = ref(false);

const isDirty = computed(() => {
    if (!props.document) {
        return false;
    }
    return (
        draft.name !== props.document.name
        || draft.category !== props.document.category
        || draft.content !== props.document.content
    );
});

const readOnlyLink = computed(() => {
    if (!props.document) {
        return "";
    }
    return `clawswarm://projects/${props.projectId}/documents/${props.document.id}`;
});

watch(
    () => props.document,
    (document) => {
      editing.value = false;
      previewingDraft.value = false;
      draft.name = document?.name ?? "";
      draft.category = document?.category ?? "其他";
      draft.content = document?.content ?? "";
      emit("dirtyChange", false);
    },
    { immediate: true },
);

watch(isDirty, (dirty) => emit("dirtyChange", dirty));

function startEditing() {
    if (!props.document) {
        return;
    }
    draft.name = props.document.name;
    draft.category = props.document.category;
    draft.content = props.document.content;
    editing.value = true;
    previewingDraft.value = false;
}

function cancelEditing() {
    editing.value = false;
    previewingDraft.value = false;
    draft.name = props.document?.name ?? "";
    draft.category = props.document?.category ?? "其他";
    draft.content = props.document?.content ?? "";
}

function togglePreview() {
    previewingDraft.value = !previewingDraft.value;
}

async function copyDocumentLink() {
    if (!props.document || !readOnlyLink.value) {
        return;
    }
    await navigator.clipboard.writeText(
        `${t("projects.documentName")}：${props.document.name}\n${t("projects.documentLink")}：${readOnlyLink.value}`,
    );
    ElMessage.success(t("conversation.copied"));
}

function saveDocument() {
    if (!props.document || !draft.name.trim()) {
        return;
    }
    emit("save", {
        name: draft.name.trim(),
        category: draft.category,
        content: draft.content,
    });
}

async function deleteDocument() {
    if (!props.document || props.document.isCore) {
        return;
    }
    await ElMessageBox.confirm(
        t("projects.deleteDocumentConfirm", { name: props.document.name }),
        t("common.confirm"),
        {
            type: "warning",
            confirmButtonText: t("common.confirm"),
            cancelButtonText: t("common.cancel"),
        },
    );
    emit("delete", props.document.id);
}
</script>

<style scoped>
.document-viewer {
  min-height: 0;
  gap: 16px;
}

.document-viewer__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.document-viewer__meta {
  margin: 6px 0 0;
  color: var(--color-text-secondary);
  font-size: 0.88rem;
}

.document-viewer__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.document-viewer__editor {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.document-viewer__preview {
  min-height: 0;
  flex: 1;
  overflow: auto;
}

.document-viewer__form {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.document-viewer__content-textarea :deep(.el-textarea__inner) {
  min-height: calc(100vh - 380px) !important;
}

@media (max-width: 960px) {
  .document-viewer__header {
    flex-direction: column;
  }

  .document-viewer__actions {
    justify-content: flex-start;
  }
}
</style>
