<template>
  <el-drawer
    :model-value="visible"
    :title="drawerTitle"
    size="720px"
    destroy-on-close
    @close="emit('update:visible', false)"
  >
    <div v-loading="submitting" class="drawer-shell">
      <div class="drawer-body">
        <el-form label-position="top">
          <el-form-item v-if="!isEditMode" :label="t('openclaw.agentTemplate')">
            <el-select
              v-model="selectedTemplateKey"
              class="agent-template-select"
              :placeholder="t('openclaw.agentTemplatePlaceholder')"
              @change="applySelectedTemplate"
            >
              <el-option
                v-for="template in agentTemplateOptions"
                :key="template.value"
                :label="template.label"
                :value="template.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item :label="t('openclaw.agentKey')" :error="agentKeyDuplicateError">
            <el-input
              v-model="form.agentKey"
              maxlength="120"
              :placeholder="t('openclaw.agentKeyPlaceholder')"
              :disabled="isEditMode"
            />
          </el-form-item>

          <el-form-item :label="t('openclaw.displayName')">
            <el-input v-model="form.displayName" maxlength="120" :placeholder="t('openclaw.displayNamePlaceholder')"/>
          </el-form-item>

          <el-form-item :label="t('openclaw.roleName')">
            <el-input v-model="form.roleName" maxlength="120" :placeholder="t('openclaw.rolePlaceholder')"/>
          </el-form-item>

          <div class="file-sections">
            <div
              v-for="fileField in fileFields"
              :key="fileField.key"
              class="file-section"
            >
              <button
                type="button"
                class="file-section__header"
                @click="toggleFileSection(fileField.key)"
              >
              <span class="file-section__title-wrap">
                <span class="file-section__title">{{ t(fileField.labelKey) }}</span>
                <span
                  v-if="isEditMode && fileDirtyState[fileField.key]"
                  class="file-section__edited"
                >
                  {{ t("openclaw.fileEdited") }}
                </span>
              </span>
                <span class="file-section__header-actions">
                <el-button
                  v-if="isEditMode"
                  type="primary"
                  text
                  size="small"
                  class="file-section__edit-button"
                  @click.stop="enableFileEdit(fileField.key)"
                >
                  <el-icon><EditPen/></el-icon>
                </el-button>
                <el-icon class="file-section__arrow"
                         :class="{ 'file-section__arrow--open': fileExpandedState[fileField.key] }">
                  <ArrowDown/>
                </el-icon>
              </span>
              </button>

              <div v-show="fileExpandedState[fileField.key]" class="file-section__body">
                <el-input
                  :model-value="form[fileField.key]"
                  type="textarea"
                  :autosize="{ minRows: 6, maxRows: 12 }"
                  :placeholder="t(fileField.placeholderKey)"
                  :readonly="isEditMode && !fileEditableState[fileField.key]"
                  @update:model-value="updateFileField(fileField.key, $event)"
                />
                <p v-if="isEditMode && !fileEditableState[fileField.key]" class="file-section__hint">
                  {{ t("openclaw.fileEditLockedHint") }}
                </p>
              </div>
            </div>
          </div>
        </el-form>
        <div class="drawer-actions">
          <el-button @click="emit('update:visible', false)">{{ t("common.cancel") }}</el-button>
          <el-button type="primary" @click="submit">
            {{ isEditMode ? t("openclaw.saveAgent") : t("common.create") }}
          </el-button>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
/**
 * Agent 创建与编辑抽屉。
 *
 * 负责基础字段以及 Agent workspace 文件的编辑。
 */
import {ArrowDown, EditPen} from "@element-plus/icons-vue";
import {computed, reactive, ref, watch} from "vue";
import {useI18n} from "@/composables/useI18n";
import {AGENT_TEMPLATES} from "@/constants/agentTemplates";
import type { OpenClawAgentProfileOutput } from "@/types/view/openclaw";

type AgentDrawerCreateInput = {
  mode: "create";
  agentKey: string;
  displayName: string;
  roleName: string;
  agentsMd?: string;
  toolsMd?: string;
  identityMd?: string;
  soulMd?: string;
  userMd?: string;
  memoryMd?: string;
  heartbeatMd?: string;
};

type AgentDrawerEditInput = {
  mode: "edit";
  agentId: number;
  agentKey: string;
  displayName: string;
  roleName: string;
  agentsMd?: string;
  toolsMd?: string;
  identityMd?: string;
  soulMd?: string;
  userMd?: string;
  memoryMd?: string;
  heartbeatMd?: string;
};

const props = defineProps<{
  visible: boolean;
  submitting: boolean;
  instanceName: string;
  mode: "create" | "edit";
  existingAgentKeys?: string[];
  initialValue?: OpenClawAgentProfileOutput | null;
}>();

const emit = defineEmits<{
  "update:visible": [value: boolean];
  submit: [payload: AgentDrawerCreateInput | AgentDrawerEditInput];
}>();

const {t} = useI18n();

