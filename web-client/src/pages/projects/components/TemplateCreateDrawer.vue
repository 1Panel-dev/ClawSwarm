<template>
  <el-drawer
    :model-value="visible"
    :title="template ? t('projects.editTemplate') : t('projects.createTemplate')"
    size="760px"
    destroy-on-close
    @close="emit('update:visible', false)"
  >
    <div v-loading="submitting ?? false" class="drawer-body">
      <el-form label-position="top" class="template-drawer-form">
        <el-row :gutter="12">
          <el-col :xs="24" :sm="16">
            <el-form-item :label="t('projects.templateName')">
              <el-input v-model="form.name" maxlength="200" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item :label="t('projects.documentCategory')">
              <el-select v-model="form.category" style="width: 100%">
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
          <el-input v-model="form.description" maxlength="500" />
        </el-form-item>
        <el-form-item :label="t('projects.templateContent')" class="template-drawer-form__content-item">
          <el-input
            v-model="form.content"
            type="textarea"
            resize="none"
            class="template-drawer-form__content-editor"
          />
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <div class="drawer-actions">
        <el-button @click="emit('update:visible', false)">{{ t("common.cancel") }}</el-button>
        <el-button type="primary" :disabled="!form.name.trim()" @click="submit">
          {{ template ? t("common.save") : t("common.create") }}
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue";

import { useI18n } from "@/composables/useI18n";
import { PROJECT_DOCUMENT_CATEGORIES, type DocumentTemplateCreatePayload, type DocumentTemplateView } from "@/types/view/project-management";

const props = defineProps<{
    visible: boolean;
    template?: DocumentTemplateView | null;
    submitting?: boolean;
}>();

const emit = defineEmits<{
    "update:visible": [value: boolean];
    submit: [payload: DocumentTemplateCreatePayload];
}>();

const { t } = useI18n();
const form = reactive({
    name: "",
    description: "",
    category: "其他",
    content: "",
});

watch(
    () => props.visible,
    (visible) => {
      if (!visible) {
        return;
      }
      form.name = props.template?.name ?? "";
      form.description = props.template?.description ?? "";
      form.category = props.template?.category ?? "其他";
      form.content = props.template?.content ?? "";
    },
);

function submit() {
    emit("submit", {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        content: form.content,
    });
}
</script>

<style scoped>
.drawer-body {
  min-height: 0;
  height: calc(100vh - 138px);
}

.template-drawer-form {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.template-drawer-form__content-item {
  display: flex;
  flex: 1;
  min-height: 0;
  margin-bottom: 0;
}

.template-drawer-form__content-item :deep(.el-form-item__content) {
  display: flex;
  flex: 1;
  min-height: 0;
}

.template-drawer-form__content-editor {
  display: flex;
  flex: 1;
  min-height: 0;
}

.template-drawer-form__content-editor :deep(.el-textarea) {
  display: flex;
  flex: 1;
  min-height: 0;
}

.template-drawer-form__content-editor :deep(.el-textarea__inner) {
  flex: 1;
  min-height: 100%;
}

.drawer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 960px) {
  .drawer-body {
    height: auto;
  }
}
</style>
