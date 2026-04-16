/**
 * 登录认证模块的前端输入输出模型。
 */
import type { AuthUserResponse } from "@/types/api/auth";
import type { Camelized } from "@/utils/case";

export type AuthUserOutput = Camelized<AuthUserResponse>;

export interface LoginInput {
    username: string;
    password: string;
}

export interface UpdateProfileInput {
    displayName: string;
    currentPassword?: string;
    newPassword?: string;
}
