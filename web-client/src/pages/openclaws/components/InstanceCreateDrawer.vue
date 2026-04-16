<template>
  <el-drawer
    :model-value="visible"
    :title="drawerTitle"
    size="620px"
    destroy-on-close
    @close="emit('update:visible', false)"
  >
    <div v-loading="submitting" class="drawer-body">
      <el-form label-position="top">
        <el-form-item :label="t('openclaw.instanceName')">
          <el-input v-model="form.name" maxlength="120" :placeholder="t('openclaw.instanceNamePlaceholder')" />
        </el-form-item>

        <el-form-item :label="t('openclaw.openclawUrl')">
          <el-input v-model="form.channelBaseUrl" placeholder="例如：https://172.16.200.119:18789" />
        </el-form-item>
      </el-form>

      <el-form v-if="credentials" label-position="top">
        <el-form-item :label="t('openclaw.outboundToken')">
          <el-input :model-value="maskedSecret(credentials.outboundToken)" readonly>
            <template #append>
              <el-button text @click="copyCredential('outboundToken')">
                <el-icon><DocumentCopy /></el-icon>
              </el-button>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item :label="t('openclaw.inboundSigningSecret')">
          <el-input :model-value="maskedSecret(credentials.inboundSigningSecret)" readonly>
            <template #append>
              <el-button text @click="copyCredential('inboundSigningSecret')">
                <el-icon><DocumentCopy /></el-icon>
              </el-button>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <template #label>
            <span class="drawer-label-with-tip">
              <span>{{ t("openclaw.gatewayToken") }}</span>
              <el-tooltip :content="t('openclaw.gatewayTokenHint')" placement="top">
                <el-icon class="drawer-label-tip"><InfoFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input
            v-model="form.gatewayToken"
            :placeholder="t('openclaw.gatewayTokenPlaceholder')"
          />
        </el-form-item>

        <el-form-item>
          <el-checkbox v-model="form.includeIntermediateMessages">
            {{ t("openclaw.includeIntermediateMessages") }}
          </el-checkbox>
          <div class="drawer-config-help">{{ t("openclaw.includeIntermediateMessagesHelp") }}</div>
        </el-form-item>

        <el-form-item>
          <template #label>
            <span class="drawer-label-with-tip">
              <span>{{ t("openclaw.openclawJsonConfig") }} &nbsp;&nbsp;→</span>
              <el-tooltip :content="t('openclaw.copyOpenclawJsonConfig')" placement="top">
                <el-button link @click="copyOpenClawConfig">
                  <el-icon><DocumentCopy /></el-icon>
                </el-button>
              </el-tooltip>
            </span>
          </template>
          <el-input
            type="textarea"
            @mousedown.prevent
            readonly
            :model-value="maskedOpenClawConfig"
            :autosize="{ minRows: 12, maxRows: 18 }"
          />
          <div class="drawer-config-help">{{ t("openclaw.openclawJsonConfigHelp") }}</div>
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <div class="drawer-actions">
        <el-button @click="emit('update:visible', false)">{{ t("common.cancel") }}</el-button>
        <el-button type="primary" :disabled="!canSubmit" @click="submit">
          {{ submitLabel }}
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
/**
 * OpenClaw 实例创建与编辑抽屉。
 *
 * 负责实例基础信息和接入配置片段展示。
 */
import { computed, reactive, watch } from "vue";
import { DocumentCopy, InfoFilled } from "@element-plus/icons-vue";
import { useI18n } from "@/composables/useI18n";
import type { OpenClawInstanceCredentialsOutput } from "@/types/view/openclaw";

const props = defineProps<{
    visible: boolean;
    submitting: boolean;
    mode?: "create" | "edit";
    initialValue?: {
        id: number;
        name: string;
        channelBaseUrl: string;
        channelAccountId: string;
    } | null;
    credentials?: OpenClawInstanceCredentialsOutput | null;
}>();

const emit = defineEmits<{
    "update:visible": [value: boolean];
    submit: [payload:
        | {
            mode: "create";
            name: string;
            channelBaseUrl: string;
            channelAccountId: string;
        }
        | {
            mode: "edit";
            instanceId: number;
            name: string;
            channelBaseUrl: string;
            channelAccountId: string;
        }
    ];
}>();

const form = reactive({
    name: "",
    channelBaseUrl: "",
    channelAccountId: "default",
    gatewayToken: "",
    includeIntermediateMessages: true,
});
const { t } = useI18n();

const mode = computed(() => props.mode ?? "create");
const drawerTitle = computed(() => (mode.value === "edit" ? t("openclaw.drawerEditTitle") : t("openclaw.drawerCreateTitle")));
const submitLabel = computed(() => t("common.save"));

watch(
    () => props.visible,
    (visible) => {
        if (!visible) {
            form.name = "";
            form.channelBaseUrl = "";
            form.channelAccountId = "default";
            form.includeIntermediateMessages = true;
            form.gatewayToken = "";
            return;
        }
        if (mode.value === "edit" && props.initialValue) {
            form.name = props.initialValue.name;
            form.channelBaseUrl = props.initialValue.channelBaseUrl;
            form.channelAccountId = props.initialValue.channelAccountId;
            form.gatewayToken = "";
        }
        form.gatewayToken = "";
    },
);

