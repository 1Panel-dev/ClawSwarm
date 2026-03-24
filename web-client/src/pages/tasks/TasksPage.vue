<template>
  <div class="page-shell">
    <section class="page-header page-shell__header">
      <h1 class="page-header__title page-shell__title">任务管理</h1>

      <el-tabs :model-value="activeStatusTab" class="tasks-tabs" @tab-change="handleTabChange">
        <el-tab-pane
          v-for="tab in statusTabs"
          :key="tab.value"
          :label="tab.label"
          :name="tab.value"
        />
      </el-tabs>
    </section>

    <section class="table-shell page-shell__body">
      <header class="toolbar">
        <div class="toolbar__left">
          <el-button type="primary" @click="createDrawerVisible = true">
            创建任务
          </el-button>
        </div>

        <div class="toolbar__right">
          <el-input
            :model-value="filters.keyword"
            clearable
            class="toolbar__search"
            placeholder="按任务名称 / 任务内容搜索"
            @update:model-value="handleKeywordChange"
          />
          <el-button :loading="taskLoading" @click="reloadTasks">
            刷新
          </el-button>
          <span class="toolbar__mode" :class="`toolbar__mode--${backendMode}`">
            {{ backendModeLabel }}
          </span>
        </div>
      </header>

      <div class="table-wrap">
        <div v-if="loadError" class="table-banner table-banner--warning">
          {{ loadError }}
        </div>
        <div v-if="taskLoading" class="table-empty">
          正在加载任务…
        </div>
        <div v-else class="task-table-v2">
          <el-auto-resizer>
            <template #default="{ height, width }">
              <el-table-v2
                :columns="columns"
                :data="loadedTasks"
                :header-height="48"
                :height="Math.max(height, tableViewportHeight)"
                :width="width"
                class="task-table-v2__table"
                @rows-rendered="handleRowsRendered"
              >
                <template #empty>
                  <el-empty :description="emptyStateText" />
                </template>
              </el-table-v2>
            </template>
          </el-auto-resizer>
        </div>
      </div>

    </section>

    <TaskCreateDrawer
      v-model:visible="createDrawerVisible"
      :instances="instances"
      @submit="handleCreateTask"
    />

    <el-drawer
      :model-value="detailDrawerVisible"
      title="任务详情"
      size="760px"
      destroy-on-close
      @close="detailDrawerVisible = false"
    >
      <TaskDetailPane
        :task="detailTask"
        @complete="handleCompleteTask"
        @terminate="handleTerminateTask"
      />
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
/**
 * 任务页现在改成更贴近“管理台”的结构：
 * 1. 顶部状态 Tab
 * 2. 工具栏里的创建按钮和搜索框
 * 3. 下方表格列表
 *
 * 这样后续接真实任务后端时，更容易直接套上真实列表和按批次查询。
 */
import { computed, h, onMounted, ref } from "vue";
import ElButton from "element-plus/es/components/button/index";
import { ElMessage } from "element-plus/es/components/message/index";
import type { Column } from "element-plus/es/components/table-v2/index";

import TaskDetailPane from "@/components/task/TaskDetailPane.vue";
import TaskCreateDrawer from "@/components/task/TaskCreateDrawer.vue";
import { useOpenClawStore } from "@/stores/openclaw";
import { useTaskStore } from "@/stores/task";
import type { TaskCreatePayload, TaskStatus } from "@/types/view/task";

const taskStore = useTaskStore();
const openClawStore = useOpenClawStore();
const createDrawerVisible = ref(false);
const detailDrawerVisible = ref(false);
const detailTaskId = ref<string | null>(null);
const activeStatusTab = ref<TaskStatus | "all">("in_progress");
const virtualLoadStep = 500;
const virtualPreloadThresholdRows = 120;
const loadedTaskCount = ref(virtualLoadStep);
const tableViewportHeight = 460;

