'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import {
  Plus, Send, Trash2, Check, Loader2,
  PlusCircle, RefreshCw, CheckCircle2, Pencil, ChevronDown, ChevronUp,
} from 'lucide-react'
import type { Task, Profile, TaskActivity } from '@/lib/types'

interface ChecklistItem {
  id: string
  task_id: string
  text: string
  completed: boolean
  position: number
}

interface Comment {
  id: string
  task_id: string
  author_id: string
  text: string
  created_at: string
  author?: Pick<Profile, 'id' | 'full_name'>
}

interface TaskDetailProps {
  task: Task
  profile: Profile
}

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  created:        PlusCircle,
  status_changed: RefreshCw,
  completed:      CheckCircle2,
  edited:         Pencil,
  comment_added:  Send,
}

const ACTIVITY_COLORS: Record<string, string> = {
  created:        'text-blue-500 bg-blue-50',
  status_changed: 'text-amber-500 bg-amber-50',
  completed:      'text-emerald-500 bg-emerald-50',
  edited:         'text-violet-500 bg-violet-50',
  comment_added:  'text-slate-500 bg-slate-50',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Новая', in_progress: 'В работе', done: 'Выполнено',
}

function activityText(item: TaskActivity): string {
  const name = item.full_name || 'Кто-то'
  switch (item.action) {
    case 'created':        return `${name} создал(а) задачу`
    case 'completed':      return `${name} выполнил(а) задачу`
    case 'edited':         return `${name} отредактировал(а) задачу`
    case 'comment_added':  return `${name} добавил(а) комментарий`
    case 'status_changed': {
      const from = STATUS_LABELS[(item.details?.from as string) || ''] || item.details?.from
      const to   = STATUS_LABELS[(item.details?.to   as string) || ''] || item.details?.to
      return `${name} изменил(а) статус: ${from} → ${to}`
    }
    default: return `${name} обновил(а) задачу`
  }
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

export default function TaskDetail({ task, profile }: TaskDetailProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [activity, setActivity] = useState<TaskActivity[]>([])
  const [newItem, setNewItem] = useState('')
  const [newComment, setNewComment] = useState('')
  const [addingItem, setAddingItem] = useState(false)
  const [sendingComment, setSendingComment] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activityOpen, setActivityOpen] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const isManager = profile.role === 'owner' || profile.role === 'manager'

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel(`task-detail-${task.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_checklist_items', filter: `task_id=eq.${task.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') setChecklist(p => [...p, payload.new as ChecklistItem])
          if (payload.eventType === 'UPDATE') setChecklist(p => p.map(i => i.id === payload.new.id ? payload.new as ChecklistItem : i))
          if (payload.eventType === 'DELETE') setChecklist(p => p.filter(i => i.id !== payload.old.id))
        }
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_comments', filter: `task_id=eq.${task.id}` },
        async (payload) => {
          const { data } = await supabase
            .from('task_comments')
            .select('*, author:profiles!task_comments_author_id_fkey(id, full_name)')
            .eq('id', payload.new.id)
            .single()
          if (data) setComments(p => [...p, data as Comment])
        }
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_activity', filter: `task_id=eq.${task.id}` },
        (payload) => {
          setActivity(p => [payload.new as TaskActivity, ...p])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [task.id])

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  async function loadData() {
    const [{ data: cl }, { data: cm }, { data: ac }] = await Promise.all([
      supabase.from('task_checklist_items').select('*').eq('task_id', task.id).order('position'),
      supabase.from('task_comments').select('*, author:profiles!task_comments_author_id_fkey(id, full_name)').eq('task_id', task.id).order('created_at'),
      supabase.from('task_activity').select('*').eq('task_id', task.id).order('created_at', { ascending: false }).limit(20),
    ])
    setChecklist(cl || [])
    setComments((cm || []) as Comment[])
    setActivity((ac || []) as TaskActivity[])
    setLoading(false)
  }

  async function addChecklistItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newItem.trim()) return
    setAddingItem(true)
    const { error } = await supabase.from('task_checklist_items').insert({
      task_id: task.id,
      text: newItem.trim(),
      position: checklist.length,
    })
    if (error) toast.error('Ошибка добавления пункта')
    else setNewItem('')
    setAddingItem(false)
  }

  async function toggleItem(item: ChecklistItem) {
    await supabase.from('task_checklist_items').update({ completed: !item.completed }).eq('id', item.id)
  }

  async function deleteItem(id: string) {
    await supabase.from('task_checklist_items').delete().eq('id', id)
  }

  async function sendComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim()) return
    setSendingComment(true)
    const { error } = await supabase.from('task_comments').insert({
      task_id: task.id,
      author_id: profile.id,
      text: newComment.trim(),
    })
    if (error) toast.error('Ошибка отправки комментария')
    else setNewComment('')
    setSendingComment(false)
  }

  const completedCount = checklist.filter(i => i.completed).length

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Checklist */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">
            Чек-лист
            {checklist.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                {completedCount}/{checklist.length}
              </span>
            )}
          </h3>
        </div>

        {checklist.length > 0 && (
          <div className="h-1.5 bg-muted rounded-full mb-3 overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / checklist.length) * 100}%` }}
            />
          </div>
        )}

        <div className="space-y-1.5 mb-2">
          {checklist.map(item => (
            <div key={item.id} className="flex items-center gap-2 group">
              <button
                onClick={() => toggleItem(item)}
                className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                  item.completed
                    ? 'bg-green-500 border-green-500'
                    : 'border-border hover:border-green-400'
                }`}
              >
                {item.completed && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </button>
              <span className={`flex-1 text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                {item.text}
              </span>
              {isManager && (
                <button
                  onClick={() => deleteItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {isManager && task.status !== 'done' && (
          <form onSubmit={addChecklistItem} className="flex gap-2">
            <Input
              placeholder="Добавить пункт..."
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              className="h-8 text-sm"
            />
            <Button type="submit" size="sm" variant="outline" className="h-8 px-2" disabled={addingItem}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </form>
        )}
      </div>

      <div className="border-t" />

      {/* Comments */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Комментарии</h3>

        <div className="space-y-3 mb-3 max-h-48 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Комментариев пока нет</p>
          ) : (
            comments.map(c => {
              const initials = (c.author?.full_name || 'U')
                .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
              const isMe = c.author_id === profile.id
              return (
                <div key={c.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                    <div className={`px-3 py-2 rounded-2xl text-sm ${
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted text-foreground rounded-tl-sm'
                    }`}>
                      {c.text}
                    </div>
                    <span className="text-xs text-muted-foreground px-1">
                      {isMe ? 'Вы' : c.author?.full_name?.split(' ')[0]} · {new Date(c.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )
            })
          )}
          <div ref={commentsEndRef} />
        </div>

        <form onSubmit={sendComment} className="flex gap-2">
          <Input
            placeholder="Написать комментарий..."
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            className="h-9 text-sm"
          />
          <Button type="submit" size="sm" className="h-9 px-3" disabled={sendingComment || !newComment.trim()}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>

      {/* Activity log */}
      {activity.length > 0 && (
        <>
          <div className="border-t" />
          <div>
            <button
              onClick={() => setActivityOpen(!activityOpen)}
              className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              История изменений
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md">{activity.length}</span>
              <span className="ml-auto">
                {activityOpen
                  ? <ChevronUp className="h-3.5 w-3.5" />
                  : <ChevronDown className="h-3.5 w-3.5" />}
              </span>
            </button>

            {activityOpen && (
              <div className="mt-3 space-y-2">
                {activity.map(item => {
                  const Icon = ACTIVITY_ICONS[item.action] || RefreshCw
                  const colorCls = ACTIVITY_COLORS[item.action] || 'text-slate-500 bg-slate-50'
                  return (
                    <div key={item.id} className="flex items-start gap-2.5">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${colorCls}`}>
                        <Icon className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground leading-snug">{activityText(item)}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(item.created_at)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
