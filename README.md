# 三模型辩论共识系统

一个基于 Next.js 16 构建的智能辩论系统，通过三个 AI 模型的多轮辩论来达成共识，为复杂问题提供全面、深入的分析。

## 项目简介

本项目是一个创新的 AI 辩论平台，采用**三轮辩论机制**：
- **第一轮**：三个 AI 模型（GLM-4-plus、GLM-4-flash、DeepSeek-chat）分别提出独立观点
- **第二轮**：各模型互相批评和评价其他观点
- **第三轮**：基于批评进行修正，尝试达成共识
- **最终共识**：综合所有观点，提取一致意见和剩余分歧

## 功能特性

### 核心功能
- **多模型辩论**：同时调用三个 AI 模型进行辩论
- **三轮辩论机制**：提案 → 批评 → 共识的结构化流程
- **会话管理**：创建、暂停、继续、删除辩论会话
- **历史记录**：保存和查看所有辩论历史
- **置顶功能**：标记重要会话

### 技术特性
- **实时状态跟踪**：监控辩论进度和状态
- **类型安全**：完整的 TypeScript 类型定义
- **响应式设计**：适配各种设备尺寸
- **深色模式**：支持明暗主题切换

## 技术栈

### 前端
- **Next.js 16** - React 框架
- **React 19** - UI 库
- **TypeScript** - 类型安全
- **Tailwind CSS 4** - 样式框架
- **Radix UI** - 无障碍组件库
- **Lucide React** - 图标库
- **Sonner** - Toast 通知

### 后端
- **Next.js API Routes** - RESTful API
- **Drizzle ORM** - 数据库 ORM
- **PostgreSQL** - 数据库
- **Better Auth** - 身份认证

### AI 集成
- **智谱 AI (GLM-4-plus & GLM-4-flash)**
- **DeepSeek (DeepSeek-chat)**

## 项目结构

```
md/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── debate/              # 辩论 API
│   │   │   │   ├── route.ts         # POST 创建新辩论
│   │   │   │   └── [sessionId]/
│   │   │   │       ├── route.ts     # GET 获取辩论详情
│   │   │   │       ├── pause/       # POST 暂停/继续
│   │   │   │       ├── message/     # POST 发送用户消息
│   │   │   │       └── continue/    # POST 继续辩论
│   │   │   └── sessions/            # 会话管理 API
│   │   │       ├── route.ts         # GET 获取会话列表
│   │   │       └── [sessionId]/
│   │   │           ├── route.ts     # GET/PUT/PATCH/DELETE
│   │   │           └── pin/         # POST 置顶/取消置顶
│   │   ├── (main)/                  # 主应用页面
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   └── auth/[...all]/           # 认证路由
│   ├── components/
│   │   ├── app/                     # 应用级组件
│   │   │   ├── AppLayout.tsx        # 主布局
│   │   │   ├── ActiveDiscussion.tsx # 进行中的辩论
│   │   │   ├── HistoryViewer.tsx    # 历史记录
│   │   │   └── NewDiscussionForm.tsx # 新建辩论表单
│   │   ├── chat/                    # 聊天组件
│   │   │   ├── ChatContainer.tsx    # 聊天容器
│   │   │   ├── ChatMessage.tsx      # 消息组件
│   │   │   ├── Sidebar.tsx          # 侧边栏
│   │   │   ├── SessionList.tsx      # 会话列表
│   │   │   └── SessionItem.tsx      # 会话项
│   │   └── ui/                      # UI 组件库
│   ├── db/
│   │   ├── schema/
│   │   │   ├── planner.ts           # 辩论数据表
│   │   │   └── auth/                # 认证相关表
│   │   └── index.ts                 # 数据库连接
│   └── lib/
│       ├── prompts.ts               # AI 提示词
│       └── utils.ts                 # 工具函数
├── drizzle/                         # 数据库迁移
│   └── 0006_convert_to_debate_system.sql
├── public/                          # 静态资源
├── next.config.mjs                  # Next.js 配置
├── tailwind.config.ts               # Tailwind 配置
├── tsconfig.json                    # TypeScript 配置
└── package.json                     # 项目依赖
```

## 数据库设计

### debate_session (辩论会话表)
```sql
CREATE TABLE "debate_session" (
    "id" text PRIMARY KEY,
    "user_question" text NOT NULL,          -- 用户问题
    "title" text NOT NULL,                   -- 会话标题
    "round1_proposals" json,                -- 第一轮提案
    "round2_critiques" json,                -- 第二轮批评
    "round3_consensus" json,                -- 第三轮共识
    "final_consensus" text,                 -- 最终共识
    "remaining_disagreements" text,         -- 剩余分歧
    "model_used" json,                      -- 使用的模型列表
    "status" text DEFAULT 'pending',        -- 状态: pending/debating/completed/failed
    "is_paused" boolean DEFAULT false,      -- 是否暂停
    "is_pinned" boolean DEFAULT false,      -- 是否置顶
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);
```

