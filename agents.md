# Current - AI Agent 进度追踪与经验记录

> 本文件用于跨会话保持项目上下文，记录开发进度、关键决策和经验教训。

---

## 项目概述

**Current** 是一个轻量级工业地图与物理引擎，专注于 AGV/仓储自动化项目规划阶段的吞吐量验证和运力测算。

**核心仓库**：https://github.com/xinnnan/Current.git（基于 PhysX-Anything CVPR 2026 fork）

**架构文档**：
- [V1 架构](plans/architecture.md) — 自建 GPU 推理方案
- [V2 架构](plans/architecture-v2-cloud-api.md) — **当前采用** 云端 API 方案

---

## 关键架构决策记录

### ADR-001: 采用云端 API 替代本地 GPU 推理
- **日期**: 2026-05-21（更新: 2026-05-22）
- **决策**: 使用 MiniMax M2.7-highspeed API + Tripo3D API 替代本地 Qwen2.5-VL + TRELLIS
- **原因**: 用户希望轻量部署自用，避免管理 GPU 服务器
- **变更**: 原使用智谱 GLM-4V-Plus，后切换为 MiniMax M2.7-highspeed
- **影响**:
  - 不再需要 `trellis/`、`qwen-vl-finetune/`、`qwen-vl-utils/` 等重型模块
  - 月成本从 ~$1000-2000 降至 ~$50-80
  - 资产生成后永久缓存到 Supabase Storage，不重复推理
  - MiniMax M2.7-highspeed 兼容 OpenAI 多模态格式，支持图片+文本输入

### ADR-002: 技术栈选型
- **前端**: Next.js 15 (App Router) + React Three Fiber + Fabric.js
- **后端**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **推理**: 云端 API（智谱 + Tripo3D）+ Railway Python 微服务（后处理）
- **部署**: Vercel + Supabase + Railway

---

## 开发进度

### Phase 1: 基础框架搭建
- [x] 初始化 Next.js 16 项目
- [x] 配置 Supabase 数据库 Schema（11 张表 + RLS + 索引）
- [x] 实现基础布局（三栏式 + 侧边栏导航）
- [x] 实现用户认证（Supabase Auth + login/callback/logout）
- [x] 实现项目管理 CRUD（API routes）

### Phase 2: 3D 资产库 + 云端推理集成
- [x] 实现 3D 模型检视器（React Three Fiber + GLB Loader）
- [x] 集成智谱 GLM-4V API（VLM route）
- [x] 集成 Tripo3D API（generate-3d route）
- [x] Python 微服务（FastAPI + mesh splitter + URDF placeholder）
- [x] 实现完整推理流水线编排（upload → VLM → 3D → status）
- [x] 实现资产缓存策略（Supabase Storage）

### Phase 3: 2D 地图编辑器
- [x] Fabric.js v7 Canvas 编辑器（缩放/平移/绘制工具）
- [x] 底图导入（DXF/PDF/JPEG）
- [x] 比例尺标定向导（CalibrationWizard 组件）
- [x] 多图层管理（LayerManager 组件：可见性/锁定/排序/增删）
- [x] 路径绘制工具（节点/连线/多边形）

### Phase 4: 路径规划与仿真
- [x] A* 路径规划算法（支持速度限制/单行/互斥区）
- [x] 离散事件仿真引擎（轻量级+动态调度模式）
- [x] 热力图可视化（HeatmapOverlay 组件）
- [x] 数据看板（UPH/稼动率/空跑率/死锁/AGV 详情）

