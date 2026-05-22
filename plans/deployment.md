# Current — 生产部署步骤

> **目标**: 将 Current 部署到 Vercel + Supabase + Railway 三平台。
> **预计时间**: 30-45 分钟（首次部署）。
> **月成本**: ~$50-80 + API 按量。

---

## 前置条件

- [ ] GitHub 账号 + 仓库推送权限
- [ ] Vercel 账号（可 GitHub 登录）
- [ ] Supabase 账号（可 GitHub 登录）
- [ ] Railway 账号（可 GitHub 登录）
- [ ] MiniMax API Key（从 [platform.minimax.chat](https://platform.minimax.chat) 获取）
- [ ] Tripo3D API Key（从 [platform.tripo3d.ai](https://platform.tripo3d.ai) 获取）

---

## Step 1: 推送代码到 GitHub

```bash
# 在项目根目录初始化 Git（如果还没有）
cd /path/to/Current
git init

# 创建 .gitignore（确保不提交敏感文件）
cat > .gitignore << 'EOF'
node_modules/
.next/
.env.local
.env*.local
__pycache__/
*.pyc
.DS_Store
*.npy
*.mp4
trellis/
qwen-vl-finetune/
qwen-vl-utils/
configs/
dataset/
dataset_toolkits/
demo/
evaluation_video/
img/
mjcf_source/
EOF

# 提交并推送
git add .
git commit -m "feat: Current v1.0 — complete AGV warehouse simulation platform"
git remote add origin https://github.com/<your-username>/Current.git
git push -u origin main
```

> **注意**: `trellis/`、`qwen-vl-finetune/`、`qwen-vl-utils/`、`configs/`、`dataset/` 等原始仓库重型模块不需要部署，应排除在 Git 外。

---

## Step 2: Supabase 配置

### 2.1 创建项目

1. 访问 [supabase.com](https://supabase.com) → New Project
2. 项目名称: `current-production`
3. 区域: 选择离用户最近的（如 Northeast Asia / Singapore）
4. 数据库密码: 生成强密码并保存
5. 等待项目初始化完成（约 2 分钟）

### 2.2 执行数据库 Schema

1. 进入项目 → SQL Editor
2. 打开 [`current-web/supabase/migrations/001_initial_schema.sql`](current-web/supabase/migrations/001_initial_schema.sql)
3. 复制全部内容到 SQL Editor
4. 点击 Run 执行

> 这会创建 11 张表 + RLS 策略 + 索引。

### 2.3 配置 Authentication

1. Authentication → Providers → Email
   - 确认已启用 Email + Password
2. Authentication → URL Configuration
   - Site URL: `https://your-vercel-app.vercel.app`
   - Redirect URLs: 添加 `https://your-vercel-app.vercel.app/auth/callback`

### 2.4 创建 Storage Buckets

1. Storage → New Bucket
   - 名称: `assets`
   - Public: 否（通过 API 访问）
   - File size limit: 50MB
2. Storage → Policies → 为 `assets` bucket 添加策略:
   ```sql
   -- 用户只能访问自己上传的资产
   CREATE POLICY "Users can view own assets" ON storage.objects
     FOR SELECT USING (auth.uid()::text = (storage.foldername(name))[1]);
   
   CREATE POLICY "Users can upload assets" ON storage.objects
     FOR INSERT WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);
   ```

### 2.5 获取连接信息

1. Settings → API
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - service_role key → `SUPABASE_SECRET_KEY`（⚠️ 保密！）

---

## Step 3: Vercel 部署（前端）

### 3.1 创建项目

1. 访问 [vercel.com](https://vercel.com) → Add New → Project
2. Import Git Repository → 选择 `Current` 仓库
3. 配置:
   - **Framework Preset**: Next.js
   - **Root Directory**: `current-web`（⚠️ 关键！点击 Edit 设置）
   - **Build Command**: `pnpm build`
   - **Output Directory**: `.next`
   - **Install Command**: `pnpm install`

### 3.2 配置环境变量

在 Vercel 项目 Settings → Environment Variables 中添加:

| 变量名 | 值 | 环境 |
|--------|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `eyJ...` | Production, Preview, Development |
| `SUPABASE_SECRET_KEY` | `eyJ...` | Production only |
| `MINIMAX_API_KEY` | 你的 MiniMax API Key | Production only |
| `TRIPO_API_KEY` | 你的 Tripo3D API Key | Production only |
| `INFERENCE_SERVICE_URL` | `https://your-railway-app.up.railway.app` | Production, Preview |

### 3.3 部署

1. 点击 Deploy
2. 等待构建完成（约 1-2 分钟）
3. 访问分配的 URL 验证

### 3.4 配置自定义域名（可选）

1. Settings → Domains → Add
2. 输入你的域名（如 `current.yourdomain.com`）
3. 在域名 DNS 添加 CNAME 记录指向 `cname.vercel-dns.com`

---

## Step 4: Railway 部署（Python 微服务）

### 4.1 创建项目

1. 访问 [railway.app](https://railway.app) → New Project
2. Deploy from GitHub repo → 选择 `Current` 仓库
3. Settings:
   - **Root Directory**: `current-inference`
   - Railway 会自动检测 Dockerfile

### 4.2 配置环境变量

在 Railway 项目 Variables 中添加:

| 变量名 | 值 |
|--------|-----|
| `SUPABASE_URL` | `https://xxx.supabase.co` |
| `SUPABASE_SECRET_KEY` | `eyJ...` |
| `PORT` | `8000` |

### 4.3 获取服务 URL

1. 部署完成后 → Settings → Networking
2 - 生成公开域名: `https://your-service.up.railway.app`
3. 将此 URL 填入 Vercel 的 `INFERENCE_SERVICE_URL` 环境变量

### 4.4 验证

```bash
# 健康检查
curl https://your-service.up.railway.app/health
# 应返回 {"status": "ok"}
```

---

## Step 5: 更新 Supabase 回调 URL

1. 回到 Supabase → Authentication → URL Configuration
2. 更新 Site URL 为 Vercel 分配的实际域名
3. 添加 Redirect URLs: `https://your-vercel-app.vercel.app/auth/callback`

---

## Step 6: 端到端验证

### 6.1 认证流程
1. 访问 `https://your-vercel-app.vercel.app/auth/login`
2. 注册新账号 → 检查邮箱确认
3. 登录 → 确认跳转到仪表板

### 6.2 资产生成流程
1. 进入资产库 → 上传一张设备照片
2. 确认 MiniMax VLM 推理成功（检查控制台日志）
3. 确认 Tripo3D 3D 生成成功
4. 确认 GLB 文件保存到 Supabase Storage

### 6.3 地图编辑器
1. 导入一张底图（DXF/PDF/JPEG）
2. 标定比例尺
3. 绘制路径节点和连线
4. 放置资产

### 6.4 仿真分析
1. 配置仿真参数（AGV 数量、时长等）
2. 启动仿真
3. 查看热力图和数据看板
4. 切换 2D/3D 视图

---

## Step 7: 生产优化（可选）

### 7.1 Vercel 优化
```typescript
// next.config.ts — 添加以下配置
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  experimental: {
    // 启用 PPR（如果需要）
    // ppr: 'incremental',
  },
}
```

### 7.2 Supabase 优化
- 启用 Point-in-Time Recovery（Pro Plan）
- 配置自动备份
- 设置数据库连接池（PgBouncer）

### 7.3 监控
- Vercel Analytics（内置）
- Supabase Dashboard → Logs
- Railway → Deployments → Logs

---

## 环境变量汇总

### 前端（Vercel — `current-web/`）

| 变量 | 来源 | 必须 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Settings → API | ✅ |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase Settings → API | ✅ |
| `SUPABASE_SECRET_KEY` | Supabase Settings → API | ✅ |
| `MINIMAX_API_KEY` | [platform.minimax.chat](https://platform.minimax.chat) | ✅ |
| `TRIPO_API_KEY` | [platform.tripo3d.ai](https://platform.tripo3d.ai) | ✅ |
| `INFERENCE_SERVICE_URL` | Railway 部署后的 URL | ✅ |

### 后端（Railway — `current-inference/`）

| 变量 | 来源 | 必须 |
|------|------|------|
| `SUPABASE_URL` | Supabase Settings → API | ✅ |
| `SUPABASE_SECRET_KEY` | Supabase Settings → API | ✅ |
| `PORT` | 固定 `8000` | ✅ |

---

## 预估月成本

| 服务 | 方案 | 月成本 |
|------|------|--------|
| Vercel | Hobby (免费) 或 Pro ($20) | $0-20 |
| Supabase | Pro Plan | $25 |
| Railway | Developer Plan | $5 |
| MiniMax API | 按量付费 | ~¥30-100 |
| Tripo3D API | 按量付费 | ~¥100-500 |
| **总计** | | **~$30-55 + API 按量** |

> Hobby 方案足够个人使用。Pro 方案适合团队协作。
