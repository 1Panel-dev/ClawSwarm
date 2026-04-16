import { apiClient } from "@/api/client";
import type { AuthUserResponse } from "@/types/api/auth";
import type { AuthUserOutput, LoginInput, UpdateProfileInput } from "@/types/view/auth";
import { camelizeKeys, snakeizeKeys } from "@/utils/case";

export async function login(payload: LoginInput): Promise<AuthUserOutput> {
    const response = await apiClient.post<AuthUserResponse>("/api/auth/login", payload);
    return camelizeKeys(response.data);
}

export async function logout() {
    await apiClient.post("/api/auth/logout");
}

export async function fetchCurrentUser(): Promise<AuthUserOutput> {
    const response = await apiClient.get<AuthUserResponse>("/api/auth/me");
    return camelizeKeys(response.data);
}

export async function updateProfile(payload: UpdateProfileInput): Promise<AuthUserOutput> {
    const response = await apiClient.put<AuthUserResponse>("/api/auth/profile", snakeizeKeys(payload));
    return camelizeKeys(response.data);
}
