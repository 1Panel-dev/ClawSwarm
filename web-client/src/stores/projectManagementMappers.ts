import type { AddressBookAgentOutput } from "@/types/view/addressBook";

export interface SelectableProjectMember {
  id: number;
  agentKey: string;
  name?: string;
  csId: string;
  openclaw: string;
  role?: string;
}

export function toSelectableProjectMember(item: AddressBookAgentOutput, openclaw: string): SelectableProjectMember {
  return {
    id: item.id,
    agentKey: item.agentKey,
    name: item.displayName ?? undefined,
    csId: item.csId,
    role: item.roleName ?? undefined,
    openclaw,
  };
}
