# 1Claw 管理系统 - 文件系统 API 设计

**文档版本**: v1.0  
**创建时间**: 2026-03-17  
**作者**: 高级研发工程师

**参考**: 
- [00-开发概述.md](./00-开发概述.md)
- [02-后端 API 设计.md](./02-后端 API 设计.md)

---

## 一、概述

本模块提供 OpenClaw 工作空间的**文件管理功能**，允许管理员：
- 浏览工作空间目录结构
- 上传文件到工作空间
- 下载工作空间中的文件
- 删除文件/目录
- 查看空间使用情况
- 清空工作空间

---

## 二、工作空间目录结构

```
/workspace/                    # 工作空间根目录
├── oc_001/                    # OpenClaw-001 的工作空间
│   ├── docs/                  # 文档
│   ├── uploads/               # 上传的文件
│   ├── outputs/               # 输出产物
│   ├── MEMORY.md              # 记忆文件
│   ├── SOUL.md                # 身份文件
│   └── ...
├── oc_002/                    # OpenClaw-002 的工作空间
└── ...
```

### 2.1 空间配额

- 每个 OpenClaw 默认 **1GB** 空间配额
- 配额可在系统设置中调整
- 超出配额时禁止上传

---

## 三、API 设计

### 3.1 列出工作空间文件

```
GET /api/admin/openclaws/:id/workspace?path=/docs
```

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | integer | 是 | OpenClaw ID |

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| path | string | 否 | 子目录路径，默认根目录 |

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "path": "/docs",
    "items": [
      {
        "name": "产品手册.pdf",
        "type": "file",
        "size": 2621440,
        "created_at": "2026-03-13T08:00:00Z",
        "updated_at": "2026-03-13T08:00:00Z"
      },
      {
        "name": "reports",
        "type": "directory",
        "size": 0,
        "created_at": "2026-03-13T09:00:00Z",
        "updated_at": "2026-03-13T10:00:00Z"
      }
    ],
    "total_size": 131072000,
    "quota_size": 1073741824,
    "usage_percent": 12.2
  }
}
```

---

### 3.2 下载文件

```
GET /api/admin/openclaws/:id/workspace/download?path=/docs/产品手册.pdf
```

**响应**: 文件流（application/octet-stream）

**说明**: 
- 直接触发浏览器下载
- 大文件支持断点续传（可选）

---

### 3.3 上传文件

```
POST /api/admin/openclaws/:id/workspace/upload
```

**请求**: multipart/form-data

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | 是 | 要上传的文件 |
| path | string | 否 | 目标目录路径，默认根目录 |

**响应**:
```json
{
  "code": 201,
  "message": "success",
  "data": {
    "name": "产品手册.pdf",
    "path": "/产品手册.pdf",
    "size": 2621440,
    "uploaded_at": "2026-03-17T15:00:00Z"
  }
}
```

**错误响应**（超出配额）:
```json
{
  "code": 400,
  "message": "工作空间配额不足，当前已用 950MB/1GB",
  "data": null
}
```

---

### 3.4 删除文件/目录

```
DELETE /api/admin/openclaws/:id/workspace?path=/docs/临时文件.txt
```

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | integer | 是 | OpenClaw ID |

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| path | string | 是 | 文件或目录路径 |

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "deleted_count": 1,
    "freed_size": 1048576
  }
}
```

**删除目录**（递归删除）:
```
DELETE /api/admin/openclaws/:id/workspace?path=/docs/reports
```

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "deleted_count": 15,
    "freed_size": 52428800
  }
}
```

---

### 3.5 清空工作空间

```
POST /api/admin/openclaws/:id/workspace/clear
```

**说明**: 删除工作空间下所有文件和目录（保留目录结构）

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "deleted_count": 128,
    "freed_size": 524288000
  }
}
```

---

### 3.6 获取空间使用情况

```
GET /api/admin/openclaws/:id/workspace/usage
```

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "openclaw_id": 1,
    "openclaw_name": "AI 助手 -001",
    "used_bytes": 131072000,
    "quota_bytes": 1073741824,
    "usage_percent": 12.2,
    "file_count": 45,
    "directory_count": 8
  }
}
```

---

### 3.7 创建目录

```
POST /api/admin/openclaws/:id/workspace/mkdir
```

**请求**:
```json
{
  "path": "/docs/reports/2026"
}
```

**说明**: 支持递归创建目录（类似 `mkdir -p`）

**响应**:
```json
{
  "code": 201,
  "message": "success",
  "data": {
    "path": "/docs/reports/2026",
    "created_at": "2026-03-17T15:00:00Z"
  }
}
```

---

### 3.8 重命名文件/目录

```
PUT /api/admin/openclaws/:id/workspace/rename
```

**请求**:
```json
{
  "old_path": "/docs/旧文件名.pdf",
  "new_path": "/docs/新文件名.pdf"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "path": "/docs/新文件名.pdf"
  }
}
```

---

## 四、后端实现要点

### 4.1 文件路径安全

**必须验证**:
1. 路径不能包含 `..`（防止目录遍历攻击）
2. 路径必须在 OpenClaw 工作空间根目录内
3. 路径不能访问其他 OpenClaw 的工作空间

```python
# 示例代码
import os
from pathlib import Path