const canSubmit = computed(
    () =>
        !!form.name.trim()
        && !!form.channelBaseUrl.trim(),
);

function submit() {
    if (!canSubmit.value) {
        return;
    }
    if (mode.value === "edit" && props.initialValue) {
        emit("submit", {
            mode: "edit",
            instanceId: props.initialValue.id,
            name: form.name.trim(),
            channelBaseUrl: form.channelBaseUrl.trim(),
            channelAccountId: form.channelAccountId.trim(),
        });
        return;
    }
    emit("submit", {
        mode: "create",
        name: form.name.trim(),
        channelBaseUrl: form.channelBaseUrl.trim(),
        channelAccountId: form.channelAccountId.trim(),
    });
}

function maskedSecret(value: string) {
    return value ? "••••••••••••••••••••••••" : "";
}

function buildOpenClawConfig(maskSecrets: boolean) {
    if (!props.credentials) {
        return "";
    }
    const backendBaseUrl = resolveBackendBaseUrl();
    const fullConfig = JSON.stringify({
        plugins: {
            allow: [
                "clawswarm",
            ],
            entries: {
                "clawswarm": {
                    enabled: true,
                    config: {},
                },
            },
        },
        skills: {
            load: {
                extraDirs: [
                    "/home/node/.openclaw/extensions/clawswarm/skills",
                ],
            },
            entries: {
                "cs-chat": {
                    enabled: true,
                },
            },
        },
        channels: {
            "clawswarm": {
                accounts: {
                    default: {
                        enabled: true,
                        baseUrl: backendBaseUrl,
                            outboundToken: maskSecrets ? maskedSecret(props.credentials.outboundToken) : props.credentials.outboundToken,
                            inboundSigningSecret: maskSecrets ? maskedSecret(props.credentials.inboundSigningSecret) : props.credentials.inboundSigningSecret,
                            webchatMirror: {
                                includeIntermediateMessages: form.includeIntermediateMessages,
                            },
                            gateway: {
                                baseUrl: form.channelBaseUrl.trim(),
                                token: maskSecrets ? maskedSecret(form.gatewayToken.trim()) : form.gatewayToken.trim(),
                                model: "openclaw",
                                stream: true,
                                allowInsecureTls: true,
                        },
                        agentDirectory: {
                            allowedAgentIds: ["main"],
                            aliases: {},
                        },
                    },
                },
            },
        },
    }, null, 2);

    return `${fullConfig.replace(/^\{\n/, "").replace(/\n\}$/, "")},`;
}

const generatedOpenClawConfig = computed(() => buildOpenClawConfig(false));
const maskedOpenClawConfig = computed(() => buildOpenClawConfig(true));

function resolveBackendBaseUrl() {
    const explicit = import.meta.env.VITE_API_BASE_URL?.trim();
    if (explicit) {
        return explicit;
    }
    const devProxyTarget = import.meta.env.VITE_DEV_API_PROXY_TARGET?.trim();
    if (devProxyTarget) {
        return devProxyTarget;
    }
    if (typeof window !== "undefined" && window.location?.origin) {
        return window.location.origin;
    }
    return "http://127.0.0.1:18080";
}

async function copyCredential(key: keyof OpenClawInstanceCredentialsOutput) {
    if (!props.credentials) {
        return;
    }
    const value = props.credentials[key];
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(value);
        } else {
            const textarea = document.createElement("textarea");
            textarea.value = value;
            textarea.setAttribute("readonly", "true");
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";
            document.body.appendChild(textarea);
            textarea.select();
            const copied = document.execCommand("copy");
            document.body.removeChild(textarea);
            if (!copied) {
                throw new Error(t("openclaw.copyFailed"));
            }
        }
        ElMessage.success(t("openclaw.copySuccess"));
    } catch (error) {
        ElMessage.error(error instanceof Error ? error.message : String(error));
    }
}

async function copyOpenClawConfig() {
    const copyValue = generatedOpenClawConfig.value;
    if (!copyValue) {
        return;
    }
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(copyValue);
        } else {
            const textarea = document.createElement("textarea");
            textarea.value = copyValue;
            textarea.setAttribute("readonly", "true");
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";
            document.body.appendChild(textarea);
            textarea.select();
            const copied = document.execCommand("copy");
            document.body.removeChild(textarea);
            if (!copied) {
                throw new Error(t("openclaw.copyFailed"));
            }
        }
        ElMessage.success(t("openclaw.copySuccess"));
        window.setTimeout(() => {
            form.gatewayToken = "";
        }, 1000);
    } catch (error) {
        ElMessage.error(error instanceof Error ? error.message : String(error));
    }
}
</script>

<style scoped>
.drawer-body {
  display: grid;
  gap: var(--space-3);
  padding-right: 6px;
}

.drawer-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.drawer-label-with-tip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.drawer-label-tip {
  color: #909399;
  cursor: help;
}

.drawer-config-help {
  margin-bottom: 8px;
  color: #606266;
  font-size: 0.92rem;
  line-height: 1.5;
  white-space: pre-line;
}

</style>
