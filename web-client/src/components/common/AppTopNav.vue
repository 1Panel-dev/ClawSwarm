<template>
  <header class="top-nav">
    <div class="top-nav__brand">
      <img class="top-nav__logo" src="/Logo-2.png" alt="Claw Team Logo" />
    </div>

    <nav class="top-nav__links">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        custom
        v-slot="{ href, navigate }"
      >
        <a
          :href="href"
          class="top-nav__link"
          :class="{
            'top-nav__link--active': isCurrent(item.to),
            'el-button el-button--default': !isCurrent(item.to),
            'el-button el-button--primary': isCurrent(item.to),
          }"
          @click="navigate"
        >
          <span>{{ item.label }}</span>
        </a>
      </RouterLink>
    </nav>
  </header>
</template>

<script setup lang="ts">
/**
 * 顶部导航从第一阶段就固定好长期产品模块。
 *
 * 即使 OpenClaw、任务、设置目前还只有占位页，
 * 也先把导航定下来，避免后面再大改应用骨架。
 */
import { useRoute } from "vue-router";

const route = useRoute();

const navItems = [
    { label: "消息", to: "/messages" },
    { label: "OpenClaw", to: "/openclaws" },
    { label: "任务", to: "/tasks" },
    { label: "设置", to: "/settings" },
];

function isCurrent(target: string) {
    return route.path === target || route.path.startsWith(`${target}/`);
}
</script>

<style scoped>
.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  min-height: 58px;
  padding: 8px 14px;
  border-bottom: 1px solid #dddde2;
  background: #f3f3f5;
}

.top-nav__brand {
  display: flex;
  align-items: center;
}

.top-nav__logo {
  width: auto;
  height: 28px;
  object-fit: contain;
}

.top-nav__links {
  display: flex;
  gap: 8px;
}

.top-nav__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 14px;
  text-decoration: none;
  white-space: nowrap;
  font-weight: 600;
  font-size: 0.95rem;
}

.top-nav__link:hover {
  text-decoration: none;
}

.top-nav__link--active {
  color: #ffffff;
}

.top-nav :deep(.el-button) {
  --el-button-hover-bg-color: #ffffff;
  --el-button-hover-border-color: #d0d0d6;
  --el-button-active-bg-color: color-mix(in srgb, var(--color-accent) 85%, black);
  box-shadow: none;
}

@media (max-width: 960px) {
  .top-nav {
    flex-direction: column;
    align-items: stretch;
  }

  .top-nav__links {
    overflow-x: auto;
  }
}
</style>
