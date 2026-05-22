import { Upload, Search, Box, Download } from 'lucide-react'
import { ModelViewer } from '@/components/viewer-3d/model-viewer'

export default function AssetsPage() {
  return (
    <div className="flex h-full">
      {/* Left Panel - Asset List */}
      <div className="w-72 border-r border-panel-border bg-panel-bg flex flex-col shrink-0">
        <div className="p-3 border-b border-panel-border">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="text"
              placeholder="搜索资产..."
              aria-label="搜索资产"
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        {/* Category filters */}
        <div className="flex gap-1 p-3 border-b border-panel-border overflow-x-auto">
          {['全部', 'AGV', '货架', '传送带', '工位'].map((cat) => (
            <button
              key={cat}
              className="px-2.5 py-1 text-xs rounded-full bg-gray-100 text-muted hover:bg-accent/10 hover:text-accent transition-colors whitespace-nowrap"
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Asset list */}
        <div className="flex-1 overflow-auto p-3">
          <div className="text-center py-12 text-muted text-sm">
            <Box size={32} className="mx-auto mb-2 opacity-30" />
            <p>资产库为空</p>
            <p className="text-xs mt-1">上传照片生成 3D 资产</p>
          </div>
        </div>

        {/* Upload button */}
        <div className="p-3 border-t border-panel-border">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white rounded-md text-sm font-medium hover:bg-accent-hover transition-colors" aria-label="上传照片生成3D资产">
            <Upload size={16} aria-hidden="true" />
            上传照片生成资产
          </button>
        </div>
      </div>

      {/* Center - 3D Viewer */}
      <div className="flex-1 relative">
        <ModelViewer />
        {/* Viewer controls overlay */}
        <div className="absolute top-3 right-3 flex gap-1">
          <button className="p-1.5 bg-white/90 rounded shadow-sm text-muted hover:text-foreground transition-colors" title="导出 GLB" aria-label="导出GLB文件">
            <Download size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Right Panel - Properties */}
      <div className="w-80 border-l border-panel-border bg-panel-bg overflow-auto shrink-0">
        <div className="p-4 border-b border-panel-border">
          <h3 className="text-sm font-medium">属性面板</h3>
        </div>
        <div className="p-4 space-y-4">
          {/* Basic info */}
          <section>
            <h4 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">基础信息</h4>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-muted mb-0.5">名称</label>
                <input
                  type="text"
                  placeholder="--"
                  className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-0.5">类别</label>
                <select className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent">
                  <option>选择类别</option>
                  <option>AGV - 潜伏式</option>
                  <option>AGV - 叉车式</option>
                  <option>货架</option>
                  <option>传送带</option>
                  <option>工位</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-muted mb-0.5">长 (cm)</label>
                  <input type="number" placeholder="--" className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-0.5">宽 (cm)</label>
                  <input type="number" placeholder="--" className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-0.5">高 (cm)</label>
                  <input type="number" placeholder="--" className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
              </div>
            </div>
          </section>

          {/* Physical properties */}
          <section>
            <h4 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">物理属性</h4>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-muted mb-0.5">密度 (kg/m³)</label>
                  <input type="number" placeholder="--" className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-0.5">质量 (kg)</label>
                  <input type="number" placeholder="--" className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-muted mb-0.5">摩擦系数</label>
                  <input type="number" step="0.01" placeholder="--" className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-0.5">杨氏模量 (GPa)</label>
                  <input type="number" placeholder="--" className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted mb-0.5">泊松比</label>
                <input type="number" step="0.01" placeholder="--" className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent" />
              </div>
            </div>
          </section>

          {/* Export */}
          <section>
            <h4 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">导出</h4>
            <div className="flex gap-2">
              <button className="flex-1 py-1.5 text-xs bg-gray-100 text-muted rounded hover:bg-gray-200 transition-colors">
                GLB
              </button>
              <button className="flex-1 py-1.5 text-xs bg-gray-100 text-muted rounded hover:bg-gray-200 transition-colors">
                URDF
              </button>
              <button className="flex-1 py-1.5 text-xs bg-gray-100 text-muted rounded hover:bg-gray-200 transition-colors">
                MJCF
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
