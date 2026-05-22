# Current

> 轻量级工业地图与物理引擎 — 专注 AGV/仓储自动化项目规划阶段的吞吐量验证与运力测算

---

## 🎯 产品定位

Current 摒弃传统大型工业仿真软件繁琐的建模流程与冗余交互，聚焦解决两个核心痛点：

1. **非标资产建模慢** — 基于前沿视觉大模型，实现现场实景照片到 Sim-Ready 3D 物理资产的"零代码"转换
2. **地图路径测算效率低** — 提供高度敏捷的 2D 布局编辑器，打通任意格式客户图纸（CAD/PDF/JPEG）与底层控制系统的路径映射

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    浏览器客户端                           │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ 3D 检视器 │  │ 2D 地图编辑器 │  │ 仿真数据看板      │  │
│  │ (R3F)     │  │ (Fabric.js)  │  │ (Recharts)       │  │
│  └──────────┘  └──────────────┘  └──────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────┐
│              Vercel — Next.js 15 App Router              │
│  ┌──────────────────────────────────────────────────┐   │
│  │ API Routes (BFF) — 代理云端 API + 业务逻辑        │   │
│  └──────────────────────────────────────────────────┘   │
└───────┬─────────────────┬──────────────────┬────────────┘
        │                 │                  │
   ┌────▼─────┐    ┌──────▼──────┐    ┌──────▼──────┐
   │ Supabase │    │ 智谱 GLM-4V │    │  Tripo3D    │
   │ PG+Auth  │    │ 物理属性推理 │    │  3D 生成    │
   │ Storage  │    └─────────────┘    └─────────────┘
   │ Realtime │
   └────┬─────┘    ┌──────────────────────────────────┐
        │          │ Railway — Python 微服务            │
        └──────────│  • Mesh 部件分割 (3_split.py)     │
                   │  • URDF/MJCF 生成 (4_simready.py) │
                   └──────────────────────────────────┘
```

---

## ✨ 核心功能

### 模块一：3D 物理资产库生成流水线

- 📸 **现场即时采集** — 上传客户现场非标设备的单张 RGB 照片
- 🧠 **AI 物理拓扑推理** — 智谱 GLM-4V 推理物理属性（密度、摩擦系数、质量、关节类型）
- 🎮 **3D 模型生成** — Tripo3D API 生成 Sim-Ready 3D Mesh
- 🔧 **物理属性校准** — WebGL 界面中检视模型，表单式编辑物理参数
- 💾 **永久缓存** — 生成一次，永久存入资产库，不重复推理

### 模块二：地图初始化与路网编辑器

- 📐 **零门槛底图导入** — 支持 DXF / PDF / JPEG，自动铺底
- 📏 **比例尺强制标定** — 画线段 + 输入真实距离 → 全局坐标系
- 🗂️ **语义化多图层** — 底图层 / 限域层（障碍区）/ 路径层（路网）
- 🛤️ **路径规则限定** — 限速、单双向、互斥区/死锁防范区
- 🧭 **智能寻路** — A* 算法即时显示最优路径 + 预计行驶用时

### 模块三：仿真引擎与可视化分析

- ⚡ **轻量级调度** — 10x 极速运行，粗算理论产能
- 🔄 **动态真实调度** — 还原 RCS 逻辑，实时路径抢占/重规划
- 🔥 **3D 热力图** — 路段拥堵度可视化
- 📊 **数据看板** — AGV 稼动率、吞吐量、阻塞状态实时刷新

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 15 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| 3D 渲染 | React Three Fiber + drei |
| 2D 编辑器 | Fabric.js |
| 状态管理 | Zustand |
| 后端服务 | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| AI 推理 | 智谱 GLM-4V-Plus + Tripo3D API |
| 后处理 | Python FastAPI (Railway) |
| 部署 | Vercel + Supabase + Railway |

---

## 📁 项目结构

```
Current/
├── agents.md                    # AI Agent 进度追踪与经验记录
├── plans/                       # 架构设计文档
│   ├── architecture.md          # V1 架构（自建 GPU）
│   └── architecture-v2-cloud-api.md  # V2 架构（云端 API）⭐
├── current-web/                 # Next.js 前端项目（待创建）
├── current-inference/           # Python 推理微服务（待创建）
├── 3_split.py                   # 原始 Mesh 分割脚本（待迁移）
├── 4_simready_gen.py            # 原始 URDF 生成脚本（待迁移）
├── dataset/overall_prompt.txt   # VLM Prompt 模板
└── supabase/                    # 数据库迁移（待创建）
```

---

## 🚀 快速开始

### 前置条件

- Node.js >= 18.x
- Python >= 3.10
- pnpm (推荐)

### 环境变量

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# 云端 AI API
ZHIPU_API_KEY=
TRIPO_API_KEY=

# Python 微服务
INFERENCE_SERVICE_URL=
```

### 开发启动

```bash
# 前端
cd current-web
pnpm install
pnpm dev

# Python 微服务
cd current-inference
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## 📋 开发路线图

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 1 | 基础框架搭建（Next.js + Supabase + 认证） | 🔄 进行中 |
| Phase 2 | 3D 资产库 + 云端推理集成 | ⏳ 待开始 |
| Phase 3 | 2D 地图编辑器 | ⏳ 待开始 |
| Phase 4 | 路径规划与仿真引擎 | ⏳ 待开始 |
| Phase 5 | 集成与优化 | ⏳ 待开始 |

---

## 📄 许可证

基于 [PhysX-Anything](https://github.com/ziangcao0312/PhysX-Anything) (S-Lab License) 改造。
