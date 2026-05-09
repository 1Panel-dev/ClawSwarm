<template>
  <section class="hermes-pane" v-loading="pageBusy">
    <el-card shadow="never">
      <template #header>
        <div class="hermes-pane__header">
          <el-space wrap>
            <h2 class="page-section-title">{{ t("hermes.instanceList") }}</h2>
            <el-tag type="info" effect="plain">{{ instances.length }}</el-tag>
          </el-space>
          <el-button type="primary" @click="openInstanceCreate">
            {{ t("hermes.addInstance") }}
          </el-button>
        </div>
      </template>

      <el-empty v-if="store.loading && !instances.length" :description="t('hermes.loadingInstances')" />
      <el-empty v-else-if="!instances.length" :description="t('hermes.noInstances')" />

      <div v-else class="hermes-pane__list">
        <el-card v-for="instance in instances" :key="instance.id" shadow="hover" class="hermes-instance-card">
          <div class="hermes-instance-card__header">
            <div>
              <el-space wrap>
                <strong>{{ instance.name }}</strong>
                <el-tag :type="instance.status === 'active' ? 'success' : 'info'" effect="plain">
                  {{ instance.status === "active" ? t("openclaw.online") : t("openclaw.inactive") }}
                </el-tag>
              </el-space>
              <p class="hermes-instance-card__meta">{{ instance.apiBaseUrl }}</p>
            </div>
            <el-space wrap>
              <el-tooltip :content="t('hermes.addProfile')" placement="top">
                <el-button circle type="primary" @click="openProfileCreate(instance)">
                  <el-icon><Plus /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip :content="t('hermes.testConnection')" placement="top">
                <el-button circle @click="testInstance(instance)">
                  <el-icon><Connection /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip :content="t('common.edit')" placement="top">
                <el-button circle @click="openInstanceEdit(instance)">
                  <el-icon><EditPen /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip :content="instance.status === 'active' ? t('common.disable') : t('common.enable')" placement="top">
                <el-button circle :type="instance.status === 'active' ? 'warning' : 'success'" @click="toggleInstance(instance)">
                  <el-icon>
                    <component :is="instance.status === 'active' ? SwitchButton : VideoPlay" />
                  </el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip :content="t('common.delete')" placement="top">
                <el-button circle type="danger" @click="confirmDeleteInstance(instance)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-tooltip>
            </el-space>
          </div>

          <el-table v-if="instance.profiles.length" :data="instance.profiles" border class="hermes-instance-card__table">
            <el-table-column prop="profileKey" :label="t('hermes.profileKey')" min-width="160" />
            <el-table-column prop="displayName" :label="t('hermes.displayName')" min-width="160" />
            <el-table-column prop="csId" label="CS ID" min-width="120" />
            <el-table-column prop="model" :label="t('hermes.model')" min-width="160" />
            <el-table-column :label="t('openclaw.actions')" width="220" fixed="right">
              <template #default="{ row }">
                <el-space>
                  <el-button link type="primary" @click="openConversation(row.id)">
                    {{ t("hermes.chat") }}
                  </el-button>
                  <el-button link @click="openProfileEdit(instance, row)">
                    {{ t("common.edit") }}
                  </el-button>
                  <el-button link :type="row.enabled ? 'warning' : 'success'" @click="toggleProfile(row)">
                    {{ row.enabled ? t("common.disable") : t("common.enable") }}
                  </el-button>
                  <el-button link type="danger" @click="confirmDeleteProfile(row)">
                    {{ t("common.delete") }}
                  </el-button>
                </el-space>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else :description="t('hermes.noProfiles')" />
        </el-card>
      </div>
    </el-card>

    <el-drawer v-model="instanceDrawerVisible" :title="instanceDrawerTitle" size="520px">
      <el-form label-position="top">
        <el-form-item :label="t('hermes.instanceName')">
          <el-input v-model="instanceForm.name" maxlength="120" />
        </el-form-item>
        <el-form-item :label="t('hermes.apiBaseUrl')">
          <el-input v-model="instanceForm.apiBaseUrl" maxlength="500" />
        </el-form-item>
        <el-form-item label="API Key">
          <el-input
            v-model="instanceForm.apiKey"
            type="password"
            show-password
            maxlength="255"
            autocomplete="new-password"
            name="hermes-api-key"
          />
        </el-form-item>
        <el-form-item :label="t('hermes.defaultModel')">
          <el-input v-model="instanceForm.defaultModel" maxlength="120" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="instanceDrawerVisible = false">{{ t("common.cancel") }}</el-button>
        <el-button type="primary" @click="submitInstance">{{ t("common.save") }}</el-button>
      </template>
    </el-drawer>

    <el-drawer v-model="profileDrawerVisible" :title="profileDrawerTitle" size="520px">
      <el-form label-position="top">
        <el-form-item :label="t('hermes.profileKey')">
          <el-input v-model="profileForm.profileKey" :disabled="profileMode === 'edit'" maxlength="120" />
        </el-form-item>
        <el-form-item :label="t('hermes.displayName')">
          <el-input v-model="profileForm.displayName" maxlength="120" />
        </el-form-item>
        <el-form-item :label="t('hermes.roleName')">
          <el-input v-model="profileForm.roleName" maxlength="120" />
        </el-form-item>
        <el-form-item :label="t('hermes.model')">
          <el-input v-model="profileForm.model" maxlength="120" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="profileDrawerVisible = false">{{ t("common.cancel") }}</el-button>
        <el-button type="primary" @click="submitProfile">{{ t("common.save") }}</el-button>
      </template>
    </el-drawer>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { Connection, Delete, EditPen, Plus, SwitchButton, VideoPlay } from "@element-plus/icons-vue";