### Phase 5: 2D→3D 升级（"2D 编辑，3D 瞧"）
- [x] 统一底层数学模型（coordinates.ts + 米制化坐标）
- [x] 2.5D 场景渲染器（SceneViewer + GroundPlane + ExtrudedWalls + TubeNetwork）
- [x] 3D 资产替换（AssetModels + GLB 动态加载 + 地面对齐）
- [x] AGV 运动学动画（AGVAnimator + 位置/朝向平滑插值）
- [x] 运动学计算器（kinematics.ts + 梯形速度曲线）
- [x] 双视图切换 UX（ViewModeSwitcher + Zustand view-store）
- [x] 3D 资产放置入 2D 地图（AssetPicker + MapEditor place_asset 工具）
- [x] 动态真实调度模式（RCSScheduler + 冲突检测 + 死锁预防）
- [x] 业务逻辑任务编排（TaskTemplatePanel + 模板管理 + 优先级 + 依赖链）

### Phase 6: UI/UX 优化（设计系统与最佳实践）
- [x] 增强设计令牌（阴影/圆角/过渡/暗色模式/focus-visible/shimmer/spinner 动画）
- [x] 创建可复用 UI 组件（Button/Input/Card/Badge/Skeleton/Spinner）
- [x] Next.js 路由级 loading.tsx + error.tsx + not-found.tsx
- [x] 优化登录页（品牌 Logo + 密码可见切换 + 加载动画）
- [x] 优化侧边栏（激活指示器 + 折叠按钮 + aria 属性 + 平滑过渡）
- [x] 首页仪表板视觉增强（统计概览条 + 渐变图标卡片 + 空状态引导 + metadata）
- [x] 仿真页面指标卡片重设计（彩色图标 + 趋势指示 + 进度条 + 时间轴刻度 + 暂停状态指示器）
- [x] 全局无障碍优化（aria-label/pressed/checked/role/keyboard shortcuts Space+R）

- [ ] 生产部署（Vercel + Supabase + Railway）

---

## 代码库结构映射

### 原始仓库（PhysX-Anything）→ Current 项目

| 原始文件 | 处置 | Current 中的位置/角色 |
|----------|------|---------------------|
| `1_vlm_demo.py` | ❌ 删除 | 功能由智谱 GLM-4V API 替代 |
| `2_decoder.py` | ❌ 删除 | 功能由 Tripo3D API 替代 |
| `3_split.py` | ✅ 保留改造 | `current-inference/services/mesh_splitter.py` |
| `4_simready_gen.py` | ✅ 保留改造 | `current-inference/services/urdf_generator.py` |
| `trellis/` | ❌ 删除 | 不再需要本地 3D 生成引擎 |
| `qwen-vl-finetune/` | ❌ 删除 | 不再需要 VLM 微调 |
| `qwen-vl-utils/` | ❌ 删除 | 不再需要 Qwen 工具 |
| `dataset/overall_prompt.txt` | ✅ 保留改造 | 精简后作为智谱 API prompt |
| `download.py` | ❌ 删除 | 不再需要下载模型权重 |
| `configs/` | ❌ 删除 | 训练配置 |
| `demo/` | ❌ 删除 | 演示图片 |
| `evaluation_*.py` | ❌ 删除 | 评估脚本 |
| `render_urdf.py` | ❌ 删除 | URDF 渲染 |

---

## 经验教训 (Lessons Learnt)

### LL-001: PhysX-Anything 流水线理解
- **日期**: 2026-05-21
- **内容**: 
  - 原始流水线是 4 步串行：VLM → 3D Decoder → Mesh Split → URDF Gen
  - VLM 步骤使用微调的 Qwen2.5-VL，输出包含 voxel grid 索引（体素坐标）
  - TRELLIS 的 `run_control` 方法接受 voxel 坐标作为控制信号，引导 3D 生成
  - Mesh 分割使用测地线传播（Dijkstra），纯 CPU 算法
  - URDF 生成（`4_simready_gen.py`）最复杂，1456 行，处理关节类型 A/B/C/D/CB/E
  - Prompt 模板定义了 5 种运动类型：A(自由)、B(滑动)、C(旋转)、D(铰接)、CB(旋转+滑动)、E(固定)

