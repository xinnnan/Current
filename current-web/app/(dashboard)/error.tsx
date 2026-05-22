'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="mx-auto w-12 h-12 bg-danger-light rounded-full flex items-center justify-center mb-4">
          <AlertTriangle size={24} className="text-danger" />
        </div>
        <h2 className="text-lg font-semibold mb-2">出错了</h2>
        <p className="text-sm text-muted mb-1">
          {error.message || '页面加载时发生了一个错误'}
        </p>
        {error.digest && (
          <p className="text-[10px] text-muted-foreground mb-4">
            错误 ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-[var(--radius-md)] text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          <RotateCcw size={14} />
          重试
        </button>
      </div>
    </div>
  )
}
