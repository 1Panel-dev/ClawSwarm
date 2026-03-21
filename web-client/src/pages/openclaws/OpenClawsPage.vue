<template>
  <div class="page-shell">
    <section class="hero page-card page-shell__header">
      <div>
        <div class="hero__eyebrow">OpenClaw</div>
        <h1 class="hero__title">OpenClaw 与 Agent 管理</h1>
        <p class="hero__description">
          这个模块现在已经接上了第一阶段的真实实例列表。你可以在这里查看 OpenClaw、查看实例下的 Agent，并进行启用/禁用操作。
        </p>
      </div>
      <div class="hero__actions">
        <div class="hero__badge">阶段一：基础管理可用</div>
        <button class="hero__button" @click="createDrawerVisible = true">新增实例</button>
      </div>
    </section>

    <section class="grid page-grid">
      <article class="card page-card">
        <div class="card__header">
          <h2 class="card__title">实例列表</h2>
          <span class="card__meta">{{ instances.length }} 套</span>
        </div>

        <div v-if="loading" class="card__empty">正在加载 OpenClaw 实例...</div>
        <div v-else-if="!instances.length" class="card__empty">当前还没有 OpenClaw 实例。</div>

        <div v-else class="instance-list">
          <article v-for="instance in instances" :key="instance.id" class="instance-card">
            <header class="instance-card__header">
              <div>
                <div class="instance-card__title">{{ instance.name }}</div>
                <div class="instance-card__meta">{{ instance.channel_base_url }}</div>
              </div>
              <div class="instance-card__actions">
                <span class="status-pill" :class="statusClass(instance.status)">
                  {{ statusLabel(instance.status) }}
                </span>
                <button
                  class="action-button"
                  :disabled="savingId === `instance:${instance.id}`"
                  @click="toggleInstance(instance.id, instance.status !== 'active')"
                >
                  {{ instance.status === "active" ? "禁用" : "启用" }}
                </button>
              </div>
            </header>

            <div class="instance-card__body">
              <div class="instance-card__section-header">
                <div class="instance-card__section-title">Agent</div>
                <button class="action-button action-button--ghost" @click="openAgentCreate(instance.id, instance.name)">
                  新增 Agent
                </button>
              </div>
              <div v-if="!instance.agents.length" class="instance-card__empty">当前实例下还没有 Agent。</div>
              <div v-for="agent in instance.agents" :key="agent.id" class="agent-row">
                <div>
                  <div class="agent-row__title">{{ agent.display_name }}</div>
                  <div class="agent-row__meta">
                    {{ agent.agent_key }}<span v-if="agent.role_name"> / {{ agent.role_name }}</span>
                  </div>
                </div>
                <div class="instance-card__actions">
                  <span class="status-pill" :class="agent.enabled ? 'status-pill--active' : 'status-pill--disabled'">
                    {{ agent.enabled ? "启用" : "禁用" }}
                  </span>
                  <button
                    class="action-button action-button--ghost"
                    :disabled="savingId === `agent:${agent.id}`"
                    @click="toggleAgent(agent.id, !agent.enabled)"
                  >
                    {{ agent.enabled ? "停用" : "启用" }}
                  </button>
                </div>
              </div>
            </div>
          </article>
        </div>
      </article>

      <article class="card page-card">
        <h2 class="card__title">当前阶段说明</h2>
        <p class="card__text">
          当前页面已经接上真实数据，但还没有做“新增实例 / 编辑配置 / 创建 Agent”这类表单操作。下一阶段会在这个页面继续补这些功能，而不需要推翻现有布局。
        </p>
        <ul class="card__list">
          <li>已支持实例列表与状态展示</li>
          <li>已支持实例启用/禁用</li>
          <li>已支持 Agent 列表与启用/禁用</li>
          <li>后续再接创建、编辑和更多状态细节</li>
        </ul>
      </article>
    </section>

    <InstanceCreateDrawer
      v-model:visible="createDrawerVisible"
      :submitting="creating"
      @submit="handleCreateInstance"
    />

    <AgentCreateDrawer
      v-model:visible="agentDrawerVisible"
      :submitting="creatingAgent"
      :instance-name="activeInstanceName"
      @submit="handleCreateAgent"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * OpenClaw 页面现在开始承载真实的实例管理能力。
 *
 * 第一阶段先把“看列表 + 启用/禁用”做稳；
 * 创建和配置类表单后续在这个模块里继续补即可。
 */
import { computed, onMounted } from "vue";
import { ref } from "vue";
import ElMessage from "element-plus/es/components/message/index";

