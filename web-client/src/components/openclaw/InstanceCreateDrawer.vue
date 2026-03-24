<template>
  <el-drawer
    :model-value="visible"
    title="快速连接 OpenClaw"
    size="620px"
    destroy-on-close
    @close="emit('update:visible', false)"
  >
    <div class="drawer-body">
      <p class="drawer-body__hint">
        只填写 OpenClaw 地址和连接密钥，Claw Team 会自动检测 channel、导入 Agent，并创建实例。
      </p>

      <el-form label-position="top">
        <el-form-item label="实例名称">
          <el-input v-model="form.name" maxlength="120" placeholder="例如：OpenClaw A" />
        </el-form-item>

        <el-form-item label="OpenClaw 地址">
          <el-input v-model="form.channel_base_url" placeholder="例如：https://172.16.200.119:18789" />
        </el-form-item>

        <el-form-item label="连接密钥">
          <el-input
            v-model="form.shared_secret"
            show-password
            placeholder="与 OpenClaw 的 claw-team channel 中配置的连接密钥保持一致"
          />
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <div class="drawer-actions">
        <el-button @click="emit('update:visible', false)">取消</el-button>
        <el-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="submit">
          连接 OpenClaw
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
        shared_secret: string;
    }];
}>();

const form = reactive({
    name: "",
    channel_base_url: "",
    shared_secret: "",
});

watch(
    () => props.visible,
    (visible) => {
        if (!visible) {
            return;
        }
        form.name = "";
        form.channel_base_url = "";
        form.shared_secret = "";
    },
);

const canSubmit = computed(
    () =>
        !!form.name.trim()
        && !!form.channel_base_url.trim()
        && !!form.shared_secret.trim(),
);

function submit() {
    if (!canSubmit.value) {
        return;
    }
    emit("submit", {
        name: form.name.trim(),
        channel_base_url: form.channel_base_url.trim(),
        shared_secret: form.shared_secret.trim(),
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
