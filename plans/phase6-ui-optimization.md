# Phase 6: UI/UX 优化计划

> **目标**: 按照 Next.js 和现代前端最佳实践，全面提升项目可视化品质和用户体验。
> **原则**: 工业极简美学 + 高信息密度 + 零装饰 + 功能优先。

---

## 现状问题诊断

### 1. 设计系统不完整
- CSS 变量只有基础颜色，缺少阴影、圆角、过渡动画令牌
- 无暗色模式支持（工业软件长时间使用需要暗色）
- 无统一的设计令牌（spacing scale, shadow scale, radius scale）

### 2. 缺少 Next.js 最佳实践文件
- 无 `loading.tsx`（路由级 Suspense fallback）
- 无 `error.tsx`（错误边界）
- 无 `not-found.tsx`（自定义 404）
- 子页面无独立 `metadata`（SEO/标题）

### 3. 组件复用性差
- 大量内联 Tailwind 类名重复（按钮、输入框、卡片）
- 无统一 Button/Input/Card 组件
- 无 Skeleton 骨架屏组件

### 4. 页面级 UI 问题
- **登录页**: 基础但缺少加载动画和密码可见切换
- **首页**: 纯静态占位，无骨架屏
- **侧边栏**: 激活指示器不够明显，折叠动画生硬
- **仿真页**: 指标卡片视觉层次不够，时间轴交互弱
- **地图页**: 工具栏缺少 tooltip

### 5. 无障碍缺失
- 图标按钮缺少 `aria-label`
- 无 `focus-visible` 样式
- 无键盘快捷键支持

---

## 实施步骤

### Step 1: 增强设计令牌

**文件**: `current-web/app/globals.css`

补全以下设计令牌：

```css
:root {
  /* 已有颜色保留... */
  
  /* 新增: 阴影 */
  --shadow-xs: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05);
  
  /* 新增: 圆角 */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  
  /* 新增: 过渡 */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
  
  /* 新增: 间距 */
  --spacing-panel: 16px;
  --spacing-section: 12px;
}

/* 暗色模式 */
.dark {
  --background: #0f1117;
  --foreground: #e5e7eb;
  --sidebar-bg: #1a1b23;
  --sidebar-border: #2d2e3a;
  --panel-bg: #1a1b23;
  --panel-border: #2d2e3a;
  --accent: #60a5fa;
  --accent-hover: #93bbfd;
  --muted: #9ca3af;
  --canvas-bg: #1e1f2b;
}
```

### Step 2: 创建可复用 UI 基础组件

**新建文件**: `current-web/components/ui/`

| 组件 | 用途 | 关键特性 |
|------|------|----------|
| `button.tsx` | 统一按钮 | variant: primary/secondary/ghost/danger, size: sm/md/lg, loading 状态 |
| `input.tsx` | 统一输入框 | label 集成, error 状态, 前后缀 slot |
| `card.tsx` | 统一卡片 | header/body/footer slot, hover 效果 |
| `badge.tsx` | 状态标签 | variant: success/warning/danger/info/default |
| `skeleton.tsx` | 骨架屏 | shimmer 动画, 多种形状 (text/circle/rect) |
| `tooltip.tsx` | 工具提示 | 基于 title 的简单实现或 CSS-only |
| `spinner.tsx` | 加载旋转器 | SVG 动画, 多尺寸 |

### Step 3: Next.js 路由级状态文件

**新建文件**:

```
app/
├── not-found.tsx                    # 自定义 404 页面
├── (dashboard)/
│   ├── loading.tsx                  # 仪表板全局加载
│   ├── error.tsx                    # 仪表板错误边界
│   ├── assets/
│   │   └── loading.tsx              # 资产页骨架屏
│   ├── map/
│   │   └── loading.tsx              # 地图页加载
│   ├── simulation/
│   │   └── loading.tsx              # 仿真页加载
│   └── settings/
│       └── loading.tsx              # 设置页加载
```

每个 `loading.tsx` 使用 Skeleton 组件模拟页面结构。

`error.tsx` 提供友好的错误展示 + 重试按钮。

`not-found.tsx` 提供品牌化的 404 页面 + 返回首页链接。

### Step 4: 优化登录页

**文件**: `current-web/app/auth/login/page.tsx`

改进:
- 添加品牌 Logo 区域（Current logo + 插图）
- 密码可见性切换按钮（眼睛图标）
- 加载中旋转动画替代文字
- 更好的错误提示样式（带图标）
- 表单验证反馈（邮箱格式、密码长度）

### Step 5: 优化侧边栏

**文件**: `current-web/components/sidebar.tsx`

改进:
- 激活项：左侧 3px 色条指示器 + 更明显的背景色
- 折叠/展开：更平滑的宽度过渡动画
- 折叠状态下显示 tooltip（CSS-only）
- 底部用户区域：头像占位 + 邮箱截断优化
- 添加 `aria-current="page"` 和 `aria-label`

### Step 6: 优化首页仪表板

**文件**: `current-web/app/(dashboard)/page.tsx`

改进:
- 快速入口卡片：添加渐变图标背景 + 悬浮阴影效果
- 添加页面 metadata（`generateMetadata`）
- 最近项目区域：空状态插图 + 引导文案
- 添加统计概览条（资产数/地图数/仿真次数）

### Step 7: 优化仿真页面

**文件**: `current-web/app/(dashboard)/simulation/page.tsx`

改进:
- 指标卡片：添加图标背景色 + 趋势箭头 + 进度环
- 时间轴：添加刻度标记 + 拖拽跳转 + 当前时间指示器
- 配置面板：分组折叠 + 更好的表单布局
- 运行状态指示器：脉冲动画 + 状态文字
- RCS 冲突日志：添加时间戳 + 颜色编码优化

### Step 8: 全局无障碍优化

涉及所有组件:
- 所有图标按钮添加 `aria-label`
- 全局 `focus-visible` 样式（蓝色轮廓）
- 侧边栏添加键盘导航（Tab + Enter）
- 仿真控制添加键盘快捷键（Space=播放/暂停, R=重置）
- 地图编辑器工具栏添加 `role="toolbar"` 和 `aria-pressed`

---

## 技术约束

1. **不引入新依赖** — 所有 UI 组件纯 Tailwind + 原生 HTML 实现
2. **保持工业极简美学** — 不添加装饰性元素，功能性优先
3. **不破坏现有功能** — 所有改动是增量式的
4. **构建必须通过** — 每步完成后验证 build

---

## 预期效果

| 维度 | 优化前 | 优化后 |
|------|--------|--------|
| 设计一致性 | 大量内联类名，风格不统一 | 统一设计令牌 + 可复用组件 |
| 加载体验 | 白屏跳转 | 骨架屏平滑过渡 |
| 错误处理 | 无边界，白屏崩溃 | 友好错误页 + 重试 |
| 暗色模式 | 不支持 | 完整暗色支持 |
| 无障碍 | 基本缺失 | WCAG AA 基础合规 |
| 视觉品质 | 功能性但粗糙 | 工业级专业感 |
