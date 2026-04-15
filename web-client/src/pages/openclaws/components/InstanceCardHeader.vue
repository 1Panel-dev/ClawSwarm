<template>
  <div class="instance-card-header">
    <div>
      <div class="instance-card-header__title">
        {{ instance.name }}
        <el-tag :type="statusTagType(instance.status)" effect="light">
          {{ statusLabel(instance.status) }}
        </el-tag>
      </div>
      <div class="instance-card-header__meta">{{ instance.channelBaseUrl }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * OpenClaw 实例卡片头部。
 *
 * 负责展示实例名称、状态和接入地址。
 */
import { ElTag } from "element-plus";

import { useI18n } from "@/composables/useI18n";
import type { OpenClawInstanceView } from "@/types/view/openclaw";

defineProps<{
    instance: OpenClawInstanceView;
}>();

const { t } = useI18n();

function statusLabel(status: string) {
    if (status === "active") {
        return t("openclaw.online");
    }
    if (status === "offline") {
        return t("openclaw.offline");
    }
    return t("openclaw.inactive");
}

function statusTagType(status: string) {
    if (status === "active") {
        return "success";
    }
    if (status === "offline") {
        return "warning";
    }
    return "info";
}
</script>

<style scoped>
.instance-card-header__title {
  font-weight: 700;
}

.instance-card-header__meta {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}
</style>
