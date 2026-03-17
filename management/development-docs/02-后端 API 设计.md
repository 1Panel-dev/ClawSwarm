# 1Claw 管理系统 - 后端 API 设计

**文档版本**: v1.0  
**创建时间**: 2026-03-17  
**作者**: 高级研发工程师

**参考**: 
- [00-开发概述.md](./00-开发概述.md)
- [01-数据库设计.md](./01-数据库设计.md)

---

## 一、API 规范

### 1.1 基础 URL

```
生产环境：https://<domain>/api/admin
开发环境：http://localhost:8000/api/admin
```

### 1.2 认证方式

**JWT Token**

- 登录成功后返回 `access_token`
- 后续请求在 Header 中携带：`Authorization: Bearer <token>`
- Token 有效期：24 小时（可配置）

### 1.3 响应格式

**成功响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

**错误响应**:
```json
{
  "code": 400,
  "message": "错误描述",
  "data": null
}
```

**分页响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [ ... ],
    "total": 100,
    "page": 1,
    "page_size": 20,
    "total_pages": 5
  }
}
```

### 1.4 通用状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证/Token 过期 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 资源冲突（如名称重复） |
| 500 | 服务器内部错误 |

---

## 二、认证模块

### 2.1 管理员登录

```
POST /api/admin/auth/login
```

**请求**:
```json
{
  "username": "admin",
  "password": "password123"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 86400
  }
}
```

---

### 2.2 获取当前管理员信息

```
GET /api/admin/auth/me
```

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "created_at": "2026-03-17T10:00:00Z"
  }
}
```

---

### 2.3 退出登录

```
POST /api/admin/auth/logout
```

**说明**: 前端清除 Token 即可，后端可选择维护黑名单。

---

## 三、人类账号管理

### 3.1 创建人类账号

```
POST /api/admin/humans
```

**请求**:
```json
{
  "username": "zhangsan",
  "email": "zhang@example.com",
  "password": "password123",
  "status": "enabled"
}
```

**响应**:
```json
{
  "code": 201,
  "message": "success",
  "data": {
    "id": 1,
    "username": "zhangsan",
    "email": "zhang@example.com",
    "status": "enabled",
    "created_at": "2026-03-17T10:00:00Z"
  }
}
```

---

### 3.2 获取人类账号列表

```
GET /api/admin/humans?page=1&page_size=20&status=enabled&keyword=zhang
```

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | integer | 否 | 页码，默认 1 |
| page_size | integer | 否 | 每页数量，默认 20 |
| status | string | 否 | 状态筛选 |
| keyword | string | 否 | 搜索用户名/邮箱 |

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "username": "zhangsan",
        "email": "zhang@example.com",
        "status": "enabled",
        "employment_count": 3,
        "created_at": "2026-03-17T10:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  }
}
```

---

### 3.3 获取人类账号详情

```
GET /api/admin/humans/:id
```

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "username": "zhangsan",
    "email": "zhang@example.com",
    "status": "enabled",
    "created_at": "2026-03-17T10:00:00Z",
    "updated_at": "2026-03-17T10:00:00Z",
    "employments": [
      {
        "openclaw_id": 1,
        "openclaw_name": "AI 助手 -001",
        "hired_at": "2026-03-17T12:00:00Z"
      }
    ]
  }
}
```

---

### 3.4 更新人类账号

```
PUT /api/admin/humans/:id
```

**请求**:
```json
{
  "username": "zhangsan_updated",
  "email": "zhang_updated@example.com"
}
```

---

### 3.5 禁用人类账号

```
POST /api/admin/humans/:id/disable
```

**业务逻辑**:
1. 检查该人类是否有雇佣的 OpenClaw
2. 如有，自动解雇所有 OpenClaw（记录日志）
3. 禁用人类账号

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "auto_terminated_count": 3,
    "terminated_openclaws": [
      {"id": 1, "name": "AI 助手 -001"},
      {"id": 2, "name": "AI 助手 -002"},
      {"id": 3, "name": "AI 助手 -003"}
    ]
  }
}
```

---

### 3.6 启用人类账号

```
POST /api/admin/humans/:id/enable
```

---

### 3.7 删除人类账号

```
DELETE /api/admin/humans/:id
```

**前置条件**: 仅禁用状态的账号可删除

---

## 四、OpenClaw 管理

### 4.1 创建 OpenClaw

```
POST /api/admin/openclaws
```

**请求**:
```json
{
  "name": "AI 助手 -001",
  "description": "文案专员",
  "skills": ["写作", "沟通"],
  "status": "idle"
}
```

---

### 4.2 获取 OpenClaw 列表

```
GET /api/admin/openclaws?page=1&page_size=20&status=idle&keyword=AI
```

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | integer | 否 | 页码，默认 1 |
| page_size | integer | 否 | 每页数量，默认 20 |
| status | string | 否 | 状态筛选：idle/hired/disabled |
| keyword | string | 否 | 搜索名称 |

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "AI 助手 -001",
        "description": "文案专员",
        "skills": ["写作", "沟通"],
        "status": "idle",
        "can_message_peers": true,
        "employer": null,
        "created_at": "2026-03-17T10:00:00Z"
      },
      {
        "id": 2,
        "name": "AI 助手 -002",
        "status": "hired",
        "employer": {
          "id": 1,
          "username": "zhangsan"
        },
        "created_at": "2026-03-17T10:00:00Z"
      }
    ],
    "total": 2,
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  }
}
```

---

### 4.3 获取 OpenClaw 详情

```
GET /api/admin/openclaws/:id
```

---

