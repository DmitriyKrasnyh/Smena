'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Plus, Trash2, ChevronUp, ChevronDown,
  Play, Pencil, Loader2, Link2, X, Check, ArrowDown,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Worker { id: string; full_name: string; role: string }
interface ChainStep {
  id?: string; step_order: number; title: string; description: string
  priority: 'low' | 'medium' | 'high'; category: string; assigned_to: string
}
interface Chain { id: string; name: string; description: string; step_count: number }
interface Props { chains: Chain[]; workers: Worker[]; restaurantId: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY = {
  low:    { label: 'Низкий',  cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  medium: { label: 'Средний', cls: 'bg-amber-50 text-amber-700 border-amber-200'  },
  high:   { label: 'Высокий', cls: 'bg-red-50 text-red-600 border-red-200'        },
}

const CATEGORIES = [
  { value: 'kitchen',  label: 'Кухня',        icon: '🍳' },
  { value: 'hall',     label: 'Зал',           icon: '🪑' },
  { value: 'bar',      label: 'Бар',           icon: '🍹' },
  { value: 'admin',    label: 'Администрация', icon: '📋' },
  { value: 'cleaning', label: 'Уборка',        icon: '🧹' },
  { value: 'other',    label: 'Другое',        icon: '📌' },
]

function emptyStep(order: number): ChainStep {
  return { step_order: order, title: '', description: '', priority: 'medium', category: 'other', assigned_to: '' }
}

// ─── Launch Modal ─────────────────────────────────────────────────────────────

function LaunchModal({ chain, onClose, onLaunched }: { chain: Chain; onClose: () => void; onLaunched: () => void }) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleLaunch() {
    setLoading(true)
    const { error } = await supabase.rpc('launch_task_chain', { p_chain_id: chain.id })
    if (error) toast.error('Ошибка запуска цепочки')
    else { toast.success('Цепочка запущена! Первая задача активна.'); onLaunched() }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-[#e4ddd2] shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-[12px] bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <Play className="h-6 w-6 text-emerald-600" />
        </div>
        <h3 className="font-bold text-[#1a1a1a] text-center text-lg mb-1">Запустить цепочку?</h3>
        <p className="text-sm text-[#9a9490] text-center mb-1">«{chain.name}»</p>
        <p className="text-sm text-center text-[#6b6460] mb-6">
          Будет создано <span className="font-semibold text-[#1a1a1a]">{chain.step_count} задач</span>.
          Каждая следующая активируется после выполнения предыдущей.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-[10px] border border-[#e4ddd2] text-sm font-medium text-[#6b6460] hover:bg-[#f5f3f0] transition-colors">
            Отмена
          </button>
          <button onClick={handleLaunch} disabled={loading}
            className="flex-1 h-10 rounded-[10px] bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Запустить
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Step Card ────────────────────────────────────────────────────────────────

function StepCard({ step, index, total, workers, onChange, onDelete, onMove }: {
  step: ChainStep; index: number; total: number; workers: Worker[]
  onChange: (s: ChainStep) => void; onDelete: () => void; onMove: (dir: -1 | 1) => void
}) {
  const fieldCls = 'w-full rounded-[8px] border border-[#e4ddd2] bg-[#faf9f7] px-3 py-2 text-sm text-[#1a1a1a] focus:outline-none focus:border-[#1a1a1a] transition-all'
  const cat = CATEGORIES.find(c => c.value === step.category)

  return (
    <div className="relative">
      {/* Step number + connector */}
      <div className="flex items-start gap-4">
        {/* Left timeline */}
        <div className="flex flex-col items-center shrink-0 pt-1">
          <div className="w-8 h-8 rounded-full bg-[#1a1a1a] text-white text-sm font-bold flex items-center justify-center ring-4 ring-white z-10">
            {index + 1}
          </div>
          {index < total - 1 && (
            <div className="flex flex-col items-center mt-1">
              <div className="w-px flex-1 bg-[#e4ddd2] min-h-[20px]" />
              <ArrowDown className="h-3 w-3 text-[#c0b9b0] my-0.5" />
              <div className="w-px flex-1 bg-[#e4ddd2] min-h-[20px]" />
            </div>
          )}
        </div>

        {/* Card */}
        <div className="flex-1 mb-3">
          <div className="bg-white rounded-2xl border border-[#e4ddd2] shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#faf9f7] border-b border-[#f0ece4]">
              <input
                value={step.title}
                onChange={e => onChange({ ...step, title: e.target.value })}
                placeholder={`Название шага ${index + 1}`}
                className="flex-1 bg-transparent text-sm font-semibold text-[#1a1a1a] placeholder:text-[#b0a99f] focus:outline-none"
              />
              {/* Priority badge */}
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${PRIORITY[step.priority].cls}`}>
                {PRIORITY[step.priority].label}
              </span>
              <div className="flex items-center gap-0.5 ml-1">
                <button onClick={() => onMove(-1)} disabled={index === 0}
                  className="p-1 rounded hover:bg-[#f0ece4] disabled:opacity-30 transition-colors">
                  <ChevronUp className="h-3.5 w-3.5 text-[#6b6460]" />
                </button>
                <button onClick={() => onMove(1)} disabled={index === total - 1}
                  className="p-1 rounded hover:bg-[#f0ece4] disabled:opacity-30 transition-colors">
                  <ChevronDown className="h-3.5 w-3.5 text-[#6b6460]" />
                </button>
                <button onClick={onDelete}
                  className="p-1 rounded hover:bg-red-50 hover:text-red-500 text-[#9a9490] transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Fields */}
            <div className="p-4 space-y-3">
              <textarea
                value={step.description}
                onChange={e => onChange({ ...step, description: e.target.value })}
                placeholder="Описание задачи (необязательно)"
                rows={2}
                className={fieldCls + ' resize-none'}
              />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-[#9a9490] font-semibold uppercase tracking-wide mb-1 block">Приоритет</label>
                  <select value={step.priority} onChange={e => onChange({ ...step, priority: e.target.value as ChainStep['priority'] })} className={fieldCls}>
                    {Object.entries(PRIORITY).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#9a9490] font-semibold uppercase tracking-wide mb-1 block">Категория</label>
                  <select value={step.category} onChange={e => onChange({ ...step, category: e.target.value })} className={fieldCls}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#9a9490] font-semibold uppercase tracking-wide mb-1 block">Исполнитель</label>
                  <select value={step.assigned_to} onChange={e => onChange({ ...step, assigned_to: e.target.value })} className={fieldCls}>
                    <option value="">Не назначен</option>
                    {workers.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ChainsClient({ chains: initialChains, workers, restaurantId }: Props) {
  const supabase = createClient()
  const [chains, setChains] = useState<Chain[]>(initialChains)
  const [view, setView] = useState<'list' | 'editor'>('list')
  const [editingChain, setEditingChain] = useState<Chain | null>(null)
  const [chainName, setChainName] = useState('')
  const [chainDesc, setChainDesc] = useState('')
  const [steps, setSteps] = useState<ChainStep[]>([emptyStep(1)])
  const [saving, setSaving] = useState(false)
  const [launching, setLaunching] = useState<Chain | null>(null)
  const [loadingEdit, setLoadingEdit] = useState<string | null>(null)

  function openNew() {
    setEditingChain(null); setChainName(''); setChainDesc('')
    setSteps([emptyStep(1), emptyStep(2)]); setView('editor')
  }

  async function openEdit(chain: Chain) {
    setLoadingEdit(chain.id)
    const { data } = await supabase.from('task_chain_steps').select('*').eq('chain_id', chain.id).order('step_order')
    setEditingChain(chain); setChainName(chain.name); setChainDesc(chain.description || '')
    setSteps((data || []).map((s: any) => ({
      id: s.id, step_order: s.step_order, title: s.title,
      description: s.description || '', priority: s.priority,
      category: s.category || 'other', assigned_to: s.assigned_to || '',
    })))
    setLoadingEdit(null); setView('editor')
  }

  function addStep() { setSteps(prev => [...prev, emptyStep(prev.length + 1)]) }
  function updateStep(idx: number, s: ChainStep) { setSteps(prev => prev.map((st, i) => i === idx ? s : st)) }
  function deleteStep(idx: number) { setSteps(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_order: i + 1 }))) }
  function moveStep(idx: number, dir: -1 | 1) {
    const next = idx + dir
    if (next < 0 || next >= steps.length) return
    const arr = [...steps];
    [arr[idx], arr[next]] = [arr[next], arr[idx]]
    setSteps(arr.map((s, i) => ({ ...s, step_order: i + 1 })))
  }

  async function handleSave() {
    if (!chainName.trim()) { toast.error('Введите название'); return }
    if (steps.length === 0) { toast.error('Добавьте хотя бы один шаг'); return }
    if (steps.some(s => !s.title.trim())) { toast.error('Заполните названия всех шагов'); return }
    setSaving(true)
    let chainId = editingChain?.id
    if (chainId) {
      await supabase.from('task_chains').update({ name: chainName.trim(), description: chainDesc.trim() }).eq('id', chainId)
      await supabase.from('task_chain_steps').delete().eq('chain_id', chainId)
    } else {
      const { data, error } = await supabase.from('task_chains')
        .insert({ name: chainName.trim(), description: chainDesc.trim(), restaurant_id: restaurantId })
        .select('id').single()
      if (error || !data) { toast.error('Ошибка сохранения'); setSaving(false); return }
      chainId = data.id
    }
    const { error } = await supabase.from('task_chain_steps').insert(
      steps.map((s, i) => ({
        chain_id: chainId, step_order: i + 1, title: s.title.trim(),
        description: s.description.trim() || null, priority: s.priority,
        category: s.category, assigned_to: s.assigned_to || null,
      }))
    )
    if (error) { toast.error('Ошибка сохранения шагов'); setSaving(false); return }
    toast.success(editingChain ? 'Цепочка обновлена' : 'Цепочка создана')
    const { data: fresh } = await supabase.from('task_chains')
      .select('*, steps:task_chain_steps(id)').eq('restaurant_id', restaurantId).order('created_at', { ascending: false })
    setChains((fresh || []).map((c: any) => ({ ...c, step_count: c.steps?.length ?? 0 })))
    setView('list'); setSaving(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('task_chains').delete().eq('id', id)
    if (error) { toast.error('Ошибка удаления'); return }
    setChains(prev => prev.filter(c => c.id !== id)); toast.success('Цепочка удалена')
  }

  // ── List view ──────────────────────────────────────────────────────────────

  if (view === 'list') {
    return (
      <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Цепочки задач</h1>
          <button onClick={openNew}
            className="flex items-center gap-2 h-10 px-4 rounded-[10px] bg-[#1a1a1a] text-white text-sm font-semibold hover:bg-[#2d2d2d] transition-colors">
            <Plus className="h-4 w-4" /> Создать
          </button>
        </div>
        <p className="text-sm text-[#9a9490] mb-7">Задачи, где каждая следующая запускается после выполнения предыдущей</p>

        {chains.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#f5f3f0] flex items-center justify-center mb-5">
              <Link2 className="h-8 w-8 text-[#c0b9b0]" />
            </div>
            <p className="font-bold text-[#1a1a1a] text-lg mb-1">Нет цепочек</p>
            <p className="text-sm text-[#9a9490] mb-6 max-w-xs">
              Создайте первую многоступенчатую задачу — например, «Открытие смены»
            </p>
            <button onClick={openNew}
              className="flex items-center gap-2 h-10 px-5 rounded-[10px] bg-[#1a1a1a] text-white text-sm font-semibold hover:bg-[#2d2d2d] transition-colors">
              <Plus className="h-4 w-4" /> Создать цепочку
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {chains.map(chain => (
              <div key={chain.id} className="bg-white rounded-2xl border border-[#e4ddd2] shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-[10px] bg-[#f5f3f0] flex items-center justify-center shrink-0">
                    <Link2 className="h-5 w-5 text-[#6b6460]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#1a1a1a] truncate">{chain.name}</h3>
                    {chain.description && <p className="text-xs text-[#9a9490] mt-0.5 line-clamp-1">{chain.description}</p>}
                  </div>
                </div>

                {/* Visual steps preview */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  {Array.from({ length: Math.min(chain.step_count, 7) }).map((_, i) => (
                    <div key={i} className="flex items-center gap-1.5 shrink-0">
                      <div className="w-6 h-6 rounded-full bg-[#1a1a1a] text-white text-[10px] font-bold flex items-center justify-center">
                        {i + 1}
                      </div>
                      {i < Math.min(chain.step_count, 7) - 1 && <div className="w-5 h-px bg-[#e4ddd2]" />}
                    </div>
                  ))}
                  {chain.step_count > 7 && <span className="text-xs text-[#9a9490] ml-1">+{chain.step_count - 7}</span>}
                  <span className="text-xs text-[#9a9490] ml-auto shrink-0">{chain.step_count} шагов</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => setLaunching(chain)} disabled={chain.step_count === 0}
                    className="flex-1 flex items-center justify-center gap-2 h-9 rounded-[8px] bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-colors">
                    <Play className="h-3.5 w-3.5" /> Запустить
                  </button>
                  <button onClick={() => openEdit(chain)} disabled={loadingEdit === chain.id}
                    className="h-9 w-9 flex items-center justify-center rounded-[8px] border border-[#e4ddd2] hover:bg-[#f5f3f0] text-[#6b6460] transition-colors">
                    {loadingEdit === chain.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                  </button>
                  <button onClick={() => handleDelete(chain.id)}
                    className="h-9 w-9 flex items-center justify-center rounded-[8px] border border-[#e4ddd2] hover:bg-red-50 hover:border-red-200 hover:text-red-500 text-[#9a9490] transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {launching && (
          <LaunchModal chain={launching} onClose={() => setLaunching(null)} onLaunched={() => setLaunching(null)} />
        )}
      </div>
    )
  }

  // ── Editor view ────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 p-6 max-w-xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setView('list')}
          className="h-9 w-9 flex items-center justify-center rounded-[10px] border border-[#e4ddd2] hover:bg-[#f5f3f0] text-[#6b6460] transition-colors">
          <X className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#1a1a1a]">{editingChain ? 'Редактировать' : 'Новая цепочка'}</h1>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 h-9 px-4 rounded-[10px] bg-[#1a1a1a] text-white text-sm font-semibold hover:bg-[#2d2d2d] disabled:opacity-50 transition-colors">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Сохранить
        </button>
      </div>

      {/* Meta */}
      <div className="bg-white rounded-2xl border border-[#e4ddd2] shadow-sm p-4 mb-6 space-y-3">
        <input
          value={chainName} onChange={e => setChainName(e.target.value)}
          placeholder="Название цепочки — например, Открытие смены"
          className="w-full h-10 px-3 rounded-[8px] border border-[#e4ddd2] bg-[#faf9f7] text-sm font-semibold text-[#1a1a1a] placeholder:text-[#b0a99f] focus:outline-none focus:border-[#1a1a1a] transition-all"
        />
        <input
          value={chainDesc} onChange={e => setChainDesc(e.target.value)}
          placeholder="Описание (необязательно)"
          className="w-full h-9 px-3 rounded-[8px] border border-[#e4ddd2] bg-[#faf9f7] text-sm text-[#1a1a1a] placeholder:text-[#b0a99f] focus:outline-none focus:border-[#1a1a1a] transition-all"
        />
      </div>

      {/* Steps */}
      <p className="text-xs font-semibold text-[#9a9490] uppercase tracking-wide mb-4">
        Шаги — {steps.length}
      </p>

      <div className="pl-4">
        {steps.map((step, idx) => (
          <StepCard
            key={idx} step={step} index={idx} total={steps.length} workers={workers}
            onChange={s => updateStep(idx, s)}
            onDelete={() => deleteStep(idx)}
            onMove={dir => moveStep(idx, dir)}
          />
        ))}
      </div>

      <button onClick={addStep}
        className="w-full h-11 ml-12 rounded-2xl border-2 border-dashed border-[#e4ddd2] text-sm text-[#9a9490] hover:border-[#1a1a1a] hover:text-[#1a1a1a] hover:bg-[#faf9f7] transition-all flex items-center justify-center gap-2 mt-2" style={{ width: 'calc(100% - 3rem)' }}>
        <Plus className="h-4 w-4" /> Добавить шаг
      </button>
    </div>
  )
}
