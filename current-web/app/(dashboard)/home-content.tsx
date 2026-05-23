'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Box, Map, Play, ArrowRight, FolderOpen, Layers, Truck, BarChart3, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'
import { useProjectStore } from '@/lib/project-store'

interface Project {
  id: string
  name: string
  description: string | null
  updated_at: string
}

export function HomeContent() {
  const { t } = useTranslation()
  const { setCurrentProject } = useProjectStore()
  const [projects, setProjects] = useState<Project[]>([])
  const [showNewProject, setShowNewProject] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectDesc, setProjectDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects || [])
      }
    } catch {
      // Silently fail — projects will show as empty
    }
  }

  const handleCreateProject = useCallback(async () => {
    if (!projectName.trim()) {
      setError(t('project.nameRequired'))
      return
    }
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName.trim(), description: projectDesc.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setProjects((prev) => [data.project, ...prev])
        setProjectName('')
        setProjectDesc('')
        setShowNewProject(false)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create project')
      }
    } catch {
      setError('Network error')
    } finally {
      setCreating(false)
    }
  }, [projectName, projectDesc, t])

  const quickAccessItems = [
    {
      href: '/assets',
      icon: Box,
      label: t('home.assetLibLabel'),
      desc: t('home.assetLibDesc'),
      gradient: 'from-blue-500 to-blue-600',
      stat: t('home.assetLibStat'),
    },
    {
      href: '/map',
      icon: Map,
      label: t('home.mapLabel'),
      desc: t('home.mapDesc'),
      gradient: 'from-emerald-500 to-emerald-600',
      stat: t('home.mapStat'),
    },
    {
      href: '/simulation',
      icon: Play,
      label: t('home.simLabel'),
      desc: t('home.simDesc'),
      gradient: 'from-violet-500 to-violet-600',
      stat: t('home.simStat'),
    },
  ]

  const statsItems = [
    { icon: Box, label: t('home.statAssets'), value: '—', color: 'text-blue-500' },
    { icon: Layers, label: t('home.statLayers'), value: '—', color: 'text-emerald-500' },
    { icon: Truck, label: t('home.statSimulation'), value: '—', color: 'text-violet-500' },
    { icon: BarChart3, label: t('home.statReports'), value: String(projects.length), color: 'text-amber-500' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('home.title')}</h1>
          <p className="text-muted text-sm mt-1">
            {t('home.subtitle')}
          </p>
        </div>
        <button
          onClick={() => { setShowNewProject(true); setError('') }}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-[var(--radius-md)] text-sm font-medium hover:bg-accent-hover transition-colors duration-[var(--transition-fast)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]"
        >
          <Plus size={16} />
          {t('home.newProject')}
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
              {t('home.enterModule')} <ArrowRight size={12} />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">{t('home.recentProjects')}</h2>
          <button className="text-xs text-muted hover:text-accent transition-colors duration-[var(--transition-fast)]">
            {t('home.viewAll')}
          </button>
        </div>
        <div className="bg-panel-bg border border-panel-border rounded-[var(--radius-lg)]">
          {projects.length > 0 ? (
            <div className="divide-y divide-panel-border">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/map?project=${project.id}`}
                  onClick={() => setCurrentProject(project.id, project.name)}
                  className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors duration-[var(--transition-fast)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-[var(--radius-md)] bg-gray-100 text-muted">
                      <FolderOpen size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{project.name}</div>
                      {project.description && (
                        <div className="text-xs text-muted mt-0.5">{project.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span>{new Date(project.updated_at).toLocaleDateString()}</span>
                    <ArrowRight size={14} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            /* Empty state */
            <div className="p-12 text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-gray-50 rounded-[var(--radius-xl)] flex items-center justify-center">
                <FolderOpen size={24} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted font-medium mb-1">{t('home.noProjects')}</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                {t('home.noProjectsDesc')}
              </p>
              <div className="flex items-center justify-center gap-3 mt-4">
                <Link
                  href="/assets"
                  className="px-3 py-1.5 text-xs text-accent bg-accent-light rounded-[var(--radius-md)] hover:bg-accent hover:text-white transition-colors duration-[var(--transition-fast)]"
                >
                  {t('home.createAsset')}
                </Link>
                <Link
                  href="/map"
                  className="px-3 py-1.5 text-xs text-accent bg-accent-light rounded-[var(--radius-md)] hover:bg-accent hover:text-white transition-colors duration-[var(--transition-fast)]"
                >
                  {t('home.editMap')}
                </Link>
                <Link
                  href="/simulation"
                  className="px-3 py-1.5 text-xs text-accent bg-accent-light rounded-[var(--radius-md)] hover:bg-accent hover:text-white transition-colors duration-[var(--transition-fast)]"
                >
                  {t('home.runSimulation')}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── New Project Modal ── */}
      {showNewProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">{t('project.newTitle')}</h2>
              <button
                onClick={() => { setShowNewProject(false); setError(''); setProjectName(''); setProjectDesc('') }}
                className="p-1 rounded-[var(--radius-md)] hover:bg-gray-100 transition-colors"
                aria-label={t('project.cancel')}
              >
                <X size={18} className="text-muted" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('project.name')} *</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => { setProjectName(e.target.value); setError('') }}
                  placeholder={t('project.namePlaceholder')}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateProject() }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('project.description')}</label>
                <textarea
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder={t('project.descPlaceholder')}
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none"
                />
              </div>

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => { setShowNewProject(false); setError(''); setProjectName(''); setProjectDesc('') }}
                  className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
                >
                  {t('project.cancel')}
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={creating || !projectName.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      {t('project.creating')}
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      {t('project.create')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
