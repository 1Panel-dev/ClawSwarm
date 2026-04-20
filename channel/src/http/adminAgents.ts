import type { AccountConfig } from "../config.js";
import type { IdempotencyStore } from "../storage/idempotency.js";
import type { OpenClawAgentWorkspaceConfig } from "../openclaw/agents/manageAgents.js";
import { createRealOpenClawAgent } from "../openclaw/agents/manageAgents.js";
import { sendJson, type HttpRequest, type HttpResponse } from "./common.js";
import { AgentAdminCreateSchema } from "./adminSchemas.js";
import { readVerifiedJsonBody } from "./adminBody.js";
import { handleAdminAgentProfileRoute } from "./adminProfile.js";

export interface AdminAgentRouteParams {
    pathname: string;
    method: string;
    req: HttpRequest;
    res: HttpResponse;
    getAccount: (accountId?: string) => AccountConfig & { accountId: string };
    idempotency: IdempotencyStore;
    loadHostConfig?: () => unknown;
}

export async function handleAdminAgentRoutes(params: AdminAgentRouteParams): Promise<boolean> {
    const { pathname, method, req, res, getAccount, idempotency, loadHostConfig } = params;
    const hostConfig = loadHostConfig?.() as OpenClawAgentWorkspaceConfig | undefined;

    if (
        await handleAdminAgentProfileRoute({
            pathname,
            method,
            req,
            res,
            getAccount,
            idempotency,
            loadHostConfig,
        })
    ) {
        return true;
    }

    if (pathname === "/clawswarm/v1/admin/agents" && method === "POST") {
        const acct = getAccount(undefined);
        const body = await readVerifiedJsonBody({
            req,
            res,
            pathname,
            accountConfig: acct,
            idempotency,
        });
        if (!body.ok) {
            return true;
        }

        const parsed = AgentAdminCreateSchema.safeParse(body.json);
        if (!parsed.success) {
            sendJson(res, 400, { error: "invalid_payload", detail: parsed.error.issues });
            return true;
        }

        try {
            const agent = await createRealOpenClawAgent({
                agentId: parsed.data.agentKey,
                displayName: parsed.data.displayName,
                files: parsed.data.files,
                profileFiles: {
                    agentsMd: parsed.data.agentsMd,
                    toolsMd: parsed.data.toolsMd,
                    identityMd: parsed.data.identityMd,
                    soulMd: parsed.data.soulMd,
                    userMd: parsed.data.userMd,
                    memoryMd: parsed.data.memoryMd,
                    heartbeatMd: parsed.data.heartbeatMd,
                },
                cfg: hostConfig,
            });
            sendJson(res, 201, agent);
        } catch (error) {
            sendJson(res, 400, { error: "agent_create_failed", detail: String(error) });
        }
        return true;
    }

    return false;
}
