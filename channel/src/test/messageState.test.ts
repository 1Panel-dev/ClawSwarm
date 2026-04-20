import { describe, expect, it } from "vitest";

import { InMemoryMessageStateStore } from "../core/message/messageState.js";
import type { MessageStateRecord } from "../types.js";

function createRecord(status: MessageStateRecord["status"] = "RECEIVED"): MessageStateRecord {
    return {
        messageId: "message-1",
        traceId: "trace-1",
        accountId: "default",
        conversationId: "conversation-1",
        targetAgentIds: [],
        sessionKeys: [],
        status,
        createdAt: "2026-04-17T00:00:00.000Z",
        lastUpdated: "2026-04-17T00:00:00.000Z",
    };
}

describe("message state transitions", () => {
    it("allows the normal inbound dispatch lifecycle", () => {
        const store = new InMemoryMessageStateStore();
        store.create(createRecord());

        expect(store.update("message-1", { status: "VALIDATED" }).status).toBe("VALIDATED");
        expect(store.update("message-1", { status: "ROUTED" }).status).toBe("ROUTED");
        expect(store.update("message-1", { status: "DISPATCHED" }).status).toBe("DISPATCHED");
        expect(store.update("message-1", { status: "CALLBACK_SENT" }).status).toBe("CALLBACK_SENT");
    });

    it("allows failures before terminal success", () => {
        const store = new InMemoryMessageStateStore();
        store.create(createRecord());
        store.update("message-1", { status: "VALIDATED" });

        expect(store.update("message-1", { status: "FAILED", error: "bad route" }).status).toBe("FAILED");
    });

    it("rejects invalid stage jumps and terminal rewrites", () => {
        const store = new InMemoryMessageStateStore();
        store.create(createRecord());

        expect(() => store.update("message-1", { status: "DISPATCHED" })).toThrow(
            "invalid message state transition: RECEIVED -> DISPATCHED",
        );

        store.update("message-1", { status: "FAILED", error: "bad payload" });
        expect(() => store.update("message-1", { status: "ROUTED" })).toThrow(
            "invalid message state transition: FAILED -> ROUTED",
        );
    });
});
