/**
 * Runtime Target 前端展示层类型。
 */
import type { RuntimeTargetResponse } from "@/types/api/runtime-target";
import type { Camelized } from "@/utils/case";

export type RuntimeTargetOutput = Camelized<RuntimeTargetResponse>;
