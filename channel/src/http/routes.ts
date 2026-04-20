import type { Logger } from "../logging/logger.js";
import type { IdempotencyStore } from "../storage/idempotency.js";
import type { AccountConfig } from "../config.js";
import type { MessageStateStore } from "../core/message/messageState.js";
import type { ClawSwarmCallbackClient } from "../flows/callback/client.js";
import type { OpenClawRuntimeAdapter } from "../openclaw/runtime/adapters.js";
import { handleAdminAgentRoutes } from "./adminAgents.js";
import { handleCatalogRoutes } from "./catalog.js";
import { handleInboundRoute } from "./inbound.js";
import { handleDocumentRoutes } from "./documentRoutes.js";
import type { HttpRequest, HttpResponse } from "./common.js";

export interface ClawSwarmRoutesParams {
    channelId: string;
    getAccount: (accountId?: string) => AccountConfig & { accountId: string };
    logger: Logger;
    idempotency: IdempotencyStore;
    messageState: MessageStateStore;
    clawSwarmFactory: (acct: AccountConfig) => ClawSwarmCallbackClient;
    openclaw: OpenClawRuntimeAdapter;
    loadHostConfig?: () => unknown;
}

export function createClawSwarmRoutes(params: ClawSwarmRoutesParams) {
    const { channelId, getAccount, logger, idempotency, messageState, clawSwarmFactory, openclaw, loadHostConfig } = params;

    // 返回给 registerHttpRoute 的 handler。
    return async function handler(req: HttpRequest, res: HttpResponse): Promise<boolean> {
        const url = new URL(req.url ?? "/", "http://localhost");
        const pathname = url.pathname;
        const method = req.method ?? "";

        if (
            await handleCatalogRoutes({
                pathname,
                method,
                res,
                channelId,
                getAccount,
            })
        ) {
            return true;
        }

        if (
            await handleAdminAgentRoutes({
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

        if (
            await handleDocumentRoutes({
                pathname,
                method,
                searchParams: url.searchParams,
                res,
                getAccount,
            })
        ) {
            return true;
        }

        if (
            await handleInboundRoute({
                pathname,
                method,
                req,
                res,
                channelId,
                getAccount,
                logger,
                idempotency,
                messageState,
                clawSwarmFactory,
                openclaw,
            })
        ) {
            return true;
        }

        // 不是当前插件关心的路径，返回 false 让宿主继续匹配其它 handler。
        return false;
    };
}
