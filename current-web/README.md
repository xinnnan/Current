# Current Web — 前端应用

> Current 工业地图与物理引擎的前端应用，基于 Next.js 16 + React 19 + Three.js + Fabric.js。

## 技术栈

- **框架**: Next.js 16 (App Router) + React 19
- **3D 渲染**: React Three Fiber + Three.js + @react-three/drei
- **2D 编辑**: Fabric.js v7
- **状态管理**: Zustand
- **样式**: Tailwind CSS 4 + CSS Custom Properties (设计令牌)
- **后端**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **图标**: Lucide React

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 代码检查
pnpm lint
```

## 环境变量

复制 `.env.local` 并填入实际值：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SECRET_KEY=your-service-role-key
MINIMAX_API_KEY=your-minimax-api-key
TRIPO_API_KEY=your-tripo-api-key
INFERENCE_SERVICE_URL=http://localhost:8000
```

## 项目结构

```
current-web/
├── app/                        # Next.js App Router
│   ├── (dashboard)/            # 仪表板路由组
│   │   ├── page.tsx            # 首页（项目概览）
│   │   ├── assets/             # 3D 资产库
│   │   ├── map/                # 地图编辑器
│   │   ├── simulation/         # 仿真分析
│   │   └── settings/           # 设置
│   ├── auth/                   # 认证（登录/回调/登出）
│   └── api/                    # API Routes
├── components/                 # React 组件
│   ├── editor-2d/              # 2D 编辑器组件
│   ├── scene-3d/               # 3D 场景组件
│   ├── simulation/             # 仿真组件
│   ├── ui/                     # 基础 UI 组件
│   └── viewer-3d/              # 3D 模型查看器
├── lib/                        # 核心库
│   ├── simulation/             # 仿真引擎 + RCS 调度器
│   ├── pathfinding/            # A* 路径规划
│   ├── stores/                 # Zustand 状态管理
│   ├── supabase/               # Supabase 客户端
│   └── utils/                  # 工具函数
└── supabase/migrations/        # 数据库迁移文件
```

## 功能模块

| 模块 | 路由 | 说明 |
|------|------|------|
| 项目概览 | `/` | 统计概览 + 快速入口 + 最近项目 |
| 资产库 | `/assets` | 上传照片 → AI 生成 3D 物理资产 |
| 地图编辑 | `/map` | Fabric.js 画布 + 图层管理 + 路径绘制 + 资产放置 |
| 仿真分析 | `/simulation` | 离散事件仿真 + 热力图 + 数据看板 + 2D/3D 视图 |
| 设置 | `/settings` | API 密钥配置 + 偏好设置 |
