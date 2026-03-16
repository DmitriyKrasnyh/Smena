'use client'

import type { RestaurantOverview, StaffMember } from './page'
import { Building2, Users, AlertCircle, TrendingUp, Crown, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const ROLE_LABELS: Record<string, string> = {
  owner:   'Владелец',
  manager: 'Управляющий',
  worker:  'Сотрудник',
}

function Avatar({ member, size = 'md' }: { member: StaffMember; size?: 'sm' | 'md' }) {
  const initials = member.full_name
    .split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const cls = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-8 h-8 text-xs'
  if (member.avatar_url) {
    return <img src={member.avatar_url} alt={member.full_name} className={`${cls} rounded-full object-cover shrink-0`} />
  }
  return (
    <div className={`${cls} rounded-full bg-[#e4ddd2] flex items-center justify-center font-bold text-[#6b6460] shrink-0`}>
      {initials}
    </div>
  )
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 14
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width="36" height="36" className="-rotate-90">
      <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3.5" />
      <circle
        cx="18" cy="18" r={r} fill="none"
        stroke={pct >= 80 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444'}
        strokeWidth="3.5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
    </svg>
  )
}

function RestaurantCard({ r, onSwitch }: { r: RestaurantOverview; onSwitch: (id: string) => void }) {
  const [expanded, setExpanded] = useState(true)
  const pct = r.tasks_total > 0 ? Math.round((r.tasks_done / r.tasks_total) * 100) : 0
  const owners   = r.staff.filter(m => m.role === 'owner')
  const managers = r.staff.filter(m => m.role === 'manager')
  const workers  = r.staff.filter(m => m.role === 'worker')
  const leads    = [...owners, ...managers] // top-level nodes

  return (
    <div className="bg-white rounded-2xl border border-[#e4ddd2] shadow-sm overflow-hidden">

      {/* Dark restaurant header */}
      <div className="bg-[#1a1a1a] px-5 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-[10px] bg-white/10 flex items-center justify-center shrink-0">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-white text-sm leading-tight truncate">{r.name}</h2>
          <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
            <span className="text-[11px] text-white/40">{r.staff.length} чел.</span>
            <span className="text-[11px] text-white/40">{r.tasks_done}/{r.tasks_total} задач</span>
            {r.tasks_overdue > 0 && (
              <span className="text-[11px] text-red-400 font-medium">{r.tasks_overdue} просрочено</span>
            )}
          </div>
        </div>

        <div className="relative shrink-0">
          <ProgressRing pct={pct} />
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">{pct}%</span>
        </div>

        <button
          onClick={() => onSwitch(r.id)}
          className="shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-[8px] bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
        >
          Открыть <ArrowRight className="h-3 w-3" />
        </button>

        <button
          onClick={() => setExpanded(v => !v)}
          className="p-1.5 rounded-[6px] hover:bg-white/10 text-white/40 transition-colors shrink-0"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Hierarchy tree */}
      {expanded && (
        <div className="p-4">
          {r.staff.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-[#b0a99f]">
              <Users className="h-4 w-4" /> Нет сотрудников
            </div>
          ) : (
            <div className="space-y-1.5">

              {/* Owners */}
              {owners.map(o => (
                <div key={o.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] bg-amber-50 border border-amber-100">
                  <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <Avatar member={o} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-900 truncate">{o.full_name}</p>
                    <p className="text-[11px] text-amber-500 truncate">{o.email}</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 shrink-0">
                    {ROLE_LABELS.owner}
                  </span>
                </div>
              ))}

              {/* Managers */}
              {managers.map(mgr => (
                <div key={mgr.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] bg-blue-50 border border-blue-100">
                  <Crown className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <Avatar member={mgr} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-blue-900 truncate">{mgr.full_name}</p>
                    <p className="text-[11px] text-blue-500 truncate">{mgr.email}</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 shrink-0">
                    {ROLE_LABELS.manager}
                  </span>
                </div>
              ))}

              {/* Workers — indented with tree connector */}
              {workers.length > 0 && (
                <div className={`space-y-1 ${leads.length > 0 ? 'ml-5 pl-4 border-l-2 border-[#ede9e3]' : ''}`}>
                  {workers.map(w => (
                    <div key={w.id} className="relative flex items-center gap-2.5 px-3 py-2 rounded-[8px] hover:bg-[#faf9f7] transition-colors">
                      {leads.length > 0 && (
                        <div className="absolute -left-4 top-1/2 w-4 border-t border-[#ede9e3]" />
                      )}
                      <Avatar member={w} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1a1a1a] truncate">{w.full_name}</p>
                        <p className="text-[11px] text-[#9a9490] truncate">{w.email}</p>
                      </div>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#f5f3f0] text-[#6b6460] border border-[#e4ddd2] shrink-0">
                        {ROLE_LABELS.worker}
                      </span>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function OverviewClient({ restaurants }: { restaurants: RestaurantOverview[] }) {
  const supabase = createClient()
  const router = useRouter()

  const totalStaff   = restaurants.reduce((s, r) => s + r.staff.length, 0)
  const totalTasks   = restaurants.reduce((s, r) => s + r.tasks_total, 0)
  const totalDone    = restaurants.reduce((s, r) => s + r.tasks_done, 0)
  const totalOverdue = restaurants.reduce((s, r) => s + r.tasks_overdue, 0)
  const overallPct   = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0

  async function handleSwitch(restaurantId: string) {
    const { error } = await supabase.rpc('switch_restaurant', { p_restaurant_id: restaurantId })
    if (error) { toast.error('Ошибка переключения'); return }
    toast.success('Точка переключена')
    router.refresh()
  }

  const stats = [
    { label: 'Заведений',   value: restaurants.length, icon: Building2,   color: 'text-[#1a1a1a]',   bg: 'bg-[#f5f3f0]' },
    { label: 'Сотрудников', value: totalStaff,          icon: Users,        color: 'text-blue-600',    bg: 'bg-blue-50'   },
    { label: 'Выполнение',  value: `${overallPct}%`,    icon: TrendingUp,   color: 'text-emerald-600', bg: 'bg-emerald-50'},
    { label: 'Просрочено',  value: totalOverdue,         icon: AlertCircle,  color: totalOverdue > 0 ? 'text-red-600' : 'text-[#9a9490]', bg: totalOverdue > 0 ? 'bg-red-50' : 'bg-[#f5f3f0]' },
  ]

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto w-full">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Все заведения</h1>
        <p className="text-sm text-[#9a9490] mt-1">Структура команд и статус задач</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
        {stats.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-xl border border-[#e4ddd2] px-4 py-3.5 shadow-sm flex items-center gap-3">
              <div className={`w-9 h-9 rounded-[8px] ${s.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-[#9a9490]">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Restaurant cards */}
      {restaurants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#f5f3f0] flex items-center justify-center mb-4">
            <Building2 className="h-7 w-7 text-[#c0b9b0]" />
          </div>
          <p className="font-semibold text-[#1a1a1a] mb-1">Нет заведений</p>
          <p className="text-sm text-[#9a9490]">Создайте первое заведение в настройках</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {restaurants.map(r => (
            <RestaurantCard key={r.id} r={r} onSwitch={handleSwitch} />
          ))}
        </div>
      )}
    </div>
  )
}
