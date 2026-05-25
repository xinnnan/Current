'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Upload, Search, Box, Download, Loader2, CheckCircle, AlertCircle, Trash2, RefreshCw, MapPin, Ruler, Weight, Layers } from 'lucide-react'
import { ModelViewer, type Dimensions } from '@/components/viewer-3d/model-viewer'
import { useTranslation } from '@/lib/i18n'
import { useRouter } from 'next/navigation'

interface AssetRecord {
  id: string
  name: string
  category: string
  dimension_length: number | null
  dimension_width: number | null
  dimension_height: number | null
  physical_params: Record<string, unknown>
  parts: unknown[]
  group_info: Record<string, unknown>
  model_url: string | null
  thumbnail_url: string | null
  urdf_url: string | null
  source_image_url: string | null
  format: string
  created_at: string
  updated_at: string
}

interface InferenceJob {
  id: string
  status: string
  progress: number
  current_step: string
  error_message: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  agv_lmr: 'AGV (LMR)',
  agv_fmr: 'AGV (FMR)',
  agv_ctu: 'AGV (CTU)',
  shelf: 'Shelf',
  conveyor: 'Conveyor',
  robot_arm: 'Robot Arm',
  workstation: 'Workstation',
  pallet: 'Pallet',
  charger: 'Charger',
  other: 'Other',
}