import { useI18n } from "@/composables/useI18n";
import { useConversationStore } from "@/stores/conversation";
import { useHermesStore } from "@/stores/hermes";
import type { HermesInstanceOutput, HermesProfileOutput } from "@/types/view/hermes";

const store = useHermesStore();
const conversationStore = useConversationStore();
const router = useRouter();
const {t} = useI18n();

const instanceDrawerVisible = ref(false);
const profileDrawerVisible = ref(false);
const instanceMode = ref<"create" | "edit">("create");
const profileMode = ref<"create" | "edit">("create");
const editingInstanceId = ref<number | null>(null);
const activeInstanceId = ref<number | null>(null);
const editingProfileId = ref<number | null>(null);

const instanceForm = reactive({
  name: "",
  apiBaseUrl: "",
  apiKey: "",
  defaultModel: "",
});
const profileForm = reactive({
  profileKey: "",
  displayName: "",
  roleName: "",
  model: "",
});

const instances = computed(() => store.instances);
const pageBusy = computed(() => store.loading || store.creating || store.savingId !== null);
const instanceDrawerTitle = computed(() => instanceMode.value === "create" ? t("hermes.addInstance") : t("hermes.editInstance"));
const profileDrawerTitle = computed(() => profileMode.value === "create" ? t("hermes.addProfile") : t("hermes.editProfile"));

onMounted(async () => {
  if (!instances.value.length) {
    await store.loadInstances();
  }
});

function resetInstanceForm() {
  instanceForm.name = "";
  instanceForm.apiBaseUrl = "";
  instanceForm.apiKey = "";
  instanceForm.defaultModel = "";
}

function resetProfileForm() {
  profileForm.profileKey = "";
  profileForm.displayName = "";
  profileForm.roleName = "";
  profileForm.model = "";
}

function openInstanceCreate() {
  instanceMode.value = "create";
  editingInstanceId.value = null;
  resetInstanceForm();
  instanceDrawerVisible.value = true;
}

function openInstanceEdit(instance: HermesInstanceOutput) {
  instanceMode.value = "edit";
  editingInstanceId.value = instance.id;
  instanceForm.name = instance.name;
  instanceForm.apiBaseUrl = instance.apiBaseUrl;
  instanceForm.apiKey = "";
  instanceForm.defaultModel = instance.defaultModel ?? "";
  instanceDrawerVisible.value = true;
}