import AgentCreateDrawer from "@/components/openclaw/AgentCreateDrawer.vue";
import InstanceCreateDrawer from "@/components/openclaw/InstanceCreateDrawer.vue";
import { useOpenClawStore } from "@/stores/openclaw";

const openClawStore = useOpenClawStore();
const createDrawerVisible = ref(false);
const agentDrawerVisible = ref(false);
const activeInstanceId = ref<number | null>(null);
const activeInstanceName = ref("");

const instances = computed(() => openClawStore.instances);
const loading = computed(() => openClawStore.loading);
const savingId = computed(() => openClawStore.savingId);
const creating = computed(() => openClawStore.creating);
const creatingAgent = computed(
    () => activeInstanceId.value !== null && openClawStore.creatingAgentForInstanceId === activeInstanceId.value,
);

onMounted(async () => {
    if (!instances.value.length) {
        await openClawStore.loadInstances();
    }
});

function statusLabel(status: string) {
    if (status === "active") {
        return "在线";
    }
    if (status === "offline") {
        return "离线";
    }
    return "禁用";
}

function statusClass(status: string) {
    if (status === "active") {
        return "status-pill--active";
    }
    if (status === "offline") {
        return "status-pill--offline";
    }
    return "status-pill--disabled";
}

async function toggleInstance(instanceId: number, enable: boolean) {
    await openClawStore.setInstanceEnabled(instanceId, enable);
}

async function toggleAgent(agentId: number, enable: boolean) {
    await openClawStore.setAgentEnabled(agentId, enable);
}

async function handleCreateInstance(payload: {
    name: string;
    channel_base_url: string;
    channel_account_id: string;
    channel_signing_secret: string;
    callback_token: string;
}) {
    const instance = await openClawStore.createNewInstance(payload);
    createDrawerVisible.value = false;
    ElMessage.success(`实例“${instance.name}”已创建`);
}

function openAgentCreate(instanceId: number, instanceName: string) {
    activeInstanceId.value = instanceId;
    activeInstanceName.value = instanceName;
    agentDrawerVisible.value = true;
}

async function handleCreateAgent(payload: {
    agent_key: string;
    display_name: string;
    role_name: string;
}) {
    if (activeInstanceId.value === null) {
        return;
    }
    const agent = await openClawStore.createNewAgent(activeInstanceId.value, payload);
    agentDrawerVisible.value = false;
    ElMessage.success(`Agent“${agent.display_name}”已创建`);
}
</script>

<style scoped>
.hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  background: linear-gradient(135deg, var(--color-bg-panel), color-mix(in srgb, var(--color-bg-soft) 65%, white));
}

.hero__eyebrow {
  color: var(--color-text-secondary);
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero__title {
  margin: 8px 0 12px;
  font-size: 1.9rem;
}

.hero__description {
  margin: 0;
  max-width: 62ch;
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.hero__badge {
  padding: 10px 14px;
  border-radius: 999px;
  background: var(--color-bg-app);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.hero__actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.hero__button {
  padding: 10px 14px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  cursor: pointer;
}

.grid {
}

.card {
  gap: var(--space-3);
  background: var(--color-bg-app);
}

.card__title {
  margin: 0;
  font-size: 1.15rem;
}

.card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.card__meta {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

.card__text {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.card__list {
  margin: 0;
  padding-left: 1.2rem;
  color: var(--color-text-secondary);
  line-height: 1.8;
}

.card__empty {
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.instance-list {
  display: grid;
  gap: var(--space-4);
}

.instance-card {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-panel);
}

.instance-card__header,
.agent-row,
.instance-card__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.instance-card__title,
.agent-row__title {
  font-weight: 700;
}

.instance-card__meta,
.agent-row__meta,
.instance-card__empty {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

.instance-card__body {
  display: grid;
  gap: var(--space-3);
}

.instance-card__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.instance-card__section-title {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.status-pill {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  white-space: nowrap;
}

.status-pill--active {
  background: color-mix(in srgb, var(--color-success) 12%, var(--color-bg-app));
  color: var(--color-success);
}

.status-pill--offline {
  background: color-mix(in srgb, var(--color-text-secondary) 12%, var(--color-bg-app));
  color: var(--color-text-secondary);
}

.status-pill--disabled {
  background: color-mix(in srgb, var(--color-danger) 12%, var(--color-bg-app));
  color: var(--color-danger);
}

.action-button {
  padding: 8px 12px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  cursor: pointer;
}

.action-button--ghost {
  border: 1px solid var(--color-border);
  background: var(--color-bg-app);
  color: var(--color-text-primary);
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 960px) {
  .hero,
  .grid {
    grid-template-columns: 1fr;
    flex-direction: column;
  }
}
</style>
