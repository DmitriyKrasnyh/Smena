'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Camera, X, Plus, Check, Pencil, MapPin } from 'lucide-react'
import type { Profile } from '@/lib/types'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец',
  manager: 'Управляющий',
  worker: 'Сотрудник',
}

interface SettingsClientProps {
  profile: Profile & { restaurants?: { id: string; name: string } | null }
  ownedRestaurants?: { id: string; name: string }[]
}

export default function SettingsClient({ profile, ownedRestaurants = [] }: SettingsClientProps) {
  const [fullName, setFullName] = useState(profile.full_name)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Restaurant management
  const [restaurants, setRestaurants] = useState(ownedRestaurants)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [savingRestaurant, setSavingRestaurant] = useState(false)
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const [addingRestaurant, setAddingRestaurant] = useState(false)
  const [newRestaurantName, setNewRestaurantName] = useState('')
  const [creatingRestaurant, setCreatingRestaurant] = useState(false)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()
  const isOwner = profile.role === 'owner'
  const activeRestaurantId = profile.restaurant_id

  const initials = profile.full_name
    .split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)

  // ─── Avatar ─────────────────────────────────────────────────────────────────

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Файл слишком большой. Максимум 2 МБ'); return }

    setUploadingAvatar(true)
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${profile.id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars').upload(path, file, { upsert: true })

    if (uploadError) { toast.error('Ошибка загрузки фото'); setUploadingAvatar(false); return }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const urlWithCache = `${publicUrl}?t=${Date.now()}`

    const { error } = await supabase.from('profiles').update({ avatar_url: urlWithCache }).eq('id', profile.id)
    if (error) { toast.error('Ошибка сохранения фото') }
    else { setAvatarUrl(urlWithCache); toast.success('Фото обновлено'); router.refresh() }
    setUploadingAvatar(false)
  }

  async function handleRemoveAvatar() {
    const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', profile.id)
    if (error) { toast.error('Ошибка') }
    else { setAvatarUrl(''); toast.success('Фото удалено'); router.refresh() }
  }

  // ─── Profile ─────────────────────────────────────────────────────────────────

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) return
    setSavingProfile(true)
    const { error } = await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', profile.id)
    if (error) toast.error('Ошибка сохранения')
    else { toast.success('Имя обновлено'); router.refresh() }
    setSavingProfile(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setSavingPassword(true)
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    })
    if (error) {
      toast.error('Не удалось отправить письмо')
    } else {
      toast.success('Письмо отправлено! Проверьте почту для смены пароля.')
    }
    setSavingPassword(false)
  }

  // ─── Restaurants ──────────────────────────────────────────────────────────────

  function startEdit(r: { id: string; name: string }) {
    setEditingId(r.id)
    setEditingName(r.name)
  }

  async function saveRestaurantName(id: string) {
    if (!editingName.trim()) return
    setSavingRestaurant(true)
    const { error } = await supabase.rpc('rename_restaurant', {
      p_restaurant_id: id,
      p_name: editingName.trim(),
    })
    if (error) {
      toast.error('Ошибка переименования')
    } else {
      setRestaurants(prev => prev.map(r => r.id === id ? { ...r, name: editingName.trim() } : r))
      setEditingId(null)
      toast.success('Название обновлено')
      router.refresh()
    }
    setSavingRestaurant(false)
  }

  async function handleSwitch(restaurantId: string) {
    if (restaurantId === activeRestaurantId) return
    setSwitchingId(restaurantId)
    const { error } = await supabase.rpc('switch_restaurant', { p_restaurant_id: restaurantId })
    if (error) toast.error('Ошибка переключения')
    else { toast.success('Точка переключена'); router.refresh() }
    setSwitchingId(null)
  }

  async function handleCreateRestaurant(e: React.FormEvent) {
    e.preventDefault()
    if (!newRestaurantName.trim()) return
    setCreatingRestaurant(true)
    const { data: newId, error } = await supabase.rpc('create_additional_restaurant', {
      p_name: newRestaurantName.trim(),
    })
    if (error) {
      toast.error('Ошибка создания точки')
    } else {
      const newR = { id: newId as string, name: newRestaurantName.trim() }
      setRestaurants(prev => [...prev, newR])
      setNewRestaurantName('')
      setAddingRestaurant(false)
      toast.success('Точка добавлена')
    }
    setCreatingRestaurant(false)
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Настройки</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Управление учётной записью</p>
      </div>

      {/* Avatar */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Фото профиля</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Аватар" className="w-20 h-20 rounded-2xl object-cover border border-[#e4ddd2]" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-[#f5f3f0] border border-[#e4ddd2] flex items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">{initials}</span>
                </div>
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 rounded-2xl bg-white/70 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-foreground" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              <Button type="button" variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar} className="gap-2">
                <Camera className="h-3.5 w-3.5" />
                {avatarUrl ? 'Заменить фото' : 'Загрузить фото'}
              </Button>
              {avatarUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={handleRemoveAvatar} className="gap-2 text-muted-foreground hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                  Удалить
                </Button>
              )}
              <p className="text-xs text-muted-foreground">JPG, PNG до 2 МБ</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Профиль</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Имя</Label>
              <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-muted-foreground">Электронная почта</span>
              <span className="text-sm font-medium">{profile.email}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-muted-foreground">Роль</span>
              <Badge>{ROLE_LABELS[profile.role] || profile.role}</Badge>
            </div>
            <Button type="submit" disabled={savingProfile || fullName.trim() === profile.full_name}>
              {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить имя
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Restaurants — только для владельца */}
      {isOwner && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Мои точки</CardTitle>
              <button
                onClick={() => { setAddingRestaurant(v => !v); setNewRestaurantName('') }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {addingRestaurant ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                {addingRestaurant ? 'Отмена' : 'Добавить точку'}
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Add form */}
            {addingRestaurant && (
              <form onSubmit={handleCreateRestaurant} className="flex gap-2 pb-1">
                <Input
                  placeholder="Название новой точки"
                  value={newRestaurantName}
                  onChange={e => setNewRestaurantName(e.target.value)}
                  autoFocus
                  required
                />
                <Button type="submit" size="sm" disabled={creatingRestaurant || !newRestaurantName.trim()}>
                  {creatingRestaurant ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Создать'}
                </Button>
              </form>
            )}

            {/* Restaurant list */}
            {restaurants.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Нет добавленных точек</p>
            ) : (
              <div className="space-y-2">
                {restaurants.map(r => {
                  const isActive = r.id === activeRestaurantId
                  const isEditing = editingId === r.id
                  return (
                    <div
                      key={r.id}
                      className={`flex items-center gap-3 p-3 rounded-[12px] border transition-colors ${
                        isActive ? 'border-[#1a1a1a] bg-[#faf9f7]' : 'border-[#e4ddd2] bg-card'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-[#1a1a1a]' : 'bg-[#f5f3f0]'
                      }`}>
                        <MapPin className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-muted-foreground'}`} />
                      </div>

                      {isEditing ? (
                        <form
                          onSubmit={e => { e.preventDefault(); saveRestaurantName(r.id) }}
                          className="flex-1 flex items-center gap-2"
                        >
                          <Input
                            value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            autoFocus
                            className="h-8 text-sm"
                          />
                          <Button type="submit" size="sm" variant="outline" className="h-8 px-2" disabled={savingRestaurant}>
                            {savingRestaurant ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          </Button>
                          <button type="button" onClick={() => setEditingId(null)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{r.name}</p>
                            {isActive && (
                              <p className="text-xs text-muted-foreground">Активная точка</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => startEdit(r)}
                              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                              title="Переименовать"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {!isActive && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2.5"
                                disabled={switchingId === r.id}
                                onClick={() => handleSwitch(r.id)}
                              >
                                {switchingId === r.id
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : 'Переключить'
                                }
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Password */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Смена пароля</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Мы отправим письмо на <span className="font-medium text-foreground">{profile.email}</span> со ссылкой для установки нового пароля.
          </p>
          <form onSubmit={handleChangePassword}>
            <Button type="submit" disabled={savingPassword}>
              {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Отправить ссылку для смены пароля
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
