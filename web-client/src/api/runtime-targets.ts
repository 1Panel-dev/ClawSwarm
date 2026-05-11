import { apiClient } from "@/api/client";
import type { RuntimeTargetResponse } from "@/types/api/runtime-target";
import type { RuntimeTargetOutput } from "@/types/view/runtime-target";
import { camelizeKeys } from "@/utils/case";

export async function fetchRuntimeTargets(): Promise<RuntimeTargetOutput[]> {
    const response = await apiClient.get<RuntimeTargetResponse[]>("/api/runtime-targets");
    return response.data.map(camelizeKeys);
}
