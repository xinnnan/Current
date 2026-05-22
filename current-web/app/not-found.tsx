import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md">
        <div className="text-7xl font-bold text-accent/20 mb-4">404</div>
        <h1 className="text-xl font-semibold mb-2">页面未找到</h1>
        <p className="text-sm text-muted mb-6">
          你访问的页面不存在或已被移动。
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-[var(--radius-md)] text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          返回首页
        </Link>
      </div>
    </div>
  )
}
