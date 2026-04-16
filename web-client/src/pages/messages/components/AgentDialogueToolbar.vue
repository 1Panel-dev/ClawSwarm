<template>
  <div class="dialogue-toolbar">
    <div class="dialogue-toolbar__meta">
      <div class="dialogue-toolbar__line">
        <span>
          {{ t("conversation.agentDialoguePair", {
              source: dialogue.sourceAgentDisplayName,
              sourceCsId: dialogue.sourceAgentCsId,
              target: dialogue.targetAgentDisplayName,
              targetCsId: dialogue.targetAgentCsId,
          }) }}
        </span>
      </div>
      <div class="dialogue-toolbar__line">
        {{ currentPartnerLabel }}
        <span class="dialogue-toolbar__divider">·</span>
        {{ t("conversation.agentDialogueWindow", { minutes: windowMinutes }) }}
        <span class="dialogue-toolbar__divider">·</span>
        {{ t("conversation.agentDialogueMessageDensity", {
            current: recentMessageCount,
            soft: dialogue.softMessageLimit,
            hard: dialogue.hardMessageLimit,
        }) }}
      </div>
      <div v-if="softLimitTriggered" class="dialogue-toolbar__warning">
        {{ t("conversation.agentDialogueSoftLimitWarning") }}
      </div>
    </div>
    <div class="dialogue-toolbar__actions">
      <el-button
        v-if="dialogue.status === 'active'"
        plain
        size="small"
        @click="emit('pause')"
      >
        {{ t("conversation.pauseDialogue") }}
      </el-button>
      <el-button
        v-if="dialogue.status === 'paused'"
        plain
        size="small"
        @click="emit('resume')"
      >
        {{ t("conversation.resumeDialogue") }}
      </el-button>
      <el-button
        v-if="dialogue.status !== 'stopped' && dialogue.status !== 'completed'"
        type="danger"
        plain
        size="small"
        @click="emit('stop')"
      >
        {{ t("conversation.stopDialogue") }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { useI18n } from "@/composables/useI18n";
import type { AgentDialogueOutput } from "@/types/view/agent-dialogue";
import type { MessageOutput } from "@/types/view/message";
import { parseServerDateTime } from "@/utils/datetime";

const props = defineProps<{
    dialogue: AgentDialogueOutput;
    messages: MessageOutput[];
}>();

const emit = defineEmits<{
    pause: [];
    resume: [];
    stop: [];
}>();

const { t } = useI18n();

const windowMinutes = computed(() => Math.max(1, Math.round(props.dialogue.windowSeconds / 60)));

const recentMessageCount = computed(() => {
    const now = Date.now();
    const windowStart = now - props.dialogue.windowSeconds * 1000;
    return props.messages.filter((message) => {
        if (message.senderType !== "user" && message.senderType !== "agent") {
            return false;
        }
        return parseServerDateTime(message.createdAt).getTime() >= windowStart;
    }).length;
});

const softLimitTriggered = computed(() => {
    if (!props.dialogue.softLimitWarnedAt) {
        return false;
    }
    const warnedAt = parseServerDateTime(props.dialogue.softLimitWarnedAt);
    return Date.now() - warnedAt.getTime() <= props.dialogue.windowSeconds * 1000;
});

const currentPartnerLabel = computed(() => {
    if (!props.dialogue.nextAgentDisplayName || !props.dialogue.nextAgentCsId) {
        return t("conversation.agentDialogueWaiting");
    }
    return t("conversation.agentDialogueCurrentPartner", {
        name: props.dialogue.nextAgentDisplayName,
        csId: props.dialogue.nextAgentCsId,
    });
});
</script>

<style scoped>
.dialogue-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 6px 0 0;
}

.dialogue-toolbar__meta {
  display: grid;
  gap: 2px;
}

.dialogue-toolbar__line,
.dialogue-toolbar__warning {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

.dialogue-toolbar__divider {
  color: #c0c4cc;
}

.dialogue-toolbar__warning {
  color: #b06700;
}

.dialogue-toolbar__actions {
  display: flex;
  gap: var(--space-2);
}
</style>
