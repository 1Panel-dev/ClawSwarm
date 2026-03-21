<template>
  <el-drawer
    :model-value="visible"
    title="新增 OpenClaw 实例"
    size="620px"
    destroy-on-close
    @close="emit('update:visible', false)"
  >
    <div class="drawer-body">
      <p class="drawer-body__hint">
        这里填写的是调度中心访问这套 `claw-team channel` 所需的最小连接信息。
      </p>

      <el-form label-position="top">
        <el-form-item label="实例名称">
          <el-input v-model="form.name" maxlength="120" placeholder="例如：OpenClaw A" />
        </el-form-item>

        <el-form-item label="Channel 地址">
          <el-input v-model="form.channel_base_url" placeholder="例如：https://172.16.200.119:18789" />
        </el-form-item>

        <el-form-item label="Channel 账号 ID">
          <el-input v-model="form.channel_account_id" placeholder="默认一般是 default" />
        </el-form-item>

        <el-form-item label="Channel 签名密钥">
          <el-input v-model="form.channel_signing_secret" show-password placeholder="scheduler-server -> channel 验签密钥" />
        </el-form-item>

        <el-form-item label="Claw Team 调度中心回调 Token">
          <el-input v-model="form.callback_token" show-password placeholder="channel -> scheduler-server 的 Bearer Token" />
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <div class="drawer-actions">
        <el-button @click="emit('update:visible', false)">取消</el-button>
        <el-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="submit">
          创建实例
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

const props = defineProps<{
    visible: boolean;
    submitting: boolean;
}>();

const emit = defineEmits<{
    "update:visible": [value: boolean];
    submit: [payload: {
        name: string;
        channel_base_url: string;
        channel_account_id: string;
        channel_signing_secret: string;
        callback_token: string;
    }];
}>();

const form = reactive({
    name: "",
    channel_base_url: "",
    channel_account_id: "default",
    channel_signing_secret: "",
    callback_token: "",
});

watch(
    () => props.visible,
    (visible) => {
        if (!visible) {
            return;
        }
        form.name = "";
        form.channel_base_url = "";
        form.channel_account_id = "default";
        form.channel_signing_secret = "";
        form.callback_token = "";
    },
);

const canSubmit = computed(
    () =>
        !!form.name.trim()
        && !!form.channel_base_url.trim()
        && !!form.channel_account_id.trim()
        && !!form.channel_signing_secret.trim()
        && !!form.callback_token.trim(),
);

function submit() {
    if (!canSubmit.value) {
        return;
    }
    emit("submit", {
        name: form.name.trim(),
        channel_base_url: form.channel_base_url.trim(),
        channel_account_id: form.channel_account_id.trim(),
        channel_signing_secret: form.channel_signing_secret.trim(),
        callback_token: form.callback_token.trim(),
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
