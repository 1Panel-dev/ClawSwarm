<template>
  <el-drawer
    :model-value="visible"
    :title="t('conversation.createAgentDialogue')"
    size="520px"
    destroy-on-close
    @close="emit('update:visible', false)"
  >
    <div class="drawer-body">
      <p class="drawer-body__hint">{{ t("conversation.agentDialogueHint") }}</p>

      <el-form label-position="top">
        <el-form-item :label="t('conversation.sourceRuntimeTarget')">
          <el-select
            v-model="sourceRuntimeTargetId"
            filterable
            popper-class="agent-dialogue-runtime-select"
            style="width: 100%"
          >
            <el-option
              v-for="target in runtimeTargetOptions"
              :key="target.value"
              :label="target.label"
              :value="target.value"
            >
              <div class="runtime-option">
                <span class="runtime-option__name">{{ target.displayName }}</span>
                <span class="runtime-option__meta">{{ target.meta }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item :label="t('conversation.targetRuntimeTarget')">
          <el-select
            v-model="targetRuntimeTargetId"
            filterable
            popper-class="agent-dialogue-runtime-select"
            style="width: 100%"
          >
            <el-option
              v-for="target in targetOptions"
              :key="target.value"
              :label="target.label"
              :value="target.value"
            >
              <div class="runtime-option">
                <span class="runtime-option__name">{{ target.displayName }}</span>
                <span class="runtime-option__meta">{{ target.meta }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item :label="t('conversation.agentDialogueTopic')">
          <el-input
            v-model="topic"
            type="textarea"
            :autosize="{ minRows: 4, maxRows: 8 }"
            :placeholder="t('conversation.agentDialogueTopicPlaceholder')"
          />
        </el-form-item>

        <el-form-item :label="t('conversation.agentDialogueWindowSeconds')">
          <el-input-number v-model="windowSeconds" :min="60" :max="3600" :step="60" />
        </el-form-item>

        <el-form-item :label="t('conversation.agentDialogueSoftMessageLimit')">
          <el-input-number v-model="softMessageLimit" :min="2" :max="100" />
        </el-form-item>

        <el-form-item :label="t('conversation.agentDialogueHardMessageLimit')">
          <el-input-number v-model="hardMessageLimit" :min="3" :max="200" />
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <div class="drawer-actions">
        <el-button @click="emit('update:visible', false)">{{ t("common.cancel") }}</el-button>
        <el-button type="primary" :disabled="!canSubmit" @click="submit">
          {{ t("conversation.createAgentDialogue") }}
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { useI18n } from "@/composables/useI18n";
import type { RuntimeTargetOutput } from "@/types/view/runtime-target";

type RuntimeTargetOption = {
    value: number;
    label: string;
    displayName: string;
    meta: string;
};

const props = defineProps<{
    visible: boolean;
    runtimeTargets: RuntimeTargetOutput[];
}>();

const emit = defineEmits<{
    "update:visible": [value: boolean];
    submit: [payload: {
        sourceRuntimeTargetId: number;
        targetRuntimeTargetId: number;
        topic: string;
        windowSeconds: number;
        softMessageLimit: number;
        hardMessageLimit: number;
    }];
}>();

const { t } = useI18n();
const sourceRuntimeTargetId = ref<number | null>(null);
const targetRuntimeTargetId = ref<number | null>(null);
const topic = ref("");
const windowSeconds = ref(300);
const softMessageLimit = ref(12);
const hardMessageLimit = ref(20);

const runtimeTargetOptions = computed<RuntimeTargetOption[]>(() =>
    props.runtimeTargets.map((target) => {
        const runtimeLabel = target.runtimeType === "hermes"
            ? t("conversation.runtimeHermesEndpoint")
            : t("conversation.runtimeOpenClawAgent");
        const meta = [target.instanceName, runtimeLabel, target.csId].filter(Boolean).join(" / ");
        return {
            value: target.id,
            label: `${target.displayName} / ${meta}`,
            displayName: target.displayName,
            meta,
        };
    }),
);

const targetOptions = computed(() =>
    runtimeTargetOptions.value.filter((item) => item.value !== sourceRuntimeTargetId.value),
);

const canSubmit = computed(() => {
    return (
        !!sourceRuntimeTargetId.value
        && !!targetRuntimeTargetId.value
        && sourceRuntimeTargetId.value !== targetRuntimeTargetId.value
        && !!topic.value.trim()
        && softMessageLimit.value < hardMessageLimit.value
    );
});

watch(
    () => props.visible,
    (visible) => {
        if (!visible) {
            return;
        }
        sourceRuntimeTargetId.value = null;
        targetRuntimeTargetId.value = null;
        topic.value = "";
        windowSeconds.value = 300;
        softMessageLimit.value = 12;
        hardMessageLimit.value = 20;
    },
);

function submit() {
    if (!canSubmit.value || sourceRuntimeTargetId.value === null || targetRuntimeTargetId.value === null) {
        return;
    }
    emit("submit", {
        sourceRuntimeTargetId: sourceRuntimeTargetId.value,
        targetRuntimeTargetId: targetRuntimeTargetId.value,
        topic: topic.value.trim(),
        windowSeconds: windowSeconds.value,
        softMessageLimit: softMessageLimit.value,
        hardMessageLimit: hardMessageLimit.value,
    });
}
</script>

<style scoped>
.drawer-body {
  display: grid;
  gap: var(--space-3);
  padding-right: 6px;
}

.drawer-body__hint {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.drawer-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.runtime-option {
  display: grid;
  gap: 2px;
  padding: 4px 0;
  line-height: 1.35;
}

.runtime-option__name {
  font-weight: 600;
  color: var(--color-text-primary);
}

.runtime-option__meta {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

:global(.agent-dialogue-runtime-select .el-select-dropdown__item) {
  height: auto;
  min-height: 48px;
  padding-top: 6px;
  padding-bottom: 6px;
  line-height: normal;
}
</style>
