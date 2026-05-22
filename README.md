<div align="center">

# ⚡ Current

### 工业地图与物理引擎 — AGV 仓储自动化项目规划平台

**上传照片 → AI 生成 3D 物理资产 → 绘制路网 → 运行仿真 → 吞吐量验证**

[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-r184-black?logo=three.js)](https://threejs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## 🎯 Current 是什么？

**Current** 是一个轻量级工业地图与物理引擎，专为 AGV/仓储自动化项目规划阶段设计。

在投入昂贵的物理部署之前，Current 帮助你：

- 📸 **拍照生成 3D 资产** — 上传设备照片，AI 自动生成 Sim-Ready 3D 物理模型
- 🗺️ **绘制工业地图** — 导入 CAD/图纸，绘制路网、设定交通规则和限域
- 📊 **仿真验证** — 运行离散事件仿真，分析吞吐量、稼动率、空跑率、死锁风险
- 🔥 **热力图分析** — 可视化路段拥堵程度，识别瓶颈区域
- 🎮 **2D 编辑，3D 瞧** — 无缝切换 2D 编辑视图和 3D 仿真演示

---

## ✨ 核心功能

### 模块一：AI 驱动的 3D 物理资产库

| 功能 | 说明 |
|------|------|
| 📷 照片上传 | 支持上传设备照片作为 AI 输入 |
| 🧠 VLM 物理推理 | MiniMax M2.7-highspeed 自动识别物理属性（材质、密度、摩擦系数等） |
| 🎨 3D 模型生成 | Tripo3D API 生成 Sim-Ready GLB 模型 |
| ✂️ Mesh 分割 | Python 微服务自动分割多部件模型 |
| 📦 资产缓存 | 生成后永久缓存到 Supabase Storage，不重复推理 |

### 模块二：工业地图编辑器

| 功能 | 说明 |
|------|------|
| 📐 底图导入 | 支持 DXF / PDF / JPEG 格式 |
| 📏 比例尺标定 | 两点标定向导，精确映射像素→米 |
| 🗂️ 多图层管理 | 底图层、限域层、路径层，独立控制可见性/锁定/不透明度 |
| 🔗 路径绘制 | 节点/连线/多边形工具，支持速度限制和互斥区 |
| 🏗️ 资产放置 | 从资产库拖放 3D 模型到地图 |

### 模块三：仿真分析引擎

| 功能 | 说明 |
|------|------|
| ⚡ 轻量级仿真 | 离散事件仿真，快速验证基本吞吐量 |
| 🔄 动态调度模式 | RCS 调度器，冲突检测 + 死锁预防 |
| 📋 任务模板 | 可配置优先级、依赖链、频率的任务编排 |
| 📊 数据看板 | UPH / 稼动率 / 空跑率 / 死锁 / AGV 详情 |
| 🔥 热力图 | 路段拥堵色彩编码可视化 |
| 🎮 2D/3D 视图 | 无缝切换 SVG 路网和 Three.js 3D 场景 |

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    Current Platform                      │
├──────────────┬──────────────┬────────────────────────────┤
│   Frontend   │    Backend   │      AI Services           │
│   (Vercel)   │  (Supabase)  │   (Cloud API + Railway)    │
├──────────────┼──────────────┼────────────────────────────┤
│ Next.js 16   │ PostgreSQL   │ MiniMax M2.7-highspeed     │
│ React 19     │ Auth         │ (VLM 物理属性推理)          │
│ Three.js     │ Storage      │ Tripo3D API                │
│ Fabric.js    │ Realtime     │ (Image → 3D GLB)           │
│ Zustand      │ RLS          │ Python 微服务 (Railway)     │
│ Tailwind CSS │              │ (Mesh 分割 + URDF 生成)     │
└──────────────┴──────────────┴────────────────────────────┘
```

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **前端框架** | Next.js 16 (App Router) + React 19 |
| **3D 渲染** | React Three Fiber + Three.js + Drei |
| **2D 编辑** | Fabric.js v7 |
| **状态管理** | Zustand |
| **样式** | Tailwind CSS 4 + CSS Custom Properties |
| **后端** | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| **AI 推理** | MiniMax M2.7-highspeed + Tripo3D API |
| **后处理** | Python FastAPI (Mesh Splitter + URDF Generator) |
| **部署** | Vercel + Supabase + Railway |

---

## 📁 项目结构

```
Current/
├── current-web/                 # 前端 — Next.js 16 应用
│   ├── app/                     # App Router 页面
│   │   ├── (dashboard)/         # 仪表板页面（首页/资产/地图/仿真/设置）
│   │   ├── auth/                # 认证页面（登录/回调/登出）
│   │   └── api/                 # API Routes（推理流水线/项目CRUD）
│   ├── components/              # React 组件
│   │   ├── editor-2d/           # 2D 编辑器（MapEditor/LayerManager/CalibrationWizard）
│   │   ├── scene-3d/            # 3D 场景（SceneViewer/AGVAnimator/TubeNetwork）
│   │   ├── simulation/          # 仿真组件（HeatmapOverlay/TaskTemplatePanel）
│   │   ├── ui/                  # 基础 UI 组件（Button/Input/Card/Badge/Skeleton）
│   │   └── viewer-3d/           # 3D 模型查看器
│   ├── lib/                     # 核心库
│   │   ├── simulation/          # 仿真引擎 + RCS 调度器 + 运动学
│   │   ├── pathfinding/         # A* 路径规划
│   │   ├── stores/              # Zustand 状态
│   │   └── supabase/            # Supabase 客户端
│   └── supabase/migrations/     # 数据库 Schema
│
├── current-inference/           # Python 微服务 — FastAPI
│   ├── main.py                  # FastAPI 入口
│   ├── routers/                 # API 路由（health/split/urdf）
│   ├── services/                # 业务逻辑（mesh_splitter）
│   ├── Dockerfile               # Railway 部署配置
│   └── requirements.txt         # Python 依赖
│
├── plans/                       # 架构设计与工作计划
│   ├── architecture.md          # V1 架构（自建 GPU）
│   ├── architecture-v2-cloud-api.md  # V2 架构（云端 API，当前采用）
│   ├── deployment.md            # 生产部署指南
│   ├── phase5-3d-upgrade.md     # 2D→3D 升级计划
│   └── phase6-ui-optimization.md # UI/UX 优化计划
│
└── agents.md                    # AI Agent 进度追踪
```

---

## 🚀 快速开始

### 前置条件

- Node.js >= 18.x
- Python >= 3.10
- pnpm（推荐）

### 环境变量

```bash
# current-web/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MINIMAX_API_KEY=your-minimax-api-key
TRIPO_API_KEY=your-tripo-api-key
INFERENCE_SERVICE_URL=http://localhost:8000
```

### 前端开发

```bash
cd current-web
pnpm install
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000)

### Python 微服务

```bash
cd current-inference
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

健康检查: [http://localhost:8000/health](http://localhost:8000/health)

---

## 📊 成本估算

| 服务 | 方案 | 月成本 |
|------|------|--------|
| Vercel | Hobby (免费) | $0 |
| Supabase | Pro | $25 |
| Railway | Developer | $5 |
| MiniMax API | 按量 | ~¥30-100 |
| Tripo3D API | 按量 | ~¥100-500 |
| **总计** | | **~$30/月 + API 按量** |

> 单次资产生成成本约 ¥0.40，生成后永久缓存。

---

## 📄 致谢

本项目基于 [PhysX-Anything](https://github.com/xxRoma/PhysX-Anything)（CVPR 2026）的思路进行改造：
- 原始 VLM + TRELLIS 3D 生成流水线 → 替换为云端 API（MiniMax + Tripo3D）
- Mesh 分割算法（测地线传播）→ 保留并封装为 FastAPI 服务
- URDF/MJCF 生成逻辑 → 保留并精简

---

## 📜 许可证

本项目基于 [MIT License](LICENSE) 开源。

原始 PhysX-Anything 代码遵循 S-Lab License 1.0（非商业用途）。Current 项目的原创部分采用 MIT 许可证。