const filters = computed(() => taskStore.filters);
const instances = computed(() => openClawStore.instances);
const taskLoading = computed(() => taskStore.loading);
const loadError = computed(() => taskStore.loadError);
const backendMode = computed(() => taskStore.backendMode);
const filteredTasks = computed(() => taskStore.filteredTasks);
const detailTask = computed(() => taskStore.items.find((item) => item.id === detailTaskId.value) ?? null);
const loadedTasks = computed(() =>
    filteredTasks.value.slice(0, Math.min(filteredTasks.value.length, loadedTaskCount.value)),
);
const backendModeLabel = computed(() => {
    if (backendMode.value === "server") {
        return "真实后端";
    }
    if (backendMode.value === "demo") {
        return "演示数据";
    }
    return "初始化中";
});
const emptyStateText = computed(() => {
    if (backendMode.value === "server") {
        return "真实任务系统里还没有任务。你可以先点击左上角“创建任务”试一条。";
    }
    return "当前筛选条件下还没有任务。";
});
const statusTabs = [
    { value: "in_progress", label: "进行中任务" },
    { value: "completed", label: "已完成任务" },
    { value: "terminated", label: "已终止任务" },
    { value: "all", label: "全部任务" },
] as const;
const columns = computed<Column[]>(() => [
    {
        key: "title",
        title: "任务标题",
        dataKey: "title",
        width: 260,
        flexGrow: 2.6,
        cellRenderer: ({ rowData }) => h("div", { class: "task-cell task-cell--title" }, rowData.title),
    },
    {
        key: "agent",
        title: "执行 Agent",
        dataKey: "agent",
        width: 120,
        flexGrow: 1,
        cellRenderer: ({ rowData }) => h("div", rowData.assignee.agentName),
    },
    {
        key: "instance",
        title: "OpenClaw",
        dataKey: "instance",
        width: 180,
        flexGrow: 1.5,
        cellRenderer: ({ rowData }) => h("div", rowData.assignee.instanceName),
    },
    {
        key: "status",
        title: "状态",
        dataKey: "status",
        width: 100,
        cellRenderer: ({ rowData }) =>
            h("span", { class: `status-pill status-pill--${rowData.status}` }, statusLabel(rowData.status)),
    },
    {
        key: "startedAt",
        title: "开始时间",
        dataKey: "startedAt",
        width: 150,
        flexGrow: 1.1,
        cellRenderer: ({ rowData }) => h("div", formatDateTime(rowData.startedAt)),
    },
    {
        key: "endedAt",
        title: "结束时间",
        dataKey: "endedAt",
        width: 140,
        flexGrow: 1,
        cellRenderer: ({ rowData }) => h("div", rowData.endedAt ? formatDateTime(rowData.endedAt) : "-"),
    },
    {
        key: "actions",
        title: "操作",
        dataKey: "actions",
        width: 180,
        flexGrow: 1,
        cellRenderer: ({ rowData }) =>
            h("div", { class: "actions" }, [
                h(
                    ElButton,
                    {
                        class: "actions__button",
                        size: "small",
                        onClick: () => openTaskDetail(rowData.id),
                    },
                    { default: () => "查看" },
                ),
                ...(rowData.status === "in_progress"
                    ? [
                        h(
                            ElButton,
                            {
                                class: "actions__button",
                                size: "small",
                                onClick: () => handleCompleteTask(rowData.id),
                            },
                            { default: () => "完成" },
                        ),
                        h(
                            ElButton,
                            {
                                class: "actions__button",
                                size: "small",
                                type: "danger",
                                plain: true,
                                onClick: () => handleTerminateTask(rowData.id),
                            },
                            { default: () => "终止" },
                        ),
                    ]
                    : []),
            ]),
    },
]);

onMounted(() => {
    void taskStore.initialize();
    taskStore.setPriorityFilter("all");
    taskStore.setStatusFilter(activeStatusTab.value);
    if (!openClawStore.instances.length) {
        void openClawStore.loadInstances();
    }
});

async function handleCreateTask(payload: TaskCreatePayload) {
    try {
        const task = await taskStore.createTask(payload);
        createDrawerVisible.value = false;
        activeStatusTab.value = "in_progress";
        taskStore.setStatusFilter("in_progress");
        detailTaskId.value = task.id;
        detailDrawerVisible.value = true;
        ElMessage.success(`任务“${task.title}”已创建`);
    } catch (error) {
        ElMessage.error(error instanceof Error ? error.message : "创建任务失败");
    }
}

async function handleCompleteTask(taskId: string) {
    try {
        const task = await taskStore.completeTask(taskId);
        if (!task) {
            return;
        }
        ElMessage.success(`任务“${task.title}”已完成`);
    } catch (error) {
        ElMessage.error(error instanceof Error ? error.message : "完成任务失败");
    }
}

async function handleTerminateTask(taskId: string) {
    try {
        const task = await taskStore.terminateTask(taskId);
        if (!task) {
            return;
        }
        ElMessage.success(`任务“${task.title}”已终止`);
    } catch (error) {
        ElMessage.error(error instanceof Error ? error.message : "终止任务失败");
    }
}

function openTaskDetail(taskId: string) {
    detailTaskId.value = taskId;
    detailDrawerVisible.value = true;
}

function switchStatusTab(status: TaskStatus | "all") {
    activeStatusTab.value = status;
    taskStore.setStatusFilter(status);
    resetVirtualWindow();
}

function handleTabChange(value: string | number) {
    switchStatusTab(String(value) as TaskStatus | "all");
}

function handleKeywordChange(value: string | number) {
    taskStore.setKeyword(String(value ?? ""));
    resetVirtualWindow();
}

function handleRowsRendered(params: { rowCacheEnd: number }) {
    maybeLoadMore(params.rowCacheEnd);
}

