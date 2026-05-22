<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Current Web — AI Agent 规则

## 项目概述
Current 是一个工业地图与物理引擎平台，用于 AGV/仓储自动化项目规划。

## 关键约定
- **App Router**: 所有页面使用 `app/` 目录下的 React Server Components
- **客户端组件**: 需要 `'use client'` 指令的组件放在 `components/` 下
- **Supabase**: 客户端用 `@/lib/supabase/client`，服务端用 `@/lib/supabase/server`
- **异步 API**: `cookies()` 和 `headers()` 需要 `await`
- **中间件**: `middleware.ts` 在 Next.js 16 中有 deprecation warning，应使用 `proxy.ts`
- **Tailwind CSS 4**: 使用 `@theme inline` 替代 `tailwind.config.ts`
- **设计令牌**: 使用 CSS 自定义属性（`var(--shadow-md)` 等），定义在 `globals.css`
