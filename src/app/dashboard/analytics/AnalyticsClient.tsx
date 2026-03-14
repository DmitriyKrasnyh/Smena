'use client'

import { useState } from 'react'
import { CheckSquare, Clock, AlertCircle, TrendingUp, Users, BarChart2 } from 'lucide-react'

const STATUS_CONFIG = {
  new:         { label: 'Новые',     color: '#3b82f6', bg: '#eff6ff' },
  in_progress: { label: 'В работе',  color: '#f59e0b', bg: '#fffbeb' },
  done:        { label: 'Выполнено', color: '#10b981', bg: '#ecfdf5' },
}

const PRIORITY_CONFIG = {
  low:    { label: 'Низкий',  color: '#94a3b8' },
  medium: { label: 'Средний', color: '#f59e0b' },
  high:   { label: 'Высокий', color: '#ef4444' },
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  kitchen:  { label: 'Кухня',         icon: '🍳' },
  hall:     { label: 'Зал',           icon: '🪑' },
  bar:      { label: 'Бар',           icon: '🍹' },
  admin:    { label: 'Администрация', icon: '📋' },
  cleaning: { label: 'Уборка',        icon: '🧹' },
  other:    { label: 'Другое',        icon: '📌' },
}

type Period = '7d' | '30d' | 'all'

interface Task {
  id: string
  status: string
  priority: string
  category: string | null
  deadline: string | null
  created_at: string
  updated_at: string
  assigned_to: string | null
}

interface Member {
  id: string
  full_name: string
  role: string
}

interface Props {
  tasks: Task[]
  members: Member[]
}

function BarRow({ label, value, max, color, suffix = '' }: {
  label: string
  value: number
  max: number
  color: string
  suffix?: string
}) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-6 bg-[#f5f3f0] rounded-lg overflow-hidden">
        <div
          className="h-full rounded-lg transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color, minWidth: value > 0 ? '6px' : 0 }}
        />
      </div>
      <span className="text-xs font-semibold text-foreground w-8 text-right shrink-0">
        {value}{suffix}
      </span>
    </div>
  )
}

