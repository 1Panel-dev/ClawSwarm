<template>
  <div ref="containerRef" class="message-list">
    <div v-if="loading && !messages.length" class="message-list__empty">
      {{ t("conversation.loadingMessages") }}
    </div>
    <div v-else-if="!messages.length" class="message-list__empty">
      {{ t("conversation.emptyMessages") }}
    </div>
    <div
      v-for="message in messageViews"
      :key="message.id"
      class="message-list__item"
      :class="{
        'message-list__item--user': message.senderType === 'user',
      }"
    >
      <div class="message-list__meta">
        <span class="message-list__sender">{{ message.senderLabel }}</span>
        <div class="message-list__meta-side">
          <span>{{ formatDateTime(message.updatedAt) }}</span>
        </div>
      </div>
      <div class="message-list__parts">
        <template v-for="(part, index) in message.parts" :key="`${message.id}-${part.kind}-${index}`">
          <MessageMarkdown
            v-if="part.kind === 'markdown'"
            class="message-list__content"
            :content="part.content"
          />
          <MessageAttachmentCard
            v-else-if="part.kind === 'attachment'"
            :name="part.name"
            :mime-type="part.mimeType"
            :url="part.url"
          />
          <MessageToolCard
            v-else-if="part.kind === 'tool_card'"
            :title="part.title"
            :status="part.status"
            :summary="part.summary"
          />
        </template>
      </div>
    </div>
    <div v-if="showTypingIndicator" class="message-list__typing">
      <span class="message-list__typing-dot" />
      <span class="message-list__typing-dot" />
      <span class="message-list__typing-dot" />
      <span class="message-list__typing-text">{{ t("conversation.replying") }}</span>
    </div>
    <div ref="bottomRef" class="message-list__bottom-anchor" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";

import MessageAttachmentCard from "@/components/conversation/MessageAttachmentCard.vue";
import MessageMarkdown from "@/components/conversation/MessageMarkdown.vue";
import MessageToolCard from "@/components/conversation/MessageToolCard.vue";
import { useI18n } from "@/composables/useI18n";
import type { MessageReadApi } from "@/types/api/conversation";
import { toMessageView } from "@/types/view/message";

const props = defineProps<{
    messages: MessageReadApi[];
    loading: boolean;
    showTypingIndicator?: boolean;
}>();

const containerRef = ref<HTMLElement | null>(null);
const bottomRef = ref<HTMLElement | null>(null);
const messageViews = computed(() => props.messages.map((item) => toMessageView(item)));
const hasInitializedScroll = ref(false);
const { locale, t } = useI18n();
const scrollTrigger = computed(() => {
    const lastMessage = props.messages.at(-1);
    return [
        props.loading ? "loading" : "ready",
        props.messages.length,
        props.showTypingIndicator ? "typing" : "idle",
        lastMessage?.id ?? "",
        lastMessage?.updated_at ?? "",
        lastMessage?.content ?? "",
    ].join("|");
});

async function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    await nextTick();
    if (bottomRef.value) {
        bottomRef.value.scrollIntoView({ behavior, block: "end" });
        return;
    }
    if (containerRef.value) {
        containerRef.value.scrollTop = containerRef.value.scrollHeight;
    }
}

async function syncScrollPosition() {
    // 首次进入会话时，消息通常是异步拉取的。
    // 只有等第一批数据真正落地后，才把位置直接定到底部；
    // 后续新增消息或流式更新，再使用平滑滚动。
    if (!hasInitializedScroll.value) {
        if (props.loading && !props.messages.length) {
            return;
        }
        await scrollToBottom("auto");
        hasInitializedScroll.value = true;
        return;
    }

    await scrollToBottom("smooth");
}

watch(
    scrollTrigger,
    () => {
        void syncScrollPosition();
    },
    { immediate: true, flush: "post" },
);

function formatDateTime(value: string) {
    return new Intl.DateTimeFormat(locale.value, {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}
</script>

<style scoped>
.message-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px var(--page-shell-pad-x);
  min-height: 0;
  overflow: auto;
  background: #ffffff;
}

.message-list__item {
  width: min(84%, 1040px);
  max-width: 1040px;
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, var(--color-border) 82%, white);
  border-radius: 18px;
  background: #f7f7f8;
}

.message-list__item--user {
  margin-left: auto;
  width: min(56%, 760px);
  border-color: transparent;
  background: color-mix(in srgb, var(--color-accent) 12%, white);
}

.message-list__empty {
  display: grid;
  place-items: center;
  min-height: 100%;
  color: #c7c7cb;
  text-align: center;
}

.message-list__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: 8px;
  color: #91959d;
  font-size: 0.82rem;
}

.message-list__sender {
  font-weight: 600;
}

.message-list__meta-side {
  display: flex;
  align-items: center;
  gap: 8px;
}

.message-list__content {
  min-width: 0;
}

.message-list__parts {
  display: grid;
  gap: 10px;
}

.message-list__bottom-anchor {
  width: 100%;
  height: 1px;
}

.message-list__typing {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  padding: 10px 14px;
  border: 1px solid color-mix(in srgb, var(--color-border) 82%, white);
  border-radius: 18px;
  background: #f7f7f8;
  color: #8f949d;
}

.message-list__typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #c2c6ce;
  animation: message-list-typing 1.2s infinite ease-in-out;
}

.message-list__typing-dot:nth-child(2) {
  animation-delay: 0.15s;
}

.message-list__typing-dot:nth-child(3) {
  animation-delay: 0.3s;
}

.message-list__typing-text {
  margin-left: 2px;
  font-size: 0.9rem;
}

@keyframes message-list-typing {
  0%, 80%, 100% {
    opacity: 0.35;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-1px);
  }
}

@media (max-width: 720px) {
  .message-list__meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .message-list__meta-side {
    flex-wrap: wrap;
  }
}
</style>
