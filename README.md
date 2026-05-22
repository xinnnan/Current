<div align="center">

# ⚡ Current

### Industrial Map & Physics Engine — AGV/Warehouse Automation Planning Platform

### 工业地图与物理引擎 — AGV 仓储自动化项目规划平台

**📸 Upload → 🧠 AI 3D Generation → 🗺️ Map Editing → 📊 Simulation → ✅ Throughput Validation**

[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-r184-black?logo=three.js)](https://threejs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[English](#english) · [中文](#中文)

</div>

---

<a id="english"></a>

## 🎯 What is Current?

**Current** is a lightweight industrial map and physics engine designed for the planning phase of AGV/warehouse automation projects.

Before investing in expensive physical deployments, Current helps you:

- 📸 **Photo-to-3D** — Upload equipment photos, AI generates Sim-Ready 3D physics models
- 🗺️ **Industrial Map Editor** — Import CAD/blueprints, draw route networks, set traffic rules
- 📊 **Simulation & Analysis** — Run discrete event simulations, analyze throughput, utilization, deadlocks
- 🔥 **Heatmap Visualization** — Visualize segment congestion, identify bottlenecks
- 🎮 **2D Edit, 3D View** — Seamlessly switch between 2D editing and 3D simulation views

---

## ✨ Core Features

### Module 1: AI-Powered 3D Physics Asset Library

| Feature | Description |
|---------|-------------|
| 📷 Photo Upload | Upload equipment photos as AI input |
| 🧠 VLM Physics Reasoning | MiniMax M2.7-highspeed auto-identifies physical properties (material, density, friction, etc.) |
| 🎨 3D Model Generation | Tripo3D API generates Sim-Ready GLB models |
| ✂️ Mesh Splitting | Python microservice auto-splits multi-part models |
| 📦 Asset Caching | Permanently cache to Supabase Storage after generation, no repeat inference |

### Module 2: Industrial Map Editor

| Feature | Description |
|---------|-------------|
| 📐 Base Map Import | DXF / PDF / JPEG support |
| 📏 Scale Calibration | Two-point calibration wizard, precise pixel→meter mapping |
| 🗂️ Multi-Layer Management | Base map, constraint zones, routing layers with independent visibility/lock/opacity |
| 🔗 Path Drawing | Node/line/polygon tools with speed limits and mutex zones |
| 🏗️ Asset Placement | Drag-and-drop 3D models from asset library onto map |

### Module 3: Simulation & Analysis Engine

| Feature | Description |
|---------|-------------|
| ⚡ Lightweight Simulation | Discrete event simulation for quick throughput validation |
| 🔄 Dynamic Scheduling | RCS scheduler with conflict detection + deadlock prevention |
| 📋 Task Templates | Configurable priority, dependency chains, and frequency-based task orchestration |
| 📊 Dashboard | UPH / utilization / empty-run ratio / deadlocks / AGV details |
| 🔥 Heatmap | Segment congestion color-coded visualization |
| 🎮 2D/3D Views | Seamless SVG network and Three.js 3D scene switching |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Current Platform                      │
├──────────────┬──────────────┬────────────────────────────┤
│   Frontend   │    Backend   │      AI Services           │
│   (Vercel)   │  (Supabase)  │   (Cloud API + Railway)    │
├──────────────┼──────────────┼────────────────────────────┤
│ Next.js 16   │ PostgreSQL   │ MiniMax M2.7-highspeed     │
│ React 19     │ Auth         │ (VLM physics reasoning)    │
│ Three.js     │ Storage      │ Tripo3D API                │
│ Fabric.js    │ Realtime     │ (Image → 3D GLB)           │
│ Zustand      │ RLS          │ Python Service (Railway)    │
│ Tailwind CSS │              │ (Mesh split + URDF gen)     │
└──────────────┴──────────────┴────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16 (App Router) + React 19 |
| **3D Rendering** | React Three Fiber + Three.js + Drei |
| **2D Editing** | Fabric.js v7 |
| **State Management** | Zustand |
| **Styling** | Tailwind CSS 4 + CSS Custom Properties |
| **Backend** | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| **AI Inference** | MiniMax M2.7-highspeed + Tripo3D API |
| **Post-processing** | Python FastAPI (Mesh Splitter + URDF Generator) |
| **Deployment** | Vercel + Supabase + Railway |

---

## 📁 Project Structure

```
Current/
├── current-web/                 # Frontend — Next.js 16 App
│   ├── app/                     # App Router pages
│   │   ├── (dashboard)/         # Dashboard (home/assets/map/simulation/settings)
│   │   ├── auth/                # Auth (login/callback/logout)
│   │   └── api/                 # API Routes (inference pipeline/project CRUD)
│   ├── components/              # React components
│   │   ├── editor-2d/           # 2D editor (MapEditor/LayerManager/CalibrationWizard)
│   │   ├── scene-3d/            # 3D scene (SceneViewer/AGVAnimator/TubeNetwork)
│   │   ├── simulation/          # Simulation (HeatmapOverlay/TaskTemplatePanel)
│   │   ├── ui/                  # UI primitives (Button/Input/Card/Badge/Skeleton)
│   │   └── viewer-3d/           # 3D model viewer
│   ├── lib/                     # Core libraries
│   │   ├── simulation/          # Simulation engine + RCS scheduler + kinematics
│   │   ├── pathfinding/         # A* pathfinding
│   │   ├── stores/              # Zustand state
│   │   └── supabase/            # Supabase clients
│   └── supabase/migrations/     # Database schema
│
├── current-inference/           # Python microservice — FastAPI
│   ├── main.py                  # FastAPI entry
│   ├── routers/                 # API routes (health/split/urdf)
│   ├── services/                # Business logic (mesh_splitter)
│   ├── Dockerfile               # Railway deployment
│   └── requirements.txt         # Python dependencies
│
├── plans/                       # Architecture & planning docs
└── agents.md                    # AI Agent progress tracking
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.x
- Python >= 3.10
- pnpm (recommended)

### Environment Variables

```bash
# current-web/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SECRET_KEY=your-service-role-key
MINIMAX_API_KEY=your-minimax-api-key
TRIPO_API_KEY=your-tripo-api-key
INFERENCE_SERVICE_URL=http://localhost:8000
```

### Frontend Development

```bash
cd current-web
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### Python Microservice

```bash
cd current-inference
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Health check: [http://localhost:8000/health](http://localhost:8000/health)

---

## 📊 Cost Estimate

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Vercel | Hobby (free) | $0 |
| Supabase | Pro | $25 |
| Railway | Developer | $5 |
| MiniMax API | Pay-per-use | ~¥30-100 |
| Tripo3D API | Pay-per-use | ~¥100-500 |
| **Total** | | **~$30/mo + API usage** |

> Single asset generation cost: ~¥0.40, permanently cached after generation.

---

## 📜 Acknowledgments

This project builds upon concepts from [PhysX-Anything](https://github.com/xxRoma/PhysX-Anything) (CVPR 2026):
- Original VLM + TRELLIS 3D generation pipeline → Replaced with cloud APIs (MiniMax + Tripo3D)
- Mesh splitting algorithm (geodesic propagation) → Retained and wrapped as FastAPI service
- URDF/MJCF generation logic → Retained and simplified

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

Original PhysX-Anything code is subject to S-Lab License 1.0 (non-commercial). Current project's original code is MIT licensed.

---

<a id="中文"></a>

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
│                    Current 平台                          │
├──────────────┬──────────────┬────────────────────────────┤
│    前端      │    后端      │      AI 服务               │
│  (Vercel)    │ (Supabase)   │  (云端 API + Railway)      │
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

## 🚀 快速开始

### 前置条件

- Node.js >= 18.x
- Python >= 3.10
- pnpm（推荐）

### 环境变量

```bash
# current-web/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SECRET_KEY=your-service-role-key
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

## 📜 致谢

本项目基于 [PhysX-Anything](https://github.com/xxRoma/PhysX-Anything)（CVPR 2026）的思路进行改造：
- 原始 VLM + TRELLIS 3D 生成流水线 → 替换为云端 API（MiniMax + Tripo3D）
- Mesh 分割算法（测地线传播）→ 保留并封装为 FastAPI 服务
- URDF/MJCF 生成逻辑 → 保留并精简

---

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。

原始 PhysX-Anything 代码遵循 S-Lab License 1.0（非商业用途）。Current 项目的原创部分采用 MIT 许可证。