### LL-002: 云端 API 替代的权衡
- **日期**: 2026-05-21
- **内容**:
  - 智谱 GLM-4V 可以替代 Qwen VLM 做物理属性推理，但无法输出精确的 voxel grid
  - Tripo3D API 可以替代 TRELLIS 做 3D 生成，但没有 voxel 控制能力
  - 这意味着云端方案生成的 3D 模型可能不如原始流水线精确
  - 对于 MVP 阶段，这个质量损失可以接受
  - 后续可以通过 Replicate 自托管 TRELLIS 来恢复完整质量

---

## 环境配置备忘

### 前端开发
```bash
# Node.js 版本要求
node >= 18.x

# 包管理器
pnpm (推荐) 或 npm

# 关键环境变量
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MINIMAX_API_KEY=
TRIPO_API_KEY=
INFERENCE_SERVICE_URL=
```

### Python 微服务
```bash
# Python 版本
python >= 3.10

# 关键依赖
fastapi>=0.115.0
uvicorn>=0.32.0
trimesh>=4.5.0
scipy>=1.14.0
numpy>=1.26.0
```

---

## 会话记录

### Session 1 - 2026-05-21
- **完成**: 代码审查、架构设计 V1 + V2、agents.md 创建
- **下一步**: 创建 README.md、初始化 Next.js 项目、配置 Supabase

### Session 2 - 2026-05-21
- **完成**:
  - 创建 agents.md 和 README.md
  - 初始化 Next.js 16 项目（current-web/）
  - 安装依赖：@supabase/ssr, @react-three/fiber, @react-three/drei, three, zustand, recharts, lucide-react
  - 创建 Supabase 客户端（client.ts + server.ts + middleware.ts）
  - 创建完整数据库 Schema（11 张表 + RLS + 索引）
  - 创建 TypeScript 类型定义（lib/types.ts）
  - 实现基础布局：侧边栏导航 + 三栏式页面结构
  - 创建所有核心页面占位：首页、资产库、地图编辑器、仿真分析、设置
  - 构建验证通过 ✅
- **下一步**: 实现用户认证、项目管理 CRUD、3D 模型检视器

### LL-003: Next.js 16 项目初始化注意事项
- **日期**: 2026-05-21
- **内容**:
  - Next.js 16 将 `middleware.ts` 重命名为 `proxy.ts`（有 deprecation warning）
  - Tailwind CSS 4 使用 `@theme inline` 替代 `tailwind.config.ts` 中的 theme 扩展
  - `create-next-app` 默认创建 AGENTS.md 和 CLAUDE.md
  - React 19 + Next.js 16 使用 `use()` API 替代部分 hooks
  - `cookies()` 和 `headers()` 现在是异步的，需要 `await`

### Session 3 - 2026-05-22
- **完成**:
  - 修复 `current-inference/routers/__init.py` → `__init__.py`
  - GLB 模型加载器集成到 ModelViewer（useGLTF + 自动缩放居中）
  - 实现 LayerManager 组件（可见性/锁定/排序/增删/不透明度滑块）
  - 实现 CalibrationWizard 组件（两点标定 + 实际距离输入 + 比例计算）
  - 实现 HeatmapOverlay 组件（拥堵色彩编码 + 发光效果 + 百分比标签 + 图例）
  - MapEditor 升级为 forwardRef + 支持外部工具控制 + 标定模式 + 绘图交互
  - 集成地图页面（MapEditor + LayerManager + CalibrationWizard + 属性面板）
  - 集成仿真页面（SimulationEngine + HeatmapOverlay + SVG路网 + 数据看板 + 时间轴）
  - 构建验证通过 ✅（15 routes）
- **下一步**: Phase 5 集成与优化

### LL-004: Fabric.js v7 与 React 集成注意事项
- **日期**: 2026-05-22
- **内容**:
  - Fabric.js v7 Canvas 类型不支持自定义属性（isDragging/lastPosX/lastPosY），需用 useRef 替代
  - Canvas 的 `getScenePoint(opt.e)` 用于获取缩放/平移后的实际坐标
  - `sendObjectToBack(img)` 存在，但 `canvas.sendToBack()` 不存在
  - `FabricImage.fromURL()` 返回 Promise，需 `await`
  - forwardRef + useImperativeHandle 模式适合暴露 importFile 等方法给父组件

