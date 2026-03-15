'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Copy, Plus, Loader2, Link2, Clock, CheckSquare, TrendingUp, AlertCircle } from 'lucide-react'
import type { Profile, Invite } from '@/lib/types'

const ROLE_LABELS: Record<string, string> = { owner: 'Владелец', manager: 'Управляющий', worker: 'Сотрудник' }
const ROLE_BADGE_CLS: Record<string, string> = {
  owner: 'bg-amber-50 text-amber-700 border-amber-100',
  manager: 'bg-blue-50 text-blue-700 border-blue-100',
  worker: 'bg-green-50 text-green-700 border-green-100',
}

interface TaskStat { assigned_to: string | null; status: string; deadline: string | null }

interface TeamClientProps {
  profile: Profile
  members: Profile[]
  invites: Invite[]
  tasks: TaskStat[]
}

export default function TeamClient({ profile, members: initialMembers, invites: initialInvites, tasks }: TeamClientProps) {
  const [invites, setInvites] = useState<Invite[]>(initialInvites)
  const [role, setRole] = useState<'manager' | 'worker'>('worker')
  const [loading, setLoading] = useState(false)
  const [origin, setOrigin] = useState('')
  const supabase = createClient()

  useEffect(() => { setOrigin(window.location.origin) }, [])

  async function createInvite() {
    setLoading(true)
    const { data, error } = await supabase
      .from('invites')
      .insert({ restaurant_id: profile.restaurant_id, role, created_by: profile.id })
      .select().single()
    if (error) toast.error('Ошибка создания ссылки')
    else { setInvites(prev => [data, ...prev]); toast.success('Ссылка создана') }
    setLoading(false)
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`)
    toast.success('Ссылка скопирована')
  }

  function getStats(memberId: string) {
    const memberTasks = tasks.filter(t => t.assigned_to === memberId)
    return {
      total: memberTasks.length,
      done: memberTasks.filter(t => t.status === 'done').length,
      inProgress: memberTasks.filter(t => t.status === 'in_progress').length,
      overdue: memberTasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done').length,
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Команда</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{initialMembers.length} человек</p>
      </div>

      {/* Members */}
      <div className="space-y-3 mb-8">
        {initialMembers.map(member => {
          const initials = member.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
          const stats = getStats(member.id)

          return (
            <div key={member.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  {member.avatar_url && <AvatarImage src={member.avatar_url} alt={member.full_name} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{member.full_name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-lg border font-medium ${ROLE_BADGE_CLS[member.role] || 'bg-muted text-muted-foreground border-border'}`}>
                      {ROLE_LABELS[member.role] || member.role}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{member.email}</p>
                </div>
              </div>

              {/* Stats row */}
              {stats.total > 0 && (
                <div className="flex gap-3 mt-3 pt-3 border-t">
                  <div className="flex items-center gap-1.5">
                    <CheckSquare className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-xs text-muted-foreground">{stats.done} выполнено</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs text-muted-foreground">{stats.inProgress} в работе</span>
                  </div>
                  {stats.overdue > 0 && (
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                      <span className="text-xs text-red-500 font-medium">{stats.overdue} просрочено</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Separator className="mb-8" />

      {/* Invite */}
      <div className="mb-4">
        <h2 className="text-base font-semibold">Пригласить сотрудника</h2>
        <p className="text-muted-foreground text-sm mt-0.5">Ссылка активна 7 дней, одноразовая</p>
      </div>

      <div className="rounded-2xl border bg-card p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="space-y-2 flex-1">
            <Label>Роль</Label>
            <Select value={role} onValueChange={v => setRole(v as typeof role)}>
              <SelectTrigger><SelectValue>{ROLE_LABELS[role]}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="worker">Сотрудник</SelectItem>
                <SelectItem value="manager">Управляющий</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={createInvite} disabled={loading} className="gap-2 w-full sm:w-auto">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Создать ссылку
          </Button>
        </div>
      </div>

      {/* Active invites */}
      {invites.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Активные приглашения</p>
          {invites.map(inv => {
            const expired = new Date(inv.expires_at) < new Date()
            const daysLeft = Math.ceil((new Date(inv.expires_at).getTime() - Date.now()) / 86400000)
            return (
              <div key={inv.id} className="rounded-2xl border bg-card p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Link2 className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-lg border font-medium bg-muted text-foreground border-border">
                      {ROLE_LABELS[inv.role]}
                    </span>
                    {!expired
                      ? <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{daysLeft} дн.</span>
                      : <span className="text-xs text-red-500">Истекла</span>
                    }
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate font-mono">
                    {origin}/invite/{inv.token}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="shrink-0 h-8 w-8 p-0" onClick={() => copyLink(inv.token)} disabled={expired}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
