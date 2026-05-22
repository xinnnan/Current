import { Plus, Box, Map, Play, ArrowRight, FolderOpen, Layers, Truck, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '项目概览 — Current',
  description: 'AGV/仓储自动化项目规划 — 吞吐量验证与运力测算',
}

const quickAccessItems = [
  {
    href: '/assets',
    icon: Box,
    label: '3D 资产库',
    desc: '上传照片 → AI 生成 Sim-Ready 3D 物理资产',
    gradient: 'from-blue-500 to-blue-600',
    bgLight: 'bg-blue-50',
    stat: 'AI 驱动',
  },
  {
    href: '/map',
    icon: Map,
    label: '地图编辑器',
    desc: '导入 CAD/图纸 → 绘制路网 → 设定交通规则',
    gradient: 'from-emerald-500 to-emerald-600',
    bgLight: 'bg-emerald-50',
    stat: '多图层',
  },
  {
    href: '/simulation',
    icon: Play,
    label: '仿真分析',
    desc: '运行仿真 → 热力图 → 吞吐量与运力测算',
    gradient: 'from-violet-500 to-violet-600',
    bgLight: 'bg-violet-50',
    stat: '实时可视化',
  },
]

const statsItems = [
  { icon: Box, label: '3D 资产', value: '—', color: 'text-blue-500' },
  { icon: Layers, label: '地图图层', value: '—', color: 'text-emerald-500' },
  { icon: Truck, label: 'AGV 仿真', value: '—', color: 'text-violet-500' },
  { icon: BarChart3, label: '分析报告', value: '—', color: 'text-amber-500' },
]

export default function HomePage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">项目概览</h1>
          <p className="text-muted text-sm mt-1">
            AGV/仓储自动化项目规划 — 吞吐量验证与运力测算
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-[var(--radius-md)] text-sm font-medium hover:bg-accent-hover transition-colors duration-[var(--transition-fast)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]"
        >
          <Plus size={16} />
          新建项目
        </button>
      </div>

      {/* Stats Overview Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {statsItems.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 p-3 bg-panel-bg border border-panel-border rounded-[var(--radius-lg)]"
          >
            <div className={`p-1.5 rounded-[var(--radius-md)] bg-gray-50 ${stat.color}`}>
              <stat.icon size={16} />
            </div>
            <div>
              <div className="text-xs text-muted">{stat.label}</div>
              <div className="text-sm font-semibold">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {quickAccessItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group relative p-5 bg-panel-bg border border-panel-border rounded-[var(--radius-lg)] hover:border-accent/40 hover:shadow-[var(--shadow-md)] transition-all duration-[var(--transition-normal)]"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2.5 rounded-[var(--radius-lg)] bg-gradient-to-br ${item.gradient} text-white shadow-[var(--shadow-sm)]`}>
                <item.icon size={18} />
              </div>
              <div>
                <h3 className="font-medium text-sm">{item.label}</h3>
                <span className="text-[10px] text-muted font-medium uppercase tracking-wider">{item.stat}</span>
              </div>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              {item.desc}
            </p>
            <div className="flex items-center gap-1 mt-3 text-xs text-accent opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--transition-fast)]">
              进入模块 <ArrowRight size={12} />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">最近项目</h2>
          <button className="text-xs text-muted hover:text-accent transition-colors duration-[var(--transition-fast)]">
            查看全部
          </button>
        </div>
        <div className="bg-panel-bg border border-panel-border rounded-[var(--radius-lg)]">
          {/* Empty state */}
          <div className="p-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-gray-50 rounded-[var(--radius-xl)] flex items-center justify-center">
              <FolderOpen size={24} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted font-medium mb-1">暂无项目</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
              点击「新建项目」开始规划你的第一个 AGV 仓储自动化项目，或直接进入下方模块开始使用。
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <Link
                href="/assets"
                className="px-3 py-1.5 text-xs text-accent bg-accent-light rounded-[var(--radius-md)] hover:bg-accent hover:text-white transition-colors duration-[var(--transition-fast)]"
              >
                创建资产
              </Link>
              <Link
                href="/map"
                className="px-3 py-1.5 text-xs text-accent bg-accent-light rounded-[var(--radius-md)] hover:bg-accent hover:text-white transition-colors duration-[var(--transition-fast)]"
              >
                编辑地图
              </Link>
              <Link
                href="/simulation"
                className="px-3 py-1.5 text-xs text-accent bg-accent-light rounded-[var(--radius-md)] hover:bg-accent hover:text-white transition-colors duration-[var(--transition-fast)]"
              >
                运行仿真
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
