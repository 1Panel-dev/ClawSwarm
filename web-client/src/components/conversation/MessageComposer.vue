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
    <div v-else class="composer__direct-options">
      <span class="composer__direct-options-label">使用单独聊天通道</span>
      <el-switch v-model="useDedicatedDirectSession" />
    </div>
    <textarea
      v-model="content"
      class="composer__input"
      rows="4"
      placeholder="输入消息"
      @keydown="handleKeydown"
    />
    <div class="composer__actions">
      <div class="composer__tools">
        <el-button plain disabled>
          附件
        </el-button>
      </div>
      <div class="composer__submit-group">
        <el-popover placement="top-end" :width="240" trigger="click">
          <template #reference>
            <el-button plain>
              快捷键
            </el-button>
          </template>
          <div class="composer__shortcut-popover">
            <div class="composer__shortcut-title">发送快捷键</div>
            <div
              class="composer__shortcut-capture"
              :class="{ 'composer__shortcut-capture--recording': shortcutRecording }"
              tabindex="0"
              @keydown.prevent="captureShortcut"
            >
              {{ shortcutRecording ? "请按发送快捷键" : shortcutLabel }}
            </div>
            <div class="composer__shortcut-actions">
              <el-button plain @click="startShortcutRecording">
                {{ shortcutRecording ? "重新录制" : "录制快捷键" }}
              </el-button>
              <el-button plain @click="resetShortcut">
                恢复默认
              </el-button>
            </div>
            <div class="composer__shortcut-hint">
              仅支持 Enter 相关组合，例如 Enter、Ctrl/Cmd + Enter、Shift + Enter、Alt + Enter。
            </div>
          </div>
        </el-popover>
        <el-button type="primary" native-type="submit" :disabled="sending || !content.trim()">
          {{ sending ? "发送中..." : "发送消息" }}
        </el-button>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";

type SendShortcut = {
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
};

const SEND_SHORTCUT_STORAGE_KEY = "claw-team.send-shortcut";
const DEFAULT_SHORTCUT: SendShortcut = {
    altKey: false,
    ctrlKey: true,
    metaKey: false,
    shiftKey: false,
};

defineProps<{
    sending: boolean;
    isGroup: boolean;
    mentionOptions: Array<{ value: string; label: string }>;
}>();

const emit = defineEmits<{
    send: [payload: { content: string; mentions: string[]; useDedicatedDirectSession: boolean }];
}>();

const content = ref("");
const mentions = ref<string[]>([]);
const useDedicatedDirectSession = ref(false);
const sendShortcut = ref<SendShortcut>({ ...DEFAULT_SHORTCUT });
const shortcutRecording = ref(false);

if (typeof window !== "undefined") {
    const storedShortcut = window.localStorage.getItem(SEND_SHORTCUT_STORAGE_KEY);
    if (storedShortcut) {
        try {
            const parsed = JSON.parse(storedShortcut) as Partial<SendShortcut>;
            sendShortcut.value = {
                altKey: Boolean(parsed.altKey),
                ctrlKey: Boolean(parsed.ctrlKey),
                metaKey: Boolean(parsed.metaKey),
                shiftKey: Boolean(parsed.shiftKey),
            };
        } catch {
            sendShortcut.value = { ...DEFAULT_SHORTCUT };
        }
    }
}

watch(sendShortcut, (value) => {
    if (typeof window !== "undefined") {
        window.localStorage.setItem(SEND_SHORTCUT_STORAGE_KEY, JSON.stringify(value));
    }
}, { deep: true });

const shortcutLabel = computed(() => {
    const parts: string[] = [];
    if (sendShortcut.value.ctrlKey) {
        parts.push("Ctrl");
    }
    if (sendShortcut.value.metaKey) {
        parts.push("Cmd");
    }
    if (sendShortcut.value.shiftKey) {
        parts.push("Shift");
    }
    if (sendShortcut.value.altKey) {
        parts.push("Alt");
    }
    parts.push("Enter");
    return `${parts.join(" + ")} 发送`;
});

function submit() {
    if (!content.value.trim()) {
        return;
    }
    emit("send", {
        content: content.value.trim(),
        mentions: [...mentions.value],
        useDedicatedDirectSession: useDedicatedDirectSession.value,
    });
    content.value = "";
    mentions.value = [];
}

function handleKeydown(event: KeyboardEvent) {
    if (event.isComposing) {
        return;
    }
    if (event.key !== "Enter") {
        return;
    }
    const matched =
        event.altKey === sendShortcut.value.altKey
        && event.ctrlKey === sendShortcut.value.ctrlKey
        && event.metaKey === sendShortcut.value.metaKey
        && event.shiftKey === sendShortcut.value.shiftKey;

    if (matched) {
        event.preventDefault();
        submit();
    }
}

function startShortcutRecording() {
    shortcutRecording.value = true;
    nextTick(() => {
        const captureElement = document.querySelector<HTMLElement>(".composer__shortcut-capture");
        captureElement?.focus();
    });
}

function resetShortcut() {
    shortcutRecording.value = false;
    sendShortcut.value = { ...DEFAULT_SHORTCUT };
}

function captureShortcut(event: KeyboardEvent) {
    if (!shortcutRecording.value) {
        return;
    }
    if (event.key !== "Enter") {
        return;
    }
    sendShortcut.value = {
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
    };
    shortcutRecording.value = false;
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

.composer__direct-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.composer__mentions-label {
  color: var(--color-text-secondary);
  font-size: 0.82rem;
}

.composer__direct-options-label {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
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

.composer__submit-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.composer__shortcut-popover {
  display: grid;
  gap: 10px;
}

.composer__shortcut-capture {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 12px;
  border: 1px dashed var(--color-border);
  border-radius: 10px;
  background: #fafafa;
  color: var(--color-text-primary);
  font-size: 0.9rem;
  outline: none;
}

.composer__shortcut-capture--recording {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 8%, white);
}

.composer__shortcut-actions {
  display: flex;
  gap: 8px;
}

.composer__shortcut-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.composer__shortcut-hint {
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--color-text-secondary);
}
</style>
