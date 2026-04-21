import { describe, expect, it, vi } from "vitest";

import type { ClawSwarmCallbackClient } from "../flows/callback/client.js";
import { AccountConfigSchema } from "../config.js";
import type { OpenClawRuntimeAdapter } from "../openclaw/runtime/adapters.js";
import type { Logger } from "../logging/logger.js";
import type { InboundMessage, RouteDecision } from "../core/routing/resolveRoute.js";
import { createIdempotencyStore } from "../storage/idempotency.js";
import { InMemoryMessageStateStore } from "../core/message/messageState.js";
import { runInboundDispatch } from "../flows/inbound/inboundDispatch.js";

describe("runInboundDispatch", () => {
    it("marks message state as failed when background dispatch throws", async () => {
        const logger: Logger = {
            child: () => logger,
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        };
        const messageState = new InMemoryMessageStateStore();
        const now = new Date().toISOString();
        messageState.create({
            messageId: "msg-background-1",
            traceId: "trace-background-1",
            accountId: "default",
            conversationId: "conv-1",
            routingMode: "DIRECT",
            targetAgentIds: ["qa"],
            sessionKeys: [],
            status: "ROUTED",
            createdAt: now,
            lastUpdated: now,
        });

        const inbound: InboundMessage = {
            messageId: "msg-background-1",
            accountId: "default",
            chat: { type: "direct", chatId: "conv-1" },
            from: { userId: "user-1" },
            text: "hello",
            directAgentId: "qa",
        };
        const decision: RouteDecision = {
            kind: "DIRECT",
            targetAgentIds: ["qa"],
            mentionTokens: [],
            conversationId: "conv-1",
        };

        await runInboundDispatch({
            channelId: "clawswarm",
            accountId: "default",
            accountConfig: AccountConfigSchema.parse({
                baseUrl: "https://clawswarm.example.com",
                outboundToken: "outbound-token",
                inboundSigningSecret: "1234567890123456",
            }),
            logger,
            idempotency: createIdempotencyStore({ mode: "memory", logger }),
            messageState,
            clawSwarm: { sendEvent: vi.fn() } as ClawSwarmCallbackClient,
            openclaw: {} as OpenClawRuntimeAdapter,
            inbound,
            decision,
            traceId: "trace-background-1",
            dispatchDirectFn: async () => {
                throw new Error("boom");
            },
        });

        expect(messageState.get("msg-background-1")).toMatchObject({
            status: "FAILED",
            routingMode: "DIRECT",
            targetAgentIds: ["qa"],
            error: "Error: boom",
        });
        expect(logger.error).toHaveBeenCalledWith(
            { err: "Error: boom" },
            "async dispatch failed",
        );
    });
});
