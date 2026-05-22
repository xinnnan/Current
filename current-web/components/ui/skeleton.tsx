interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circle' | 'rect'
  width?: string | number
  height?: string | number
}

export function Skeleton({ className = '', variant = 'rect', width, height }: SkeletonProps) {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  }

  if (variant === 'text') {
    return <div className={`skeleton h-4 ${className}`} style={style} />
  }

  if (variant === 'circle') {
    return <div className={`skeleton rounded-full ${className}`} style={{ ...style, width: width || 40, height: height || 40 }} />
  }

  return <div className={`skeleton ${className}`} style={style} />
}

export function SkeletonCard() {
  return (
    <div className="bg-panel-bg border border-panel-border rounded-[var(--radius-lg)] p-4 space-y-3">
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="100%" height={12} />
      <Skeleton variant="text" width="80%" height={12} />
      <div className="flex gap-2 pt-2">
        <Skeleton width={60} height={24} />
        <Skeleton width={60} height={24} />
      </div>
    </div>
  )
}

export function SkeletonMetric() {
  return (
    <div className="bg-panel-bg border border-panel-border rounded-[var(--radius-lg)] p-4 space-y-2">
      <Skeleton variant="text" width="50%" height={10} />
      <Skeleton variant="text" width="30%" height={28} />
      <Skeleton variant="rect" width="100%" height={6} className="rounded-full" />
    </div>
  )
}
