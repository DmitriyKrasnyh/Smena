import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  CheckSquare, Clock, AlertCircle, TrendingUp,
  ArrowRight, Plus, Users, LayoutTemplate, Flame,
} from 'lucide-react'
import Link from 'next/link'
import AnnouncementsWidget from '@/components/AnnouncementsWidget'

const STATUS_MAP = {
  new:         { label: 'Новая',     cls: 'bg-blue-50 text-[#3b82f6] border border-blue-100' },
  in_progress: { label: 'В работе',  cls: 'bg-amber-50 text-amber-600 border border-amber-100' },
  done:        { label: 'Выполнено', cls: 'bg-emerald-50 text-emerald-600 border border-emerald-100' },
}

const PRIORITY_DOT: Record<string, string> = {
  low:    'bg-[#94a3b8]',
  medium: 'bg-[#f59e0b]',
  high:   'bg-[#ef4444]',
}

const CATEGORY_LABEL: Record<string, string> = {
  kitchen: 'Кухня', hall: 'Зал', bar: 'Бар',
  admin: 'Администрация', cleaning: 'Уборка', other: 'Другое',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, restaurants(name)')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/register')

  const isManager = profile.role === 'owner' || profile.role === 'manager'

  let query = supabase
    .from('tasks')
    .select('*, assignee:profiles!tasks_assigned_to_fkey(id, full_name)')
    .eq('restaurant_id', profile.restaurant_id)
  if (!isManager) query = query.eq('assigned_to', user.id)
  const { data: tasks = [] } = await query

  const { data: announcements = [] } = await supabase
    .from('announcements')
    .select('*, author:profiles!announcements_created_by_fkey(id, full_name)')
    .eq('restaurant_id', profile.restaurant_id)
    .order('created_at', { ascending: false })
    .limit(10)

  let teamCount = 0
  if (isManager) {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', profile.restaurant_id)
    teamCount = count || 0
  }

  const newTasks   = tasks?.filter(t => t.status === 'new') || []
  const inProgress = tasks?.filter(t => t.status === 'in_progress') || []
  const done       = tasks?.filter(t => t.status === 'done') || []
  const overdue    = tasks?.filter(t =>
    t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done'
  ) || []
  const urgent     = tasks?.filter(t => t.priority === 'high' && t.status !== 'done') || []

  const recentTasks = [...(tasks || [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const total = tasks?.length || 0
  const donePercent = total > 0 ? Math.round((done.length / total) * 100) : 0

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Доброе утро' : hour < 17 ? 'Добрый день' : 'Добрый вечер'
  const firstName = profile.full_name.split(' ')[0]

  const now = new Date()
  const dateStr = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
  const dateFormatted = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  const stats = [
    { label: 'Новые',      value: newTasks.length,   icon: AlertCircle, color: '#3b82f6', bg: '#eff6ff', border: '#dbeafe' },
    { label: 'В работе',   value: inProgress.length, icon: TrendingUp,  color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
    { label: 'Выполнено',  value: done.length,       icon: CheckSquare, color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
    { label: 'Просрочено', value: overdue.length,    icon: Clock,       color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  ]

  // Deduplicated urgent + overdue list
  const alertTasks = [...new Map([...overdue, ...urgent].map(t => [t.id, t])).values()].slice(0, 4)

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="mb-7 animate-slide-up">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground mb-1 tracking-widest uppercase">
              {dateFormatted}
            </p>
            <h1 className="text-2xl md:text-[28px] font-bold text-foreground tracking-tight leading-tight">
              {greeting}, {firstName}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {isManager
                ? total > 0
                  ? `${total} задач · выполнено ${donePercent}%`
                  : 'Обзор задач вашей команды'
                : `${newTasks.length + inProgress.length} активных задач`
              }
            </p>
          </div>

          {isManager && (
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/dashboard/team"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-[#f5f3f0] border border-[#e4ddd2] text-[#1a1a1a] text-sm font-medium hover:bg-[#ece8e1] transition-colors"
              >
                <Users className="h-3.5 w-3.5" />
                Команда
                {teamCount > 0 && (
                  <span className="text-xs text-muted-foreground">({teamCount})</span>
                )}
              </Link>
              <Link
                href="/dashboard/tasks"
                className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#1a1a1a] text-white text-sm font-semibold hover:bg-[#2d2d2d] transition-colors shadow-sm shadow-black/20"
              >
                <Plus className="h-4 w-4" />
                Новая задача
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {stats.map(({ label, value, icon: Icon, color, bg, border }, i) => (
          <Link
            key={label}
            href="/dashboard/tasks"
            className="bg-card rounded-[14px] border p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-px animate-slide-up group"
            style={{ borderColor: border, animationDelay: `${i * 55}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center"
                style={{ backgroundColor: bg }}
              >
                <Icon className="h-4 w-4" style={{ color }} strokeWidth={2} />
              </div>
              <ArrowRight
                className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground mt-0.5 transition-colors"
              />
            </div>
            <p className="font-num text-[32px] font-bold text-foreground leading-none mb-1">{value}</p>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
          </Link>
        ))}
      </div>

      {/* ── Progress bar (managers) ── */}
      {isManager && total > 0 && (
        <div
          className="bg-card rounded-[14px] border border-[#e4ddd2] px-5 py-4 mb-5 animate-slide-up"
          style={{ animationDelay: '240ms' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">Прогресс выполнения</span>
            <span className="text-xs font-bold text-foreground">{donePercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-[#f0ece4] overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${donePercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-muted-foreground">
              {done.length} из {total} задач выполнено
            </span>
            {overdue.length > 0 && (
              <span className="text-[11px] font-semibold text-[#ef4444]">
                {overdue.length} просрочено
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

        {/* Left — main content */}
        <div className="space-y-5">

          {/* Urgent / overdue alert */}
          {alertTasks.length > 0 && (
            <div
              className="bg-red-50 border border-red-200 rounded-[14px] px-5 py-4 animate-slide-up"
              style={{ animationDelay: '280ms' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-red-500" />
                  <h3 className="text-sm font-semibold text-red-700">Требуют внимания</h3>
                </div>
                <Link
                  href="/dashboard/tasks"
                  className="text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors"
                >
                  Все →
                </Link>
              </div>
              <ul className="space-y-2">
                {alertTasks.map(task => (
                  <li key={task.id}>
                    <Link href="/dashboard/tasks" className="flex items-center gap-3 group">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]}`} />
                      <span className="text-sm text-red-800 font-medium truncate group-hover:underline flex-1 min-w-0">
                        {task.title}
                      </span>
                      {task.deadline && (
                        <span className="text-[11px] text-red-400 shrink-0">
                          до {new Date(task.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recent tasks */}
          <div
            className="bg-card rounded-[14px] border border-[#e4ddd2] shadow-sm overflow-hidden animate-slide-up"
            style={{ animationDelay: '320ms' }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e4ddd2]">
              <h2 className="font-semibold text-sm text-foreground">Последние задачи</h2>
              <Link
                href="/dashboard/tasks"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                Все задачи
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recentTasks.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <div className="w-12 h-12 rounded-[14px] bg-[#f5f3f0] flex items-center justify-center mx-auto mb-3">
                  <CheckSquare className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="font-semibold text-sm text-foreground">Задач пока нет</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  {isManager ? 'Создайте первую задачу для команды' : 'Вам пока не назначены задачи'}
                </p>
                {isManager && (
                  <Link
                    href="/dashboard/tasks"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#1a1a1a] text-white text-xs font-medium hover:bg-[#2d2d2d] transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Создать задачу
                  </Link>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-[#f0ece4]">
                {recentTasks.map(task => {
                  const s = STATUS_MAP[task.status as keyof typeof STATUS_MAP]
                  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done'
                  const stripe = isOverdue ? '#ef4444'
                    : task.status === 'done'        ? '#10b981'
                    : task.status === 'in_progress' ? '#f59e0b'
                    : '#3b82f6'
                  const assigneeName = (task.assignee as any)?.full_name?.split(' ')[0]
                  return (
                    <li key={task.id}>
                      <Link
                        href="/dashboard/tasks"
                        className="flex items-stretch hover:bg-[#faf9f7] transition-colors group"
                      >
                        <div className="w-[3px] shrink-0 rounded-l-sm" style={{ backgroundColor: stripe }} />
                        <div className="flex items-center gap-3 flex-1 px-4 py-3.5 min-w-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] || 'bg-slate-300'}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                              {task.title}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {assigneeName && (
                                <span className="text-xs text-muted-foreground">{assigneeName}</span>
                              )}
                              {task.category && task.category !== 'other' && (
                                <>
                                  {assigneeName && <span className="text-xs text-muted-foreground/50">·</span>}
                                  <span className="text-xs text-muted-foreground">{CATEGORY_LABEL[task.category]}</span>
                                </>
                              )}
                              {task.deadline && (
                                <>
                                  <span className="text-xs text-muted-foreground/50">·</span>
                                  <span className={`text-xs ${isOverdue ? 'text-[#ef4444] font-medium' : 'text-muted-foreground'}`}>
                                    {isOverdue ? 'Просрочено' : `до ${new Date(task.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium shrink-0 ${s?.cls}`}>
                            {s?.label}
                          </span>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Right — sidebar */}
        <div className="space-y-5">

          {/* Quick actions (managers) */}
          {isManager && (
            <div
              className="bg-card rounded-[14px] border border-[#e4ddd2] shadow-sm p-4 animate-slide-up"
              style={{ animationDelay: '200ms' }}
            >
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                Быстрые действия
              </p>
              <div className="space-y-1">
                {[
                  { href: '/dashboard/tasks',    icon: Plus,           label: 'Создать задачу' },
                  { href: '/dashboard/team',     icon: Users,          label: 'Управление командой' },
                  { href: '/dashboard/tasks',    icon: LayoutTemplate, label: 'Шаблоны задач' },
                  { href: '/kiosk',              icon: CheckSquare,    label: 'Режим киоска' },
                ].map(({ href, icon: Icon, label }) => (
                  <Link
                    key={label}
                    href={href}
                    className="flex items-center gap-3 px-2.5 py-2 rounded-[10px] hover:bg-[#f5f3f0] transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-[8px] bg-[#f5f3f0] group-hover:bg-white border border-[#e4ddd2] flex items-center justify-center shrink-0 transition-colors">
                      <Icon className="h-3.5 w-3.5 text-[#1a1a1a]" strokeWidth={1.8} />
                    </div>
                    <span className="text-sm font-medium text-foreground flex-1">{label}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Announcements */}
          <AnnouncementsWidget profile={profile} initialAnnouncements={announcements || []} />
        </div>
      </div>
    </div>
  )
}
