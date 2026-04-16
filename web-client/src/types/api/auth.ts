/**
 * 登录认证接口的原始响应类型。
 *
 * 这里保持与后端字段一致，前端业务层通过 Output 类型使用 camelCase。
 */
export interface AuthUserResponse {
    id: string;
    username: string;
    display_name: string;
    using_default_password: boolean;
}
