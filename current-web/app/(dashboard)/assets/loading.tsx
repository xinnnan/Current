import { Skeleton } from '@/components/ui/skeleton'

export default function AssetsLoading() {
  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-panel-border bg-panel-bg flex flex-col shrink-0 p-3 space-y-3">
        <Skeleton variant="rect" height={36} className="rounded-[var(--radius-md)]" />
        <div className="flex gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rect" width={48} height={24} className="rounded-full" />
          ))}
        </div>
        <div className="flex-1 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rect" height={56} className="rounded-[var(--radius-md)]" />
          ))}
        </div>
      </div>
      <div className="flex-1 bg-canvas-bg" />
      <div className="w-80 border-l border-panel-border bg-panel-bg p-4 space-y-4">
        <Skeleton variant="text" width={80} height={16} />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="rect" height={32} className="rounded-[var(--radius-md)]" />
        ))}
      </div>
    </div>
  )
}
