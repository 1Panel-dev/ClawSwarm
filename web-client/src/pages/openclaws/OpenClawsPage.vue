<template>
  <div class="page-container">
    <section class="page-container__body" v-loading="syncingAgents" element-loading-background="rgba(122, 122, 122, 0.8)">
      <el-card shadow="never">
        <template #header>
          <div class="openclaws-page__panel-header">
            <el-space wrap>
              <h2 class="page-section-title">{{ t("openclaw.instanceList") }}</h2>
              <el-tag type="info" effect="plain">{{ instances.length }}</el-tag>
            </el-space>
            <el-button type="primary" :disabled="pageBusy" @click="openCreateInstance">
              {{ t("openclaw.addInstance") }}
            </el-button>
          </div>
        </template>

        <el-empty v-if="loading && !instances.length" :description="t('openclaw.loadingInstances')"/>
        <el-empty v-else-if="!instances.length" :description="t('openclaw.noInstances')"/>

        <div v-else class="openclaws-page__instance-list">
          <el-card
            v-for="instance in instances"
            :key="instance.id"
            shadow="hover"
            class="openclaws-page__instance"
          >
            <div class="openclaws-page__instance-header">
              <div>
                <div class="openclaws-page__instance-title">
                  {{ instance.name }}
                  <el-tag :type="statusTagType(instance.status)" effect="light">
                    {{ statusLabel(instance.status) }}
                  </el-tag>
                </div>
                <div class="openclaws-page__instance-meta">{{ instance.channel_base_url }}</div>
              </div>

              <el-space wrap class="openclaws-page__instance-actions">
                <el-tooltip :content="t('openclaw.addAgent')" placement="top">
                  <el-button type="primary" circle :disabled="pageBusy" @click="openAgentCreate(instance.id, instance.name)">
                    <el-icon><Plus /></el-icon>
                  </el-button>
                </el-tooltip>
                <el-tooltip :content="t('openclaw.syncAgents')" placement="top">
                  <el-button
                    circle
                    :loading="savingId === `instance:${instance.id}:sync`"
                    :disabled="pageBusy"
                    @click="syncAgents(instance.id, instance.name)"
                  >
                    <el-icon><RefreshRight /></el-icon>
                  </el-button>
                </el-tooltip>
                <el-tooltip :content="t('openclaw.editInstance')" placement="top">
                  <el-button circle :disabled="pageBusy" @click="openInstanceEdit(instance)">
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
                    @click="toggleInstance(instance.id, instance.status !== 'active')"
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
                    @click="confirmDeleteInstance(instance)"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </el-tooltip>
              </el-space>
            </div>

            <div
              v-if="instance.agents.length"
              class="openclaws-page__agent-table"
              :style="{ height: `${getAgentTableHeight(instance.agents.length)}px` }"
            >
              <el-auto-resizer>
                <template #default="{ width }">
                  <el-table-v2
                    :columns="agentTableColumns"
                    :data="getAgentTableRows(instance)"
                    :width="width"
                    :height="getAgentTableHeight(instance.agents.length)"
                    :row-height="AGENT_TABLE_ROW_HEIGHT"
                    :header-height="AGENT_TABLE_HEADER_HEIGHT"
                  />
                </template>
              </el-auto-resizer>
            </div>

            <el-empty v-else :description="t('openclaw.noAgents')"/>
          </el-card>
        </div>
      </el-card>
    </section>

    <InstanceCreateDrawer
      v-model:visible="createDrawerVisible"
      :submitting="creating"
      :credentials="createCredentials"
      mode="create"
      @submit="handleCreateInstanceSubmit"
    />

    <InstanceCreateDrawer
      v-model:visible="editDrawerVisible"
      :submitting="creating"
      mode="edit"
      :initial-value="editingInstance"
      :credentials="editCredentials"
      @submit="handleEditInstanceSubmit"
    />

    <AgentCreateDrawer
      v-model:visible="agentDrawerVisible"
      :submitting="creatingAgent || editingAgent"
      :instance-name="activeInstanceName"
      :existing-agent-keys="activeInstanceAgentKeys"
      :mode="agentDrawerMode"
      :initial-value="editingAgentProfile"
      @submit="handleAgentSubmit"
    />

  </div>
</template>