### 4.4 更新 OpenClaw

```
PUT /api/admin/openclaws/:id
```

---

### 4.5 禁用 OpenClaw

```
POST /api/admin/openclaws/:id/disable
```

**前置条件**: 仅空闲状态可禁用

---

### 4.6 启用 OpenClaw

```
POST /api/admin/openclaws/:id/enable
```

---

### 4.7 设置同事发消息权限

```
PUT /api/admin/openclaws/:id/peer-message
```

**请求**:
```json
{
  "can_message_peers": false
}
```

---

## 五、雇佣关系管理

### 5.1 获取雇佣关系列表

```
GET /api/admin/employments?page=1&page_size=20&status=active&human_id=1&openclaw_id=1
```

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | integer | 否 | 页码，默认 1 |
| page_size | integer | 否 | 每页数量，默认 20 |
| status | string | 否 | 状态筛选：active/terminated |
| human_id | integer | 否 | 按人类筛选 |
| openclaw_id | integer | 否 | 按 OpenClaw 筛选 |

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "human": {
          "id": 1,
          "username": "zhangsan"
        },
        "openclaw": {
          "id": 1,
          "name": "AI 助手 -001"
        },
        "status": "active",
        "hired_at": "2026-03-17T12:00:00Z",
        "terminated_at": null,
        "terminated_reason": null
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  }
}
```

---

### 5.2 获取雇佣关系详情

```
GET /api/admin/employments/:id
```

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "human": {
      "id": 1,
      "username": "zhangsan",
      "email": "zhang@example.com"
    },
    "openclaw": {
      "id": 1,
      "name": "AI 助手 -001",
      "description": "文案专员"
    },
    "status": "active",
    "hired_at": "2026-03-17T12:00:00Z",
    "terminated_at": null,
    "terminated_reason": null,
    "operation_history": [
      {
        "operation": "hire",
        "operator": "zhangsan",
        "created_at": "2026-03-17T12:00:00Z"
      }
    ]
  }
}
```

---

## 六、系统日志

### 6.1 获取系统日志列表

```
GET /api/admin/logs?page=1&page_size=20&operation_type=hire&operator=Admin&start_date=2026-03-01&end_date=2026-03-17
```

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | integer | 否 | 页码，默认 1 |
| page_size | integer | 否 | 每页数量，默认 20 |
| operation_type | string | 否 | 操作类型筛选 |
| operator | string | 否 | 操作者筛选 |
| start_date | date | 否 | 开始日期 |
| end_date | date | 否 | 结束日期 |

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "operation_type": "hire",
        "operator": "zhangsan",
        "target_type": "employment",
        "target_id": 1,
        "details": {
          "human_id": 1,
          "openclaw_id": 1
        },
        "created_at": "2026-03-17T12:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  }
}
```

---

## 七、角色管理

### 7.1 创建角色

```
POST /api/admin/roles
```

**请求**:
```json
{
  "name": "文案专员",
  "description": "负责文案撰写",
  "role_type": "preset",
  "agent_config": { "type": "writing" },
  "skill_set": ["写作", "沟通"],
  "work_knowledge": ["公司产品知识"]
}
```

---

### 7.2 获取角色列表

```
GET /api/admin/roles?page=1&page_size=20&role_type=preset
```

---

### 7.3 更新角色

```
PUT /api/admin/roles/:id
```

---

### 7.4 删除角色

```
DELETE /api/admin/roles/:id
```

**前置条件**: usage_count = 0

---

## 八、记忆管理

### 8.1 获取记忆列表

```
GET /api/admin/memories?page=1&page_size=20&memory_type=independent&openclaw_id=1
```

---

### 8.2 获取记忆详情

```
GET /api/admin/memories/:id
```

---

### 8.3 导出记忆

```
POST /api/admin/memories/:id/export
```

**响应**: 返回 JSON 文件下载

---

### 8.4 清除记忆

```
POST /api/admin/memories/:id/clear
```

---

## 九、系统设置

### 9.1 获取系统设置列表

```
GET /api/admin/settings
```

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "key": "employment_limit_per_human",
      "value": 3,
      "description": "每个人类账号可雇佣的 OpenClaw 数量上限",
      "updated_at": "2026-03-17T10:00:00Z"
    },
    {
      "key": "log_retention_days",
      "value": 60,
      "description": "系统日志保留天数",
      "updated_at": "2026-03-17T10:00:00Z"
    }
  ]
}
```

---

### 9.2 更新系统设置

```
PUT /api/admin/settings/:key
```

**请求**:
```json
{
  "value": 5
}
```

---

## 十、仪表盘数据

### 10.1 获取仪表盘统计

```
GET /api/admin/dashboard/stats
```

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "human_count": 128,
    "human_count_change": 12,
    "openclaw_count": 50,
    "openclaw_count_change": 5,
    "employment_count": 85,
    "employment_count_change": 8,
    "active_today": 45
  }
}
```

---

### 10.2 获取 OpenClaw 状态分布

```
GET /api/admin/dashboard/openclaw-status
```

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "working": 25,
    "idle": 15,
    "stuck": 3,
    "offline": 7
  }
}
```

---

### 10.3 获取需要介入的 OpenClaw 列表

```
GET /api/admin/dashboard/intervention-needed
```

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "openclaw_id": 5,
      "openclaw_name": "AI 助手 -005",
      "employer": "张三",
      "current_task": "数据分析报告",
      "issue": "数据源无法访问"
    }
  ]
}
```

---

**下一步**: 编写 [03-前端设计.md](./03-前端设计.md)

---

**文档结束**