### debate_messages (辩论消息表)
```sql
CREATE TABLE "debate_messages" (
    "id" text PRIMARY KEY,
    "session_id" text REFERENCES "debate_session"("id") ON DELETE CASCADE,
    "role" text NOT NULL,                    -- 角色: user/assistant
    "model_name" text,                       -- 模型名称
    "round" integer,                         -- 辩论轮次: 1/2/3
    "is_consensus" boolean DEFAULT false,   -- 是否共识观点
    "content" text NOT NULL,                 -- 消息内容
    "reply_to_id" text REFERENCES "debate_messages"("id") ON DELETE SET NULL,
    "created_at" timestamp DEFAULT now()
);
```

## 安装和运行

### 前置要求
- Node.js 18+
- PostgreSQL 数据库
- pnpm 包管理器

### 1. 克隆项目
```bash
git clone <repository-url>
cd md
```

### 2. 安装依赖
```bash
pnpm install
```

### 3. 配置环境变量
复制环境变量模板并填入你自己的密钥：
```bash
cp .env.example .env
```

不要提交 `.env`、真实数据库连接串、API 密钥或本机工具配置。

### 4. 数据库迁移
```bash
# 生成迁移文件
pnpm run db:generate

# 推送数据库更改
pnpm run db:migrate

# 或执行特定迁移
pnpm run db:apply-0006
```

### 5. 启动开发服务器
```bash
pnpm run dev
```

访问 http://localhost:3000

## API 接口文档

### 辩论相关 API

#### 创建新辩论
```http
POST /api/debate
Content-Type: application/json

{
  "question": "人工智能是否会对人类构成威胁？"
}

Response:
{
  "sessionId": "session-id",
  "status": "debating"
}
```

#### 获取辩论详情
```http
GET /api/debate/:sessionId

Response:
{
  "session": {
    "id": "session-id",
    "userQuestion": "...",
    "status": "completed",
    ...
  },
  "messages": [...]
}
```

#### 暂停/继续辩论
```http
POST /api/debate/:sessionId/pause

Response:
{
  "isPaused": true
}
```

#### 发送用户消息
```http
POST /api/debate/:sessionId/message
Content-Type: application/json

{
  "content": "我想要补充一些信息..."
}
```

#### 继续辩论
```http
POST /api/debate/:sessionId/continue

Response:
{
  "message": "Debate continued"
}
```

### 会话管理 API

#### 获取会话列表
```http
GET /api/sessions

Response:
{
  "sessions": [...]
}
```

#### 获取单个会话
```http
GET /api/sessions/:sessionId

Response:
{
  "session": {...}
}
```

#### 更新会话
```http
PATCH /api/sessions/:sessionId
Content-Type: application/json

{
  "title": "新标题"
}
```

#### 删除会话
```http
DELETE /api/sessions/:sessionId

Response:
{
  "success": true
}
```

#### 置顶/取消置顶
```http
POST /api/sessions/:sessionId/pin
Content-Type: application/json

{
  "isPinned": true
}
```

## 开发指南

### 代码风格
项目使用 ESLint 和 Prettier 进行代码规范检查：
```bash
# 检查代码
pnpm run lint

# 格式化代码（需配置 Prettier）
npx prettier --write .
```

### 数据库操作
```bash
# 打开 Drizzle Studio（数据库管理界面）
pnpm run db:studio

# 生成新迁移
pnpm run db:generate

# 推送迁移到数据库
pnpm run db:migrate
```

### 添加新的 AI 模型
在 `src/lib/prompts.ts` 中添加新模型配置，然后更新 API 路由中的模型调用逻辑。

## 部署

### Vercel 部署
1. 推送代码到 GitHub
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 部署

### 其他平台
确保平台支持：
- Node.js 18+
- PostgreSQL 连接
- Serverless 函数

## 常见问题

### Q: 如何添加新的 AI 模型？
A: 在 `src/lib/prompts.ts` 中添加模型配置，并更新相关 API 路由。

### Q: 如何自定义辩论轮次？
A: 修改数据库 schema 和 API 路由中的辩论逻辑。

### Q: 数据库迁移失败怎么办？
A: 检查 `DATABASE_URL` 是否正确，或使用 `pnpm run db:studio` 查看数据库状态。

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证，详见 [LICENSE](LICENSE)。

第三方依赖和字体资源的许可证说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。提交到公开仓库前，请确认没有真实密钥进入 Git 历史；如曾提交过密钥，应先轮换密钥再清理历史。

## 联系方式

如有问题或建议，欢迎提交 Issue 或 Pull Request。

---

**注意**：本项目为演示项目，生产环境部署前请完成安全、隐私和成本控制评估。
