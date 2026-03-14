'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Copy, Plus, Loader2, Link2, Clock } from 'lucide-react'
import type { Invite, Profile } from '@/lib/types'

const ROLE_LABELS: Record<string, string> = {
  manager: 'Управляющий',
  worker: 'Сотрудник',
}

export default function InvitePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [invites, setInvites] = useState<Invite[]>([])
  const [role, setRole] = useState<'manager' | 'worker'>('worker')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)

      if (p) {
        const { data: inv } = await supabase
          .from('invites')
          .select('*')
          .eq('restaurant_id', p.restaurant_id)
          .eq('used', false)
          .order('created_at', { ascending: false })
        setInvites(inv || [])
      }
      setFetching(false)
    }
    load()
  }, [])

  async function createInvite() {
    if (!profile) return
    setLoading(true)

    const { data, error } = await supabase
      .from('invites')
      .insert({
        restaurant_id: profile.restaurant_id,
        role,
        created_by: profile.id,
      })
      .select()
      .single()

    if (error) {
      toast.error('Ошибка создания ссылки')
    } else {
      setInvites(prev => [data, ...prev])
      toast.success('Ссылка создана')
    }
    setLoading(false)
  }

  function getInviteUrl(token: string) {
    return `${window.location.origin}/invite/${token}`
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(getInviteUrl(token))
    toast.success('Ссылка скопирована')
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Пригласить сотрудника</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Создайте ссылку и отправьте сотруднику
        </p>
      </div>

      {/* Create invite */}
      <Card className="border shadow-sm mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Новая ссылка-приглашение</CardTitle>
          <CardDescription>Ссылка активна 7 дней и может быть использована один раз</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="space-y-2 flex-1">
              <Label>Роль</Label>
              <Select value={role} onValueChange={v => setRole(v as typeof role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="worker">Сотрудник</SelectItem>
                  <SelectItem value="manager">Управляющий</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={createInvite} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              {loading ? '' : 'Создать ссылку'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active invites */}
      {invites.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Активные приглашения
          </h2>
          <div className="space-y-2">
            {invites.map(inv => {
              const expired = new Date(inv.expires_at) < new Date()
              const daysLeft = Math.ceil((new Date(inv.expires_at).getTime() - Date.now()) / 86400000)

              return (
                <Card key={inv.id} className="border">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Link2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {ROLE_LABELS[inv.role]}
                        </Badge>
                        {!expired && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {daysLeft} дн.
                          </span>
                        )}
                        {expired && <span className="text-xs text-red-500">Истекла</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate font-mono">
                        {getInviteUrl(inv.token)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => copyLink(inv.token)}
                      disabled={expired}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
