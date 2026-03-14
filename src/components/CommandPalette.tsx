'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  Search, LayoutDashboard, CheckSquare, Users, BarChart2,
  Settings, ArrowRight, Plus, Loader2, Monitor,
} from 'lucide-react'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ElementType
  action: () => void
  category: string
}

interface CommandPaletteProps {
  restaurantId?: string | null
  role?: string
}

export default function CommandPalette({ restaurantId, role }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [tasks, setTasks] = useState<{ id: string; title: string; status: string }[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // Listen for Cmd+K / Ctrl+K and custom event from Sidebar
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    function handleCustom() { setOpen(true) }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('openCommandPalette', handleCustom)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('openCommandPalette', handleCustom)
    }
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTasks([])
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Search tasks with debounce
  useEffect(() => {
    if (!query.trim() || !restaurantId) { setTasks([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('tasks')
        .select('id, title, status')
        .eq('restaurant_id', restaurantId)
        .ilike('title', `%${query}%`)
        .limit(5)
      setTasks(data || [])
      setSearching(false)
    }, 220)
    return () => clearTimeout(timer)
  }, [query, restaurantId])

  const navigate = (href: string) => { router.push(href); setOpen(false) }
  const isManager = role === 'owner' || role === 'manager'

  const STATUS_LABELS: Record<string, string> = {
    new: 'Новая', in_progress: 'В работе', done: 'Готово',
  }

  const navItems: CommandItem[] = [
    { id: 'home', label: 'Главная', description: 'Дашборд', icon: LayoutDashboard, action: () => navigate('/dashboard'), category: 'Навигация' },
    { id: 'tasks', label: 'Задачи', description: 'Все задачи', icon: CheckSquare, action: () => navigate('/dashboard/tasks'), category: 'Навигация' },
    ...(isManager ? [
      { id: 'team', label: 'Команда', description: 'Управление сотрудниками', icon: Users, action: () => navigate('/dashboard/team'), category: 'Навигация' },
      { id: 'analytics', label: 'Аналитика', description: 'Отчёты и статистика', icon: BarChart2, action: () => navigate('/dashboard/analytics'), category: 'Навигация' },
    ] : []),
    { id: 'settings', label: 'Настройки', description: 'Профиль и аккаунт', icon: Settings, action: () => navigate('/dashboard/settings'), category: 'Навигация' },
    { id: 'kiosk', label: 'Режим киоска', description: 'Полноэкранный вид для планшета', icon: Monitor, action: () => navigate('/kiosk'), category: 'Навигация' },
    ...(isManager ? [
      { id: 'new-task', label: 'Создать задачу', description: 'Открыть форму новой задачи', icon: Plus, action: () => navigate('/dashboard/tasks'), category: 'Действия' },
    ] : []),
  ]

  const taskItems: CommandItem[] = tasks.map(t => ({
    id: `task-${t.id}`,
    label: t.title,
    description: STATUS_LABELS[t.status] || t.status,
    icon: CheckSquare,
    action: () => navigate('/dashboard/tasks'),
    category: 'Задачи',
  }))

  const allItems: CommandItem[] = query.trim()
    ? [
        ...navItems.filter(i => i.label.toLowerCase().includes(query.toLowerCase())),
        ...taskItems,
      ]
    : navItems

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, allItems.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' && allItems[selectedIndex]) { allItems[selectedIndex].action() }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, allItems, selectedIndex])

  if (!open) return null

  // Group by category for rendering
  const categories: string[] = []
  const grouped: Record<string, CommandItem[]> = {}
  allItems.forEach(item => {
    if (!grouped[item.category]) {
      grouped[item.category] = []
      categories.push(item.category)
    }
    grouped[item.category].push(item)
  })

  let renderIndex = 0

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[14vh] px-4" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[520px] bg-card rounded-[18px] shadow-2xl border border-[#e4ddd2] overflow-hidden animate-pop"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#e4ddd2]">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0) }}
            placeholder="Поиск задач или команда..."
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
          />
          {searching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />}
          <kbd className="hidden sm:block text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-[#f5f3f0] text-muted-foreground border border-[#e4ddd2]">ESC</kbd>
        </div>

        {/* Results list */}
        <div className="max-h-[340px] overflow-y-auto py-1.5">
          {allItems.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Ничего не найдено</p>
          ) : (
            categories.map(cat => (
              <div key={cat}>
                <p className="text-[10px] font-bold text-muted-foreground px-4 pt-2 pb-1 uppercase tracking-widest">
                  {cat}
                </p>
                {grouped[cat].map(item => {
                  const idx = renderIndex++
                  const Icon = item.icon
                  const isSelected = idx === selectedIndex
                  return (
                    <button
                      key={item.id}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        isSelected ? 'bg-[#f5f3f0]' : 'hover:bg-[#faf9f7]'
                      )}
                    >
                      <div className={cn(
                        'w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 transition-colors',
                        isSelected ? 'bg-[#1a1a1a] text-[#f0ece4]' : 'bg-[#f5f3f0] text-muted-foreground'
                      )}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.label}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                        )}
                      </div>
                      {isSelected && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-[#e4ddd2] bg-[#faf9f7]">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <kbd className="font-mono px-1 rounded bg-white border border-[#e4ddd2] text-[10px]">↑↓</kbd> выбор
          </span>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <kbd className="font-mono px-1 rounded bg-white border border-[#e4ddd2] text-[10px]">↵</kbd> открыть
          </span>
          <span className="ml-auto text-[11px] text-muted-foreground font-medium">⌘K</span>
        </div>
      </div>
    </div>
  )
}
