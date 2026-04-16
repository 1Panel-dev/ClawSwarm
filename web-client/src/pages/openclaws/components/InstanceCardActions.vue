<template>
  <el-space wrap class="instance-card-actions">
    <el-tooltip :content="t('openclaw.addAgent')" placement="top">
      <el-button type="primary" circle :disabled="pageBusy" @click="emit('create-agent')">
        <el-icon><Plus /></el-icon>
      </el-button>
    </el-tooltip>
    <el-tooltip :content="t('openclaw.syncAgents')" placement="top">
      <el-button
        circle
        :loading="syncing"
        :disabled="pageBusy"
        @click="emit('sync')"
      >
        <el-icon><RefreshRight /></el-icon>
      </el-button>
    </el-tooltip>
    <el-tooltip :content="t('openclaw.editInstance')" placement="top">
      <el-button circle :disabled="pageBusy" @click="emit('edit-instance')">
        <el-icon><EditPen /></el-icon>
      </el-button>
    </el-tooltip>
    <el-tooltip
      :content="instance.status === 'active' ? t('common.disable') : t('common.enable')"
      placement="top"
    >
      <el-button
        :type="instance.status === 'active' ? 'warning' : 'success'"
        circle
        :disabled="pageBusy"
        @click="emit('toggle-instance', instance.status !== 'active')"
      >
        <el-icon>
          <component :is="instance.status === 'active' ? SwitchButton : VideoPlay" />
        </el-icon>
      </el-button>
    </el-tooltip>
    <el-tooltip :content="t('common.delete')" placement="top">
      <el-button
        type="danger"
        circle
        :disabled="pageBusy"
        @click="emit('delete-instance')"
      >
        <el-icon><Delete /></el-icon>
      </el-button>
    </el-tooltip>
  </el-space>
</template>

<script setup lang="ts">
/**
 * OpenClaw 实例卡片操作区。
 *
 * 负责实例级常用操作按钮，不直接持有页面状态。
 */
import { Delete, EditPen, Plus, RefreshRight, SwitchButton, VideoPlay } from "@element-plus/icons-vue";

import { useI18n } from "@/composables/useI18n";
import type { OpenClawInstanceOutput } from "@/types/view/openclaw";

defineProps<{
    instance: OpenClawInstanceOutput;
    pageBusy: boolean;
    syncing: boolean;
}>();

const emit = defineEmits<{
    "create-agent": [];
    sync: [];
    "edit-instance": [];
    "toggle-instance": [enable: boolean];
    "delete-instance": [];
}>();

const { t } = useI18n();
</script>