export default function AssetsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [assets, setAssets] = useState<AssetRecord[]>([])
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeJob, setActiveJob] = useState<InferenceJob | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Fetch assets from database ──
  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch('/api/assets')
      if (res.ok) {
        const data = await res.json()
        setAssets(data.assets || [])
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  // ── Poll inference job status ──
  useEffect(() => {
    if (!activeJob) return
    if (activeJob.status === 'completed' || activeJob.status === 'failed') return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/inference/${activeJob.id}`)
        if (res.ok) {
          const data = await res.json()
          const job = data.job as InferenceJob
          setActiveJob(job)

          if (job.status === 'completed') {
            setUploadStatus({ type: 'success', message: `Asset generated successfully!` })
            fetchAssets() // Refresh list
          } else if (job.status === 'failed') {
            setUploadStatus({ type: 'error', message: job.error_message || 'Generation failed' })
            fetchAssets() // Refresh list to show uploaded image even if inference failed
          }
        }
      } catch {
        // Continue polling
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [activeJob, fetchAssets])

  // ── Upload image and start inference ──
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setUploadStatus({ type: 'error', message: 'Invalid file type. Use JPEG, PNG, or WebP.' })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus({ type: 'error', message: 'File too large. Max 10MB.' })
      return
    }

    setUploading(true)
    setUploadStatus(null)

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('name', file.name.replace(/\.[^/.]+$/, ''))

      const res = await fetch('/api/inference/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      // Start polling for job status
      setActiveJob({
        id: data.job_id,
        status: 'pending',
        progress: 0,
        current_step: 'pending',
        error_message: null,
      })
      setUploadStatus({ type: 'success', message: `Upload started! Processing...` })
    } catch (err) {
      setUploadStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Upload failed',
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Save asset property changes ──
  const handleSaveProperty = async (field: string, value: unknown) => {
    if (!selectedAsset) return
    setSaving(true)
    try {
      const res = await fetch(`/api/assets/${selectedAsset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      if (res.ok) {
        const data = await res.json()
        setSelectedAsset(data.asset)
        setAssets(prev => prev.map(a => a.id === data.asset.id ? data.asset : a))
      }
    } catch {
      // Silently fail
    } finally {
      setSaving(false)
    }
  }

  // ── Delete asset ──
  const handleDeleteAsset = async () => {
    if (!selectedAsset) return
    try {
      const res = await fetch(`/api/assets/${selectedAsset.id}`, { method: 'DELETE' })
      if (res.ok) {
        setAssets(prev => prev.filter(a => a.id !== selectedAsset.id))
        setSelectedAsset(null)
      }
    } catch {
      // Silently fail
    }
  }

  // ── Filtered assets ──
  const filteredAssets = assets.filter(a => {
    const matchesSearch = !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || a.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // ── Progress percentage for inference job ──
  const jobProgress = activeJob ? Math.round(activeJob.progress * 100) : 0

  // ── "Use in Map" handler — store asset in sessionStorage and navigate ──
  const handleUseInMap = useCallback(() => {
    if (!selectedAsset) return
    sessionStorage.setItem('pendingAsset', JSON.stringify({
      id: selectedAsset.id,
      name: selectedAsset.name,
      dimension_length: selectedAsset.dimension_length,
      dimension_width: selectedAsset.dimension_width,
      category: selectedAsset.category,
    }))
    router.push('/map')
  }, [selectedAsset, router])

  // ── Compute dimensions prop for ModelViewer ──
  const viewerDimensions: Dimensions | undefined = selectedAsset ? {
    length: selectedAsset.dimension_length ?? undefined,
    width: selectedAsset.dimension_width ?? undefined,
    height: selectedAsset.dimension_height ?? undefined,
  } : undefined

  const hasAnyDimension = selectedAsset && (
    selectedAsset.dimension_length || selectedAsset.dimension_width || selectedAsset.dimension_height
  )

  return (
    <div className="flex h-full">
      {/* Left Panel - Asset List */}
      <div className="w-72 border-r border-panel-border bg-panel-bg flex flex-col shrink-0">
        <div className="p-3 border-b border-panel-border">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('assets.search')}
              aria-label={t('assets.searchAriaLabel')}
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        {/* Category filters */}
        <div className="flex gap-1 p-3 border-b border-panel-border overflow-x-auto">
          {['all', 'agv_lmr', 'agv_fmr', 'shelf', 'conveyor', 'workstation', 'charger', 'other'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 text-xs rounded-full transition-colors whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-accent/10 text-accent'
                  : 'bg-gray-100 text-muted hover:bg-gray-200'
              }`}
            >
              {cat === 'all' ? t('assets.all') : (CATEGORY_LABELS[cat] || cat)}
            </button>
          ))}
        </div>

        {/* Upload status / Inference progress */}
        {uploadStatus && (
          <div className={`mx-3 mt-3 p-2.5 rounded-md text-xs flex items-start gap-2 ${
            uploadStatus.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {uploadStatus.type === 'success'
              ? <CheckCircle size={14} className="shrink-0 mt-0.5" />
              : <AlertCircle size={14} className="shrink-0 mt-0.5" />
            }
            <div className="flex-1 min-w-0">
              <span>{uploadStatus.message}</span>
              {activeJob && activeJob.status !== 'completed' && activeJob.status !== 'failed' && (
                <div className="mt-1.5">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-accent h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${jobProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted mt-0.5 block">
                    {activeJob.current_step?.replace(/_/g, ' ')} ({jobProgress}%)
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => { setUploadStatus(null); setActiveJob(null) }}
              className="ml-auto shrink-0 opacity-60 hover:opacity-100"
            >
              ×
            </button>
          </div>
        )}

        {/* Asset list */}
        <div className="flex-1 overflow-auto p-3">
          {loading ? (
            <div className="text-center py-12 text-muted text-sm">
              <Loader2 size={24} className="mx-auto mb-2 spinner" />
              <p>Loading assets...</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-12 text-muted text-sm">
              <Box size={32} className="mx-auto mb-2 opacity-30" />
              <p>{t('assets.empty')}</p>
              <p className="text-xs mt-1">{t('assets.emptyDesc')}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredAssets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset)}
                  className={`w-full text-left p-2.5 rounded-md text-sm transition-colors ${
                    selectedAsset?.id === asset.id
                      ? 'bg-accent/10 border border-accent/30'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-xs">
                      {asset.model_url ? '📦' : '🖼️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{asset.name}</div>
                      <div className="text-[10px] text-muted">
                        {CATEGORY_LABELS[asset.category] || asset.category}
                        {asset.dimension_length && ` · ${asset.dimension_length}×${asset.dimension_width}×${asset.dimension_height}cm`}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bottom bar: refresh + upload */}
        <div className="p-3 border-t border-panel-border flex gap-2">
          <button
            onClick={fetchAssets}
            className="p-2 bg-gray-100 text-muted rounded hover:bg-gray-200 transition-colors"
            title="Refresh"
            aria-label="Refresh asset list"
          >
            <RefreshCw size={14} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white rounded-md text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label={t('assets.uploadAriaLabel')}
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="spinner" aria-hidden="true" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={16} aria-hidden="true" />
                {t('assets.upload')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Center - 3D Viewer */}
      <div className="flex-1 relative">
        {selectedAsset?.model_url ? (
          <ModelViewer
            modelUrl={selectedAsset.model_url}
            dimensions={viewerDimensions}
            showDimensions={!!hasAnyDimension}
          />
        ) : selectedAsset?.source_image_url ? (
          <div className="flex flex-col items-center justify-center h-full bg-canvas-bg">
            <img
              src={selectedAsset.source_image_url}
              alt={selectedAsset.name}
              className="max-w-[80%] max-h-[70%] object-contain rounded shadow-lg"
            />
            <div className="mt-3 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-1.5">
              <AlertCircle size={12} />
              {activeJob?.status === 'failed'
                ? t('assets.generationFailed')
                : activeJob && activeJob.status !== 'completed'
                  ? t('assets.generating')
                  : t('assets.noModel')}
            </div>
          </div>
        ) : (
          <ModelViewer />
        )}
        {/* Viewer controls overlay */}
        <div className="absolute top-3 right-3 flex gap-1">
          {selectedAsset?.model_url && (
            <a
              href={selectedAsset.model_url}
              download
              className="p-1.5 bg-white/90 rounded shadow-sm text-muted hover:text-foreground transition-colors"
              title={t('assets.exportGlb')}
              aria-label={t('assets.exportGlbAriaLabel')}
            >
              <Download size={14} aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

      {/* Right Panel - Properties */}
      <div className="w-80 border-l border-panel-border bg-panel-bg overflow-auto shrink-0">
        <div className="p-4 border-b border-panel-border flex items-center justify-between">
          <h3 className="text-sm font-medium">{t('assets.properties')}</h3>
          {selectedAsset && (
            <button
              onClick={handleDeleteAsset}
              className="p-1 text-muted hover:text-red-500 transition-colors"
              title="Delete asset"
              aria-label="Delete asset"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {selectedAsset ? (
          <div className="p-4 space-y-4">
            {/* Basic info */}
            <section>
              <h4 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">{t('assets.basicInfo')}</h4>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-muted mb-0.5">{t('assets.name')}</label>
                  <input
                    type="text"
                    value={selectedAsset.name}
                    onChange={(e) => {
                      const updated = { ...selectedAsset, name: e.target.value }
                      setSelectedAsset(updated)
                    }}
                    onBlur={() => handleSaveProperty('name', selectedAsset.name)}
                    className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-0.5">{t('assets.category')}</label>
                  <select
                    value={selectedAsset.category}
                    onChange={(e) => {
                      setSelectedAsset({ ...selectedAsset, category: e.target.value })
                      handleSaveProperty('category', e.target.value)
                    }}
                    className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="other">{t('assets.selectCategory')}</option>
                    <option value="agv_lmr">{t('assets.agvLmr')}</option>
                    <option value="agv_fmr">{t('assets.agvFmr')}</option>
                    <option value="shelf">{t('assets.shelf')}</option>
                    <option value="conveyor">{t('assets.conveyor')}</option>
                    <option value="workstation">{t('assets.workstation')}</option>
                    <option value="charger">Charger</option>
                    <option value="pallet">Pallet</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-muted mb-0.5">{t('assets.lengthCm')}</label>
                    <input
                      type="number"
                      value={selectedAsset.dimension_length ?? ''}
                      onChange={(e) => {
                        setSelectedAsset({ ...selectedAsset, dimension_length: parseFloat(e.target.value) || null })
                      }}
                      onBlur={() => handleSaveProperty('dimension_length', selectedAsset.dimension_length)}
                      className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-0.5">{t('assets.widthCm')}</label>
                    <input
                      type="number"
                      value={selectedAsset.dimension_width ?? ''}
                      onChange={(e) => {
                        setSelectedAsset({ ...selectedAsset, dimension_width: parseFloat(e.target.value) || null })
                      }}
                      onBlur={() => handleSaveProperty('dimension_width', selectedAsset.dimension_width)}
                      className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-0.5">{t('assets.heightCm')}</label>
                    <input
                      type="number"
                      value={selectedAsset.dimension_height ?? ''}
                      onChange={(e) => {
                        setSelectedAsset({ ...selectedAsset, dimension_height: parseFloat(e.target.value) || null })
                      }}
                      onBlur={() => handleSaveProperty('dimension_height', selectedAsset.dimension_height)}
                      className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Dimensions read-only display */}
            <section>
              <h4 className="text-xs font-medium text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Ruler size={12} aria-hidden="true" />
                {t('assets.dimensions')}
              </h4>
              {hasAnyDimension ? (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2.5">
                  <div className="text-sm font-semibold text-indigo-700 font-mono tracking-wide">
                    {selectedAsset.dimension_length?.toFixed(1) ?? '—'}
                    <span className="text-indigo-400 mx-1">×</span>
                    {selectedAsset.dimension_width?.toFixed(1) ?? '—'}
                    <span className="text-indigo-400 mx-1">×</span>
                    {selectedAsset.dimension_height?.toFixed(1) ?? '—'}
                    <span className="text-indigo-500 text-xs font-sans ml-1.5">cm</span>
                  </div>
                  <div className="text-[10px] text-indigo-500 mt-1">
                    {t('assets.dimensionsLwh')} (L × W × H)
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted italic">{t('assets.noDimensions')}</div>
              )}
            </section>

            {/* Material / Physical info read-only display */}
            {(() => {
              const pp = (selectedAsset.physical_params as Record<string, number>) || {}
              const hasMaterialInfo = pp.mass || pp.density || pp.friction
              return hasMaterialInfo ? (
                <section>
                  <h4 className="text-xs font-medium text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers size={12} aria-hidden="true" />
                    {t('assets.material')}
                  </h4>
                  <div className="space-y-1.5">
                    {pp.mass != null && (
                      <div className="flex items-center gap-2 text-xs">
                        <Weight size={12} className="text-gray-400" aria-hidden="true" />
                        <span className="text-muted">{t('assets.mass')}:</span>
                        <span className="font-medium">{pp.mass} kg</span>
                      </div>
                    )}
                    {pp.density != null && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-3 h-3 rounded-full bg-amber-100 border border-amber-300 inline-block shrink-0" aria-hidden="true" />
                        <span className="text-muted">{t('assets.density')}:</span>
                        <span className="font-medium">{pp.density} kg/m³</span>
                      </div>
                    )}
                    {pp.friction != null && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300 inline-block shrink-0" aria-hidden="true" />
                        <span className="text-muted">{t('assets.friction')}:</span>
                        <span className="font-medium">{pp.friction}</span>
                      </div>
                    )}
                  </div>
                </section>
              ) : null
            })()}

            {/* Use in Map button */}
            <section>
              <button
                onClick={handleUseInMap}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors shadow-sm"
                aria-label={t('assets.useInMapAriaLabel')}
              >
                <MapPin size={16} aria-hidden="true" />
                {t('assets.useInMap')}
              </button>
            </section>

            {/* Physical properties */}
            <section>
              <h4 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">{t('assets.physical')}</h4>
              <div className="space-y-2">
                {(() => {
                  const pp = selectedAsset.physical_params as Record<string, number> || {}
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-muted mb-0.5">{t('assets.density')}</label>
                          <input
                            type="number"
                            value={pp.density ?? ''}
                            onChange={(e) => {
                              const updated = { ...selectedAsset, physical_params: { ...pp, density: parseFloat(e.target.value) || undefined } }
                              setSelectedAsset(updated)
                            }}
                            onBlur={() => handleSaveProperty('physical_params', selectedAsset.physical_params)}
                            className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted mb-0.5">{t('assets.mass')}</label>
                          <input
                            type="number"
                            value={pp.mass ?? ''}
                            onChange={(e) => {
                              const updated = { ...selectedAsset, physical_params: { ...pp, mass: parseFloat(e.target.value) || undefined } }
                              setSelectedAsset(updated)
                            }}
                            onBlur={() => handleSaveProperty('physical_params', selectedAsset.physical_params)}
                            className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-muted mb-0.5">{t('assets.friction')}</label>
                          <input
                            type="number"
                            step="0.01"
                            value={pp.friction ?? ''}
                            onChange={(e) => {
                              const updated = { ...selectedAsset, physical_params: { ...pp, friction: parseFloat(e.target.value) || undefined } }
                              setSelectedAsset(updated)
                            }}
                            onBlur={() => handleSaveProperty('physical_params', selectedAsset.physical_params)}
                            className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted mb-0.5">{t('assets.youngsModulus')}</label>
                          <input
                            type="number"
                            value={pp.youngs_modulus ?? ''}
                            onChange={(e) => {
                              const updated = { ...selectedAsset, physical_params: { ...pp, youngs_modulus: parseFloat(e.target.value) || undefined } }
                              setSelectedAsset(updated)
                            }}
                            onBlur={() => handleSaveProperty('physical_params', selectedAsset.physical_params)}
                            className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>
            </section>

            {/* Export */}
            <section>
              <h4 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">{t('assets.export')}</h4>
              <div className="flex gap-2">
                {selectedAsset.model_url ? (
                  <a
                    href={selectedAsset.model_url}
                    download
                    className="flex-1 py-1.5 text-xs bg-gray-100 text-muted rounded hover:bg-gray-200 transition-colors text-center block"
                  >
                    GLB
                  </a>
                ) : (
                  <button className="flex-1 py-1.5 text-xs bg-gray-100 text-muted rounded opacity-50 cursor-not-allowed">
                    GLB
                  </button>
                )}
                {selectedAsset.urdf_url ? (
                  <a
                    href={selectedAsset.urdf_url}
                    download
                    className="flex-1 py-1.5 text-xs bg-gray-100 text-muted rounded hover:bg-gray-200 transition-colors text-center block"
                  >
                    URDF
                  </a>
                ) : (
                  <button className="flex-1 py-1.5 text-xs bg-gray-100 text-muted rounded opacity-50 cursor-not-allowed">
                    URDF
                  </button>
                )}
                <button className="flex-1 py-1.5 text-xs bg-gray-100 text-muted rounded opacity-50 cursor-not-allowed">
                  MJCF
                </button>
              </div>
            </section>

            {/* Metadata */}
            <section>
              <h4 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">Metadata</h4>
              <div className="text-xs text-muted space-y-1">
                <div>ID: <span className="font-mono">{selectedAsset.id.slice(0, 8)}...</span></div>
                <div>Created: {new Date(selectedAsset.created_at).toLocaleDateString()}</div>
                <div>Updated: {new Date(selectedAsset.updated_at).toLocaleDateString()}</div>
                <div>Format: {selectedAsset.format || 'N/A'}</div>
              </div>
            </section>

            {saving && (
              <div className="text-xs text-muted flex items-center gap-1">
                <Loader2 size={12} className="spinner" /> Saving...
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-muted text-sm">
            <Box size={32} className="mx-auto mb-2 opacity-30" />
            <p>Select an asset to view properties</p>
          </div>
        )}
      </div>
    </div>
  )
}
