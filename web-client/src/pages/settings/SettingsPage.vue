<template>
  <div class="page-shell">
    <section class="settings-hero page-card page-shell__header">
      <div>
        <div class="settings-card__eyebrow">设置</div>
        <h1 class="settings-card__title">界面与偏好</h1>
        <p class="settings-card__description">
          设置页第一阶段先把主题系统真正做起来。后续更多偏好项也会继续放在这个模块，而不是散落在各页面局部状态里。
        </p>
      </div>
      <div class="settings-hero__badge">主题系统已启用</div>
    </section>

    <section class="settings-grid page-grid">
      <div class="settings-card page-card">
        <h2 class="settings-card__section-title">主题切换</h2>
        <div class="settings-card__options">
          <button
            v-for="item in themeOptions"
            :key="item.id"
            class="theme-option"
            :class="{ 'theme-option--active': item.id === themeId }"
            @click="setTheme(item.id)"
          >
            <div class="theme-option__title">{{ item.label }}</div>
            <div class="theme-option__description">{{ item.description }}</div>
          </button>
        </div>
      </div>

      <div class="settings-card page-card">
        <h2 class="settings-card__section-title">为什么现在就做主题</h2>
        <ul class="settings-card__list">
          <li>避免以后为了黑白风格大改页面颜色</li>
          <li>组件样式统一走设计令牌，减少写死颜色</li>
          <li>后续增加更多品牌风格时，只需要扩展 token</li>
        </ul>
      </div>
    </section>

    <section class="settings-card page-card">
      <h2 class="settings-card__section-title">后续设置项预留</h2>
      <div class="settings-card__options settings-card__options--future">
        <button
          class="theme-option theme-option--disabled"
          disabled
        >
          <div class="theme-option__title">消息偏好</div>
          <div class="theme-option__description">后续接入已读、轮询频率和通知偏好。</div>
        </button>
        <button
          class="theme-option theme-option--disabled"
          disabled
        >
          <div class="theme-option__title">界面布局</div>
          <div class="theme-option__description">后续接入侧栏宽度、密度和更多阅读偏好。</div>
        </button>
      </div>
    </section>

    <section class="settings-card page-card">
      <h2 class="settings-card__section-title">按钮样式对比</h2>
      <p class="settings-card__description">
        这里专门放一个 Element Plus 主按钮，方便你直接对比它和我们自定义按钮的颜色表现。
      </p>
      <div class="settings-card__compare">
        <el-button type="primary">Element Plus 主按钮</el-button>
        <button class="settings-card__brand-button" type="button">项目自定义按钮</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * 设置页第一阶段先把主题切换真正做起来。
 *
 * 这是一个很重要的“先搭好基础设施”的点，
 * 后面无论是黑白主题还是别的品牌风格，都能在 token 层切换。
 */
import { useTheme } from "@/composables/useTheme";

const { themeId, themeOptions, setTheme } = useTheme();
</script>

<style scoped>
.settings-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  background: linear-gradient(135deg, var(--color-bg-panel), color-mix(in srgb, var(--color-bg-soft) 65%, white));
}

.settings-hero__badge {
  padding: 10px 14px;
  border-radius: 999px;
  background: var(--color-bg-app);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.settings-grid {
}

.settings-card {
  gap: var(--space-4);
  background: var(--color-bg-app);
}

.settings-card__eyebrow {
  color: var(--color-text-secondary);
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.settings-card__title {
  margin: 0;
  font-size: 1.7rem;
}

.settings-card__section-title {
  margin: 0;
  font-size: 1.15rem;
}

.settings-card__description {
  margin: 0;
  color: var(--color-text-secondary);
  max-width: 58ch;
  line-height: 1.7;
}

.settings-card__options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-4);
}

.theme-option {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-app);
  text-align: left;
  cursor: pointer;
}

.theme-option--active {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-accent) 40%, transparent);
}

.theme-option--disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.theme-option__title {
  font-weight: 700;
}

.theme-option__description {
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.settings-card__options--future {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.settings-card__compare {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.settings-card__brand-button {
  padding: 10px 16px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-accent);
  color: #ffffff;
  cursor: pointer;
}

.settings-card__list {
  margin: 0;
  padding-left: 1.2rem;
  color: var(--color-text-secondary);
  line-height: 1.8;
}

@media (max-width: 960px) {
  .settings-hero,
  .settings-grid {
    grid-template-columns: 1fr;
    flex-direction: column;
  }
}
</style>
