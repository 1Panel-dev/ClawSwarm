/**
 * 这是 Web Client 的前端入口。
 *
 * 这里负责：
 * 1. 挂载 Vue 应用。
 * 2. 注册 Pinia、Router、按需使用的 Element Plus 组件。
 * 3. 初始化全局主题。
 * 4. 引入基础样式和设计令牌。
 */
import { createApp } from "vue";

import App from "@/App.vue";
import { registerProviders } from "@/app/providers";
import { applyInitialTheme } from "@/theme/applyTheme";

import "@/styles/reset.css";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/page-shell.css";

const app = createApp(App);

registerProviders(app);
applyInitialTheme();

app.mount("#app");
