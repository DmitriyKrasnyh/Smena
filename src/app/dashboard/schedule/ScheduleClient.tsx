'use client'

import { useState, useCallback, Fragment } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Loader2, X, Trash2, RefreshCw, Calendar, Clock, Building2 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee { id: string; full_name: string; role: string; avatar_url: string | null; restaurant_id: string }
interface Shift { id: string; employee_id: string; date: string; start_time: string; end_time: string; note: string | null }
interface ShiftTemplate { id: string; employee_id: string; restaurant_id: string; day_of_week: number; start_time: string; end_time: string }
interface Props {
  employees: Employee[]
  initialShifts: Shift[]
  templates: ShiftTemplate[]
  restaurantGroups: { id: string; name: string }[]
  initialWeekStart: string
}
interface ModalState { employee: Employee; date: string; shift: Shift | null }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_SHORT  = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTHS     = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек']
const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10)
}
function calcHours(s: string, e: string) {
  const [sh, sm] = s.slice(0, 5).split(':').map(Number)
  const [eh, em] = e.slice(0, 5).split(':').map(Number)
  const diff = (eh * 60 + em) - (sh * 60 + sm)
  return diff > 0 ? diff / 60 : 0
}
function fmt(t: string) { return t.slice(0, 5) }
function fmtH(h: number) { return h === 0 ? '—' : `${h % 1 === 0 ? h : h.toFixed(1)}ч` }
function getWeekDays(ws: string) { return Array.from({ length: 7 }, (_, i) => addDays(ws, i)) }
function getInitials(name: string) { return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) }
function isWeekend(i: number) { return i >= 5 }

// Employee color palette (subtle)
const EMP_COLORS = [
  'bg-blue-50 border-blue-200 text-blue-800',
  'bg-violet-50 border-violet-200 text-violet-800',
  'bg-emerald-50 border-emerald-200 text-emerald-800',
  'bg-orange-50 border-orange-200 text-orange-800',
  'bg-pink-50 border-pink-200 text-pink-800',
  'bg-teal-50 border-teal-200 text-teal-800',
]

// ─── Shift Modal ──────────────────────────────────────────────────────────────

