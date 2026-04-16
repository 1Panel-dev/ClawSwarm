<template>
  <el-dialog
    :model-value="visible"
    :title="t('auth.accountSettings')"
    width="460px"
    @close="emit('update:visible', false)"
  >
    <el-form label-position="top">
      <el-form-item :label="t('auth.username')">
        <div class="account-dialog__static-value">{{ username }}</div>
      </el-form-item>
      <el-form-item :label="t('auth.displayName')">
        <el-input v-model="form.displayName" maxlength="120" />
      </el-form-item>
      <el-form-item :label="t('auth.currentPassword')">
        <el-input v-model="form.currentPassword" type="password" show-password autocomplete="current-password" />
      </el-form-item>
      <el-form-item :label="t('auth.newPassword')">
        <el-input v-model="form.newPassword" type="password" show-password autocomplete="new-password" />
      </el-form-item>
      <el-form-item :label="t('auth.confirmPassword')">
        <el-input v-model="form.confirmPassword" type="password" show-password autocomplete="new-password" />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="account-dialog__footer">
        <el-button @click="emit('update:visible', false)">{{ t("common.cancel") }}</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSave">{{ t("common.save") }}</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue";

import { useI18n } from "@/composables/useI18n";
import type { UpdateProfileInput } from "@/types/view/auth";

const props = defineProps<{
    visible: boolean;
    submitting: boolean;
    username: string;
    displayName: string;
}>();

const emit = defineEmits<{
    "update:visible": [value: boolean];
    submit: [payload: UpdateProfileInput];
}>();

const { t } = useI18n();
const form = reactive({
    displayName: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
});

watch(
    () => props.visible,
    (visible) => {
        if (!visible) {
            return;
        }
        form.displayName = props.displayName;
        form.currentPassword = "";
        form.newPassword = "";
        form.confirmPassword = "";
    },
);

function handleSave() {
    const displayName = form.displayName.trim();
    const currentPassword = form.currentPassword;
    const newPassword = form.newPassword.trim();
    const confirmPassword = form.confirmPassword.trim();

    if (!displayName) {
        ElMessage.error(t("auth.accountRequired"));
        return;
    }
    if (newPassword || confirmPassword) {
        if (!currentPassword) {
            ElMessage.error(t("auth.currentPasswordRequired"));
            return;
        }
        if (newPassword !== confirmPassword) {
            ElMessage.error(t("auth.passwordMismatch"));
            return;
        }
        if (newPassword.length < 8) {
            ElMessage.error(t("auth.passwordTooShort"));
            return;
        }
    }

    emit("submit", {
        displayName,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
    });
}
</script>

<style scoped>
.account-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.account-dialog__static-value {
  color: var(--color-text-primary);
  line-height: 32px;
}
</style>
