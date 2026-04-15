import type {AddressBookAgentApi} from "@/types/api/addressBook";

export interface SelectableProjectMember {
  id: number;
  agentKey: string;
  name?: string;
  csId: string;
  openclaw: string;
  role?: string;
}

export function toSelectableProjectMember(item: AddressBookAgentApi, openclaw: string): SelectableProjectMember {
  return {
    id: item.id,
    agentKey: item.agent_key,
    name: item.display_name ?? undefined,
    csId: item.cs_id,
    role: item.role_name ?? undefined,
    openclaw,
  };
}
