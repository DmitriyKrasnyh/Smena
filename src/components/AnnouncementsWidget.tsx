'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Megaphone, Plus, Trash2, Loader2, X } from 'lucide-react'
import type { Profile, Announcement } from '@/lib/types'
import { toast } from 'sonner'

interface Props {
  profile: Profile
  initialAnnouncements: Announcement[]
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return 'только что'
  if (m < 60) return `${m} мин. назад`
  if (h < 24) return `${h} ч. назад`
  return `${d} дн. назад`
}

export default function AnnouncementsWidget({ profile, initialAnnouncements }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements)
  const [creating, setCreating] = useState(false)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const isManager = profile.role === 'owner' || profile.role === 'manager'

  useEffect(() => {
    const channel = supabase
      .channel('announcements-realtime')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'announcements',
        filter: `restaurant_id=eq.${profile.restaurant_id}`,
      }, async (payload) => {
        const { data } = await supabase
          .from('announcements')
          .select('*, author:profiles!announcements_created_by_fkey(id, full_name)')
          .eq('id', payload.new.id).single()
        if (data) setAnnouncements(prev => [data as Announcement, ...prev])
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'announcements',
      }, (payload) => {
        setAnnouncements(prev => prev.filter(a => a.id !== payload.old.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile.restaurant_id])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)

    const { data, error } = await supabase
      .from('announcements')
      .insert({
        restaurant_id: profile.restaurant_id,
        content: content.trim(),
        created_by: profile.id,
      })
      .select('*, author:profiles!announcements_created_by_fkey(id, full_name)')
      .single()

    if (error) {
      toast.error('Не удалось создать объявление')
    } else {
      setAnnouncements(prev => [data as Announcement, ...prev])
      setContent('')
      setCreating(false)
      toast.success('Объявление опубликовано')

      // Уведомить всех участников команды
      const { data: members } = await supabase
        .from('profiles')
        .select('id')
        .eq('restaurant_id', profile.restaurant_id)
        .neq('id', profile.id)

      if (members && members.length > 0) {
        await supabase.from('notifications').insert(
          members.map(m => ({
            user_id: m.id,
            restaurant_id: profile.restaurant_id,
            type: 'announcement',
            title: 'Новое объявление',
            body: content.trim().slice(0, 100),
            task_id: null,
            read: false,
          }))
        )
      }
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('announcements').delete().eq('id', id)
    if (error) toast.error('Ошибка удаления')
    else setAnnouncements(prev => prev.filter(a => a.id !== id))
  }

  if (announcements.length === 0 && !isManager) return null

  return (
    <div className="bg-card rounded-[14px] border border-[#e4ddd2] shadow-sm overflow-hidden animate-slide-up">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#e4ddd2]">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm text-foreground">Объявления</h2>
        </div>
        {isManager && (
          <button
            onClick={() => { setCreating(!creating); setContent('') }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            {creating ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {creating ? 'Отмена' : 'Добавить'}
          </button>
        )}
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="px-5 py-4 border-b border-[#e4ddd2] bg-[#faf9f7]">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Текст объявления для команды..."
            rows={3}
            autoFocus
            className="w-full px-3 py-2.5 rounded-[10px] border border-[#e4ddd2] bg-white text-sm text-foreground resize-none focus:outline-none focus:border-[#1a1a1a] focus:ring-2 focus:ring-[#1a1a1a]/10 transition-all"
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#1a1a1a] text-white text-xs font-semibold hover:bg-[#2d2d2d] disabled:opacity-40 transition-colors"
            >
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
              Опубликовать
            </button>
          </div>
        </form>
      )}

      {announcements.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-muted-foreground">Объявлений пока нет</p>
        </div>
      ) : (
        <ul className="divide-y divide-[#f0ece4]">
          {announcements.map(ann => (
            <li key={ann.id} className="px-5 py-4 group">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-[8px] bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Megaphone className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-muted-foreground">
                      {(ann as any).author?.full_name || 'Менеджер'}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{timeAgo(ann.created_at)}</span>
                  </div>
                </div>
                {isManager && (
                  <button
                    onClick={() => handleDelete(ann.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive transition-all rounded-lg hover:bg-red-50 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
