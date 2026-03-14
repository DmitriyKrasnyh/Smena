'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  CheckSquare, Users, Settings, LogOut,
  LayoutDashboard, X, BarChart2,
  ChevronDown, Check, Plus, Loader2,
} from 'lucide-react'
import type { Profile } from '@/lib/types'
import { toast } from 'sonner'

interface SidebarProps {
  profile: Profile & { restaurants?: { name: string } | null }
  ownedRestaurants?: { id: string; name: string }[]
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец',
  manager: 'Управляющий',
  worker: 'Сотрудник',
}

const ROLE_COLORS: Record<string, string> = {
  owner:   'bg-amber-500/20 text-amber-400',
  manager: 'bg-blue-500/20 text-blue-400',
  worker:  'bg-emerald-500/20 text-emerald-400',
}

export default function Sidebar({ profile, ownedRestaurants = [] }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [switching, setSwitching] = useState(false)

  const isManager = profile.role === 'owner' || profile.role === 'manager'
  const isOwner = profile.role === 'owner'
  const hasMultipleRestaurants = isOwner && ownedRestaurants.length > 1
  const activeRestaurantId = profile.restaurant_id

  // Listen for mobile open event dispatched by TopBar
  useEffect(() => {
    const handler = () => setOpen(true)
    document.addEventListener('openSidebar', handler)
    return () => document.removeEventListener('openSidebar', handler)
  }, [])

  // Close on route change
  useEffect(() => { setOpen(false) }, [pathname])

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Вы вышли из системы')
    router.push('/login')
    router.refresh()
  }

  async function handleSwitch(restaurantId: string) {
    if (restaurantId === activeRestaurantId) { setSwitcherOpen(false); return }
    setSwitching(true)
    const { error } = await supabase.rpc('switch_restaurant', { p_restaurant_id: restaurantId })
    if (error) {
      toast.error('Ошибка переключения')
    } else {
      setSwitcherOpen(false)
      router.refresh()
    }
    setSwitching(false)
  }

  const initials = profile.full_name
    .split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const restaurantName = (profile as any).restaurants?.name || 'Заведение'

  const navItems = [
    { href: '/dashboard',             label: 'Главная',   icon: LayoutDashboard },
    { href: '/dashboard/tasks',       label: 'Задачи',    icon: CheckSquare },
    ...(isManager ? [
      { href: '/dashboard/team',      label: 'Команда',   icon: Users },
      { href: '/dashboard/analytics', label: 'Аналитика', icon: BarChart2 },
    ] : []),
    { href: '/dashboard/settings',    label: 'Настройки', icon: Settings },
  ]

  const SidebarContent = () => (
    <div className="flex flex-col h-full select-none">

      {/* Logo + Restaurant Switcher */}
      <div className="px-4 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] overflow-hidden shrink-0">
            <img src="/icon.svg" alt="Смена" className="w-full h-full" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm text-white leading-tight">Смена</p>

            {hasMultipleRestaurants ? (
              <div className="relative mt-0.5">
                <button
                  onClick={() => setSwitcherOpen(v => !v)}
                  disabled={switching}
                  className="flex items-center gap-1 text-xs text-[#78736a] hover:text-[#f0ece4] transition-colors max-w-full"
                >
                  {switching ? <Loader2 className="h-3 w-3 animate-spin shrink-0" /> : null}
                  <span className="truncate">{restaurantName}</span>
                  <ChevronDown className={cn('h-3 w-3 shrink-0 transition-transform', switcherOpen && 'rotate-180')} />
                </button>

                {switcherOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setSwitcherOpen(false)} />
                    <div className="absolute left-0 top-full mt-2 w-52 bg-[#2d2d2d] rounded-[12px] shadow-xl border border-[#3d3d3d] overflow-hidden z-40">
                      <div className="py-1">
                        {ownedRestaurants.map(r => (
                          <button
                            key={r.id}
                            onClick={() => handleSwitch(r.id)}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-[#3d3d3d] transition-colors text-left"
                          >
                            <div className={cn(
                              'w-5 h-5 rounded-md flex items-center justify-center shrink-0',
                              r.id === activeRestaurantId ? 'bg-[#f0ece4]' : 'bg-[#3d3d3d]'
                            )}>
                              {r.id === activeRestaurantId && (
                                <Check className="h-3 w-3 text-[#1a1a1a]" strokeWidth={2.5} />
                              )}
                            </div>
                            <span className={cn(
                              'truncate flex-1',
                              r.id === activeRestaurantId ? 'text-[#f0ece4] font-semibold' : 'text-[#a09a90]'
                            )}>
                              {r.name}
                            </span>
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-[#3d3d3d]">
                        <Link
                          href="/dashboard/settings"
                          onClick={() => { setSwitcherOpen(false); setOpen(false) }}
                          className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-[#78736a] hover:text-[#f0ece4] hover:bg-[#3d3d3d] transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Добавить точку
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-xs text-[#78736a] truncate mt-0.5">{restaurantName}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mx-4 h-px bg-[#2d2d2d]" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-[#f0ece4] text-[#1a1a1a] shadow-sm'
                  : 'text-[#78736a] hover:text-[#f0ece4] hover:bg-[#2d2d2d]'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="mx-4 h-px bg-[#2d2d2d]" />

      {/* User section */}
      <div className="px-3 py-4 space-y-1">
        <div className="flex items-center gap-3 px-3 py-3 rounded-[10px] bg-[#2d2d2d]">
          <div className="w-8 h-8 rounded-[8px] overflow-hidden shrink-0 border border-[#f0ece4]/10">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Аватар" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#f0ece4]/15 flex items-center justify-center">
                <span className="text-xs font-bold text-[#f0ece4]">{initials}</span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#f0ece4] truncate leading-tight">{profile.full_name}</p>
            <span className={cn(
              'inline-block text-[11px] px-1.5 py-0.5 rounded-md font-medium mt-0.5',
              ROLE_COLORS[profile.role] || 'bg-white/10 text-[#a09a90]'
            )}>
              {ROLE_LABELS[profile.role]}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm text-[#78736a] hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.8} />
          Выйти
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile overlay drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-[#1a1a1a] shadow-2xl animate-slide-up">
            <button
              className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-[8px] text-[#78736a] hover:text-[#f0ece4] hover:bg-[#2d2d2d] transition-all"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col h-screen sticky top-0 bg-[#1a1a1a]">
        <SidebarContent />
      </aside>
    </>
  )
}
