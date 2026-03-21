/**
 * 这里封装前端统一的 HTTP 客户端。
 *
 * 后面如果要增加鉴权、全局错误处理、请求日志或切换 baseURL，
 * 优先都在这里做，而不是散落在页面组件里。
 */
import axios from "axios";

export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8080",
    timeout: 10000,
});
