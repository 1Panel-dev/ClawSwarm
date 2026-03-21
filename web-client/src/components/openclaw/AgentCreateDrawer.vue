<template>
  <el-drawer
    :model-value="visible"
    :title="`在 ${instanceName} 下新增 Agent`"
    size="560px"
    destroy-on-close
    @close="emit('update:visible', false)"
  >
    <div class="drawer-body">
      <p class="drawer-body__hint">
        Agent 是调度中心中的可路由对象。这里填写的是消息路由和展示所需的最小信息。
      </p>

      <el-form label-position="top">
        <el-form-item label="Agent Key">
          <el-input v-model="form.agent_key" maxlength="120" placeholder="例如：main / weather / coder-01" />
        </el-form-item>

        <el-form-item label="显示名称">
          <el-input v-model="form.display_name" maxlength="120" placeholder="例如：主助手 / 天气助理" />
        </el-form-item>

        <el-form-item label="角色名称">
          <el-input v-model="form.role_name" maxlength="120" placeholder="例如：assistant / 产品经理（可选）" />
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <div class="drawer-actions">
        <el-button @click="emit('update:visible', false)">取消</el-button>
        <el-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="submit">
          创建 Agent
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
/**
 * 这个对话框负责在指定实例下新增 Agent。
 *
 * 第一阶段只保留路由和通讯录所需的最小字段，
 * 避免现在就把“记忆、知识库、技能”等高级能力塞进前端表单。
 */
import { computed, reactive, watch } from "vue";

const props = defineProps<{
    visible: boolean;
    submitting: boolean;
    instanceName: string;
}>();

const emit = defineEmits<{
    "update:visible": [value: boolean];
    submit: [payload: {
        agent_key: string;
        display_name: string;
        role_name: string;
    }];
}>();

const form = reactive({
    agent_key: "",
    display_name: "",
    role_name: "",
});

watch(
    () => props.visible,
    (visible) => {
        if (!visible) {
            return;
        }
        form.agent_key = "";
        form.display_name = "";
        form.role_name = "";
    },
);

const canSubmit = computed(() => !!form.agent_key.trim() && !!form.display_name.trim());

function submit() {
    if (!canSubmit.value) {
        return;
    }
    emit("submit", {
        agent_key: form.agent_key.trim(),
        display_name: form.display_name.trim(),
        role_name: form.role_name.trim(),
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
