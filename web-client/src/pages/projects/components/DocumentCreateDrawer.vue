<template>
  <el-drawer
    :model-value="visible"
    :title="t('projects.addDocument')"
    size="72%"
    destroy-on-close
    @close="handleClose"
  >
    <div v-loading="submitting ?? false" class="document-create-drawer">
      <template v-if="step === 1">
        <div class="document-create-drawer__intro">
          <p>{{ t("projects.chooseDocumentStart") }}</p>
        </div>
        <div class="template-grid">
          <button class="template-grid__card" type="button" @click="selectBlank">
            <h3>{{ t("projects.blankDocument") }}</h3>
            <p>{{ t("projects.blankDocumentHint") }}</p>
          </button>

          <button
            v-for="template in templates"
            :key="template.id"
            class="template-grid__card"
            type="button"
            @click="selectTemplate(template.id)"
          >
            <div class="template-grid__card-badge">{{ template.category }}</div>
            <h3>{{ template.name }}</h3>
            <p>{{ template.description || t("projects.noTemplateDescription") }}</p>
          </button>
        </div>
      </template>

      <template v-else>
        <el-form label-position="top">
          <el-form-item :label="t('projects.documentName')">
            <el-input v-model="form.name" maxlength="200" />
          </el-form-item>
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
          <el-form-item :label="t('projects.initialContent')">
            <el-input v-model="form.content" type="textarea" :rows="18" resize="vertical" />
          </el-form-item>
        </el-form>
      </template>
    </div>

    <template #footer>
      <div class="drawer-actions">
        <template v-if="step === 1">
          <el-button @click="handleClose">{{ t("common.cancel") }}</el-button>
        </template>
        <template v-else>
          <el-button @click="step = 1">{{ t("common.back") }}</el-button>
          <el-button @click="handleClose">{{ t("common.cancel") }}</el-button>
          <el-button type="primary" :disabled="!form.name.trim()" @click="submit">
            {{ t("common.create") }}
          </el-button>
        </template>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "vue";

import { useI18n } from "@/composables/useI18n";
import type { DocumentTemplateView, ProjectDocumentCreateInput } from "@/types/view/project-management";
import { PROJECT_DOCUMENT_CATEGORIES } from "@/types/view/project-management";

const props = defineProps<{
    visible: boolean;
    templates: DocumentTemplateView[];
    submitting?: boolean;
}>();

const emit = defineEmits<{
    "update:visible": [value: boolean];
    submit: [payload: ProjectDocumentCreateInput];
}>();

const { t } = useI18n();
const step = ref<1 | 2>(1);
const form = reactive({
    name: "",
    category: "其他",
    content: "",
    templateId: "",
});

watch(
    () => props.visible,
    (visible) => {
      if (!visible) {
        return;
      }
      resetState();
    },
);

function resetState() {
    step.value = 1;
    form.name = "";
    form.category = "其他";
    form.content = "";
    form.templateId = "";
}

function handleClose() {
    emit("update:visible", false);
}

function selectBlank() {
    form.name = "";
    form.category = "其他";
    form.content = "";
    form.templateId = "";
    step.value = 2;
}

function selectTemplate(templateId: string) {
    const template = props.templates.find((item) => item.id === templateId);
    if (!template) {
        return;
    }
    form.name = template.name;
    form.category = template.category || "其他";
    form.content = template.content;
    form.templateId = template.id;
    step.value = 2;
}

function submit() {
    emit("submit", {
        name: form.name.trim(),
        category: form.category,
        content: form.content,
        templateId: form.templateId || undefined,
    });
}
</script>

<style scoped>
.document-create-drawer {
  min-height: 420px;
}

.document-create-drawer__intro {
  margin-bottom: 14px;
  color: var(--color-text-secondary);
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

.template-grid__card {
  display: grid;
  gap: 10px;
  min-height: 160px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.template-grid__card:hover {
  border-color: color-mix(in srgb, var(--color-accent) 35%, var(--color-border));
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.template-grid__card h3 {
  margin: 0;
  font-size: 1rem;
}

.template-grid__card p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.template-grid__card-badge {
  width: fit-content;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f4f6fb;
  color: var(--color-text-secondary);
  font-size: 0.78rem;
}

.drawer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
