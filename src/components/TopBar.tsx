'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  Bell, X, CheckCheck, UserPlus, RefreshCw, MessageCircle,
  Megaphone, Search, Menu,
} from 'lucide-react'
import type { Profile, Notification } from '@/lib/types'
import { toast } from 'sonner'

const NOTIF_ICONS: Record<string, React.ElementType> = {
  task_assigned: UserPlus,
  task_status:   RefreshCw,
  task_comment:  MessageCircle,
  announcement:  Megaphone,
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':            'Главная',
  '/dashboard/tasks':      'Задачи',
  '/dashboard/team':       'Команда',
  '/dashboard/analytics':  'Аналитика',
  '/dashboard/settings':   'Настройки',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return 'только что'
  if (m < 60) return `${m} мин.`
  if (h < 24) return `${h} ч.`
  return `${d} дн.`
}

export default function TopBar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])

  const unreadCount = notifications.filter(n => !n.read).length
  const pageTitle = PAGE_TITLES[pathname] ?? ''

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(30)
      if (data) setNotifications(data as Notification[])
    }
    load()

    const channel = supabase
      .channel(`topbar-notif-${profile.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${profile.id}`,
      }, (payload) => {
        const notif = payload.new as Notification
        setNotifications(prev => [notif, ...prev])
        toast.info(notif.title, { description: notif.body || undefined })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile.id])

  async function markAllRead() {
    if (unreadCount === 0) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', profile.id).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  function markRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    supabase.from('notifications').update({ read: true }).eq('id', id)
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center h-14 px-4 md:px-6 bg-[#f0ece4]/80 backdrop-blur-md border-b border-[#e4ddd2]">
        {/* Mobile hamburger */}
        <button
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-[8px] text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:bg-[#e4ddd2] transition-colors mr-3"
          onClick={() => document.dispatchEvent(new CustomEvent('openSidebar'))}
          aria-label="Меню"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Page title */}
        <p className="font-semibold text-sm text-foreground flex-1 min-w-0 truncate">
          {pageTitle}
        </p>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {/* Search */}
          <button
            onClick={() => document.dispatchEvent(new CustomEvent('openCommandPalette'))}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-[8px] text-muted-foreground hover:text-foreground hover:bg-[#e4ddd2] transition-colors"
          >
            <Search className="h-4 w-4" />
            <kbd className="hidden sm:inline text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-white border border-[#e4ddd2] text-muted-foreground leading-none">
              ⌘K
            </kbd>
          </button>

          {/* Notification bell */}
          <button
            onClick={() => setNotifOpen(true)}
            className="relative flex items-center justify-center w-8 h-8 rounded-[8px] text-muted-foreground hover:text-foreground hover:bg-[#e4ddd2] transition-colors"
            aria-label="Уведомления"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#f0ece4]" />
            )}
          </button>
        </div>
      </header>

      {/* Notification slide panel */}
      {notifOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setNotifOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-card border-l border-[#e4ddd2] shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e4ddd2]">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-foreground" />
                <h2 className="font-semibold text-sm">Уведомления</h2>
                {unreadCount > 0 && (
                  <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-medium leading-none">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Прочитать все
                  </button>
                )}
                <button
                  onClick={() => setNotifOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                    <Bell className="h-5 w-5 text-muted-foreground opacity-40" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Уведомлений нет</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Здесь появятся оповещения о задачах
                  </p>
                </div>
              ) : (
                notifications.map(notif => {
                  const Icon = NOTIF_ICONS[notif.type] || Bell
                  return (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markRead(notif.id)
                        if (notif.task_id) {
                          router.push('/dashboard/tasks')
                          setNotifOpen(false)
                        }
                      }}
                      className={cn(
                        'flex gap-3 px-5 py-4 border-b border-[#f0ece4] cursor-pointer transition-colors',
                        notif.read ? 'hover:bg-muted/50' : 'bg-blue-50/60 hover:bg-blue-50'
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                        notif.read ? 'bg-muted' : 'bg-blue-100'
                      )}>
                        <Icon className={cn('h-4 w-4', notif.read ? 'text-muted-foreground' : 'text-blue-600')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            'text-sm leading-snug',
                            notif.read ? 'text-foreground' : 'font-semibold text-foreground'
                          )}>
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                          )}
                        </div>
                        {notif.body && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{timeAgo(notif.created_at)}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
