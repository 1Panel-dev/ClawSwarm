<template>
  <el-drawer
    :model-value="visible"
    :title="project ? t('projects.editProject') : t('projects.createProject')"
    size="620px"
    destroy-on-close
    @close="emit('update:visible', false)"
  >
    <div v-loading="submitting ?? false" class="drawer-body">
      <el-form label-position="top">
        <el-form-item :label="t('projects.projectName')">
          <el-input v-model="form.name" maxlength="200" :placeholder="t('projects.projectNamePlaceholder')"/>
        </el-form-item>

        <el-form-item :label="t('projects.projectDescription')">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            maxlength="20000"
            :placeholder="t('projects.projectDescriptionPlaceholder')"
          />
        </el-form-item>

        <el-form-item :label="t('projects.currentProgress')">
          <el-input
            v-model="form.currentProgress"
            type="textarea"
            :rows="4"
            maxlength="20000"
            :placeholder="t('projects.currentProgressPlaceholder')"
          />
        </el-form-item>

        <el-form-item :label="t('projects.projectMembers')">
          <div class="project-members">
            <div class="project-members__toolbar">
              <el-button @click="openMemberDialog">{{ t("projects.addMember") }}</el-button>
              <span class="project-members__count">{{ form.members.length }}</span>
            </div>

            <div v-if="form.members.length" class="project-members__list">
                <div v-for="member in form.members" :key="member.csId" class="project-members__item">
                <div class="project-members__item-main">
                  <el-text type="primary">{{ member.openclaw }}</el-text>
                  <strong>{{ member.agentKey }}</strong>
                  <span>{{ member.csId }}</span>
                </div>
                <el-button text :icon="Delete" @click="removeMember(member.csId)"></el-button>
              </div>
            </div>

            <el-empty v-else :description="t('projects.noMembers')" :image-size="72"/>
          </div>
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <div class="drawer-actions">
        <el-button @click="emit('update:visible', false)">{{ t("common.cancel") }}</el-button>
        <el-button type="primary" :disabled="!canSubmit" @click="submit">
          {{ project ? t("common.save") : t("common.create") }}
        </el-button>
      </div>
    </template>

    <el-dialog
      :model-value="memberDialogVisible"
      :title="t('projects.addMember')"
      width="520px"
      @close="memberDialogVisible = false"
    >
      <div v-loading="addressBookStore.loading">
        <el-form label-position="top">
          <el-form-item :label="t('openclaw.instanceName')">
            <el-select v-model="selectedAgents" value-key="csId" multiple style="width: 100%">
              <el-option-group
                v-for="instance in availableInstances"
                :key="instance.id"
                :label="instance.name"
                :value="instance.id"
              >
                <el-option
                  v-for="agent in instance.agents"
                  :key="agent.id"
                  :label="`${agent.agentKey} / ${agent.csId}`"
                  :value="{ ...agent, openclaw: instance.name }"
                />
              </el-option-group>
            </el-select>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <div class="drawer-actions">
          <el-button @click="memberDialogVisible = false">{{ t("common.cancel") }}</el-button>
          <el-button type="primary" :disabled="!selectedAgents.length" @click="confirmAddMember">
            {{ t("common.confirm") }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </el-drawer>
</template>

<script setup lang="ts">
import {computed, reactive, ref, watch} from "vue";
import {Delete} from "@element-plus/icons-vue";
import {useI18n} from "@/composables/useI18n";
import {useAddressBookStore} from "@/stores/addressBook";
import { toSelectableProjectMember, type SelectableProjectMember } from "@/stores/projectManagementMappers";
import type {
  ProjectCreateInput,
  ProjectMemberView,
  ProjectUpdateInput,
  ProjectView
} from "@/types/view/project-management";

const props = defineProps<{
  visible: boolean;
  submitting?: boolean;
  project?: ProjectView | null;
}>();

const emit = defineEmits<{
  "update:visible": [value: boolean];
  submit: [payload: ProjectCreateInput | ProjectUpdateInput];
}>();

const {t} = useI18n();
const addressBookStore = useAddressBookStore();
const form = reactive({
  name: "",
  description: "",
  currentProgress: "",
  members: [] as ProjectMemberView[],
});
const memberDialogVisible = ref(false);
const availableInstances = computed(() =>
  addressBookStore.instances.map((instance) => ({
    id: instance.id,
    name: instance.name,
    agents: instance.agents.map((agent) => toSelectableProjectMember(agent, instance.name)),
  })),
);
const selectedAgents = ref<SelectableProjectMember[]>([]);

const canSubmit = computed(() => !!form.name.trim());

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      return;
    }
    if (!addressBookStore.addressBook) {
      await addressBookStore.loadAddressBook();
    }
    form.name = props.project?.name ?? "";
    form.description = props.project?.description ?? "";
    form.currentProgress = props.project?.currentProgress ?? "";
    form.members = props.project?.members.map((item) => ({...item})) ?? [];
  },
);

function openMemberDialog() {
  memberDialogVisible.value = true;
  selectedAgents.value = [];
}

function confirmAddMember() {
  const allMembers = [...form.members, ...selectedAgents.value];
  form.members = Array.from(
    new Map(allMembers.map((item) => [item.csId, item])).values(),
  );

  memberDialogVisible.value = false;
}

function removeMember(csId: string) {
  form.members = form.members.filter((item) => item.csId !== csId);
}

function submit() {
  if (!canSubmit.value) {
    return;
  }
  emit("submit", {
    name: form.name.trim(),
    description: form.description.trim(),
    currentProgress: form.currentProgress.trim(),
    members: form.members.map((item) => ({...item})),
  });
}
</script>

<style scoped>
.drawer-body {
  min-height: 240px;
}

.drawer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.project-members {
  display: grid;
  gap: 12px;
  width: 100%;
}

.project-members__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.project-members__count {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.project-members__list {
  display: grid;
  gap: 8px;
}

.project-members__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.project-members__item-main {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  color: var(--color-text-secondary);
}
</style>
