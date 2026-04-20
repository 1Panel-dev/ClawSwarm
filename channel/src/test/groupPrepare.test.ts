import { describe, expect, it } from "vitest";

import { prepareGroupDispatchTargets } from "../flows/dispatch/groupPrepare.js";
import type { InboundMessage } from "../core/routing/resolveRoute.js";

describe("prepareGroupDispatchTargets", () => {
    it("builds one isolated group session key for each target agent", () => {
        const inbound: InboundMessage = {
            messageId: "msg-group-prepare-1",
            chat: { type: "group", chatId: "Group A", threadId: "Thread A" },
            from: { userId: "user-1" },
            text: "@pm @qa hello",
        };

        expect(
            prepareGroupDispatchTargets({
                inbound,
                agentIds: ["PM Agent", "QA Agent"],
                routeKind: "GROUP_MENTION",
            }),
        ).toEqual([
            {
                agentId: "PM Agent",
                sessionKey: "agent:pm_agent:clawswarm:group:group_a:route:mention:conv:thread_a",
            },
            {
                agentId: "QA Agent",
                sessionKey: "agent:qa_agent:clawswarm:group:group_a:route:mention:conv:thread_a",
            },
        ]);
    });
});
