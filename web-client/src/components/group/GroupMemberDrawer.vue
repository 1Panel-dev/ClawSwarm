<template>
  <el-drawer
    :model-value="visible"
    title="管理群成员"
    size="760px"
    destroy-on-close
    @close="emit('update:visible', false)"
  >
    <div v-if="group" class="member-drawer">
      <div class="member-dialog__intro">
        <div>
          <div class="member-dialog__group-name">{{ group.name }}</div>
          <div class="member-dialog__group-desc">{{ group.description || "未填写群组描述" }}</div>
        </div>
      </div>

      <div class="member-dialog__grid">
        <section class="member-card">
          <h3 class="member-card__title">当前成员</h3>
          <div v-if="!group.members.length" class="member-card__empty">当前还没有成员。</div>
          <div v-for="member in group.members" :key="member.id" class="member-row">
            <div>
              <div class="member-row__title">{{ member.display_name }}</div>
              <div class="member-row__meta">{{ member.instance_name }} / {{ member.agent_key }}</div>
            </div>
            <el-button text type="danger" :disabled="saving" @click="emit('remove-member', member.id)">
              移除
            </el-button>
          </div>
        </section>

        <section class="member-card">
          <h3 class="member-card__title">添加成员</h3>
          <div class="member-card__hint">从现有 OpenClaw Agent 中选择，支持跨实例加到同一个群。</div>

          <el-select
            v-model="selectedValues"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            placeholder="选择一个或多个 Agent"
            style="width: 100%"
          >
            <el-option-group
              v-for="instance in instances"
              :key="instance.id"
              :label="instance.name"
            >
              <el-option
                v-for="agent in instance.agents"
                :key="`${instance.id}-${agent.id}`"
                :label="`${agent.display_name}${agent.role_name ? ` / ${agent.role_name}` : ''}`"
                :value="`${instance.id}:${agent.id}`"
                :disabled="!agent.enabled || existingKeys.has(`${instance.id}:${agent.id}`)"
              />
            </el-option-group>
          </el-select>

          <div class="member-card__actions">
            <el-button
              type="primary"
              :loading="saving"
              :disabled="!selectedValues.length"
              @click="submit"
            >
              添加成员
            </el-button>
          </div>
        </section>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
/**
 * 这个对话框负责群成员维护。
 *
 * 第一阶段先支持：
 * 1. 查看当前成员
 * 2. 从通讯录中添加成员
 * 3. 删除成员
 */
import { computed, ref, watch } from "vue";

import type { AddressBookInstanceApi } from "@/types/api/addressBook";
import type { GroupDetailApi } from "@/types/api/group";

const props = defineProps<{
    visible: boolean;
    group: GroupDetailApi | null;
    instances: AddressBookInstanceApi[];
    saving: boolean;
}>();

const emit = defineEmits<{
    "update:visible": [value: boolean];
    "add-members": [payload: Array<{ instance_id: number; agent_id: number }>];
    "remove-member": [memberId: number];
}>();

const selectedValues = ref<string[]>([]);

watch(
    () => props.visible,
    (visible) => {
        if (visible) {
            selectedValues.value = [];
        }
    },
);

const existingKeys = computed(() => {
    const values = new Set<string>();
    for (const member of props.group?.members ?? []) {
        values.add(`${member.instance_id}:${member.agent_id}`);
    }
    return values;
});

function submit() {
    const payload = selectedValues.value.map((value) => {
        const [instanceId, agentId] = value.split(":").map((item) => Number(item));
        return {
            instance_id: instanceId,
            agent_id: agentId,
        };
    });
    emit("add-members", payload);
}
</script>

<style scoped>
.member-drawer {
  display: grid;
  gap: var(--space-4);
  padding-right: 6px;
}

.member-dialog__intro {
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}

.member-dialog__group-name {
  font-size: 1.05rem;
  font-weight: 700;
}

.member-dialog__group-desc {
  margin-top: 6px;
  color: var(--color-text-secondary);
}

.member-dialog__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.member-card {
  display: grid;
  align-content: start;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-app);
}

.member-card__title {
  margin: 0;
  font-size: 1rem;
}

.member-card__hint,
.member-card__empty {
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.member-card__actions {
  display: flex;
  justify-content: flex-end;
}

.member-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.member-row__title {
  font-weight: 600;
}

.member-row__meta {
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

@media (max-width: 900px) {
  .member-dialog__grid {
    grid-template-columns: 1fr;
  }
}
</style>