def validate_path(openclaw_id: int, request_path: str) -> str:
    # 获取工作空间根目录
    workspace_root = get_workspace_root(openclaw_id)
    
    # 规范化路径
    safe_path = os.path.normpath(request_path)
    
    # 防止目录遍历
    if '..' in safe_path:
        raise ValueError("Invalid path")
    
    # 拼接完整路径
    full_path = os.path.join(workspace_root, safe_path.lstrip('/'))
    
    # 验证路径在工作空间内
    if not full_path.startswith(workspace_root):
        raise ValueError("Path outside workspace")
    
    return full_path
```

---

### 4.2 大文件上传

**建议实现**:
- 分片上传（每片 5MB）
- 断点续传
- 上传进度回调

```python
# FastAPI 分片上传示例
@router.post("/workspace/upload")
async def upload_file(
    openclaw_id: int,
    file: UploadFile,
    path: str = "/",
    chunk_index: int = 0,
    total_chunks: int = 1
):
    # 处理分片上传逻辑
    pass
```

---

### 4.3 配额检查

```python
def check_quota(openclaw_id: int, file_size: int) -> bool:
    # 获取当前使用量
    used = get_workspace_usage(openclaw_id)
    
    # 获取配额
    quota = get_quota(openclaw_id)  # 默认 1GB
    
    # 检查是否超出
    if used + file_size > quota:
        return False
    return True
```

---

### 4.4 文件类型限制（可选）

可配置允许/禁止的文件类型：

```python
ALLOWED_EXTENSIONS = {
    # 文档
    '.pdf', '.doc', '.docx', '.txt', '.md',
    # 表格
    '.xls', '.xlsx', '.csv',
    # 图片
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    # 代码
    '.py', '.js', '.ts', '.vue', '.json', '.yaml',
    # 压缩
    '.zip', '.tar', '.gz'
}

BLOCKED_EXTENSIONS = {
    '.exe', '.bat', '.sh', '.cmd',  # 可执行文件
    '.sql', '.db'  # 数据库文件（安全考虑）
}
```

---

## 五、前端实现要点

### 5.1 文件列表组件

```vue
<!-- 工作空间文件浏览器 -->
<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>工作空间：{{ currentPath }}</span>
        <el-button @click="handleUpload">上传文件</el-button>
      </div>
    </template>

    <!-- 面包屑导航 -->
    <el-breadcrumb>
      <el-breadcrumb-item @click="navigateTo('/')">根目录</el-breadcrumb-item>
      <el-breadcrumb-item v-for="seg in pathSegments" :key="seg">
        {{ seg }}
      </el-breadcrumb-item>
    </el-breadcrumb>

    <!-- 文件列表 -->
    <el-table :data="files">
      <el-table-column type="selection" width="55" />
      <el-table-column prop="name" label="名称">
        <template #default="{ row }">
          <el-icon v-if="row.type === 'directory'"><Folder /></el-icon>
          <el-icon v-else><Document /></el-icon>
          {{ row.name }}
        </template>
      </el-table-column>
      <el-table-column prop="size" label="大小" width="120">
        <template #default="{ row }">
          {{ formatSize(row.size) }}
        </template>
      </el-table-column>
      <el-table-column prop="updated_at" label="修改时间" width="180" />
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button v-if="row.type === 'file'" @click="handleDownload(row)">下载</el-button>
          <el-button @click="handleRename(row)">重命名</el-button>
          <el-button type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 空间使用进度条 -->
    <el-progress :percentage="usagePercent" :status="usagePercent > 90 ? 'exception' : ''" />
    <p>已用：{{ formatSize(usedSize) }} / {{ formatSize(quotaSize) }}</p>
  </el-card>
</template>
```

---

### 5.2 上传组件

```vue
<!-- 文件上传弹窗 -->
<template>
  <el-dialog v-model="visible" title="上传文件">
    <el-upload
      ref="uploadRef"
      :action="uploadUrl"
      :headers="headers"
      :data="{ path: currentPath }"
      :on-success="handleSuccess"
      :on-error="handleError"
      :before-upload="beforeUpload"
      drag
    >
      <el-icon class="el-icon--upload"><upload-filled /></el-icon>
      <div class="el-upload__text">
        拖拽文件到此处或 <em>点击上传</em>
      </div>
    </el-upload>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const uploadUrl = computed(() => 
  `${import.meta.env.VITE_API_BASE_URL}/openclaws/${props.openclawId}/workspace/upload`
)

const headers = computed(() => ({
  Authorization: `Bearer ${userStore.token}`
}))

const beforeUpload = (file: File) => {
  // 检查文件大小
  if (file.size > 100 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 100MB')
    return false
  }
  return true
}
</script>
```

---

## 六、安全考虑

| 风险 | 防护措施 |
|------|----------|
| 目录遍历攻击 | 严格验证路径，禁止 `..` |
| 任意文件读取 | 限制只能访问工作空间内文件 |
| 恶意文件上传 | 文件类型白名单、病毒扫描（可选） |
| 磁盘空间耗尽 | 配额限制、上传前检查 |
| 权限绕过 | 管理员认证、OpenClaw 所有权校验 |

---

## 七、性能优化

| 场景 | 优化方案 |
|------|----------|
| 大文件下载 | 流式传输、支持断点续传 |
| 大文件上传 | 分片上传、并发上传 |
| 大量文件列表 | 分页加载、虚拟滚动 |
| 频繁的空间统计 | 缓存统计结果、异步更新 |

---

**下一步**: 编写 [05-部署指南.md](./05-部署指南.md)

---

**文档结束**
