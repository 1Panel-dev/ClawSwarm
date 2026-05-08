# ClawSwarm Channel 插件

[English](./README.md)

## 快速安装手册

- [人类安装](./docs/human-install.zh-CN.md)
- [Agent 安装](./docs/agent-install.zh-CN.md)

`channel/` 是 ClawSwarm 对接 OpenClaw 的原生 Channel 插件实现。

它的目标是把 ClawSwarm 调度中心和 OpenClaw Gateway 连接起来，让用户可以通过 ClawSwarm 与多个 Agent 进行单聊、群聊和 `@mention` 定向对话。

## OpenClaw 兼容性

- 目标宿主版本：OpenClaw `2026.5.5+`。
- npm 包通过 `openclaw.extensions`、`openclaw.runtimeExtensions`、`openclaw.setupEntry`、`openclaw.runtimeSetupEntry` 同时声明源码入口和构建后的运行时入口。
- `channelConfigs.clawswarm` 是 OpenClaw Channel 配置页面所需的配置路径。
- 技能文件打包在 `skills/cs-chat` 下，由 OpenClaw 发布到宿主插件技能目录。