<script setup lang="ts">
import { Delete, EditPen, Plus, RefreshRight, SwitchButton, VideoPlay } from "@element-plus/icons-vue";
import { ElButton, ElIcon, ElTag, ElTooltip } from "element-plus";
import {computed, h, onBeforeUnmount, onMounted, ref} from "vue";

import AgentCreateDrawer from "@/pages/openclaws/components/AgentCreateDrawer.vue";
import InstanceCreateDrawer from "@/pages/openclaws/components/InstanceCreateDrawer.vue";
import {useI18n} from "@/composables/useI18n";
import {useOpenClawStore} from "@/stores/openclaw";
import type {OpenClawInstanceView} from "@/stores/openclaw";
import type {AgentReadApi} from "@/types/api/agent";
import type {InstanceCredentialsReadApi, InstanceReadApi} from "@/types/api/instance";

const openClawStore = useOpenClawStore();
const {t} = useI18n();

const createDrawerVisible = ref(false);
const editDrawerVisible = ref(false);
const agentDrawerVisible = ref(false);
const agentDrawerMode = ref<"create" | "edit">("create");
const syncingAgents = ref(false);
const refreshTimer = ref<number | null>(null);
const activeInstanceId = ref<number | null>(null);
const activeInstanceName = ref("");
const editingInstance = ref<InstanceReadApi | null>(null);
const createCredentials = ref<InstanceCredentialsReadApi | null>(null);
const editCredentials = ref<InstanceCredentialsReadApi | null>(null);
const editingAgentProfile = ref<{
  agent_id: number;
  agent_key: string;
  display_name: string;
  role_name: string | null;
  agents_md: string;
  tools_md: string;
  identity_md: string;
  soul_md: string;
  user_md: string;
  memory_md: string;
  heartbeat_md: string;
} | null>(null);
const activeInstanceAgentKeys = ref<string[]>([]);

const instances = computed(() => openClawStore.instances);
const loading = computed(() => openClawStore.loading);
const savingId = computed(() => openClawStore.savingId);
const creating = computed(() => openClawStore.creating);
const creatingAgent = computed(
  () => activeInstanceId.value !== null && openClawStore.creatingAgentForInstanceId === activeInstanceId.value,
);
const editingAgent = computed(
  () => editingAgentProfile.value !== null && openClawStore.editingAgentId === editingAgentProfile.value.agent_id,
);
const loadingAgentProfileId = computed(() => openClawStore.loadingAgentProfileId);
const pageBusy = computed(
  () =>
    syncingAgents.value ||
    loading.value ||
    creating.value ||
    savingId.value !== null ||
    creatingAgent.value ||
    editingAgent.value ||
    loadingAgentProfileId.value !== null,
);

const AGENT_TABLE_ROW_HEIGHT = 52;
const AGENT_TABLE_HEADER_HEIGHT = 44;
const AGENT_TABLE_MAX_VISIBLE_ROWS = 5;

type AgentTableRow = AgentReadApi & {
  instanceId: number;
  instanceName: string;
};

function getAgentTableRows(instance: OpenClawInstanceView): AgentTableRow[] {
  return instance.agents.map((agent) => ({
    ...agent,
    instanceId: instance.id,
    instanceName: instance.name,
  }));
}

function getAgentTableHeight(agentCount: number) {
  return AGENT_TABLE_HEADER_HEIGHT + Math.min(agentCount, AGENT_TABLE_MAX_VISIBLE_ROWS) * AGENT_TABLE_ROW_HEIGHT;
}

const agentTableColumns = computed<any[]>(() => [
  {
    key: "display_name",
    dataKey: "display_name",
    title: t("openclaw.displayName"),
    width: 220,
    minWidth: 200,
    flexGrow: 1.4,
  },
  {
    key: "agent_key",
    dataKey: "agent_key",
    title: t("openclaw.agentKey"),
    width: 220,
    minWidth: 200,
    flexGrow: 1.4,
  },
  {
    key: "cs_id",
    dataKey: "cs_id",
    title: "CS ID",
    width: 160,
    minWidth: 150,
    flexGrow: 1,
  },
  {
    key: "role_name",
    dataKey: "role_name",
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
      h("div", { class: "openclaws-page__agent-actions" }, [
        canEditAgent(rowData)
          ? h(
              ElTooltip,
              { content: t("common.edit"), placement: "top" },
              () =>
                h(
                  ElButton,
                  {
                    circle: true,
                    disabled: pageBusy.value,
                    onClick: () => openAgentEdit(rowData.instanceId, rowData.instanceName, rowData),
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
                disabled: pageBusy.value,
                onClick: () => toggleAgent(rowData.id, !rowData.enabled),
              },
              () => h(ElIcon, null, () => h(rowData.enabled ? SwitchButton : VideoPlay)),
            ),
        ),
      ]),
  },
]);

