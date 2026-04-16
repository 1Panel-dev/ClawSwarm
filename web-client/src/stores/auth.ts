import { defineStore } from "pinia";

import { fetchCurrentUser, login as loginRequest, logout as logoutRequest, updateProfile as updateProfileRequest } from "@/api/auth";
import type { AuthUserOutput, LoginInput, UpdateProfileInput } from "@/types/view/auth";

type AuthState = {
    user: AuthUserOutput | null;
    initialized: boolean;
    loadingMe: Promise<AuthUserOutput | null> | null;
};

export const useAuthStore = defineStore("auth", {
    state: (): AuthState => ({
        user: null,
        initialized: false,
        loadingMe: null,
    }),
    getters: {
        isAuthenticated: (state) => !!state.user,
    },
    actions: {
        async ensureLoaded() {
            if (this.initialized) {
                return this.user;
            }
            if (this.loadingMe) {
                return this.loadingMe;
            }
            this.loadingMe = (async () => {
                try {
                    this.user = await fetchCurrentUser();
                } catch {
                    this.user = null;
                } finally {
                    this.initialized = true;
                    this.loadingMe = null;
                }
                return this.user;
            })();
            return this.loadingMe;
        },
        async login(payload: LoginInput) {
            const user = await loginRequest(payload);
            this.user = user;
            this.initialized = true;
            return user;
        },
        async logout() {
            await logoutRequest();
            this.user = null;
            this.initialized = true;
        },
        async updateProfile(payload: UpdateProfileInput) {
            const user = await updateProfileRequest(payload);
            this.user = user;
            this.initialized = true;
            return user;
        },
    },
});
