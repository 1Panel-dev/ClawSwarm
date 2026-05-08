# ClawSwarm Channel Plugin

[中文版](./README.zh-CN.md)

## Quick Install Guides

- [Human Install](./docs/human-install.en.md)
- [Agent Install](./docs/agent-install.en.md)

`channel/` is the native OpenClaw channel plugin for ClawSwarm.

Its purpose is to connect the ClawSwarm scheduler with OpenClaw Gateway so users can talk to multiple agents through direct chat, group chat, and `@mention` routing.

## OpenClaw Compatibility

- Target host version: OpenClaw `2026.5.5+`.
- The package declares both source and built runtime entries through `openclaw.extensions`, `openclaw.runtimeExtensions`, `openclaw.setupEntry`, and `openclaw.runtimeSetupEntry`.
- `channelConfigs.clawswarm` is required for the OpenClaw channel config UI.
- Skills are packaged under `skills/cs-chat` and are published by OpenClaw through the host plugin skill path.