### LL-005: React Three Fiber GLB 加载
- **日期**: 2026-05-22
- **内容**:
  - `useGLTF(url)` 从 `@react-three/drei` 加载 GLB 文件
  - 加载后需 `scene.clone()` 避免共享引用问题
  - 使用 `THREE.Box3().setFromObject()` 计算包围盒，自动缩放居中
  - `<primitive object={scene} />` 渲染加载的 3D 场景

### Session 4 - 2026-05-22
- **完成**:
  - 审查现有代码，分析 2D→3D 升级差距
  - 制定 Phase 5 详细工作计划（plans/phase5-3d-upgrade.md）
  - Step 1: 统一底层数学模型
    - 新建 `coordinates.ts`（canvas↔world↔three.js 双向转换）
    - 增强 `SimulationEngine`（heading/acceleration/getAGVStates/getAnimationFrame）
    - 新建 `kinematics.ts`（梯形速度曲线 + 位置插值）
    - Demo 数据米制化（30m×30m 仓库）
  - Step 2: 2.5D 场景渲染器
    - 新建 `scene-viewer.tsx`（R3F Canvas + 灯光 + OrbitControls）
    - 新建 `ground-plane.tsx`（地面网格 + 底图纹理）
    - 新建 `extruded-walls.tsx`（2D 多边形→ExtrudeGeometry 拉伸）
    - 新建 `tube-network.tsx`（TubeGeometry 管道化路网 + 节点球体）
  - Step 3: 3D 资产替换
    - 新建 `asset-models.tsx`（GLB 动态加载 + 自动缩放居中 + 地面对齐）
  - Step 4: AGV 运动学动画
    - 新建 `agv-animator.tsx`（useFrame 逐帧动画 + lerp/slerp 插值）
    - 状态颜色编码（idle=绿, moving=蓝, waiting=红, deadlocked=深红）
  - Step 5: 双视图切换 UX
    - 新建 `view-store.ts`（Zustand 状态管理）
    - 新建 `view-mode-switcher.tsx`（2D 编辑 ↔ 3D 演示 切换按钮）
    - 仿真页面集成 3D 视图（SVG + 3D 条件渲染）
  - 构建验证通过 ✅（15 routes）
- **下一步**: 生产部署（Vercel + Supabase + Railway）

### Session 5 - 2026-05-22
- **完成**:
  - 修复 `engine.ts` 类型：`SimTask.type` 添加 `'patrol'`，添加 `priority?: number`
  - 导出 `rcs-scheduler.ts` 的 `ConflictResolution` 和 `DeadlockInfo` 接口
  - 更新 `MapEditor`：添加 `'place_asset'` 工具 + `PlacedAsset` 类型 + `placeAssetOnCanvas` 方法
  - 集成 `AssetPicker` 到地图页面左侧面板 + 放置模式指示器
  - 创建 `TaskTemplatePanel` 组件（模板管理 + 优先级 + 依赖链 + 频率配置）
  - 集成 `RCSScheduler` 到仿真页面动态模式（冲突检测 + 死锁预防）
  - 仿真仪表板新增 RCS 冲突解决日志和动态模式指示器
  - 构建验证通过 ✅（16 routes）
- **下一步**: Phase 6 UI/UX 优化

