<template>
  <div
    class="instance-agent-table"
    :style="{ height: `${tableHeight}px` }"
  >
    <el-auto-resizer>
      <template #default="{ width }">
        <el-table-v2
          :columns="columns"
          :data="rows"
          :width="width"
          :height="tableHeight"
          :row-height="AGENT_TABLE_ROW_HEIGHT"
          :header-height="AGENT_TABLE_HEADER_HEIGHT"
        />
      </template>
    </el-auto-resizer>
  </div>
</template>

<script setup lang="ts">
/**
 * OpenClaw 实例卡片中的 Agent 列表表格。
 *
 * 使用 el-table-v2 做虚拟滚动，并把列定义和操作按钮渲染集中到这里，
 * 让页面本身只保留实例卡片和事件处理。
 */
import { EditPen, SwitchButton, VideoPlay } from "@element-plus/icons-vue";
import { ElButton, ElIcon, ElTag, ElTooltip } from "element-plus";
import { computed, h } from "vue";

import { useI18n } from "@/composables/useI18n";
import type { OpenClawAgentOutput, OpenClawInstanceOutput } from "@/types/view/openclaw";

type AgentTableRow = OpenClawAgentOutput & {
  instanceId: number;
  instanceName: string;
};

const props = defineProps<{
  instance: OpenClawInstanceOutput;
  pageBusy: boolean;
}>();

const emit = defineEmits<{
  edit: [agent: AgentTableRow];
  toggle: [agentId: number, enable: boolean];
}>();

const { t } = useI18n();

const AGENT_TABLE_ROW_HEIGHT = 52;
const AGENT_TABLE_HEADER_HEIGHT = 44;
const AGENT_TABLE_MAX_VISIBLE_ROWS = 5;

const rows = computed<AgentTableRow[]>(() =>
  props.instance.agents.map((agent) => ({
    ...agent,
    instanceId: props.instance.id,
    instanceName: props.instance.name,
  })),
);

const tableHeight = computed(
  () => AGENT_TABLE_HEADER_HEIGHT + Math.min(rows.value.length, AGENT_TABLE_MAX_VISIBLE_ROWS) * AGENT_TABLE_ROW_HEIGHT,
);

function canEditAgent(agent: OpenClawAgentOutput) {
  return agent.createdViaClawswarm || agent.agentKey.trim().toLowerCase() !== "main";
}

const columns = computed<any[]>(() => [
  {
    key: "displayName",
    dataKey: "displayName",
    title: t("openclaw.displayName"),
    width: 220,
    minWidth: 200,
    flexGrow: 1.4,
  },
  {
    key: "agentKey",
    dataKey: "agentKey",
    title: t("openclaw.agentKey"),
    width: 220,
    minWidth: 200,
    flexGrow: 1.4,
  },
  {
    key: "csId",
    dataKey: "csId",
    title: "CS ID",
    width: 160,
    minWidth: 150,
    flexGrow: 1,
  },
  {
    key: "roleName",
    dataKey: "roleName",
    title: t("openclaw.roleName"),
    width: 180,
    minWidth: 160,
    flexGrow: 1.2,
    cellRenderer: ({ cellData }: { cellData: string | null }) => cellData || "—",
  },
  {
    key: "enabled",
    dataKey: "enabled",
    title: t("openclaw.agentStatus"),
    width: 120,
    minWidth: 120,
    cellRenderer: ({ cellData }: { cellData: boolean }) =>
      h(
        ElTag,
        { type: cellData ? "success" : "info", effect: "light" },
        () => (cellData ? t("common.enable") : t("common.disable")),
      ),
  },
  {
    key: "actions",
    dataKey: "id",
    title: t("openclaw.actions"),
    width: 180,
    minWidth: 170,
    align: "center",
    cellRenderer: ({ rowData }: { rowData: AgentTableRow }) =>
      h("div", { class: "instance-agent-table__actions" }, [
        canEditAgent(rowData)
          ? h(
              ElTooltip,
              { content: t("common.edit"), placement: "top" },
              () =>
                h(
                  ElButton,
                  {
                    circle: true,
                    disabled: props.pageBusy,
                    onClick: () => emit("edit", rowData),
                  },
                  () => h(ElIcon, null, () => h(EditPen)),
                ),
            )
          : null,
        h(
          ElTooltip,
          {
            content: rowData.enabled ? t("common.disable") : t("common.enable"),
            placement: "top",
          },
          () =>
            h(
              ElButton,
              {
                type: rowData.enabled ? "warning" : "success",
                circle: true,
                disabled: props.pageBusy,
                    onClick: () => emit("toggle", rowData.id, !rowData.enabled),
              },
              () => h(ElIcon, null, () => h(rowData.enabled ? SwitchButton : VideoPlay)),
            ),
        ),
      ]),
  },
]);
</script>

<style scoped>
.instance-agent-table__actions {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  flex-direction: row;
  flex-wrap: nowrap;
  white-space: nowrap;
}
</style>
