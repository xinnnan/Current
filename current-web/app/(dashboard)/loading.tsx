import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" width={200} height={28} />
          <Skeleton variant="text" width={300} height={14} />
        </div>
        <Skeleton variant="rect" width={120} height={36} className="rounded-[var(--radius-md)]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-panel-bg border border-panel-border rounded-[var(--radius-lg)] p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton variant="circle" width={36} height={36} />
              <Skeleton variant="text" width={80} height={16} />
            </div>
            <Skeleton variant="text" width="100%" height={12} />
            <Skeleton variant="text" width="60%" height={12} />
          </div>
        ))}
      </div>
      <div className="bg-panel-bg border border-panel-border rounded-[var(--radius-lg)] p-8">
        <Skeleton variant="text" width={120} height={20} />
        <div className="mt-4 space-y-2">
          <Skeleton variant="text" width="100%" height={12} />
          <Skeleton variant="text" width="80%" height={12} />
        </div>
      </div>
    </div>
  )
}
