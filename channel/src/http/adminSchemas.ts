import { z } from "zod";

export const AgentAdminCreateSchema = z.object({
    agentKey: z.string().min(1),
    displayName: z.string().min(1),
    agentsMd: z.string().optional(),
    toolsMd: z.string().optional(),
    identityMd: z.string().optional(),
    soulMd: z.string().optional(),
    userMd: z.string().optional(),
    memoryMd: z.string().optional(),
    heartbeatMd: z.string().optional(),
});

export const AgentAdminUpdateSchema = z.object({
    displayName: z.string().min(1).optional(),
    agentsMd: z.string().optional(),
    toolsMd: z.string().optional(),
    identityMd: z.string().optional(),
    soulMd: z.string().optional(),
    userMd: z.string().optional(),
    memoryMd: z.string().optional(),
    heartbeatMd: z.string().optional(),
});
