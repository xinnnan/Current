'use client'

import { useState } from 'react'
import { ListTodo, Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react'
import type { TaskTemplate } from '@/lib/simulation/rcs-scheduler'
import { DEFAULT_TASK_TEMPLATES } from '@/lib/simulation/rcs-scheduler'
import { useTranslation } from '@/lib/i18n'

interface TaskTemplatePanelProps {
  templates: TaskTemplate[]
  enabledTemplates: Set<string>
  onToggleTemplate: (templateId: string) => void
  onUpdateTemplate: (template: TaskTemplate) => void
  onAddTemplate: (template: TaskTemplate) => void
  onRemoveTemplate: (templateId: string) => void
}

export function TaskTemplatePanel({
  templates,
  enabledTemplates,
  onToggleTemplate,
  onUpdateTemplate,
  onAddTemplate,
  onRemoveTemplate,
}: TaskTemplatePanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { t } = useTranslation()

  const TYPE_LABELS: Record<string, string> = {
    transport: t('task.transport'),
    charge: t('task.charge'),
    park: t('task.park'),
    patrol: t('task.patrol'),
  }

  const TYPE_COLORS: Record<string, string> = {
    transport: 'bg-blue-100 text-blue-700',
    charge: 'bg-green-100 text-green-700',
    park: 'bg-gray-100 text-gray-700',
    patrol: 'bg-purple-100 text-purple-700',
  }

  const handleAddCustom = () => {
    const id = `tpl_custom_${Date.now()}`
    const newTemplate: TaskTemplate = {
      id,
      name: t('task.customTask'),
      type: 'transport',
      description: '',
      priority: 5,
      dependencies: [],
      config: {
        frequency: 10,
        dwellTimePickup: 15,
        dwellTimeDelivery: 15,
      },
    }
    onAddTemplate(newTemplate)
    setExpandedId(id)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted flex items-center gap-1.5">
          <ListTodo size={12} />
          {t('task.title')}
        </h4>
        <button
          onClick={handleAddCustom}
          className="flex items-center gap-1 px-2 py-1 text-[10px] bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors"
        >
          <Plus size={10} />
          {t('task.addTemplate')}
        </button>
      </div>

      {/* Template list */}
      <div className="space-y-1">
        {templates.map((template) => {
          const isEnabled = enabledTemplates.has(template.id)
          const isExpanded = expandedId === template.id

          return (
            <div key={template.id} className={`rounded-md border transition-colors ${
              isEnabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
            }`}>
              {/* Template header */}
              <div className="flex items-center gap-1.5 p-2">
                <button
                  onClick={() => onToggleTemplate(template.id)}
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    isEnabled ? 'bg-accent border-accent text-white' : 'border-gray-300 bg-white'
                  }`}
                >
                  {isEnabled && <span className="text-[8px]">✓</span>}
                </button>

                <button
                  onClick={() => setExpandedId(isExpanded ? null : template.id)}
                  className="flex items-center gap-1 flex-1 min-w-0"
                >
                  {isExpanded ? <ChevronDown size={10} className="text-muted shrink-0" /> : <ChevronRight size={10} className="text-muted shrink-0" />}
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${TYPE_COLORS[template.type] || 'bg-gray-100 text-gray-700'}`}>
                    {TYPE_LABELS[template.type] || template.type}
                  </span>
                  <span className="text-xs truncate">{template.name}</span>
                </button>

                <span className="text-[10px] text-muted shrink-0">
                  P{template.priority}
                </span>

                {template.id.startsWith('tpl_custom_') && (
                  <button
                    onClick={() => onRemoveTemplate(template.id)}
                    className="p-0.5 text-muted hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-2 pb-2 space-y-2 border-t border-gray-100 pt-2">
                  <div>
                    <label className="text-[10px] text-muted block mb-0.5">{t('task.name')}</label>
                    <input
                      type="text"
                      value={template.name}
                      onChange={(e) => onUpdateTemplate({ ...template, name: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted block mb-0.5">{t('task.description')}</label>
                    <input
                      type="text"
                      value={template.description}
                      onChange={(e) => onUpdateTemplate({ ...template, description: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted block mb-0.5">{t('task.priority')}</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={template.priority}
                        onChange={(e) => onUpdateTemplate({ ...template, priority: Number(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted block mb-0.5">{t('task.type')}</label>
                      <select
                        value={template.type}
                        onChange={(e) => onUpdateTemplate({ ...template, type: e.target.value as TaskTemplate['type'] })}
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white"
                      >
                        <option value="transport">{t('task.transport')}</option>
                        <option value="charge">{t('task.charge')}</option>
                        <option value="park">{t('task.park')}</option>
                        <option value="patrol">{t('task.patrol')}</option>
                      </select>
                    </div>
                  </div>

                  {template.type === 'transport' && (
                    <div>
                      <label className="text-[10px] text-muted block mb-0.5">
                        {t('task.frequency')}: {template.config.frequency ?? '--'}
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={100}
                        step={1}
                        value={template.config.frequency ?? 10}
                        onChange={(e) => onUpdateTemplate({
                          ...template,
                          config: { ...template.config, frequency: Number(e.target.value) },
                        })}
                        className="w-full accent-accent"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted block mb-0.5">{t('task.pickupWait')}</label>
                      <input
                        type="number"
                        value={template.config.dwellTimePickup ?? 15}
                        onChange={(e) => onUpdateTemplate({
                          ...template,
                          config: { ...template.config, dwellTimePickup: Number(e.target.value) },
                        })}
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted block mb-0.5">{t('task.deliveryWait')}</label>
                      <input
                        type="number"
                        value={template.config.dwellTimeDelivery ?? 15}
                        onChange={(e) => onUpdateTemplate({
                          ...template,
                          config: { ...template.config, dwellTimeDelivery: Number(e.target.value) },
                        })}
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white"
                      />
                    </div>
                  </div>

                  {/* Dependencies */}
                  <div>
                    <label className="text-[10px] text-muted block mb-0.5">
                      {t('task.dependencies')} {template.dependencies.length > 0 && `(${template.dependencies.length})`}
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {DEFAULT_TASK_TEMPLATES
                        .filter((t) => t.id !== template.id)
                        .map((t) => {
                          const isDep = template.dependencies.includes(t.id)
                          return (
                            <button
                              key={t.id}
                              onClick={() => {
                                const deps = isDep
                                  ? template.dependencies.filter((d) => d !== t.id)
                                  : [...template.dependencies, t.id]
                                onUpdateTemplate({ ...template, dependencies: deps })
                              }}
                              className={`px-1.5 py-0.5 text-[9px] rounded transition-colors ${
                                isDep ? 'bg-accent/10 text-accent' : 'bg-gray-100 text-muted hover:bg-gray-200'
                              }`}
                            >
                              {t.name}
                            </button>
                          )
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Info */}
      <div className="p-2 bg-blue-50 rounded text-[10px] text-blue-700">
        <p>{t('task.info')}</p>
      </div>
    </div>
  )
}
