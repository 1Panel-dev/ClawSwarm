<template>
  <section class="hermes-pane" v-loading="pageBusy">
    <el-card shadow="never">
      <template #header>
        <div class="hermes-pane__header">
          <el-space wrap>
            <h2 class="page-section-title">{{ t("hermes.endpointList") }}</h2>
            <el-tag type="info" effect="plain">{{ endpoints.length }}</el-tag>
          </el-space>
          <el-button type="primary" @click="openEndpointCreate">
            {{ t("hermes.addEndpoint") }}
          </el-button>
        </div>
      </template>

      <el-empty v-if="store.loading && !endpoints.length" :description="t('hermes.loadingInstances')" />
      <el-empty v-else-if="!endpoints.length" :description="t('hermes.noEndpoints')" />

      <div v-else class="hermes-pane__list">
        <el-card v-for="endpoint in endpoints" :key="endpoint.id" shadow="hover" class="hermes-endpoint-card">
          <div class="hermes-endpoint-card__header">
            <div class="hermes-endpoint-card__main">
              <el-space wrap>
                <strong>{{ endpoint.displayName }}</strong>
                <el-tag type="info" effect="plain">{{ endpoint.csId }}</el-tag>
                <el-tag :type="endpoint.status === 'active' ? 'success' : 'info'" effect="plain">
                  {{ endpoint.status === "active" ? t("openclaw.online") : t("openclaw.inactive") }}
                </el-tag>
              </el-space>
              <p class="hermes-endpoint-card__meta">
                {{ endpoint.name }} · {{ endpoint.defaultModel || endpoint.instanceKey }}
              </p>
              <p class="hermes-endpoint-card__url">{{ endpoint.apiBaseUrl }}</p>
            </div>
            <el-space wrap>
              <el-tooltip :content="t('hermes.chat')" placement="top">
                <el-button circle type="primary" @click="openConversation(endpoint)">
                  <el-icon><ChatDotRound /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip :content="t('hermes.testConnection')" placement="top">
                <el-button circle @click="testEndpoint(endpoint)">
                  <el-icon><Connection /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip :content="t('common.edit')" placement="top">
                <el-button circle @click="openEndpointEdit(endpoint)">
                  <el-icon><EditPen /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip :content="endpoint.status === 'active' ? t('common.disable') : t('common.enable')" placement="top">
                <el-button circle :type="endpoint.status === 'active' ? 'warning' : 'success'" @click="toggleEndpoint(endpoint)">
                  <el-icon>
                    <component :is="endpoint.status === 'active' ? SwitchButton : VideoPlay" />
                  </el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip :content="t('common.delete')" placement="top">
                <el-button circle type="danger" @click="confirmDeleteEndpoint(endpoint)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-tooltip>
            </el-space>
          </div>
        </el-card>
      </div>
    </el-card>

    <el-drawer v-model="drawerVisible" :title="drawerTitle" size="520px">
      <el-form label-position="top">
        <el-form-item :label="t('hermes.endpointName')">
          <el-input v-model="form.name" maxlength="120" />
        </el-form-item>
        <el-form-item :label="t('hermes.displayName')">
          <el-input v-model="form.displayName" maxlength="120" />
        </el-form-item>
        <el-form-item :label="t('hermes.roleName')">
          <el-input v-model="form.roleName" maxlength="120" />
        </el-form-item>
        <el-form-item :label="t('hermes.apiBaseUrl')">
          <el-input v-model="form.apiBaseUrl" maxlength="500" />
        </el-form-item>
        <el-form-item label="API Key">
          <el-input
            v-model="form.apiKey"
            type="password"
            show-password
            maxlength="255"
            autocomplete="new-password"
            name="hermes-api-key"
          />
        </el-form-item>
        <el-form-item :label="t('hermes.defaultModel')">
          <el-input v-model="form.defaultModel" maxlength="120" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="drawerVisible = false">{{ t("common.cancel") }}</el-button>
        <el-button type="primary" @click="submitEndpoint">{{ t("common.save") }}</el-button>
      </template>
    </el-drawer>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ChatDotRound, Connection, Delete, EditPen, SwitchButton, VideoPlay } from "@element-plus/icons-vue";

