<template>
  <el-drawer
    :model-value="visible"
    :title="drawerTitle"
    size="620px"
    destroy-on-close
    @close="emit('update:visible', false)"
  >
    <div class="drawer-body">
      <p class="drawer-body__hint">
        {{ drawerHint }}
      </p>

      <el-form label-position="top">
        <el-form-item :label="t('openclaw.instanceName')">
          <el-input v-model="form.name" maxlength="120" :placeholder="t('openclaw.instanceNamePlaceholder')" />
        </el-form-item>

        <el-form-item :label="t('openclaw.openclawUrl')">
          <el-input v-model="form.channel_base_url" placeholder="例如：https://172.16.200.119:18789" />
        </el-form-item>

        <el-form-item :label="t('openclaw.sharedSecret')">
          <el-input
            v-model="form.shared_secret"
            show-password
            :placeholder="secretPlaceholder"
          />
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <div class="drawer-actions">
        <el-button @click="emit('update:visible', false)">{{ t("common.cancel") }}</el-button>
        <el-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="submit">
          {{ submitLabel }}
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
/**
 * 这个对话框负责新增 OpenClaw 实例。
 *
 * 第一阶段先只收集调度中心对接 channel 所需的最小字段，
 * 这样能尽快把实例管理链路补齐，而不把高级配置过早塞进 UI。
 */
import { computed, reactive, watch } from "vue";
import { useI18n } from "@/composables/useI18n";

const props = defineProps<{
    visible: boolean;
    submitting: boolean;
    mode?: "create" | "edit";
    initialValue?: {
        id: number;
        name: string;
        channel_base_url: string;
        channel_account_id: string;
    } | null;
}>();

const emit = defineEmits<{
    "update:visible": [value: boolean];
    submit: [payload:
        | {
            mode: "create";
            name: string;
            channel_base_url: string;
            shared_secret: string;
            channel_account_id: string;
        }
        | {
            mode: "edit";
            instance_id: number;
            name: string;
            channel_base_url: string;
            shared_secret: string;
            channel_account_id: string;
        }
    ];
}>();

const form = reactive({
    name: "",
    channel_base_url: "",
    shared_secret: "",
    channel_account_id: "default",
});
const { t } = useI18n();

const mode = computed(() => props.mode ?? "create");
const drawerTitle = computed(() => (mode.value === "edit" ? t("openclaw.drawerEditTitle") : t("openclaw.drawerCreateTitle")));
const drawerHint = computed(() =>
    mode.value === "edit"
        ? t("openclaw.drawerEditHint")
        : t("openclaw.drawerCreateHint"),
);
const submitLabel = computed(() => (mode.value === "edit" ? t("openclaw.save") : t("openclaw.connect")));
const secretPlaceholder = computed(() =>
    mode.value === "edit"
        ? t("openclaw.sharedSecretEditPlaceholder")
        : t("openclaw.sharedSecretPlaceholder"),
);

watch(
    () => props.visible,
    (visible) => {
        if (!visible) {
            return;
        }
        if (mode.value === "edit" && props.initialValue) {
            form.name = props.initialValue.name;
            form.channel_base_url = props.initialValue.channel_base_url;
            form.channel_account_id = props.initialValue.channel_account_id;
            form.shared_secret = "";
            return;
        }
        form.name = "";
        form.channel_base_url = "";
        form.shared_secret = "";
        form.channel_account_id = "default";
    },
);

const canSubmit = computed(
    () =>
        !!form.name.trim()
        && !!form.channel_base_url.trim()
        && (mode.value === "edit" || !!form.shared_secret.trim()),
);

function submit() {
    if (!canSubmit.value) {
        return;
    }
    if (mode.value === "edit" && props.initialValue) {
        emit("submit", {
            mode: "edit",
            instance_id: props.initialValue.id,
            name: form.name.trim(),
            channel_base_url: form.channel_base_url.trim(),
            shared_secret: form.shared_secret.trim(),
            channel_account_id: form.channel_account_id.trim(),
        });
        return;
    }
    emit("submit", {
        mode: "create",
        name: form.name.trim(),
        channel_base_url: form.channel_base_url.trim(),
        shared_secret: form.shared_secret.trim(),
        channel_account_id: form.channel_account_id.trim(),
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
</style>
