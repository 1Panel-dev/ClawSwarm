/**
 * OpenClaw 接口响应到前端业务对象的转换函数。
 *
 * 这里只做 Response -> View 的稳定映射，
 * 让页面和 store 不再直接消费 snake_case 的接口字段。
 */

import type {
    OpenClawConnectResponse,
    OpenClawInstanceResponse,
} from "@/types/api/instance";
import type {
    OpenClawAgentView,
    OpenClawConnectResultView,
    OpenClawInstanceView,
} from "@/types/view/openclaw";
import { camelizeKeys } from "@/utils/case";

export function toOpenClawInstanceView(item: OpenClawInstanceResponse, agents: OpenClawAgentView[]): OpenClawInstanceView {
    return {
        ...camelizeKeys(item),
        agents,
    };
}

export function toOpenClawConnectResultView(
    item: OpenClawConnectResponse,
    agents: OpenClawAgentView[],
): OpenClawConnectResultView {
    return {
        ...camelizeKeys(item),
        instance: toOpenClawInstanceView(item.instance, agents),
        credentials: camelizeKeys(item.credentials),
    };
}
