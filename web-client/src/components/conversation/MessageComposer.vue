<template>
  <form class="composer" @submit.prevent="submit">
    <div v-if="isGroup && mentionOptions.length" class="composer__mentions">
      <div class="composer__mentions-label">定向 @Agent</div>
      <el-select
        v-model="mentions"
        multiple
        collapse-tags
        collapse-tags-tooltip
        filterable
        placeholder="不选择则默认广播给群成员"
        style="width: 100%"
      >
        <el-option
          v-for="option in mentionOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
    </div>
    <textarea
      v-model="content"
      class="composer__input"
      rows="4"
      placeholder="输入消息"
    />
    <div class="composer__actions">
      <div class="composer__tools">
        <button class="composer__tool-button" type="button" disabled>
          附件
        </button>
      </div>
      <button class="composer__button" type="submit" :disabled="sending || !content.trim()">
        {{ sending ? "发送中..." : "发送消息" }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from "vue";

defineProps<{
    sending: boolean;
    isGroup: boolean;
    mentionOptions: Array<{ value: string; label: string }>;
}>();

const emit = defineEmits<{
    send: [payload: { content: string; mentions: string[] }];
}>();

const content = ref("");
const mentions = ref<string[]>([]);

function submit() {
    if (!content.value.trim()) {
        return;
    }
    emit("send", {
        content: content.value.trim(),
        mentions: [...mentions.value],
    });
    content.value = "";
    mentions.value = [];
}
</script>

<style scoped>
.composer {
  display: grid;
  gap: var(--space-3);
  padding: 14px var(--page-shell-pad-x) var(--page-shell-pad-bottom);
  border-top: 1px solid var(--color-border);
  background: #ffffff;
}

.composer__mentions {
  display: grid;
  gap: var(--space-2);
}

.composer__mentions-label {
  color: var(--color-text-secondary);
  font-size: 0.82rem;
}

.composer__input {
  width: 100%;
  resize: vertical;
  min-height: 108px;
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, var(--color-border) 88%, white);
  border-radius: 16px;
  background: #f8f8f9;
  color: var(--color-text-primary);
  outline: none;
}

.composer__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.composer__tools {
  display: flex;
  gap: 10px;
  margin-right: auto;
}

.composer__tool-button {
  min-width: 52px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: #ffffff;
  color: var(--color-text-secondary);
  cursor: not-allowed;
  opacity: 0.72;
}

.composer__button {
  min-width: 112px;
  height: 40px;
  padding: 0 18px;
  border: none;
  border-radius: 14px;
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  cursor: pointer;
}

.composer__button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
