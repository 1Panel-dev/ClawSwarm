<template>
  <AppShell>
    <div class="main-layout">
      <div class="main-layout__frame">
        <section class="main-layout__content">
          <RouterView />
        </section>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
/**
 * MainLayout 只负责统一的页面外壳。
 *
 * 页面内部是否需要分左右、是否存在侧栏，
 * 都应该由各页面自己负责，而不是在布局层分叉成多套结构。
 */
import AppShell from "@/app/AppShell.vue";
</script>

<style scoped>
.main-layout {
  display: flex;
  height: 100%;
  min-height: 0;
  padding: 8px;
}

.main-layout__frame {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  border: 1px solid #dddddf;
  border-radius: var(--page-shell-card-radius);
  background: #f5f5f7;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.03);
  overflow: hidden;
}

.main-layout__content {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  background: #ffffff;
  display: flex;
  overflow: hidden;
  padding:
    var(--page-shell-pad-top)
    var(--page-shell-pad-x)
    var(--page-shell-pad-bottom);
  box-sizing: border-box;
  border-radius: var(--page-shell-card-radius);
}

@media (max-width: 960px) {
  .main-layout__content {
    min-height: auto;
  }
}
</style>