const fileFields = [
  {
    key: "agentsMd",
    labelKey: "openclaw.agentsFile",
    placeholderKey: "openclaw.agentsPlaceholder",
  },
  {
    key: "soulMd",
    labelKey: "openclaw.soulFile",
    placeholderKey: "openclaw.soulPlaceholder",
  },
  {
    key: "toolsMd",
    labelKey: "openclaw.toolsFile",
    placeholderKey: "openclaw.toolsPlaceholder",
  },
  {
    key: "identityMd",
    labelKey: "openclaw.identityFile",
    placeholderKey: "openclaw.identityPlaceholder",
  },
  {
    key: "userMd",
    labelKey: "openclaw.userFile",
    placeholderKey: "openclaw.userPlaceholder",
  },
  {
    key: "heartbeatMd",
    labelKey: "openclaw.heartbeatFile",
    placeholderKey: "openclaw.heartbeatPlaceholder",
  },
  {
    key: "memoryMd",
    labelKey: "openclaw.memoryFile",
    placeholderKey: "openclaw.memoryPlaceholder",
  },
] as const;

type FileFieldKey = (typeof fileFields)[number]["key"];

const form = reactive({
  agentId: 0,
  agentKey: "",
  displayName: "",
  roleName: "",
  agentsMd: "",
  toolsMd: "",
  identityMd: "",
  soulMd: "",
  userMd: "",
  memoryMd: "",
  heartbeatMd: "",
});
const selectedTemplateKey = ref("blank");

const fileExpandedState = reactive<Record<FileFieldKey, boolean>>({
  agentsMd: false,
  toolsMd: false,
  identityMd: false,
  soulMd: false,
  userMd: false,
  memoryMd: false,
  heartbeatMd: false,
});

const fileEditableState = reactive<Record<FileFieldKey, boolean>>({
  agentsMd: true,
  toolsMd: true,
  identityMd: true,
  soulMd: true,
  userMd: true,
  memoryMd: true,
  heartbeatMd: true,
});

const fileDirtyState = reactive<Record<FileFieldKey, boolean>>({
  agentsMd: false,
  toolsMd: false,
  identityMd: false,
  soulMd: false,
  userMd: false,
  memoryMd: false,
  heartbeatMd: false,
});

const initialFileValues = reactive<Record<FileFieldKey, string>>({
  agentsMd: "",
  toolsMd: "",
  identityMd: "",
  soulMd: "",
  userMd: "",
  memoryMd: "",
  heartbeatMd: "",
});

const isEditMode = computed(() => props.mode === "edit");
const agentTemplateOptions = computed(() =>
  AGENT_TEMPLATES.map((template) => ({
    value: template.key,
    label: t(template.labelKey),
  })),
);
const drawerTitle = computed(() =>
  isEditMode.value
    ? t("openclaw.editAgent")
    : t("openclaw.createAgent"),
);
const normalizedExistingAgentKeys = computed(() =>
  new Set((props.existingAgentKeys ?? []).map((key) => key.trim()).filter(Boolean)),
);
const agentKeyDuplicateError = computed(() => {
  if (isEditMode.value) {
    return "";
  }
  const normalizedKey = form.agentKey.trim();
  if (!normalizedKey) {
    return "";
  }
  return normalizedExistingAgentKeys.value.has(normalizedKey) ? t("openclaw.agentKeyDuplicate") : "";
});

function resetForm() {
  form.agentId = 0;
  form.agentKey = "";
  form.displayName = "";
  form.roleName = "";
  form.agentsMd = "";
  form.toolsMd = "";
  form.identityMd = "";
  form.soulMd = "";
  form.userMd = "";
  form.memoryMd = "";
  form.heartbeatMd = "";
}

function applyTemplate(templateKey: string) {
  const template = AGENT_TEMPLATES.find((item) => item.key === templateKey);
  if (!template) {
    return;
  }

  form.agentKey = template.agentKey;
  form.displayName = template.displayName;
  form.roleName = template.roleName;
  form.agentsMd = template.agentsMd;
  form.toolsMd = template.toolsMd;
  form.identityMd = template.identityMd;
  form.soulMd = template.soulMd;
  form.userMd = template.userMd;
  form.memoryMd = template.memoryMd;
  form.heartbeatMd = template.heartbeatMd;
}

function hasCreateFormContent() {
  return Boolean(
    form.agentKey.trim()
    || form.displayName.trim()
    || form.roleName.trim()
    || form.agentsMd.trim()
    || form.toolsMd.trim()
    || form.identityMd.trim()
    || form.soulMd.trim()
    || form.userMd.trim()
    || form.memoryMd.trim()
    || form.heartbeatMd.trim(),
  );
}

function applySelectedTemplate() {
  if (isEditMode.value) {
    return;
  }

  const templateKey = selectedTemplateKey.value;
  if (templateKey !== "blank" && hasCreateFormContent()) {
    const shouldOverwrite = window.confirm(t("openclaw.agentTemplateOverwriteConfirm"));
    if (!shouldOverwrite) {
      selectedTemplateKey.value = "blank";
      return;
    }
  }

  applyTemplate(templateKey);
}

function resetFileUiState() {
  for (const field of fileFields) {
    fileExpandedState[field.key] = false;
    fileEditableState[field.key] = !isEditMode.value;
    fileDirtyState[field.key] = false;
    initialFileValues[field.key] = "";
  }
}

