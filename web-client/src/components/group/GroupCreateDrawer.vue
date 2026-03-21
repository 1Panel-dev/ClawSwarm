<template>
  <el-drawer
    :model-value="visible"
    title="创建群组"
    size="520px"
    destroy-on-close
    @close="emit('update:visible', false)"
  >
    <div class="drawer-body">
      <p class="drawer-body__hint">
        群组由 Claw Team 调度中心维护。第一阶段先支持创建群组与后续添加成员。
      </p>

      <el-form label-position="top">
        <el-form-item label="群组名称">
          <el-input v-model="name" maxlength="120" placeholder="例如：项目开发群" />
        </el-form-item>
        <el-form-item label="群组描述">
          <el-input
            v-model="description"
            type="textarea"
            :rows="3"
            maxlength="500"
            placeholder="可选：说明这个群组的用途"
          />
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <div class="drawer-actions">
        <el-button @click="emit('update:visible', false)">取消</el-button>
        <el-button type="primary" :loading="submitting" :disabled="!name.trim()" @click="submit">
          创建群组
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
/**
 * 这个对话框负责创建群组。
 *
 * 第一阶段先把“创建群组”单独收成一个稳定弹窗，
 * 后续如果要接更复杂的群组属性，不需要重做消息页主结构。
 */
import { ref, watch } from "vue";

const props = defineProps<{
    visible: boolean;
    submitting: boolean;
}>();

const emit = defineEmits<{
    "update:visible": [value: boolean];
    submit: [payload: { name: string; description: string }];
}>();

const name = ref("");
const description = ref("");

watch(
    () => props.visible,
    (visible) => {
        if (visible) {
            name.value = "";
            description.value = "";
        }
    },
);

function submit() {
    if (!name.value.trim()) {
        return;
    }
    emit("submit", {
        name: name.value.trim(),
        description: description.value.trim(),
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
