/**
 * OpenClaw 接口响应到前端业务输出对象的转换函数。
 *
 * 这里只做 Response -> Output 的稳定映射，
 * 让页面和 store 不再直接消费 snake_case 的接口字段。
 */

import type { OpenClawConnectResponse, OpenClawInstanceResponse } from "@/types/api/instance";
import type {
    OpenClawAgentOutput,
    OpenClawConnectResultOutput,
    OpenClawInstanceOutput,
} from "@/types/view/openclaw";
import { camelizeKeys } from "@/utils/case";

export function toOpenClawInstanceOutput(
    item: OpenClawInstanceResponse,
    agents: OpenClawAgentOutput[],
): OpenClawInstanceOutput {
    return {
        ...camelizeKeys(item),
        agents,
    };
}

export function toOpenClawConnectResultOutput(
    item: OpenClawConnectResponse,
    agents: OpenClawAgentOutput[],
): OpenClawConnectResultOutput {
    return {
        ...camelizeKeys(item),
        instance: toOpenClawInstanceOutput(item.instance, agents),
        credentials: camelizeKeys(item.credentials),
    };
}

export function withOpenClawConnectAgents(
    item: OpenClawConnectResultOutput,
    agents: OpenClawAgentOutput[],
): OpenClawConnectResultOutput {
    return {
        ...item,
        instance: {
            ...item.instance,
            agents,
        },
    };
}