async function submitInstance() {
  const payload = {
    name: instanceForm.name,
    apiBaseUrl: instanceForm.apiBaseUrl,
    defaultModel: instanceForm.defaultModel || null,
    apiKey: instanceMode.value === "create" || instanceForm.apiKey ? instanceForm.apiKey || null : undefined,
  };
  try {
    if (instanceMode.value === "edit" && editingInstanceId.value !== null) {
      await store.updateInstance(editingInstanceId.value, payload);
    } else {
      await store.createInstance(payload);
    }
    instanceDrawerVisible.value = false;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

function openProfileCreate(instance: HermesInstanceOutput) {
  profileMode.value = "create";
  activeInstanceId.value = instance.id;
  editingProfileId.value = null;
  resetProfileForm();
  profileDrawerVisible.value = true;
}

function openProfileEdit(instance: HermesInstanceOutput, profile: HermesProfileOutput) {
  profileMode.value = "edit";
  activeInstanceId.value = instance.id;
  editingProfileId.value = profile.id;
  profileForm.profileKey = profile.profileKey;
  profileForm.displayName = profile.displayName;
  profileForm.roleName = profile.roleName ?? "";
  profileForm.model = profile.model ?? "";
  profileDrawerVisible.value = true;
}

async function submitProfile() {
  if (activeInstanceId.value === null) {
    return;
  }
  const payload = {
    profileKey: profileForm.profileKey,
    displayName: profileForm.displayName,
    roleName: profileForm.roleName || null,
    model: profileForm.model || null,
  };
  try {
    if (profileMode.value === "edit" && editingProfileId.value !== null) {
      await store.updateProfile(editingProfileId.value, payload);
    } else {
      await store.createProfile(activeInstanceId.value, payload);
    }
    profileDrawerVisible.value = false;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

async function testInstance(instance: HermesInstanceOutput) {
  try {
    await store.testInstance(instance.id);
    ElMessage.success(t("hermes.testSuccess"));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

async function toggleInstance(instance: HermesInstanceOutput) {
  await store.setInstanceEnabled(instance.id, instance.status !== "active");
}

async function toggleProfile(profile: HermesProfileOutput) {
  await store.setProfileEnabled(profile.id, !profile.enabled);
}

async function confirmDeleteInstance(instance: HermesInstanceOutput) {
  try {
    await ElMessageBox.confirm(t("hermes.deleteInstanceConfirm", {name: instance.name}), t("common.confirm"), {
      type: "warning",
      confirmButtonText: t("common.confirm"),
      cancelButtonText: t("common.cancel"),
    });
  } catch {
    return;
  }
  await store.deleteInstance(instance.id);
}

async function confirmDeleteProfile(profile: HermesProfileOutput) {
  try {
    await ElMessageBox.confirm(t("hermes.deleteProfileConfirm", {name: profile.displayName}), t("common.confirm"), {
      type: "warning",
      confirmButtonText: t("common.confirm"),
      cancelButtonText: t("common.cancel"),
    });
  } catch {
    return;
  }
  await store.deleteProfile(profile.id);
}

async function openConversation(profileId: number) {
  try {
    const conversation = await store.openProfileConversation(profileId);
    await conversationStore.openConversation(conversation.id, conversation);
    await router.push(`/messages/conversation/${conversation.id}`);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}
</script>

<style scoped>
.hermes-pane__header,
.hermes-instance-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.hermes-pane__list {
  display: grid;
  gap: var(--space-4);
}

.hermes-instance-card {
  display: grid;
  gap: var(--space-3);
}

.hermes-instance-card__meta {
  margin: var(--space-1) 0 0;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.hermes-instance-card__table {
  margin-top: var(--space-3);
}

@media (max-width: 960px) {
  .hermes-pane__header,
  .hermes-instance-card__header {
    flex-direction: column;
  }
}
</style>
