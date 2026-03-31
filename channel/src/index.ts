/**
 * 这里保持成极薄入口，真正的插件装配逻辑放到 app/plugin.ts。
 * 这样后续维护时，index.ts 不会再承担配置、路由、发送链等多重职责。
 */
export { default } from "./app/plugin.js";
