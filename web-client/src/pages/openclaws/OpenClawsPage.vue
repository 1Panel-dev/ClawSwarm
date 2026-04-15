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
          <InstanceCard
            v-for="instance in instances"
            :key="instance.id"
            :instance="instance"
            :page-busy="pageBusy"
            :syncing="savingId === `instance:${instance.id}:sync`"
            @create-agent="openAgentCreate"
            @sync="syncAgents"
            @edit-instance="openInstanceEdit"
            @toggle-instance="toggleInstance"
            @delete-instance="confirmDeleteInstance"
            @edit-agent="handleAgentTableEdit"
            @toggle-agent="toggleAgent"
          />
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
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import AgentCreateDrawer from "@/pages/openclaws/components/AgentCreateDrawer.vue";
import InstanceCreateDrawer from "@/pages/openclaws/components/InstanceCreateDrawer.vue";
import InstanceCard from "@/pages/openclaws/components/InstanceCard.vue";
import { useI18n } from "@/composables/useI18n";
import { useOpenClawStore } from "@/stores/openclaw";
import type {
  OpenClawAgentCreateInput,
  OpenClawAgentProfileView,
  OpenClawAgentUpdateInput,
  OpenClawAgentView,
  OpenClawInstanceCredentialsView,
  OpenClawInstanceUpdateInput,
  OpenClawInstanceView,
  OpenClawQuickConnectInput,
} from "@/types/view/openclaw";

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
const editingInstance = ref<OpenClawInstanceView | null>(null);
const createCredentials = ref<OpenClawInstanceCredentialsView | null>(null);
const editCredentials = ref<OpenClawInstanceCredentialsView | null>(null);
const editingAgentProfile = ref<OpenClawAgentProfileView | null>(null);
const activeInstanceAgentKeys = ref<string[]>([]);

const instances = computed(() => openClawStore.instances);
const loading = computed(() => openClawStore.loading);
const savingId = computed(() => openClawStore.savingId);
const creating = computed(() => openClawStore.creating);
const creatingAgent = computed(
  () => activeInstanceId.value !== null && openClawStore.creatingAgentForInstanceId === activeInstanceId.value,
);
const editingAgent = computed(
  () => editingAgentProfile.value !== null && openClawStore.editingAgentId === editingAgentProfile.value.id,
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

async function syncAgents(instanceId: number, instanceName: string) {
  syncingAgents.value = true;
  try {
    const result = await openClawStore.syncInstanceAgents(instanceId);
    ElMessage.success(t("openclaw.syncSuccess", {name: instanceName, count: result.importedAgentCount}));
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

async function confirmDeleteInstance(instance: OpenClawInstanceView) {
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

async function openInstanceEdit(instance: OpenClawInstanceView) {
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
  activeInstanceAgentKeys.value = instances.value.find((item) => item.id === instanceId)?.agents.map((agent) => agent.agentKey) ?? [];
  agentDrawerMode.value = "create";
  editingAgentProfile.value = null;
  agentDrawerVisible.value = true;
}

async function openAgentEdit(instanceId: number, instanceName: string, agent: OpenClawAgentView) {
  try {
    activeInstanceId.value = instanceId;
    activeInstanceName.value = instanceName;
    activeInstanceAgentKeys.value = [];
    agentDrawerMode.value = "edit";
    const profile = await openClawStore.loadAgentProfile(agent.id);
    editingAgentProfile.value = profile;
    agentDrawerVisible.value = true;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

function handleAgentTableEdit(agent: OpenClawAgentView & { instanceId: number; instanceName: string }) {
  return openAgentEdit(agent.instanceId, agent.instanceName, agent);
}

async function handleCreateInstance(payload: { mode: "create" } & OpenClawQuickConnectInput) {
  try {
    const result = await openClawStore.quickConnectInstance(payload);
    createCredentials.value = result.credentials;
    ElMessage.success(t("openclaw.connectSuccess", {name: result.instance.name, count: result.importedAgentCount}));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

async function handleEditInstance(payload: { mode: "edit"; instanceId: number } & OpenClawInstanceUpdateInput) {
  try {
    const instance = await openClawStore.updateInstance(payload.instanceId, {
      name: payload.name,
      channelBaseUrl: payload.channelBaseUrl,
      channelAccountId: payload.channelAccountId,
    });
    ElMessage.success(t("openclaw.updateSuccess", {name: instance.name}));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

async function handleCreateAgent(payload: { mode: "create" } & OpenClawAgentCreateInput) {
  if (activeInstanceId.value === null) {
    return;
  }
  try {
    const agent = await openClawStore.createNewAgent(activeInstanceId.value, payload);
    agentDrawerVisible.value = false;
    ElMessage.success(t("openclaw.agentCreateSuccess", {name: agent.displayName}));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

async function handleEditAgent(payload: { mode: "edit"; agentId: number } & OpenClawAgentUpdateInput & { agentKey: string }) {
  try {
    const agent = await openClawStore.updateExistingAgent(payload.agentId, payload);
    agentDrawerVisible.value = false;
    editingAgentProfile.value = null;
    ElMessage.success(t("openclaw.agentUpdateSuccess", {name: agent.displayName}));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

function handleCreateInstanceSubmit(
  payload:
    | ({ mode: "create" } & OpenClawQuickConnectInput)
    | ({ mode: "edit"; instanceId: number } & OpenClawInstanceUpdateInput),
) {
  if (payload.mode === "create") {
    return handleCreateInstance(payload);
  }
}

function handleEditInstanceSubmit(
  payload:
    | ({ mode: "create" } & OpenClawQuickConnectInput)
    | ({ mode: "edit"; instanceId: number } & OpenClawInstanceUpdateInput),
) {
  if (payload.mode === "edit") {
    return handleEditInstance(payload);
  }
}

function handleAgentSubmit(
  payload:
    | ({ mode: "create" } & OpenClawAgentCreateInput)
    | ({ mode: "edit"; agentId: number; agentKey: string } & OpenClawAgentUpdateInput),
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

@media (max-width: 960px) {
  .openclaws-page__panel-header {
    flex-direction: column;
  }
}
</style>
