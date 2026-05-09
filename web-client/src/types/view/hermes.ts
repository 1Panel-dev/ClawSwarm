/**
 * Hermes 模块前端业务层类型。
 */
import type {
    HermesConnectionTestResponse,
    HermesInstanceResponse,
    HermesProfileResponse,
} from "@/types/api/hermes";
import type { Camelized } from "@/utils/case";

export type HermesInstanceOutput = Camelized<HermesInstanceResponse> & {
    profiles: HermesProfileOutput[];
};

export type HermesProfileOutput = Camelized<HermesProfileResponse>;

export type HermesConnectionTestOutput = Camelized<HermesConnectionTestResponse>;

export interface HermesInstanceInput {
    name: string;
    apiBaseUrl: string;
    apiKey?: string | null;
    defaultModel?: string | null;
    status?: string;
}

export interface HermesProfileInput {
    profileKey?: string;
    displayName?: string;
    roleName?: string | null;
    model?: string | null;
    enabled?: boolean;
}
