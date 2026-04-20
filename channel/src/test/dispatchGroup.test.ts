import { describe, expect, it } from "vitest";

import type { ClawSwarmEvent } from "../flows/callback/client.js";
import { AccountConfigSchema } from "../config.js";
import { dispatchGroup } from "../flows/dispatch/dispatchGroup.js";
import { createLogger } from "../logging/logger.js";
import { createIdempotencyStore } from "../storage/idempotency.js";
import { InMemoryMessageStateStore } from "../core/message/messageState.js";

describe("dispatchGroup", () => {
    it("keeps one aggregate message state while dispatching multiple agents", async () => {
        const accountConfig = AccountConfigSchema.parse({
            baseUrl: "https://clawswarm.example.com",
            outboundToken: "outbound-token",
            inboundSigningSecret: "1234567890123456",
            gateway: {
                baseUrl: "https://gateway.example.com",
                token: "gateway-token",
                model: "openclaw",
                stream: true,
                allowInsecureTls: false,
            },
        });
        const logger = createLogger();
        const messageState = new InMemoryMessageStateStore();
        const idempotency = createIdempotencyStore({ mode: "memory", logger });
        const events: ClawSwarmEvent[] = [];

        messageState.create({
            messageId: "msg-group-1",
            traceId: "trace-group-1",
            accountId: "default",
            conversationId: "conv-group-1",
            groupId: "group-1",
            routingMode: "GROUP_MENTION",
            targetAgentIds: ["pm", "qa"],
            sessionKeys: [],
            status: "ROUTED",
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
        });

        await dispatchGroup({
            channelId: "clawswarm",
            accountId: "default",
            accountConfig,
            logger,
            idempotency,
            messageState,
            clawSwarm: {
                async sendEvent(event: ClawSwarmEvent) {
                    events.push(event);
                },
            },
            openclaw: {
                async *runAgentTextTurn({ agentId }) {
                    yield { text: `${agentId} done`, isFinal: true };
                },
            },
            inbound: {
                messageId: "msg-group-1",
                accountId: "default",
                chat: { type: "group", chatId: "group-1", threadId: "conv-group-1" },
                from: { userId: "user-1", displayName: "User" },
                text: "@pm @qa status",
                mentions: ["pm", "qa"],
            },
            agentIds: ["pm", "qa"],
            routeKind: "GROUP_MENTION",
            traceId: "trace-group-1",
        });

        expect(events.filter((event) => event.eventType === "reply.final")).toHaveLength(2);
        expect(messageState.get("msg-group-1")).toMatchObject({
            status: "CALLBACK_SENT",
            routingMode: "GROUP_MENTION",
            targetAgentIds: ["pm", "qa"],
        });
    });
});
