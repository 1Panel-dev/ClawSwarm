import { defineStore } from "pinia";

import { addGroupMembers, createGroup, deleteGroup, deleteGroupMember, fetchGroupDetail } from "@/api/groups";
import { useAddressBookStore } from "@/stores/addressBook";
import type { GroupCreateInput, GroupDetailOutput, GroupMemberInput, GroupOutput } from "@/types/view/group";

export const useGroupStore = defineStore("group", {
    state: () => ({
        currentGroupDetail: null as GroupDetailOutput | null,
        editingGroupId: null as number | null,
        creating: false,
        savingMembers: false,
        lastCreatedGroup: null as GroupOutput | null,
    }),
    actions: {
        async loadGroupDetail(groupId: number) {
            this.currentGroupDetail = await fetchGroupDetail(groupId);
        },
        async createNewGroup(payload: GroupCreateInput) {
            this.creating = true;
            try {
                const group = await createGroup(payload);
                this.lastCreatedGroup = group;
                await useAddressBookStore().loadAll();
                return group;
            } finally {
                this.creating = false;
            }
        },
        async appendMembers(groupId: number, members: GroupMemberInput[]) {
            this.savingMembers = true;
            try {
                await addGroupMembers(groupId, members);
                await this.loadGroupDetail(groupId);
                await useAddressBookStore().loadAll();
            } finally {
                this.savingMembers = false;
            }
        },
        async removeMember(groupId: number, memberId: number) {
            this.savingMembers = true;
            try {
                this.currentGroupDetail = await deleteGroupMember(groupId, memberId);
                await useAddressBookStore().loadAll();
            } finally {
                this.savingMembers = false;
            }
        },
        async deleteCurrentGroup(groupId: number) {
            this.savingMembers = true;
            try {
                await deleteGroup(groupId);
                this.currentGroupDetail = null;
                this.editingGroupId = null;
                await useAddressBookStore().loadAll();
            } finally {
                this.savingMembers = false;
            }
        },
        startEditing(groupId: number) {
            this.editingGroupId = groupId;
        },
        stopEditing() {
            this.editingGroupId = null;
        },
    },
});