function maybeLoadMore(renderedRowEnd: number) {
    const remainingRows = loadedTasks.value.length - renderedRowEnd;
    if (remainingRows > virtualPreloadThresholdRows) {
        return;
    }
    if (loadedTaskCount.value >= filteredTasks.value.length) {
        return;
    }
    loadedTaskCount.value = Math.min(filteredTasks.value.length, loadedTaskCount.value + virtualLoadStep);
}

function resetVirtualWindow() {
    loadedTaskCount.value = Math.min(filteredTasks.value.length, virtualLoadStep);
}

async function reloadTasks() {
    await taskStore.reload();
    resetVirtualWindow();
}

function statusLabel(status: TaskStatus) {
    if (status === "in_progress") {
        return "进行中";
    }
    if (status === "completed") {
        return "已完成";
    }
    return "已终止";
}

function formatDateTime(value: string) {
    return new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}
</script>

<style scoped>
.page-header {
  width: 100%;
  gap: 18px;
}

.tasks-tabs {
  width: 100%;
}

.tasks-tabs :deep(.el-tabs__header) {
  margin: 0;
}

.tasks-tabs :deep(.el-tabs__nav-wrap::after) {
  background-color: var(--color-border);
}

.tasks-tabs :deep(.el-tabs__item) {
  height: 42px;
  font-size: 1.02rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.tasks-tabs :deep(.el-tabs__item.is-active) {
  color: var(--color-text-primary);
}

.tasks-tabs :deep(.el-tabs__active-bar) {
  background-color: var(--color-accent);
}

.table-shell {
  display: grid;
  justify-items: stretch;
  gap: 14px;
  align-content: start;
  width: 100%;
  padding: 0;
  background: transparent;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 16px;
}

.toolbar__left,
.toolbar__right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.toolbar__left {
  flex: 0 0 auto;
}

.toolbar__right {
  flex: 1 1 auto;
  justify-content: flex-end;
}

.toolbar__mode {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  background: color-mix(in srgb, var(--color-bg-panel) 90%, white);
}

.toolbar__mode--server {
  color: #2f7b42;
  background: #edf7f0;
}

.toolbar__mode--demo {
  color: #9f6b00;
  background: #fff4df;
}

.toolbar__search {
  width: min(420px, 100%);
  max-width: 100%;
}

.table-wrap {
  width: 100%;
  min-width: 0;
  border: none;
  border-radius: 0;
  background: #ffffff;
  overflow: hidden;
}

.table-banner {
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.92rem;
}

.table-banner--warning {
  color: #8a5b00;
  background: #fff8e8;
}

.task-table-v2 {
  width: 100%;
  height: min(52vh, 520px);
  min-height: 360px;
}

.task-table-v2__table {
  width: 100% !important;
}

.task-table-v2 :deep(.el-table-v2__header-row) {
  background: #ffffff;
  color: var(--color-text-secondary);
  font-weight: 600;
}

.table-empty {
  display: grid;
  place-items: center;
  min-height: 280px;
  padding: 24px;
  color: var(--color-text-secondary);
  text-align: center;
  line-height: 1.8;
}

.task-table-v2 :deep(.el-table-v2__row-cell) {
  border-bottom: 1px solid var(--color-border);
  background: #ffffff;
}

.task-table-v2 :deep(.el-table-v2__header-cell) {
  border-bottom: 1px solid var(--color-border);
  background: #ffffff;
  font-size: 0.94rem;
}

.task-table-v2 :deep(.el-table-v2__header-cell-text),
.task-table-v2 :deep(.el-table-v2__cell-text) {
  min-width: 0;
}

.task-table-v2 :deep(.el-table-v2__row:hover .el-table-v2__row-cell) {
  background: color-mix(in srgb, var(--color-accent) 3%, white);
}

.task-cell--title {
  display: block;
  padding: 8px 0;
  font-weight: 700;
  line-height: 1.55;
  white-space: normal;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.task-cell__title {
  font-weight: 700;
  line-height: 1.45;
}

.task-cell__description {
  color: var(--color-text-secondary);
  font-size: 0.92rem;
  line-height: 1.55;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.tag,
.status-pill {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 0.8rem;
}

.status-pill--in_progress {
  background: color-mix(in srgb, var(--color-accent) 12%, white);
  color: var(--color-accent);
}

.status-pill--completed {
  background: #edf7f0;
  color: #2f7b42;
}

.status-pill--terminated {
  background: #f4f4f4;
  color: #676767;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-start;
  white-space: nowrap;
}

.actions__button {
  min-width: 52px;
}

.table-empty {
  padding: var(--space-6);
  color: var(--color-text-secondary);
  text-align: center;
}

@media (max-width: 960px) {
  .page {
    padding: 16px;
  }

  .page-header {
    gap: 14px;
  }

  .tabs,
  .toolbar {
    flex-wrap: wrap;
  }

  .toolbar__right,
  .toolbar__search {
    width: 100%;
  }

  .task-table-v2 {
    height: 420px;
  }
}
</style>
