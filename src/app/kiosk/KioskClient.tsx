'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import type { Profile } from '@/lib/types'

const STATUS_CONFIG = {
  new:         { label: 'Новая',     color: 'bg-blue-500' },
  in_progress: { label: 'В работе',  color: 'bg-amber-500' },
  done:        { label: 'Готово',    color: 'bg-emerald-500' },
}

const PRIORITY_CONFIG = {
  low:    { label: 'Низкий',    color: 'text-emerald-400' },
  medium: { label: 'Средний',   color: 'text-amber-400' },
  high:   { label: 'Высокий',   color: 'text-red-400' },
}

const CATEGORY_LABELS: Record<string, string> = {
  kitchen: 'Кухня', hall: 'Зал', bar: 'Бар',
  admin: 'Администрация', cleaning: 'Уборка', other: 'Прочее',
}

interface KioskTask {
  id: string
  title: string
  status: string
  priority: string
  category: string | null
  deadline: string | null
  assigned_to: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assignee: any
}

interface KioskClientProps {
  profile: Profile & { restaurants?: { name: string } | null }
  initialTasks: KioskTask[]
}

export default function KioskClient({ profile, initialTasks }: KioskClientProps) {
  const [tasks, setTasks] = useState<KioskTask[]>(initialTasks)
  const [time, setTime] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    const { data } = await supabase
      .from('tasks')
      .select('id, title, status, priority, category, deadline, assigned_to, assignee:profiles!assigned_to(full_name)')
      .eq('restaurant_id', profile.restaurant_id)
      .neq('status', 'done')
      .order('deadline', { ascending: true, nullsFirst: false })
    if (data) setTasks(data as unknown as KioskTask[])
    setRefreshing(false)
  }, [profile.restaurant_id, supabase])

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('kiosk-tasks')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tasks',
        filter: `restaurant_id=eq.${profile.restaurant_id}`,
      }, () => { refresh() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile.restaurant_id, refresh, supabase])

  const timeStr = time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = time.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

  const newTasks = tasks.filter(t => t.status === 'new')
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')

  function formatDeadline(d: string | null) {
    if (!d) return null
    const date = new Date(d)
    const now = new Date()
    const isOverdue = date < now
    const str = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    return { str, isOverdue }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f0ece4] flex flex-col font-[var(--font-geologica)]">

      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-[#2d2d2d]">
        <div className="flex items-center gap-5">
          <div className="w-10 h-10 rounded-[10px] overflow-hidden">
            <img src="/icon.svg" alt="Смена" className="w-full h-full" />
          </div>
          <div>
            <p className="font-bold text-xl leading-tight">
              {(profile as any).restaurants?.name || 'Заведение'}
            </p>
            <p className="text-sm text-[#78736a] capitalize">{dateStr}</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-4xl font-bold tabular-nums tracking-tight">{timeStr}</p>
          <p className="text-xs text-[#78736a] mt-0.5">{profile.full_name}</p>
        </div>
      </header>

      {/* Stats bar */}
      <div className="flex items-center gap-4 px-8 py-3 bg-[#1a1a1a] border-b border-[#2d2d2d]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-sm font-medium">{inProgressTasks.length} в работе</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-sm font-medium text-[#78736a]">{newTasks.length} новых</span>
        </div>
        <div className="ml-auto text-xs text-[#78736a]">
          Всего активных: {tasks.length}
        </div>
      </div>

      {/* Task grid */}
      <main className="flex-1 p-8 overflow-auto">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
            <div className="w-20 h-20 rounded-[20px] bg-emerald-500/20 flex items-center justify-center mb-5">
              <span className="text-4xl">✓</span>
            </div>
            <p className="text-2xl font-bold mb-2">Всё выполнено!</p>
            <p className="text-[#78736a]">Активных задач нет. Отличная работа!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {tasks.map(task => {
              const status = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.new
              const priority = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]
              const deadline = formatDeadline(task.deadline)
              return (
                <div
                  key={task.id}
                  className={`bg-[#1a1a1a] rounded-[16px] p-5 border flex flex-col gap-3 ${
                    task.status === 'in_progress' ? 'border-amber-500/40' : 'border-[#2d2d2d]'
                  }`}
                >
                  {/* Status + priority */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex px-2.5 py-1 rounded-[8px] text-xs font-bold text-white ${status.color}`}>
                      {status.label}
                    </span>
                    {priority && (
                      <span className={`text-xs font-semibold ${priority.color}`}>{priority.label}</span>
                    )}
                  </div>

                  {/* Title */}
                  <p className="text-base font-semibold leading-snug">{task.title}</p>

                  {/* Meta */}
                  <div className="flex items-center justify-between mt-auto pt-1">
                    {task.category ? (
                      <span className="text-xs text-[#78736a] bg-[#2d2d2d] px-2 py-0.5 rounded-md">
                        {CATEGORY_LABELS[task.category] ?? task.category}
                      </span>
                    ) : <span />}
                    {task.assignee && (
                      <span className="text-xs text-[#78736a]">{task.assignee.full_name.split(' ')[0]}</span>
                    )}
                  </div>

                  {deadline && (
                    <p className={`text-xs ${deadline.isOverdue ? 'text-red-400 font-semibold' : 'text-[#78736a]'}`}>
                      {deadline.isOverdue ? '⚠ ' : ''}до {deadline.str}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-between px-8 py-3 border-t border-[#2d2d2d] bg-[#1a1a1a]">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-sm text-[#78736a] hover:text-[#f0ece4] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Выйти из режима киоска
        </button>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-2 text-sm text-[#78736a] hover:text-[#f0ece4] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </footer>
    </div>
  )
}
