import type {AddressBookAgentApi} from "@/types/api/addressBook";
import type {
  DocumentTemplateResponse,
  ProjectDetailResponse,
  ProjectDocumentResponse,
  ProjectMemberResponse,
  ProjectResponse,
} from "@/types/api/project-management";
import type {
  DocumentTemplateView,
  ProjectDetailView,
  ProjectDocumentView,
  ProjectMemberView,
  ProjectView,
} from "@/types/view/project-management";
import {camelizeKeys, snakeizeKeys} from "@/utils/case";

export interface SelectableProjectMember {
  id: number;
  agentKey: string;
  name?: string;
  csId: string;
  openclaw: string;
  role?: string;
}

export function toProjectMemberView(item: ProjectMemberResponse): ProjectMemberView {
  return camelizeKeys(item);
}

export function toProjectMemberRequest(item: ProjectMemberView): ProjectMemberResponse {
  return snakeizeKeys(item) as ProjectMemberResponse;
}

export function toSelectableProjectMember(item: AddressBookAgentApi, openclaw: string): SelectableProjectMember {
  return {
    id: item.id,
    agentKey: item.agent_key,
    name: item.display_name,
    csId: item.cs_id,
    role: item.role_name,
    openclaw,
  };
}

export function toProjectView(item: ProjectResponse): ProjectView {
  return camelizeKeys(item);
}

export function toProjectDocumentView(item: ProjectDocumentResponse): ProjectDocumentView {
  return camelizeKeys(item);
}

export function toProjectDetailView(item: ProjectDetailResponse): ProjectDetailView {
  return camelizeKeys(item);
}

export function toTemplateView(item: DocumentTemplateResponse): DocumentTemplateView {
  return camelizeKeys(item);
}
