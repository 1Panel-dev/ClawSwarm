<template>
  <el-card shadow="hover" class="instance-card">
    <div class="instance-card__header">
      <InstanceCardHeader :instance="instance" />
      <InstanceCardActions
        :instance="instance"
        :page-busy="pageBusy"
        :syncing="syncing"
        @create-agent="emit('create-agent', instance.id, instance.name)"
        @sync="emit('sync', instance.id, instance.name)"
        @edit-instance="emit('edit-instance', instance)"
        @toggle-instance="emit('toggle-instance', instance.id, $event)"
        @delete-instance="emit('delete-instance', instance)"
      />
    </div>

    <InstanceAgentTable
      v-if="instance.agents.length"
      :instance="instance"
      :page-busy="pageBusy"
      @edit="emit('edit-agent', $event)"
      @toggle="handleToggleAgent"
    />

    <el-empty v-else :description="t('openclaw.noAgents')" />
  </el-card>
</template>

<script setup lang="ts">
/**
 * OpenClaw 单个实例卡片。
 *
 * 负责把实例头部、实例操作和 Agent 列表表格组合起来。
 */
import { useI18n } from "@/composables/useI18n";
import InstanceAgentTable from "@/pages/openclaws/components/InstanceAgentTable.vue";
import InstanceCardActions from "@/pages/openclaws/components/InstanceCardActions.vue";
import InstanceCardHeader from "@/pages/openclaws/components/InstanceCardHeader.vue";
import type { OpenClawAgentOutput, OpenClawInstanceOutput } from "@/types/view/openclaw";

const props = defineProps<{
    instance: OpenClawInstanceOutput;
    pageBusy: boolean;
    syncing: boolean;
}>();

const emit = defineEmits<{
    "create-agent": [instanceId: number, instanceName: string];
    sync: [instanceId: number, instanceName: string];
    "edit-instance": [instance: OpenClawInstanceOutput];
    "toggle-instance": [instanceId: number, enable: boolean];
    "delete-instance": [instance: OpenClawInstanceOutput];
    "edit-agent": [agent: OpenClawAgentOutput & { instanceId: number; instanceName: string }];
    "toggle-agent": [agentId: number, enable: boolean];
}>();

const { t } = useI18n();

function handleToggleAgent(agentId: number, enable: boolean) {
    emit("toggle-agent", agentId, enable);
}
</script>

<style scoped>
.instance-card {
  display: grid;
  gap: var(--space-3);
}

.instance-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

@media (max-width: 960px) {
  .instance-card__header {
    flex-direction: column;
  }
}
</style>