onMounted(async () => {
  if (!instances.value.length) {
    await openClawStore.loadInstances();
  }
  await openClawStore.refreshInstanceHealth();
  startInstancePolling();
});

onBeforeUnmount(() => {
  stopInstancePolling();
});

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

function canEditAgent(agent: AgentReadApi) {
  return agent.created_via_clawswarm || agent.agent_key.trim().toLowerCase() !== "main";
}

async function syncAgents(instanceId: number, instanceName: string) {
  syncingAgents.value = true;
  try {
    const result = await openClawStore.syncInstanceAgents(instanceId);
    ElMessage.success(t("openclaw.syncSuccess", {name: instanceName, count: result.imported_agent_count}));
  } finally {
    syncingAgents.value = false;
  }
}

function startInstancePolling(intervalMs = 60_000) {
  stopInstancePolling();
  refreshTimer.value = window.setInterval(() => {
    if (!pageBusy.value) {
      void openClawStore.refreshInstanceHealth();
    }
  }, intervalMs);
}

function stopInstancePolling() {
  if (refreshTimer.value !== null) {
    window.clearInterval(refreshTimer.value);
    refreshTimer.value = null;
  }
}

async function toggleInstance(instanceId: number, enable: boolean) {
  await openClawStore.setInstanceEnabled(instanceId, enable);
}