export default function AnalyticsClient({ tasks, members }: Props) {
  const [period, setPeriod] = useState<Period>('30d')

  const now = Date.now()
  const cutoff = period === '7d' ? now - 7 * 86400000
    : period === '30d' ? now - 30 * 86400000
    : 0

  const filtered = tasks.filter(t => cutoff === 0 || new Date(t.created_at).getTime() >= cutoff)

  const total      = filtered.length
  const done       = filtered.filter(t => t.status === 'done').length
  const inProgress = filtered.filter(t => t.status === 'in_progress').length
  const newTasks   = filtered.filter(t => t.status === 'new').length
  const overdue    = filtered.filter(t =>
    t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done'
  ).length
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0

  // By category
  const byCategory = Object.keys(CATEGORY_LABELS).map(cat => ({
    cat,
    count: filtered.filter(t => (t.category || 'other') === cat).length,
  })).filter(x => x.count > 0).sort((a, b) => b.count - a.count)
  const maxCategory = Math.max(...byCategory.map(x => x.count), 1)

  // By priority
  const byPriority = (['high', 'medium', 'low'] as const).map(p => ({
    p,
    count: filtered.filter(t => t.priority === p).length,
  }))
  const maxPriority = Math.max(...byPriority.map(x => x.count), 1)

  // By member
  const byMember = members
    .map(m => ({
      member: m,
      total:       filtered.filter(t => t.assigned_to === m.id).length,
      done:        filtered.filter(t => t.assigned_to === m.id && t.status === 'done').length,
      inProgress:  filtered.filter(t => t.assigned_to === m.id && t.status === 'in_progress').length,
      overdue:     filtered.filter(t => t.assigned_to === m.id && t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done').length,
    }))
    .filter(x => x.total > 0)
    .sort((a, b) => b.total - a.total)
  const maxMember = Math.max(...byMember.map(x => x.total), 1)

  // Last 7 days daily trend
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    d.setHours(0, 0, 0, 0)
    return d
  })
  const trend = days.map(d => {
    const nextDay = new Date(d.getTime() + 86400000)
    return {
      label: d.toLocaleDateString('ru-RU', { weekday: 'short' }),
      created: tasks.filter(t => {
        const ts = new Date(t.created_at).getTime()
        return ts >= d.getTime() && ts < nextDay.getTime()
      }).length,
      completed: tasks.filter(t => {
        const ts = new Date(t.updated_at).getTime()
        return t.status === 'done' && ts >= d.getTime() && ts < nextDay.getTime()
      }).length,
    }
  })
  const maxTrend = Math.max(...trend.map(t => Math.max(t.created, t.completed)), 1)

  const stats = [
    { label: 'Всего задач',  value: total,          icon: BarChart2,   color: '#1a1a1a', bg: '#f5f3f0' },
    { label: 'Выполнено',    value: done,            icon: CheckSquare, color: '#10b981', bg: '#ecfdf5' },
    { label: 'В работе',     value: inProgress,      icon: TrendingUp,  color: '#f59e0b', bg: '#fffbeb' },
    { label: 'Просрочено',   value: overdue,         icon: AlertCircle, color: '#ef4444', bg: '#fef2f2' },
  ]

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8 animate-slide-up">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Аналитика</h1>
          <p className="text-muted-foreground mt-1 text-sm">Показатели задач и команды</p>
        </div>
        {/* Period picker */}
        <div className="flex items-center gap-1 bg-[#f5f3f0] p-1 rounded-[10px] shrink-0">
          {(['7d', '30d', 'all'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all ${period === p ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {p === '7d' ? '7 дней' : p === '30d' ? '30 дней' : 'Всё время'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map(({ label, value, icon: Icon, color, bg }, i) => (
          <div
            key={label}
            className="bg-card rounded-[14px] border border-[#e4ddd2] p-5 shadow-sm animate-slide-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center mb-3" style={{ backgroundColor: bg }}>
              <Icon className="h-4 w-4" style={{ color }} strokeWidth={2} />
            </div>
            <p className="font-num text-3xl font-bold text-foreground leading-none mb-1">{value}</p>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Completion rate + status */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">

        {/* Completion rate */}
        <div className="bg-card rounded-[14px] border border-[#e4ddd2] p-5 shadow-sm animate-slide-up" style={{ animationDelay: '240ms' }}>
          <h2 className="font-semibold text-sm mb-4">Выполнение задач</h2>
          <div className="flex items-center gap-4">
            {/* Circle */}
            <div className="relative w-20 h-20 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#f5f3f0" strokeWidth="4" />
                <circle
                  cx="18" cy="18" r="14" fill="none"
                  stroke="#10b981" strokeWidth="4"
                  strokeDasharray={`${completionRate * 0.88} 88`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-num text-lg font-bold text-foreground">{completionRate}%</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              {([
                { key: 'done',         label: 'Выполнено', count: done,       color: '#10b981' },
                { key: 'in_progress',  label: 'В работе',  count: inProgress, color: '#f59e0b' },
                { key: 'new',          label: 'Новые',     count: newTasks,   color: '#3b82f6' },
              ]).map(({ label, count, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs text-muted-foreground flex-1">{label}</span>
                  <span className="text-xs font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 7-day trend */}
        <div className="bg-card rounded-[14px] border border-[#e4ddd2] p-5 shadow-sm animate-slide-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Активность за 7 дней</h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />Создано</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-[#10b981]" />Выполнено</span>
            </div>
          </div>
          <div className="flex items-end gap-2 h-24">
            {trend.map(({ label, created, completed }) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex items-end gap-0.5 h-16 w-full">
                  <div
                    className="flex-1 rounded-t-md bg-[#3b82f6]/80 transition-all duration-300"
                    style={{ height: `${(created / maxTrend) * 100}%`, minHeight: created > 0 ? '3px' : 0 }}
                  />
                  <div
                    className="flex-1 rounded-t-md bg-[#10b981]/80 transition-all duration-300"
                    style={{ height: `${(completed / maxTrend) * 100}%`, minHeight: completed > 0 ? '3px' : 0 }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category + priority */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">

        {/* By category */}
        <div className="bg-card rounded-[14px] border border-[#e4ddd2] p-5 shadow-sm animate-slide-up" style={{ animationDelay: '360ms' }}>
          <h2 className="font-semibold text-sm mb-4">По категориям</h2>
          {byCategory.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Нет данных</p>
          ) : (
            <div className="space-y-2.5">
              {byCategory.map(({ cat, count }) => (
                <BarRow
                  key={cat}
                  label={`${CATEGORY_LABELS[cat]?.icon} ${CATEGORY_LABELS[cat]?.label}`}
                  value={count}
                  max={maxCategory}
                  color="#1a1a1a"
                />
              ))}
            </div>
          )}
        </div>

        {/* By priority */}
        <div className="bg-card rounded-[14px] border border-[#e4ddd2] p-5 shadow-sm animate-slide-up" style={{ animationDelay: '420ms' }}>
          <h2 className="font-semibold text-sm mb-4">По приоритету</h2>
          <div className="space-y-2.5">
            {byPriority.map(({ p, count }) => (
              <BarRow
                key={p}
                label={PRIORITY_CONFIG[p].label}
                value={count}
                max={maxPriority}
                color={PRIORITY_CONFIG[p].color}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Team performance */}
      {byMember.length > 0 && (
        <div
          className="bg-card rounded-[14px] border border-[#e4ddd2] shadow-sm overflow-hidden animate-slide-up"
          style={{ animationDelay: '480ms' }}
        >
          <div className="px-5 py-4 border-b border-[#e4ddd2]">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">Активность команды</h2>
            </div>
          </div>
          <div className="divide-y divide-[#f0ece4]">
            {byMember.map(({ member, total: t, done: d, inProgress: ip, overdue: ov }) => {
              const rate = t > 0 ? Math.round((d / t) * 100) : 0
              return (
                <div key={member.id} className="px-5 py-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-[8px] bg-[#f5f3f0] flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                      {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.full_name}</p>
                      <p className="text-xs text-muted-foreground">{t} задач · {rate}% выполнено</p>
                    </div>
                    {ov > 0 && (
                      <span className="text-xs bg-red-50 text-red-500 border border-red-100 px-2 py-0.5 rounded-lg font-medium shrink-0">
                        {ov} просрочено
                      </span>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-[#f5f3f0] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(t / maxMember) * 100}%`,
                        background: `linear-gradient(to right, #10b981 ${rate}%, #f59e0b ${rate}% ${rate + (ip / t) * 100}%, #e4ddd2 ${rate + (ip / t) * 100}%)`,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
