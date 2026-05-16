# Self-Leveling 部署指南

**版本**: 1.0  
**日期**: 2026-05-16  
**状态**: 初版

---

## 目录

- [快速开始](#快速开始)
- [Vercel 部署](#vercel-部署)
- [环境变量配置](#环境变量配置)
- [CI/CD 流程](#cicd-流程)
- [域名配置](#域名配置)
- [监控与日志](#监控与日志)
- [故障排除](#故障排除)

---

## 快速开始

### 前置要求

- Node.js 20.x 或更高版本
- npm 或 yarn
- Vercel CLI (可选)
- Git

### 本地开发

```bash
# 克隆项目
git clone https://github.com/your-org/self-leveling.git
cd self-leveling

# 安装依赖
npm install

# 复制环境变量模板
cp .env.example .env.local

# 编辑 .env.local 填入实际值

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

---

## Vercel 部署

### 方式一：通过 Vercel 控制台部署

1. 登录 [Vercel](https://vercel.com)
2. 点击 "New Project"
3. 选择 "Import Git Repository"
4. 选择你的 GitHub 仓库
5. 配置项目设置：
   - **Framework Preset**: Next.js
   - **Root Directory**: ./
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
6. 点击 "Deploy"

### 方式二：通过 Vercel CLI 部署

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 进入项目目录
cd self-leveling

# 部署预览环境
vercel

# 部署生产环境
vercel --prod
```

### 方式三：通过 GitHub Actions 自动部署

1. 在 Vercel 控制台获取以下信息：
   - `VERCEL_TOKEN`: Settings → Tokens
   - `VERCEL_ORG_ID`: Settings → General → Organization ID
   - `VERCEL_PROJECT_ID`: Settings → General → Project ID

2. 在 GitHub 仓库 Settings → Secrets 中添加：
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`

3. 自动部署配置已完成，推送到 main 分支自动触发

---

## 环境变量配置

### 必需环境变量

在 Vercel 控制台 Settings → Environment Variables 添加：

| 变量名 | 描述 | 示例 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_SECRET` | NextAuth 加密密钥 | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | 应用 URL | `https://your-domain.com` |
| `OPENAI_API_KEY` | OpenAI API 密钥 | `sk-...` |

### 可选环境变量

| 变量名 | 描述 | 示例 |
|--------|------|------|
| `REDIS_URL` | Redis 连接字符串 | `redis://localhost:6379` |
| `SMTP_*` | 邮件服务配置 | - |
| `GOOGLE_CLIENT_ID` | Google OAuth | - |
| `GITHUB_ID` | GitHub OAuth | - |

### 本地环境变量

```bash
# .env.local (不提交到版本控制)
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="generated-secret"
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY="sk-..."
```

---

## CI/CD 流程

### 工作流说明

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Push/PR   │ ──▶ │   CI/CD     │ ──▶ │   Deploy    │
│   to GitHub │     │   Pipeline  │     │   Vercel    │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Tests &   │
                    │   Lint      │
                    └─────────────┘
```

### GitHub Actions 工作流

#### 1. CI Pipeline (ci.yml)

**触发条件**:
- 推送到 main、develop 分支
- Pull Request 到 main、develop 分支

**执行内容**:
- 安装依赖
- Prisma schema 验证
- ESLint 代码检查
- TypeScript 类型检查
- 单元测试 + 覆盖率
- E2E 测试 (可选)

#### 2. Deploy Pipeline (deploy.yml)

**触发条件**:
- 推送到 main 分支
- 手动触发

**执行内容**:
- 部署到 Vercel Preview (PR) 或 Production (main)
- 烟雾测试
- Slack 通知

#### 3. Database Migration (db-migrate.yml)

**触发条件**:
- 手动触发

**操作**:
- `deploy`: 应用数据库迁移
- `reset`: 重置数据库 (危险!)
- `status`: 查看迁移状态

### 分支策略

| 分支 | 环境 | 自动部署 |
|------|------|----------|
| `main` | Production | ✅ |
| `develop` | Staging | ❌ |
| `feature/*` | Preview | ✅ (PR) |

---

## 域名配置

### 自定义域名

1. 在 Vercel 控制台进入项目
2. Settings → Domains
3. 添加你的域名：`selfleveling.app`
4. 按提示配置 DNS 记录

### DNS 配置

```
# A 记录
A    @    76.76.21.21

# CNAME 记录 (预览环境)
CNAME    www    cname.vercel-dns.com
```

### HTTPS

- Vercel 自动配置 SSL 证书
- 强制 HTTPS 跳转已在 vercel.json 中配置

---

## 监控与日志

### Vercel Analytics

在 Vercel 控制台启用 Analytics 获取：
- 页面访问量
- 性能指标
- 用户行为

### 日志查看

```bash
# 使用 Vercel CLI
vercel logs your-project

# 实时日志
vercel logs your-project --tail

# 过滤日志
vercel logs your-project --filter "error"
```

### 错误追踪

建议集成：
- [Sentry](https://sentry.io) - 错误监控
- [LogRocket](https://logrocket.com) - 会话回放

```bash
# 安装 Sentry
npm install @sentry/nextjs

# 初始化
npx sentry-wizard@latest -i nextjs
```

---

## 故障排除

### 常见问题

#### 1. 部署失败

**检查项**:
- [ ] 环境变量是否正确配置
- [ ] Build Command 是否正确
- [ ] Node.js 版本是否匹配

**解决方案**:
```bash
# 本地构建测试
npm run build

# 查看详细错误
vercel logs your-project --verbose
```

#### 2. 数据库连接失败

**检查项**:
- [ ] `DATABASE_URL` 是否正确
- [ ] 数据库是否允许外部连接
- [ ] 防火墙规则是否配置

**解决方案**:
```bash
# 测试数据库连接
npx prisma db pull

# 检查迁移状态
npx prisma migrate status
```

#### 3. API 路由超时

**检查项**:
- [ ] AI API 响应时间
- [ ] 数据库查询性能

**解决方案**:
- 在 vercel.json 中调整 `maxDuration`
- 优化数据库索引
- 实现请求缓存

#### 4. 构建缓存问题

**解决方案**:
```bash
# 清除 Vercel 缓存
vercel rm your-project --yes
vercel --prod
```

---

## 参考资料

- [Vercel 文档](https://vercel.com/docs)
- [Next.js 部署指南](https://nextjs.org/docs/deployment)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Prisma 部署指南](https://www.prisma.io/docs/guides/deployment)

---

**文档编写**: devops  
**审核状态**: 待审核  
**下次更新**: 基础设施变更时