### Session 6 - 2026-05-22
- **完成**:
  - Step 6: 首页仪表板视觉增强
    - 添加 `generateMetadata` 导出（页面标题 + 描述）
    - 统计概览条（4 项：资产/图层/仿真/报告）
    - 快速入口卡片：渐变图标背景 + 悬浮阴影 + 功能标签
    - 最近项目：空状态引导（图标 + 文案 + 快捷操作按钮）
    - 全面使用设计令牌（shadow/radius/transition）
  - Step 7: 仿真页面指标卡片重设计
    - UPH 卡片：蓝色图标背景 + 趋势指示
    - 稼动率卡片：绿色图标 + 颜色自适应进度条（绿/黄/红）
    - 空跑率卡片：琥珀色图标 + 三级趋势指示（良好/一般/偏高）
    - 死锁卡片：红色图标 + 条件着色
    - 任务统计：完成率进度条 + 等宽字体时间
    - AGV 详情：状态圆点 + 颜色编码进度条
    - RCS 冲突日志：渐变背景指示器 + 颜色编码原因标签
    - 时间轴：刻度标记 + 进度指示器圆点 + role=progressbar
    - 运行/暂停状态指示器：backdrop-blur + 快捷键提示
  - Step 8: 全局无障碍优化
    - 仿真工具栏：role="toolbar" + aria-label（启动/暂停/重置 + 快捷键提示）
    - 倍速选择：role="radiogroup" + role="radio" + aria-checked
    - 配置按钮：aria-expanded + aria-label
    - 视图模式切换：role="radiogroup" + aria-checked
    - 地图工具栏：role="toolbar" + aria-pressed + aria-label
    - 资产页面：搜索框 aria-label + 按钮 aria-label + aria-hidden
    - 地图页面：取消/删除按钮 aria-label
    - 键盘快捷键：Space（播放/暂停）+ R（重置），输入框内不触发
    - 模式标签：aria-live="polite" 动态播报
  - 构建验证通过 ✅（16 routes）
- **下一步**: 生产部署

### LL-008: Phase 6 UI/UX 优化经验
- **日期**: 2026-05-22
- **内容**:
  - `generateMetadata` 导出用于 Next.js App Router 页面级 metadata，需要 `import type { Metadata } from 'next'`
  - 键盘快捷键需过滤输入框焦点状态：`e.target instanceof HTMLInputElement` 等判断
  - `useEffect` 中引用 state 回调函数需要加入依赖数组（`runSimulation`, `togglePause`, `resetSimulation`）
  - `role="progressbar"` 需配合 `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
  - `role="radiogroup"` + `role="radio"` + `aria-checked` 用于单选按钮组语义
  - `aria-live="polite"` 用于动态状态变化播报（如仿真模式切换）
  - 设计令牌引用：`shadow-[var(--shadow-md)]` / `rounded-[var(--radius-lg)]` / `duration-[var(--transition-fast)]`

### LL-007: RCS 调度器与任务编排
- **日期**: 2026-05-22
- **内容**:
  - `SimTask` 需要支持 `'patrol'` 类型和可选 `priority` 字段以兼容 `ScheduledTask extends SimTask`
  - `ConflictResolution` 和 `DeadlockInfo` 需要显式 export 才能被其他模块导入
  - Fabric.js `Group` 类型不支持动态属性赋值，需 `as unknown as Record<string, unknown>` 中转
  - `Rect` 需要从 fabric 显式导入（不在默认导入列表中）
  - 资产放置流程：AssetPicker 选择 → setActiveTool('place_asset') → Canvas 点击 → placeAssetOnCanvas → onToolAction 通知父组件
  - RCS 冲突解决策略：priority > fifo > nearest，通过 wait-for 图环检测实现死锁预防

### LL-006: 2D→3D 坐标映射规则
- **日期**: 2026-05-22
- **内容**:
  - 2D Canvas Y 轴向下 → 3D Three.js Z 轴向观察者（Y→Z 映射）
  - 3D Y 轴 = 高度（地面=0，墙体向上拉伸）
  - `pixels_per_meter` 是桥接 2D 像素和 3D 米的关键参数
  - ExtrudeGeometry 默认沿 Z 轴拉伸，需 `rotateX(-π/2)` 转为沿 Y 轴
  - `THREE.LineCurve3` + `TubeGeometry` 用于管道化路网渲染
  - AGV 朝向：数学角度 `atan2(dy, dx)` → Three.js Y 轴旋转 `π/2 - heading`