async function confirmDeleteInstance(instance: InstanceReadApi) {
  try {
    await ElMessageBox.confirm(
      t("openclaw.deleteInstanceConfirm", {name: instance.name}),
      t("common.confirm"),
      {
        type: "warning",
        confirmButtonText: t("common.confirm"),
        cancelButtonText: t("common.cancel"),
      },
    );
  } catch {
    return;
  }

  try {
    await openClawStore.deleteExistingInstance(instance.id);
    ElMessage.success(t("openclaw.deleteInstanceSuccess", {name: instance.name}));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

async function toggleAgent(agentId: number, enable: boolean) {
  await openClawStore.setAgentEnabled(agentId, enable);
}

function openCreateInstance() {
  createCredentials.value = null;
  createDrawerVisible.value = true;
}

async function openInstanceEdit(instance: InstanceReadApi) {
  try {
    editingInstance.value = instance;
    editCredentials.value = await openClawStore.loadInstanceCredentials(instance.id);
    editDrawerVisible.value = true;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

function openAgentCreate(instanceId: number, instanceName: string) {
  activeInstanceId.value = instanceId;
  activeInstanceName.value = instanceName;
  activeInstanceAgentKeys.value = instances.value.find((item) => item.id === instanceId)?.agents.map((agent) => agent.agent_key) ?? [];
  agentDrawerMode.value = "create";
  editingAgentProfile.value = null;
  agentDrawerVisible.value = true;
}

async function openAgentEdit(instanceId: number, instanceName: string, agent: AgentReadApi) {
  try {
    activeInstanceId.value = instanceId;
    activeInstanceName.value = instanceName;
    activeInstanceAgentKeys.value = [];
    agentDrawerMode.value = "edit";
    const profile = await openClawStore.loadAgentProfile(agent.id);
    editingAgentProfile.value = {
      agent_id: profile.id,
      agent_key: profile.agent_key,
      display_name: profile.display_name,
      role_name: profile.role_name,
      agents_md: profile.agents_md,
      tools_md: profile.tools_md,
      identity_md: profile.identity_md,
      soul_md: profile.soul_md,
      user_md: profile.user_md,
      memory_md: profile.memory_md,
      heartbeat_md: profile.heartbeat_md,
    };
    agentDrawerVisible.value = true;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

async function handleCreateInstance(payload: {
  mode: "create";
  name: string;
  channel_base_url: string;
  channel_account_id: string;
}) {
  try {
    const result = await openClawStore.quickConnectInstance(payload);
    createCredentials.value = result.credentials;
    ElMessage.success(t("openclaw.connectSuccess", {name: result.instance.name, count: result.imported_agent_count}));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

async function handleEditInstance(payload: {
  mode: "edit";
  instance_id: number;
  name: string;
  channel_base_url: string;
  channel_account_id: string;
}) {
  try {
    const instance = await openClawStore.updateInstance(payload.instance_id, {
      name: payload.name,
      channel_base_url: payload.channel_base_url,
      channel_account_id: payload.channel_account_id,
    });
    ElMessage.success(t("openclaw.updateSuccess", {name: instance.name}));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

async function handleCreateAgent(payload: {
  mode: "create";
  agent_key: string;
  display_name: string;
  role_name: string;
  agents_md?: string;
  tools_md?: string;
  identity_md?: string;
  soul_md?: string;
  user_md?: string;
  memory_md?: string;
  heartbeat_md?: string;
}) {
  if (activeInstanceId.value === null) {
    return;
  }
  try {
    const agent = await openClawStore.createNewAgent(activeInstanceId.value, payload);
    agentDrawerVisible.value = false;
    ElMessage.success(t("openclaw.agentCreateSuccess", {name: agent.display_name}));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

async function handleEditAgent(payload: {
  mode: "edit";
  agent_id: number;
  agent_key: string;
  display_name: string;
  role_name: string;
  agents_md?: string;
  tools_md?: string;
  identity_md?: string;
  soul_md?: string;
  user_md?: string;
  memory_md?: string;
  heartbeat_md?: string;
}) {
  try {
    const agent = await openClawStore.updateExistingAgent(payload.agent_id, {
      display_name: payload.display_name,
      role_name: payload.role_name,
      agents_md: payload.agents_md,
      tools_md: payload.tools_md,
      identity_md: payload.identity_md,
      soul_md: payload.soul_md,
      user_md: payload.user_md,
      memory_md: payload.memory_md,
      heartbeat_md: payload.heartbeat_md,
    });
    agentDrawerVisible.value = false;
    editingAgentProfile.value = null;
    ElMessage.success(t("openclaw.agentUpdateSuccess", {name: agent.display_name}));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

function handleCreateInstanceSubmit(
  payload:
    | {
    mode: "create";
    name: string;
    channel_base_url: string;
    channel_account_id: string;
  }
    | {
    mode: "edit";
    instance_id: number;
    name: string;
    channel_base_url: string;
    channel_account_id: string;
  },
) {
  if (payload.mode === "create") {
    return handleCreateInstance(payload);
  }
}

function handleEditInstanceSubmit(
  payload:
    | {
    mode: "create";
    name: string;
    channel_base_url: string;
    channel_account_id: string;
  }
    | {
    mode: "edit";
    instance_id: number;
    name: string;
    channel_base_url: string;
    channel_account_id: string;
  },
) {
  if (payload.mode === "edit") {
    return handleEditInstance(payload);
  }
}

function handleAgentSubmit(
  payload:
    | {
    mode: "create";
    agent_key: string;
    display_name: string;
    role_name: string;
    agents_md?: string;
    tools_md?: string;
    identity_md?: string;
    soul_md?: string;
    user_md?: string;
    memory_md?: string;
    heartbeat_md?: string;
  }
    | {
    mode: "edit";
    agent_id: number;
    agent_key: string;
    display_name: string;
    role_name: string;
    agents_md?: string;
    tools_md?: string;
    identity_md?: string;
    soul_md?: string;
    user_md?: string;
    memory_md?: string;
    heartbeat_md?: string;
  },
) {
  if (payload.mode === "edit") {
    return handleEditAgent(payload);
  }
  return handleCreateAgent(payload);
}

</script>

<style scoped>
.page-container {
  height: 100%;
  min-height: 0;
  overflow: auto;
}

.openclaws-page__panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.openclaws-page__instance-list {
  display: grid;
  gap: var(--space-4);
}

.openclaws-page__instance {
  display: grid;
  gap: var(--space-3);
}

.openclaws-page__agent-actions {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  flex-direction: row;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.openclaws-page__instance-actions {
  align-items: center;
}

.openclaws-page__instance-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.openclaws-page__instance-title {
  font-weight: 700;
}

.openclaws-page__instance-meta {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

@media (max-width: 960px) {
  .openclaws-page__instance-header,
  .openclaws-page__panel-header {
    flex-direction: column;
  }
}
</style>
