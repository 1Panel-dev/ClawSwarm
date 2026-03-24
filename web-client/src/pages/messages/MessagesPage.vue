<template>
  <div class="page-shell page-shell--conversation">
    <div class="messages-shell">
      <aside class="messages-shell__sidebar">
        <ConversationSidebar />
      </aside>
      <section class="messages-shell__content">
        <ConversationPanel
          v-if="conversationStore.currentConversationId"
          :loading="conversationStore.loading"
          :error-message="conversationStore.lastErrorMessage"
        />
        <EmptyStateCard
          v-else
          eyebrow="消息"
          title="先从左侧选择一个 Agent 或群组"
          description="第一阶段先把消息工作台搭稳。后续会继续接入 OpenClaw 管理、任务和更多协作能力。"
        />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 消息页是第一阶段真正落地的核心页面。
 *
 * 它尽量只承担页面级组织职责，
 * 真正的数据拉取、轮询和状态管理都放在 store / composable 中。
 */
import { onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useRouter } from "vue-router";

import EmptyStateCard from "@/components/common/EmptyStateCard.vue";
import ConversationPanel from "@/components/conversation/ConversationPanel.vue";
import ConversationSidebar from "@/components/conversation/ConversationSidebar.vue";
import { useConversationTransport } from "@/composables/useConversationTransport";
import { useAddressBookStore } from "@/stores/addressBook";
import { useConversationStore } from "@/stores/conversation";
import { useGroupStore } from "@/stores/group";

const route = useRoute();
const router = useRouter();
const conversationStore = useConversationStore();
const addressBookStore = useAddressBookStore();
const groupStore = useGroupStore();
const transport = useConversationTransport();
const initialized = ref(false);

onMounted(async () => {
    try {
        if (!addressBookStore.addressBook) {
            await addressBookStore.loadAll();
        }
        initialized.value = true;
        await handleRouteConversation(route.params.conversationId);
    } catch (error) {
        console.error("failed to initialize messages page", error);
    }
});

watch(
    () => conversationStore.currentConversationId,
    async (value) => {
        const routeConversationId = Number(route.params.conversationId);
        if (!value || routeConversationId === value) {
            return;
        }
        await router.replace(`/messages/conversation/${value}`);
    },
);

watch(
    () => route.params.conversationId,
    async (value) => {
        await handleRouteConversation(value);
    },
    { immediate: true },
);

async function handleRouteConversation(value: unknown) {
    if (!initialized.value) {
        return;
    }
    if (!value) {
        await ensureConversationSelection();
        return;
    }
    const conversationId = Number(value);
    if (Number.isFinite(conversationId) && conversationStore.currentConversationId !== conversationId) {
        try {
            await conversationStore.openConversation(conversationId);
        } catch (error) {
            conversationStore.currentConversationId = null;
            conversationStore.currentConversation = null;
            await router.replace("/messages");
            await ensureConversationSelection();
            return;
        }
    }
    if (conversationStore.currentConversation?.type === "group" && conversationStore.currentConversation.group_id) {
        await groupStore.loadGroupDetail(conversationStore.currentConversation.group_id);
    } else {
        groupStore.currentGroupDetail = null;
    }
}

async function ensureConversationSelection() {
    if (route.params.conversationId) {
        return;
    }
    const persistedConversationId = conversationStore.restorePersistedConversationId();
    const targetConversationId =
        addressBookStore.recentConversations.find((item) => item.id === persistedConversationId)?.id
        ?? conversationStore.currentConversationId
        ?? addressBookStore.recentConversations[0]?.id;

    if (targetConversationId) {
        if (conversationStore.currentConversationId !== targetConversationId) {
            await conversationStore.openConversation(targetConversationId);
        }
        await router.replace(`/messages/conversation/${targetConversationId}`);
        return;
    }

    // 第一次进入且还没有任何最近会话时，自动选择一个可用 Agent 打开单聊。
    // 这样消息页在真实前后端联调时，不需要先手动到 OpenClaw 模块建会话。
    const defaultInstance = addressBookStore.instances.find((instance) =>
        instance.status === "active" && instance.agents.some((agent) => agent.enabled),
    );
    const defaultAgent = defaultInstance?.agents.find((agent) => agent.enabled);
    if (!defaultInstance || !defaultAgent) {
        return;
    }

    await conversationStore.openDirectConversation(defaultInstance.id, defaultAgent.id);
    if (conversationStore.currentConversationId) {
        await router.replace(`/messages/conversation/${conversationStore.currentConversationId}`);
    }
}
</script>

<style scoped>
.messages-shell {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  width: 100%;
  min-width: 0;
  min-height: 0;
  border: 1px solid #dddddf;
  border-radius: var(--page-shell-card-radius);
  background: #f5f5f7;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.03);
  overflow: hidden;
}

.messages-shell__sidebar {
  min-width: 0;
  min-height: 0;
  background: #f3f3f5;
  border-right: 1px solid #e9e9ec;
}

.messages-shell__content {
  min-width: 0;
  min-height: 0;
  background: #ffffff;
  overflow: hidden;
}

@media (max-width: 960px) {
  .messages-shell {
    grid-template-columns: 1fr;
  }

  .messages-shell__sidebar {
    display: none;
  }
}
</style>