function ShiftModal({ state, templates, onClose, onSaved, onDeleted }: {
  state: ModalState; templates: ShiftTemplate[]
  onClose: () => void; onSaved: (s: Shift) => void; onDeleted: (id: string) => void
}) {
  const supabase = createClient()
  const { employee, date, shift } = state
  const d = new Date(date)
  const dow = d.getDay() === 0 ? 7 : d.getDay()
  const tpl = templates.find(t => t.employee_id === employee.id && t.day_of_week === dow)

  const [startTime, setStartTime] = useState(shift?.start_time?.slice(0, 5) ?? tpl?.start_time?.slice(0, 5) ?? '09:00')
  const [endTime,   setEndTime]   = useState(shift?.end_time?.slice(0, 5)   ?? tpl?.end_time?.slice(0, 5)   ?? '18:00')
  const [note,      setNote]      = useState(shift?.note ?? '')
  const [repeat,    setRepeat]    = useState(!!tpl)
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(false)

  const hours = calcHours(startTime, endTime)
  const dayName = DAY_SHORT[dow - 1]
  const dateLabel = `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`
  const weekend = dow >= 6

  async function handleSave() {
    if (hours <= 0) { toast.error('Время окончания должно быть позже начала'); return }
    setSaving(true)
    const payload = {
      restaurant_id: employee.restaurant_id,
      employee_id: employee.id,
      date,
      start_time: startTime,
      end_time: endTime,
      note: note.trim() || null,
    }
    let saved: Shift
    if (shift) {
      const { data, error } = await supabase.from('shifts').update(payload).eq('id', shift.id).select().single()
      if (error) { toast.error('Ошибка сохранения'); setSaving(false); return }
      saved = data
    } else {
      const { data, error } = await supabase.from('shifts').insert(payload).select().single()
      if (error) { toast.error('Ошибка сохранения'); setSaving(false); return }
      saved = data
    }
    if (repeat) {
      await supabase.from('shift_templates').upsert(
        { restaurant_id: employee.restaurant_id, employee_id: employee.id, day_of_week: dow, start_time: startTime, end_time: endTime, active: true },
        { onConflict: 'restaurant_id,employee_id,day_of_week' }
      )
    } else if (tpl) {
      await supabase.from('shift_templates').delete().eq('id', tpl.id)
    }
    toast.success(shift ? 'Смена обновлена' : 'Смена добавлена')
    onSaved(saved); setSaving(false)
  }

  async function handleDelete() {
    if (!shift) return
    setDeleting(true)
    await supabase.from('shifts').delete().eq('id', shift.id)
    toast.success('Смена удалена'); onDeleted(shift.id); setDeleting(false)
  }

  const inputCls = 'w-full h-10 px-3 rounded-[8px] border border-[#e4ddd2] bg-[#faf9f7] text-sm text-[#1a1a1a] focus:outline-none focus:border-[#1a1a1a] transition-all'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-[#e4ddd2] shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`p-5 border-b border-[#f0ece4] ${weekend ? 'bg-amber-50' : 'bg-[#faf9f7]'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#e4ddd2] flex items-center justify-center text-sm font-bold text-[#6b6460] shrink-0">
              {getInitials(employee.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#1a1a1a] truncate">{employee.full_name}</p>
              <p className="text-xs text-[#9a9490]">{dayName}, {dateLabel}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/60 text-[#9a9490] transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Fields */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#6b6460] uppercase tracking-wide mb-1.5 block">Начало</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6b6460] uppercase tracking-wide mb-1.5 block">Конец</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={inputCls} />
            </div>
          </div>

          {hours > 0 && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-[8px] bg-[#f5f3f0] border border-[#e4ddd2]">
              <Clock className="h-3.5 w-3.5 text-[#6b6460]" />
              <span className="text-sm text-[#1a1a1a] font-medium">{fmtH(hours)} рабочего времени</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-[#6b6460] uppercase tracking-wide mb-1.5 block">Заметка</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Необязательно" className={inputCls} />
          </div>

          {/* Repeat toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-[8px] border border-[#e4ddd2] hover:bg-[#faf9f7] transition-colors">
            <div onClick={() => setRepeat(v => !v)}
              className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${repeat ? 'bg-[#1a1a1a]' : 'bg-[#e4ddd2]'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${repeat ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-[#1a1a1a]">Повторять каждый <span className="font-bold">{dayName}</span></p>
              <p className="text-xs text-[#9a9490]">Шаблон будет применяться каждую неделю</p>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 pb-5">
          {shift && (
            <button onClick={handleDelete} disabled={deleting}
              className="h-10 w-10 flex items-center justify-center rounded-[8px] border border-[#e4ddd2] hover:bg-red-50 hover:border-red-200 hover:text-red-500 text-[#9a9490] transition-colors shrink-0">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          )}
          <button onClick={handleSave} disabled={saving}
            className="flex-1 h-10 rounded-[8px] bg-[#1a1a1a] text-white text-sm font-semibold hover:bg-[#2d2d2d] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {shift ? 'Сохранить изменения' : 'Добавить смену'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ScheduleClient({ employees, initialShifts, templates: initTpl, restaurantGroups, initialWeekStart }: Props) {
  const supabase = createClient()
  const [weekStart,   setWeekStart]   = useState(initialWeekStart)
  const [shifts,      setShifts]      = useState<Shift[]>(initialShifts)
  const [templates,   setTemplates]   = useState<ShiftTemplate[]>(initTpl)
  const [modal,       setModal]       = useState<ModalState | null>(null)
  const [loadingWeek, setLoadingWeek] = useState(false)
  const [applyingTpl, setApplyingTpl] = useState(false)

  const weekDays    = getWeekDays(weekStart)
  const today       = new Date().toISOString().slice(0, 10)
  const multiRest   = restaurantGroups.length > 1

  // Employee color map
  const empColorMap = Object.fromEntries(employees.map((e, i) => [e.id, EMP_COLORS[i % EMP_COLORS.length]]))
  const restaurantIds = restaurantGroups.map(r => r.id)

  async function navigateWeek(dir: -1 | 1) {
    const newStart = addDays(weekStart, dir * 7)
    setLoadingWeek(true); setWeekStart(newStart)
    const { data } = await supabase.from('shifts').select('*')
      .in('restaurant_id', restaurantIds)
      .gte('date', newStart).lte('date', addDays(newStart, 6))
    setShifts(data || []); setLoadingWeek(false)
  }

  async function applyTemplates() {
    setApplyingTpl(true)
    const toInsert = []
    for (const tpl of templates) {
      const emp = employees.find(e => e.id === tpl.employee_id)
      if (!emp) continue
      for (const dateStr of weekDays) {
        const d = new Date(dateStr)
        const dow = d.getDay() === 0 ? 7 : d.getDay()
        if (dow !== tpl.day_of_week) continue
        if (shifts.some(s => s.employee_id === tpl.employee_id && s.date === dateStr)) continue
        toInsert.push({ employee_id: tpl.employee_id, date: dateStr, start_time: tpl.start_time, end_time: tpl.end_time, note: null, restaurant_id: emp.restaurant_id, created_by: null })
      }
    }
    if (toInsert.length === 0) { toast('Все шаблонные смены уже применены'); setApplyingTpl(false); return }
    const { data, error } = await supabase.from('shifts').insert(toInsert).select()
    if (error) { toast.error('Ошибка применения'); setApplyingTpl(false); return }
    setShifts(prev => [...prev, ...(data || [])])
    toast.success(`Добавлено ${data?.length ?? 0} смен`); setApplyingTpl(false)
  }

  function getShift(empId: string, dateStr: string) {
    return shifts.find(s => s.employee_id === empId && s.date === dateStr) ?? null
  }

  const handleSaved = useCallback((saved: Shift) => {
    setShifts(prev => [...prev.filter(s => s.id !== saved.id), saved]); setModal(null)
  }, [])

  const handleDeleted = useCallback((id: string) => {
    setShifts(prev => prev.filter(s => s.id !== id)); setModal(null)
  }, [])

  // Week label
  const s = new Date(weekStart), e = new Date(addDays(weekStart, 6))
  const weekLabel = s.getMonth() === e.getMonth()
    ? `${s.getDate()}–${e.getDate()} ${MONTHS_GEN[e.getMonth()]} ${e.getFullYear()}`
    : `${s.getDate()} ${MONTHS[s.getMonth()]} – ${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`

  const totalWeekHours = shifts.reduce((sum, s) => sum + calcHours(s.start_time, s.end_time), 0)

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

      {/* Header */}
      <div className="px-6 py-4 flex items-center gap-3 border-b border-[#e4ddd2] bg-white shrink-0 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[#1a1a1a]">Расписание</h1>
          <p className="text-xs text-[#9a9490] mt-0.5">{weekLabel} · {fmtH(totalWeekHours)} всего</p>
        </div>

        <div className="flex items-center gap-2">
          {templates.length > 0 && (
            <button onClick={applyTemplates} disabled={applyingTpl}
              className="flex items-center gap-1.5 h-9 px-3 rounded-[8px] border border-[#e4ddd2] text-sm text-[#6b6460] hover:bg-[#f5f3f0] transition-colors">
              {applyingTpl ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Применить шаблон</span>
            </button>
          )}
          {weekStart !== initialWeekStart && (
            <button onClick={() => { setWeekStart(initialWeekStart); setShifts(initialShifts) }}
              className="flex items-center gap-1.5 h-9 px-3 rounded-[8px] border border-[#e4ddd2] text-sm text-[#6b6460] hover:bg-[#f5f3f0] transition-colors">
              <Calendar className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Сегодня</span>
            </button>
          )}
          <div className="flex items-center gap-1 border border-[#e4ddd2] rounded-[8px] overflow-hidden">
            <button onClick={() => navigateWeek(-1)} disabled={loadingWeek}
              className="h-9 w-9 flex items-center justify-center hover:bg-[#f5f3f0] text-[#6b6460] disabled:opacity-50 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="w-px h-5 bg-[#e4ddd2]" />
            <button onClick={() => navigateWeek(1)} disabled={loadingWeek}
              className="h-9 w-9 flex items-center justify-center hover:bg-[#f5f3f0] text-[#6b6460] disabled:opacity-50 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        {loadingWeek ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-[#9a9490]" />
          </div>
        ) : (
          <table className="w-full border-collapse min-w-[680px]">
            <thead className="sticky top-0 z-10 bg-white border-b border-[#e4ddd2]">
              <tr>
                <th className="w-48 text-left px-6 py-3 text-xs font-semibold text-[#6b6460] uppercase tracking-wide">Сотрудник</th>
                {weekDays.map((dateStr, i) => {
                  const weekend = isWeekend(i)
                  const isToday = dateStr === today
                  const d = new Date(dateStr)
                  return (
                    <th key={dateStr} className={`px-2 py-3 text-center ${weekend ? 'bg-amber-50/60' : ''}`}>
                      <div className={`text-xs font-semibold uppercase tracking-wide ${weekend ? 'text-amber-600' : 'text-[#6b6460]'}`}>
                        {DAY_SHORT[i]}
                      </div>
                      <div className={`w-7 h-7 flex items-center justify-center mx-auto mt-0.5 rounded-full text-sm font-bold ${
                        isToday ? 'bg-[#1a1a1a] text-white' : weekend ? 'text-amber-600' : 'text-[#1a1a1a]'
                      }`}>
                        {d.getDate()}
                      </div>
                    </th>
                  )
                })}
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#6b6460] uppercase tracking-wide w-16">Итого</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-16 text-center text-[#9a9490]">Нет сотрудников</td></tr>
              ) : restaurantGroups.map(restaurant => {
                const restEmployees = employees.filter(emp => emp.restaurant_id === restaurant.id)
                if (restEmployees.length === 0) return null

                const restShiftHours = shifts
                  .filter(s => restEmployees.some(e => e.id === s.employee_id))
                  .reduce((sum, s) => sum + calcHours(s.start_time, s.end_time), 0)

                return (
                  <Fragment key={restaurant.id}>
                    {/* Restaurant section header */}
                    {multiRest && (
                      <tr key={`header-${restaurant.id}`}>
                        <td colSpan={9} className="px-6 pt-5 pb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-[6px] bg-[#1a1a1a] flex items-center justify-center shrink-0">
                              <Building2 className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className="text-xs font-bold text-[#1a1a1a]">{restaurant.name}</span>
                            <div className="flex-1 h-px bg-[#f0ece4]" />
                            <span className="text-xs text-[#9a9490]">{restEmployees.length} чел. · {fmtH(restShiftHours)}</span>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Employee rows */}
                    {restEmployees.map(emp => {
                      const weekH = shifts.filter(s => s.employee_id === emp.id).reduce((sum, s) => sum + calcHours(s.start_time, s.end_time), 0)
                      const colorCls = empColorMap[emp.id]
                      return (
                        <tr key={emp.id} className="border-t border-[#f0ece4] hover:bg-[#fdfcfb] transition-colors">
                          {/* Employee */}
                          <td className="px-6 py-2.5 sticky left-0 bg-white border-r border-[#f0ece4]">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#e4ddd2] flex items-center justify-center text-[10px] font-bold text-[#6b6460] shrink-0">
                                {getInitials(emp.full_name)}
                              </div>
                              <p className="text-sm font-medium text-[#1a1a1a] truncate max-w-[120px]">{emp.full_name}</p>
                            </div>
                          </td>

                          {/* Day cells */}
                          {weekDays.map((dateStr, i) => {
                            const weekend = isWeekend(i)
                            const shift = getShift(emp.id, dateStr)
                            const h = shift ? calcHours(shift.start_time, shift.end_time) : 0
                            return (
                              <td key={dateStr} className={`px-1.5 py-2 ${weekend ? 'bg-amber-50/30' : ''}`}>
                                <button
                                  onClick={() => setModal({ employee: emp, date: dateStr, shift })}
                                  className={`w-full min-h-[54px] rounded-[8px] border transition-all text-left px-2.5 py-2 group ${
                                    shift
                                      ? `${colorCls} hover:opacity-90`
                                      : 'bg-transparent border-transparent hover:border-dashed hover:border-[#d0c9c0] hover:bg-[#faf9f7]'
                                  }`}
                                >
                                  {shift ? (
                                    <>
                                      <p className="text-xs font-bold leading-tight">{fmt(shift.start_time)}–{fmt(shift.end_time)}</p>
                                      <p className="text-[10px] opacity-70 mt-0.5">{fmtH(h)}</p>
                                    </>
                                  ) : (
                                    <span className="text-[11px] text-[#d0c9c0] group-hover:text-[#9a9490] transition-colors">+ смена</span>
                                  )}
                                </button>
                              </td>
                            )
                          })}

                          {/* Week total */}
                          <td className="px-4 py-2 text-center">
                            <span className={`text-sm font-bold ${weekH > 0 ? 'text-[#1a1a1a]' : 'text-[#d0c9c0]'}`}>
                              {fmtH(weekH)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </Fragment>
                )
              })}

              {/* Day totals */}
              <tr className="border-t-2 border-[#e4ddd2] bg-[#faf9f7]">
                <td className="px-6 py-2.5 text-xs font-semibold text-[#6b6460] uppercase tracking-wide sticky left-0 bg-[#faf9f7] border-r border-[#f0ece4]">
                  Итого
                </td>
                {weekDays.map((dateStr, i) => {
                  const h = shifts.filter(s => s.date === dateStr).reduce((sum, s) => sum + calcHours(s.start_time, s.end_time), 0)
                  const weekend = isWeekend(i)
                  return (
                    <td key={dateStr} className={`px-1.5 py-2.5 text-center ${weekend ? 'bg-amber-50/30' : ''}`}>
                      <span className={`text-sm font-bold ${h > 0 ? weekend ? 'text-amber-700' : 'text-[#1a1a1a]' : 'text-[#d0c9c0]'}`}>
                        {fmtH(h)}
                      </span>
                    </td>
                  )
                })}
                <td className="px-4 py-2.5 text-center">
                  <span className="text-sm font-bold text-[#1a1a1a]">{fmtH(totalWeekHours)}</span>
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <ShiftModal
          state={modal} templates={templates}
          onClose={() => setModal(null)} onSaved={handleSaved} onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
