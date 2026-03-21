<template>
  <div class="message-list">
    <div v-if="loading && !messages.length" class="message-list__empty">
      正在加载会话消息...
    </div>
    <div v-else-if="!messages.length" class="message-list__empty">
      还没有消息，先发一条试试看。
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
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import MessageAttachmentCard from "@/components/conversation/MessageAttachmentCard.vue";
import MessageMarkdown from "@/components/conversation/MessageMarkdown.vue";
import MessageToolCard from "@/components/conversation/MessageToolCard.vue";
import type { MessageReadApi } from "@/types/api/conversation";
import { toMessageView } from "@/types/view/message";

const props = defineProps<{
    messages: MessageReadApi[];
    loading: boolean;
}>();

const messageViews = computed(() => props.messages.map((item) => toMessageView(item)));

function formatDateTime(value: string) {
    return new Intl.DateTimeFormat("zh-CN", {
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
