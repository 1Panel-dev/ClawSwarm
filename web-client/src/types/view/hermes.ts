/**
 * Hermes 模块前端业务层类型。
 */
import type {
    HermesConnectionTestResponse,
    HermesInstanceResponse,
} from "@/types/api/hermes";
import type { Camelized } from "@/utils/case";

export type HermesInstanceOutput = Camelized<HermesInstanceResponse>;

export type HermesConnectionTestOutput = Camelized<HermesConnectionTestResponse>;

export interface HermesInstanceInput {
    name: string;
    displayName: string;
    roleName?: string | null;
    apiBaseUrl: string;
    apiKey?: string | null;
    defaultModel?: string | null;
    status?: string;
}