function toggleFileSection(field: FileFieldKey) {
  fileExpandedState[field] = !fileExpandedState[field];
}

function enableFileEdit(field: FileFieldKey) {
  fileEditableState[field] = true;
  fileExpandedState[field] = true;
}

function updateFileField(field: FileFieldKey, value: string) {
  if (isEditMode.value && !fileEditableState[field]) {
    return;
  }
  form[field] = value;
  if (isEditMode.value) {
    // 编辑模式下只标记真正发生变化的文件。
    fileDirtyState[field] = value !== initialFileValues[field];
  }
}

watch(
  () => [props.visible, props.mode, props.initialValue] as const,
  ([visible]) => {
    if (!visible) {
      return;
    }

    if (props.mode === "edit" && props.initialValue) {
      form.agentId = props.initialValue.id;
      form.agentKey = props.initialValue.agentKey;
      form.displayName = props.initialValue.displayName;
      form.roleName = props.initialValue.roleName ?? "";
      form.agentsMd = props.initialValue.agentsMd;
      form.toolsMd = props.initialValue.toolsMd;
      form.identityMd = props.initialValue.identityMd;
      form.soulMd = props.initialValue.soulMd;
      form.userMd = props.initialValue.userMd;
      form.memoryMd = props.initialValue.memoryMd;
      form.heartbeatMd = props.initialValue.heartbeatMd;
      resetFileUiState();
      initialFileValues.agentsMd = props.initialValue.agentsMd;
      initialFileValues.toolsMd = props.initialValue.toolsMd;
      initialFileValues.identityMd = props.initialValue.identityMd;
      initialFileValues.soulMd = props.initialValue.soulMd;
      initialFileValues.userMd = props.initialValue.userMd;
      initialFileValues.memoryMd = props.initialValue.memoryMd;
      initialFileValues.heartbeatMd = props.initialValue.heartbeatMd;
      return;
    }

    resetForm();
    resetFileUiState();
    selectedTemplateKey.value = "blank";
  },
  {immediate: true},
);

const canSubmit = computed(() => !!form.agentKey.trim() && !!form.displayName.trim() && !agentKeyDuplicateError.value);

function submit() {
  if (!canSubmit.value) {
    return;
  }

  if (isEditMode.value) {
    const payload: AgentDrawerEditInput = {
      mode: "edit",
      agentId: form.agentId,
      agentKey: form.agentKey.trim(),
      displayName: form.displayName.trim(),
      roleName: form.roleName.trim(),
    };

    // 编辑模式下只提交真正改过的文件。
    if (fileDirtyState.agentsMd) {
      payload.agentsMd = form.agentsMd;
    }
    if (fileDirtyState.toolsMd) {
      payload.toolsMd = form.toolsMd;
    }
    if (fileDirtyState.identityMd) {
      payload.identityMd = form.identityMd;
    }
    if (fileDirtyState.soulMd) {
      payload.soulMd = form.soulMd;
    }
    if (fileDirtyState.userMd) {
      payload.userMd = form.userMd;
    }
    if (fileDirtyState.memoryMd) {
      payload.memoryMd = form.memoryMd;
    }
    if (fileDirtyState.heartbeatMd) {
      payload.heartbeatMd = form.heartbeatMd;
    }

    emit("submit", {
      ...payload,
    });
    return;
  }

  emit("submit", {
    mode: "create",
    agentKey: form.agentKey.trim(),
    displayName: form.displayName.trim(),
    roleName: form.roleName.trim(),
    ...(form.agentsMd.trim() ? {agentsMd: form.agentsMd} : {}),
    ...(form.toolsMd.trim() ? {toolsMd: form.toolsMd} : {}),
    ...(form.identityMd.trim() ? {identityMd: form.identityMd} : {}),
    ...(form.soulMd.trim() ? {soulMd: form.soulMd} : {}),
    ...(form.userMd.trim() ? {userMd: form.userMd} : {}),
    ...(form.memoryMd.trim() ? {memoryMd: form.memoryMd} : {}),
    ...(form.heartbeatMd.trim() ? {heartbeatMd: form.heartbeatMd} : {}),
  });
}
</script>

<style scoped>
.drawer-body {
  display: grid;
  gap: var(--space-3);
  padding-right: 6px;
}

.drawer-shell {
  display: grid;
  gap: var(--space-4);
  min-height: 100%;
}

.agent-template-select {
  width: 100%;
}

.drawer-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.file-sections {
  display: grid;
  gap: var(--space-3);
}

.file-section {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-panel);
}

.file-section__header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: 12px 14px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.file-section__title-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.file-section__title {
  font-weight: 600;
}

.file-section__edited {
  color: var(--color-accent);
  font-size: 0.85rem;
}

.file-section__header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.file-section__edit-button {
  padding: 4px;
}

.file-section__arrow {
  transition: transform 0.2s ease;
}

.file-section__arrow--open {
  transform: rotate(180deg);
}

.file-section__body {
  display: grid;
  gap: var(--space-2);
  padding: 0 14px 14px;
}

.file-section__hint {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  line-height: 1.6;
}
</style>
