<template>
  <el-drawer
    :model-value="visible"
    :title="t('conversation.create')"
    size="520px"
    destroy-on-close
    @close="emit('update:visible', false)"
  >
    <div class="drawer-body">
      <p class="drawer-body__hint">
        {{ t("conversation.drawerGroupHint") }}
      </p>

      <el-form label-position="top">
        <el-form-item :label="t('conversation.groupName')">
          <el-input v-model="name" maxlength="120" :placeholder="t('conversation.groupNamePlaceholder')" />
        </el-form-item>
        <el-form-item :label="t('conversation.groupDescription')">
          <el-input
            v-model="description"
            type="textarea"
            :rows="3"
            maxlength="500"
            :placeholder="t('conversation.groupDescriptionPlaceholder')"
          />
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <div class="drawer-actions">
        <el-button @click="emit('update:visible', false)">{{ t("conversation.cancel") }}</el-button>
        <el-button type="primary" :loading="submitting" :disabled="!name.trim()" @click="submit">
          {{ t("conversation.create") }}
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
import { useI18n } from "@/composables/useI18n";

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
const { t } = useI18n();

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