import { useI18n } from "@/composables/useI18n";
import { useConversationStore } from "@/stores/conversation";
import { useHermesStore } from "@/stores/hermes";
import type { HermesInstanceOutput } from "@/types/view/hermes";

const store = useHermesStore();
const conversationStore = useConversationStore();
const router = useRouter();
const {t} = useI18n();

const drawerVisible = ref(false);
const mode = ref<"create" | "edit">("create");
const editingEndpointId = ref<number | null>(null);

const form = reactive({
  name: "",
  displayName: "",
  roleName: "",
  apiBaseUrl: "",
  apiKey: "",
  defaultModel: "",
});

const endpoints = computed(() => store.instances);
const pageBusy = computed(() => store.loading || store.creating || store.savingId !== null);
const drawerTitle = computed(() => mode.value === "create" ? t("hermes.addEndpoint") : t("hermes.editEndpoint"));

onMounted(async () => {
  if (!endpoints.value.length) {
    await store.loadInstances();
  }
});

function resetForm() {
  form.name = "";
  form.displayName = "";
  form.roleName = "";
  form.apiBaseUrl = "";
  form.apiKey = "";
  form.defaultModel = "";
}

function openEndpointCreate() {
  mode.value = "create";
  editingEndpointId.value = null;
  resetForm();
  drawerVisible.value = true;
}

function openEndpointEdit(endpoint: HermesInstanceOutput) {
  mode.value = "edit";
  editingEndpointId.value = endpoint.id;
  form.name = endpoint.name;
  form.displayName = endpoint.displayName;
  form.roleName = endpoint.roleName ?? "";
  form.apiBaseUrl = endpoint.apiBaseUrl;
  form.apiKey = "";
  form.defaultModel = endpoint.defaultModel ?? "";
  drawerVisible.value = true;
}

async function submitEndpoint() {
  const payload = {
    name: form.name,
    displayName: form.displayName,
    roleName: form.roleName || null,
    apiBaseUrl: form.apiBaseUrl,
    defaultModel: form.defaultModel || null,
    apiKey: mode.value === "create" || form.apiKey ? form.apiKey || null : undefined,
  };
  try {
    if (mode.value === "edit" && editingEndpointId.value !== null) {
      await store.updateInstance(editingEndpointId.value, payload);
    } else {
      await store.createInstance(payload);
    }
    drawerVisible.value = false;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

async function testEndpoint(endpoint: HermesInstanceOutput) {
  try {
    await store.testInstance(endpoint.id);
    ElMessage.success(t("hermes.testSuccess"));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

async function toggleEndpoint(endpoint: HermesInstanceOutput) {
  await store.setInstanceEnabled(endpoint.id, endpoint.status !== "active");
}

async function confirmDeleteEndpoint(endpoint: HermesInstanceOutput) {
  try {
    await ElMessageBox.confirm(t("hermes.deleteEndpointConfirm", {name: endpoint.displayName}), t("common.confirm"), {
      type: "warning",
      confirmButtonText: t("common.confirm"),
      cancelButtonText: t("common.cancel"),
    });
  } catch {
    return;
  }
  await store.deleteInstance(endpoint.id);
}

async function openConversation(endpoint: HermesInstanceOutput) {
  try {
    const conversation = await store.openInstanceConversation(endpoint.id);
    await conversationStore.openConversation(conversation.id, conversation);
    await router.push(`/messages/conversation/${conversation.id}`);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}
</script>

<style scoped>
.hermes-pane__header,
.hermes-endpoint-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.hermes-pane__list {
  display: grid;
  gap: var(--space-4);
}

.hermes-endpoint-card__main {
  min-width: 0;
}

.hermes-endpoint-card__meta,
.hermes-endpoint-card__url {
  margin: var(--space-1) 0 0;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.hermes-endpoint-card__url {
  word-break: break-all;
}

@media (max-width: 960px) {
  .hermes-pane__header,
  .hermes-endpoint-card__header {
    flex-direction: column;
  }
}
</style>
