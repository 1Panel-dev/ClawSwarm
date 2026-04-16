/**
 * 通讯录模块的前端输入输出模型。
 *
 * API 响应保持后端字段；页面和 store 统一使用 camelCase 输出。
 */
import type {
    AddressBookAgentResponse,
    AddressBookGroupMemberResponse,
    AddressBookGroupResponse,
    AddressBookInstanceResponse,
    AddressBookResponse,
} from "@/types/api/addressBook";
import type { Camelized } from "@/utils/case";

export type AddressBookAgentOutput = Camelized<AddressBookAgentResponse>;

export type AddressBookInstanceOutput = Camelized<AddressBookInstanceResponse>;

export type AddressBookGroupMemberOutput = Camelized<AddressBookGroupMemberResponse>;

export type AddressBookGroupOutput = Camelized<AddressBookGroupResponse>;

export type AddressBookOutput = Camelized<AddressBookResponse>;
