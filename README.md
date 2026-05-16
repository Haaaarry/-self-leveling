# Self-Leveling | 我独自升级

一款将个人目标达成转化为游戏化体验的 Web 应用。通过 AI 驱动的任务规划、打怪升级的积分系统和游戏化激励机制，帮助用户以更有趣、更可持续的方式完成个人目标。

## 技术栈

- **前端**: Next.js 14 + React + Tailwind CSS + shadcn/ui
- **后端**: Next.js API Routes
- **数据库**: PostgreSQL + Prisma ORM
- **AI**: OpenAI GPT-4
- **状态管理**: Zustand

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并配置：

```env
# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/self_leveling?schema=public"

# Next Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-in-production"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"
```

### 3. 初始化数据库

```bash
# 生成 Prisma Client
npx prisma generate

# 推送数据库 schema
npx prisma db push
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 功能模块

### 用户认证
- 邮箱/密码注册和登录
- Session 管理

### 目标管理
- 创建、查看、删除目标
- 目标状态管理（进行中/已暂停/已完成）

### AI 任务规划
- 调用 OpenAI GPT-4 分析目标
- 自动生成里程碑划分
- 生成每日任务列表
- 任务积分分配

### 每日任务系统
- 今日任务展示
- 任务完成标记
- 任务跳过

### 积分系统
- 完成任务获得积分
- 跳过任务消耗积分（原始积分 × 1.5）
- 积分历史记录
- 等级系统（每 100 积分升一级）

## 积分规则

| 任务难度 | 积分范围 |
|---------|---------|
| 简单任务 | 10-20 积分 |
| 中等任务 | 30-50 积分 |
| 困难任务 | 80-100 积分 |

**跳过消耗**: 任务原始积分 × 1.5

## 项目结构

```
├── prisma/
│   └── schema.prisma          # 数据库模型
├── src/
│   ├── app/
│   │   ├── api/               # API 路由
│   │   │   ├── auth/          # 认证接口
│   │   │   ├── goals/         # 目标接口
│   │   │   ├── tasks/         # 任务接口
│   │   │   ├── ai/            # AI 生成接口
│   │   │   └── points/        # 积分接口
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx           # 首页
│   ├── components/
│   │   └── ui/                # UI 组件
│   ├── lib/
│   │   ├── prisma.ts          # Prisma 客户端
│   │   ├── auth.ts            # 认证工具
│   │   ├── ai.ts              # AI 集成
│   │   └── utils.ts           # 工具函数
│   ├── store/                 # Zustand 状态
│   └── types/                 # TypeScript 类型
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## 开发相关命令

```bash
# 开发
npm run dev

# 构建
npm run build

# 生产
npm run start

# Prisma Studio
npm run db:studio
```

## License

MIT
