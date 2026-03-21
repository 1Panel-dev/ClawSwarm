/**
 * 这个 composable 负责管理消息页轮询。
 *
 * 第一阶段先用轮询，不急着上 WebSocket / SSE。
 * 把逻辑集中在这里，后面升级实时推送时改动会更小。
 */
import { onBeforeUnmount, ref } from "vue";

import { useConversationStore } from "@/stores/conversation";

export function useConversationPolling() {
    const conversationStore = useConversationStore();
    const timer = ref<number | null>(null);

    async function tick() {
        if (!conversationStore.currentConversationId) {
            return;
        }
        await conversationStore.pollCurrentConversation();
    }

    function start(intervalMs = 2500) {
        stop();
        timer.value = window.setInterval(() => {
            void tick();
        }, intervalMs);
    }

    function stop() {
        if (timer.value !== null) {
            window.clearInterval(timer.value);
            timer.value = null;
        }
    }

    onBeforeUnmount(stop);

    return {
        start,
        stop,
    };
}
