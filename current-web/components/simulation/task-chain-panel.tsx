'use client'

import { useState } from 'react'
import { Link2, Plus, Trash2, GripVertical, ChevronDown, ChevronRight, ArrowRight, Clock } from 'lucide-react'
import type { TaskChain, TaskChainStep } from '@/lib/simulation/throughput-calculator'
import { useTranslation } from '@/lib/i18n'

/** A logistics node discovered from the map */
export interface LogisticsNodeOption {
  id: string
  label: string
  type: 'loading_port' | 'unloading_port' | 'workstation'
}

interface TaskChainPanelProps {
  chains: TaskChain[]
  nodeOptions: LogisticsNodeOption[]
  onUpdateChains: (chains: TaskChain[]) => void
}

const NODE_TYPE_COLORS: Record<string, string> = {
  loading_port: 'bg-green-100 text-green-700 border-green-200',
  unloading_port: 'bg-blue-100 text-blue-700 border-blue-200',
  workstation: 'bg-purple-100 text-purple-700 border-purple-200',
}

const NODE_TYPE_ICONS: Record<string, string> = {
  loading_port: '↓',
  unloading_port: '↑',
  workstation: '⚙',
}

export function TaskChainPanel({ chains, nodeOptions, onUpdateChains }: TaskChainPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(chains[0]?.id ?? null)
  const { t } = useTranslation()

  const handleAddChain = () => {
    const id = `chain_${Date.now()}`
    const newChain: TaskChain = {
      id,
      name: `${t('sim.taskChain')} ${chains.length + 1}`,
      steps: [],
    }
    onUpdateChains([...chains, newChain])
    setExpandedId(id)
  }

  const handleRemoveChain = (chainId: string) => {
    onUpdateChains(chains.filter(c => c.id !== chainId))
    if (expandedId === chainId) setExpandedId(null)
  }

  const handleUpdateChain = (chainId: string, updates: Partial<TaskChain>) => {
    onUpdateChains(chains.map(c => c.id === chainId ? { ...c, ...updates } : c))
  }

  const handleAddStep = (chainId: string) => {
    const chain = chains.find(c => c.id === chainId)
    if (!chain) return
    const newStep: TaskChainStep = {
      nodeId: nodeOptions[0]?.id ?? '',
      nodeType: nodeOptions[0]?.type ?? 'workstation',
      processingTimeSeconds: 30,
    }
    handleUpdateChain(chainId, { steps: [...chain.steps, newStep] })
  }

  const handleRemoveStep = (chainId: string, stepIndex: number) => {
    const chain = chains.find(c => c.id === chainId)
    if (!chain) return
    const newSteps = chain.steps.filter((_, i) => i !== stepIndex)
    handleUpdateChain(chainId, { steps: newSteps })
  }

  const handleUpdateStep = (chainId: string, stepIndex: number, updates: Partial<TaskChainStep>) => {
    const chain = chains.find(c => c.id === chainId)
    if (!chain) return
    const newSteps = chain.steps.map((s, i) => i === stepIndex ? { ...s, ...updates } : s)
    handleUpdateChain(chainId, { steps: newSteps })
  }

  const handleMoveStep = (chainId: string, fromIndex: number, toIndex: number) => {
    const chain = chains.find(c => c.id === chainId)
    if (!chain) return
    const newSteps = [...chain.steps]
    const [moved] = newSteps.splice(fromIndex, 1)
    newSteps.splice(toIndex, 0, moved)
    handleUpdateChain(chainId, { steps: newSteps })
  }

  const getNodeLabel = (nodeId: string) => {
    return nodeOptions.find(n => n.id === nodeId)?.label ?? nodeId
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted flex items-center gap-1.5">
          <Link2 size={12} />
          {t('sim.taskChains')}
        </h4>
        <button
          onClick={handleAddChain}
          className="flex items-center gap-1 px-2 py-1 text-[10px] bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors"
        >
          <Plus size={10} />
          {t('sim.addChain')}
        </button>
      </div>

      {chains.length === 0 && (
        <div className="text-[10px] text-muted-foreground text-center py-3 bg-gray-50 rounded-md border border-dashed border-gray-200">
          {t('sim.noChains')}
        </div>
      )}

      {/* Chain list */}
      <div className="space-y-1.5">
        {chains.map((chain) => {
          const isExpanded = expandedId === chain.id

          return (
            <div key={chain.id} className="rounded-md border border-gray-200 bg-white overflow-hidden">
              {/* Chain header */}
              <div className="flex items-center gap-1.5 p-2">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : chain.id)}
                  className="text-muted hover:text-foreground transition-colors"
                >
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>

                <input
                  type="text"
                  value={chain.name}
                  onChange={(e) => handleUpdateChain(chain.id, { name: e.target.value })}
                  className="flex-1 text-xs font-medium bg-transparent border-none outline-none min-w-0"
                />

                <span className="text-[9px] text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">
                  {chain.steps.length} {t('sim.chainSteps')}
                </span>

                <button
                  onClick={() => handleRemoveChain(chain.id)}
                  className="p-0.5 text-muted hover:text-red-500 transition-colors shrink-0"
                  aria-label={t('sim.removeChain')}
                >
                  <Trash2 size={11} />
                </button>
              </div>

              {/* Flow preview (collapsed) */}
              {!isExpanded && chain.steps.length > 0 && (
                <div className="px-2 pb-2 flex items-center gap-1 flex-wrap">
                  {chain.steps.map((step, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <ArrowRight size={8} className="text-gray-300" />}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border ${NODE_TYPE_COLORS[step.nodeType] ?? 'bg-gray-100 text-gray-600'}`}>
                        {NODE_TYPE_ICONS[step.nodeType]} {getNodeLabel(step.nodeId)}
                      </span>
                    </span>
                  ))}
                </div>
              )}

              {/* Expanded: step editor */}
              {isExpanded && (
                <div className="border-t border-gray-100 p-2 space-y-2">
                  {/* Steps */}
                  {chain.steps.map((step, stepIndex) => (
                    <div key={stepIndex} className="flex items-start gap-1.5 p-2 bg-gray-50 rounded-md">
                      {/* Drag handle + move buttons */}
                      <div className="flex flex-col gap-0.5 pt-0.5">
                        <button
                          onClick={() => stepIndex > 0 && handleMoveStep(chain.id, stepIndex, stepIndex - 1)}
                          disabled={stepIndex === 0}
                          className="text-[8px] text-muted hover:text-foreground disabled:opacity-20"
                        >
                          ▲
                        </button>
                        <GripVertical size={10} className="text-gray-300 mx-auto" />
                        <button
                          onClick={() => stepIndex < chain.steps.length - 1 && handleMoveStep(chain.id, stepIndex, stepIndex + 1)}
                          disabled={stepIndex === chain.steps.length - 1}
                          className="text-[8px] text-muted hover:text-foreground disabled:opacity-20"
                        >
                          ▼
                        </button>
                      </div>

                      {/* Step config */}
                      <div className="flex-1 space-y-1.5">
                        {/* Node selector */}
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border shrink-0 ${NODE_TYPE_COLORS[step.nodeType] ?? 'bg-gray-100 text-gray-600'}`}>
                            {NODE_TYPE_ICONS[step.nodeType]}
                          </span>
                          <select
                            value={step.nodeId}
                            onChange={(e) => {
                              const selected = nodeOptions.find(n => n.id === e.target.value)
                              handleUpdateStep(chain.id, stepIndex, {
                                nodeId: e.target.value,
                                nodeType: selected?.type ?? step.nodeType,
                              })
                            }}
                            className="flex-1 text-[10px] px-1.5 py-1 border border-gray-200 rounded bg-white min-w-0"
                          >
                            {nodeOptions.length === 0 && (
                              <option value="">--</option>
                            )}
                            {nodeOptions.map(opt => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label} ({opt.type.replace('_', ' ')})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Processing time */}
                        <div className="flex items-center gap-1.5">
                          <Clock size={9} className="text-gray-400 shrink-0" />
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={step.processingTimeSeconds}
                            onChange={(e) => handleUpdateStep(chain.id, stepIndex, {
                              processingTimeSeconds: Math.max(0, Number(e.target.value)),
                            })}
                            className="w-16 text-[10px] px-1.5 py-0.5 border border-gray-200 rounded bg-white"
                          />
                          <span className="text-[9px] text-muted-foreground">{t('sim.processingTime')}</span>
                        </div>
                      </div>

                      {/* Remove step */}
                      <button
                        onClick={() => handleRemoveStep(chain.id, stepIndex)}
                        className="p-0.5 text-muted hover:text-red-500 transition-colors mt-0.5"
                        aria-label={t('sim.removeChain')}
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}

                  {/* Add step button */}
                  <button
                    onClick={() => handleAddStep(chain.id)}
                    disabled={nodeOptions.length === 0}
                    className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] text-muted bg-gray-50 border border-dashed border-gray-200 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    <Plus size={10} />
                    {t('sim.chainStep')}
                  </button>

                  {nodeOptions.length === 0 && (
                    <p className="text-[9px] text-amber-600 text-center">
                      {t('sim.noLogisticsNodes')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
