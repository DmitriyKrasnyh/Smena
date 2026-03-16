'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Plus, Loader2, Calendar, User, Flag, RefreshCw, Trash2,
  ChevronDown, ChevronUp, LayoutGrid, List, Archive, Download,
  Pencil, Tag, Camera, X,
} from 'lucide-react'
import { useRef } from 'react'
import type { Task, Profile, TaskTemplate } from '@/lib/types'
import TaskDetail from './TaskDetail'

const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

const CATEGORIES: { value: string; label: string; icon: string }[] = [
  { value: 'kitchen',  label: 'Кухня',           icon: '🍳' },
  { value: 'hall',     label: 'Зал',              icon: '🪑' },
  { value: 'bar',      label: 'Бар',              icon: '🍹' },
  { value: 'admin',    label: 'Администрация',    icon: '📋' },
  { value: 'cleaning', label: 'Уборка',           icon: '🧹' },
  { value: 'other',    label: 'Другое',           icon: '📌' },
]

const STATUS_CONFIG = {
  new:         { label: 'Новая',     cls: 'bg-blue-50 text-[#3b82f6] border border-blue-100',        stripe: '#3b82f6', next: 'in_progress', nextLabel: 'Взять в работу' },
  in_progress: { label: 'В работе',  cls: 'bg-amber-50 text-amber-600 border border-amber-100',      stripe: '#f59e0b', next: 'done',        nextLabel: 'Выполнено' },
  done:        { label: 'Выполнено', cls: 'bg-emerald-50 text-emerald-600 border border-emerald-100', stripe: '#10b981', next: null,          nextLabel: '' },
}

const PRIORITY_CONFIG = {
  low:    { label: 'Низкий',  color: 'text-[#94a3b8]', dot: 'bg-[#94a3b8]' },
  medium: { label: 'Средний', color: 'text-[#f59e0b]', dot: 'bg-[#f59e0b]' },
  high:   { label: 'Высокий', color: 'text-[#ef4444]', dot: 'bg-[#ef4444]' },
}

function getCategoryLabel(value: string | null) {
  return CATEGORIES.find(c => c.value === (value || 'other'))?.label || 'Другое'
}

type StatusFilter = 'all' | 'new' | 'in_progress' | 'done'
type Tab = 'tasks' | 'templates'
type ViewMode = 'list' | 'kanban'

interface TasksClientProps {
  tasks: Task[]
  workers: { id: string; full_name: string; role: string }[]
  profile: Profile
  templates: TaskTemplate[]
}

// Shared date/time input styles
const inputCls = 'w-full h-10 px-3 rounded-[10px] border border-[#e4ddd2] bg-[#faf9f7] text-sm text-foreground focus:outline-none focus:border-[#1a1a1a] focus:ring-2 focus:ring-[#1a1a1a]/10 transition-all'

export default function TasksClient({ tasks: initialTasks, workers, profile, templates: initialTemplates }: TasksClientProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [templates, setTemplates] = useState<TaskTemplate[]>(initialTemplates)
  const [tab, setTab] = useState<Tab>('tasks')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Dialog states
  const [open, setOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [completeDialog, setCompleteDialog] = useState<Task | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<Task | null>(null)

  // Complete form
  const [completionNote, setCompletionNote] = useState('')
  const [completionPhoto, setCompletionPhoto] = useState<File | null>(null)
  const [completionPhotoPreview, setCompletionPhotoPreview] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>(
    profile.role === 'owner' || profile.role === 'manager' ? 'all' : profile.id
  )
  const [categoryFilter, setCategoryFilter] = useState('all')

  const [loading, setLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [showArchive, setShowArchive] = useState(false)

  // Create task form
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [deadline, setDeadline] = useState('')
  const [category, setCategory] = useState('other')

  // Edit task form
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [editAssignedTo, setEditAssignedTo] = useState('')
  const [editDeadline, setEditDeadline] = useState('')
  const [editCategory, setEditCategory] = useState('other')

  // Template form
  const [tmplTitle, setTmplTitle] = useState('')
  const [tmplDescription, setTmplDescription] = useState('')
  const [tmplPriority, setTmplPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [tmplAssignedTo, setTmplAssignedTo] = useState('')
  const [tmplAssigneeMode, setTmplAssigneeMode] = useState<'single' | 'random'>('single')
  const [tmplRandomAssignees, setTmplRandomAssignees] = useState<string[]>([])
  const [tmplRecurrenceType, setTmplRecurrenceType] = useState<'daily' | 'weekly'>('daily')
  const [tmplDays, setTmplDays] = useState<number[]>([])
  const [tmplCategory, setTmplCategory] = useState('other')
  const [tmplScheduledTime, setTmplScheduledTime] = useState('')

  const supabase = createClient()
  const isManager = profile.role === 'owner' || profile.role === 'manager'

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks', filter: `restaurant_id=eq.${profile.restaurant_id}` },
        async (payload) => {
          if (!isManager && payload.new.assigned_to !== profile.id) return
          const { data } = await supabase
            .from('tasks')
            .select('*, assignee:profiles!tasks_assigned_to_fkey(id, full_name), creator:profiles!tasks_created_by_fkey(id, full_name)')
            .eq('id', payload.new.id).single()
          if (data) setTasks(prev => prev.some(t => t.id === data.id) ? prev : [data, ...prev])
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `restaurant_id=eq.${profile.restaurant_id}` },
        (payload) => setTasks(prev => prev.map(t =>
          t.id === payload.new.id
            ? { ...t, ...payload.new, assignee: t.assignee, creator: t.creator }
            : t
        ))
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' },
        (payload) => setTasks(prev => prev.filter(t => t.id !== payload.old.id))
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile.restaurant_id, profile.id, isManager])

  const ARCHIVE_DAYS = 3
  const isArchived = (t: Task) =>
    t.status === 'done' &&
    new Date(t.updated_at).getTime() < Date.now() - ARCHIVE_DAYS * 86400000

  const filteredTasks = tasks.filter(t => {
    if (!showArchive && isArchived(t)) return false
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (assigneeFilter !== 'all' && t.assigned_to !== assigneeFilter) return false
    if (categoryFilter !== 'all' && (t.category || 'other') !== categoryFilter) return false
    return true
  })

  const archivedCount = tasks.filter(isArchived).length

  function exportCSV() {
    const rows = filteredTasks.map(t => ({
      Название: t.title,
      Статус: STATUS_CONFIG[t.status]?.label || t.status,
      Приоритет: PRIORITY_CONFIG[t.priority]?.label || t.priority,
      Категория: getCategoryLabel(t.category),
      Исполнитель: (t as any).assignee?.full_name || '',
      Срок: t.deadline ? new Date(t.deadline).toLocaleDateString('ru-RU') : '',
      Комментарий: t.completion_note || '',
      Создана: new Date(t.created_at).toLocaleDateString('ru-RU'),
    }))
    const headers = Object.keys(rows[0] || {})
    const csv = [headers.join(';'), ...rows.map(r => headers.map(h => `"${(r as any)[h]}"`).join(';'))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `задачи-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const isOverdue = (task: Task) =>
    task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done'

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function logActivity(task_id: string, action: string, details?: Record<string, unknown>) {
    supabase.from('task_activity').insert({
      task_id, user_id: profile.id, full_name: profile.full_name, action, details: details || null,
    })
  }

  function sendNotification(user_id: string, type: string, title: string, body: string, task_id: string) {
    supabase.from('notifications').insert({
      user_id, restaurant_id: profile.restaurant_id, type, title, body, task_id, read: false,
    })
  }

  // ─── Task actions ───────────────────────────────────────────────────────────

  async function handleStatusChange(task: Task) {
    const next = STATUS_CONFIG[task.status].next
    if (!next) return
    if (next === 'done') { setCompleteDialog(task); return }

    setUpdatingId(task.id)
    const { error } = await supabase.from('tasks').update({ status: next }).eq('id', task.id)
    if (error) {
      toast.error('Ошибка обновления статуса')
    } else {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next as Task['status'] } : t))
      toast.success('Задача взята в работу')
      logActivity(task.id, 'status_changed', { from: task.status, to: next })
      if (task.created_by && task.created_by !== profile.id) {
        sendNotification(task.created_by, 'task_status', 'Задача взята в работу',
          `${profile.full_name} взял(а) задачу «${task.title}»`, task.id)
      }
    }
    setUpdatingId(null)
  }

  async function handleComplete() {
    if (!completeDialog) return
    setUpdatingId(completeDialog.id)

    let photoUrl: string | null = null
    if (completionPhoto) {
      const ext = completionPhoto.name.split('.').pop() || 'jpg'
      const path = `${profile.restaurant_id}/${completeDialog.id}.${ext}`
      const { data: uploaded } = await supabase.storage
        .from('task-photos')
        .upload(path, completionPhoto, { upsert: true })
      if (uploaded) {
        const { data: { publicUrl } } = supabase.storage.from('task-photos').getPublicUrl(path)
        photoUrl = publicUrl
      }
    }

    const { error } = await supabase.from('tasks').update({
      status: 'done',
      completion_note: completionNote || null,
      photo_url: photoUrl,
    }).eq('id', completeDialog.id)

    if (error) {
      toast.error('Ошибка')
    } else {
      setTasks(prev => prev.map(t =>
        t.id === completeDialog.id
          ? { ...t, status: 'done', completion_note: completionNote || null, photo_url: photoUrl }
          : t
      ))
      toast.success('Задача выполнена! 🎉')
      logActivity(completeDialog.id, 'completed', { note: completionNote || null })
      if (completeDialog.created_by && completeDialog.created_by !== profile.id) {
        sendNotification(completeDialog.created_by, 'task_status', 'Задача выполнена',
          `${profile.full_name} выполнил(а) «${completeDialog.title}»`, completeDialog.id)
      }
    }
    setUpdatingId(null)
    setCompleteDialog(null)
    setCompletionNote('')
    setCompletionPhoto(null)
    setCompletionPhotoPreview(null)
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    if (isManager && !assignedTo) { toast.error('Выберите исполнителя'); return }
    setLoading(true)

    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert({
        title, description: description || null,
        assigned_to: assignedTo || profile.id,
        created_by: profile.id,
        restaurant_id: profile.restaurant_id,
        priority, deadline: deadline || null, status: 'new', category,
      })
      .select('*, assignee:profiles!tasks_assigned_to_fkey(id, full_name), creator:profiles!tasks_created_by_fkey(id, full_name)')
      .single()

    if (error) {
      toast.error('Не удалось создать задачу')
    } else {
      setTasks(prev => [newTask, ...prev])
      setOpen(false)
      resetForm()
      toast.success('Задача создана')
      logActivity(newTask.id, 'created', { title: newTask.title })
      const target = assignedTo || profile.id
      if (target !== profile.id) {
        sendNotification(target, 'task_assigned', 'Новая задача',
          `${profile.full_name} назначил(а) вам задачу «${title}»`, newTask.id)
      }
    }
    setLoading(false)
  }

  function resetForm() {
    setTitle(''); setDescription(''); setAssignedTo(''); setPriority('medium'); setDeadline(''); setCategory('other')
  }

  // ─── Edit task ─────────────────────────────────────────────────────────────

  function openEditDialog(task: Task) {
    setEditTask(task)
    setEditTitle(task.title)
    setEditDescription(task.description || '')
    setEditPriority(task.priority)
    setEditAssignedTo(task.assigned_to || '')
    setEditDeadline(task.deadline || '')
    setEditCategory(task.category || 'other')
    setEditOpen(true)
  }

  async function handleEditTask(e: React.FormEvent) {
    e.preventDefault()
    if (!editTask) return
    setLoading(true)

    const { error } = await supabase
      .from('tasks')
      .update({
        title: editTitle,
        description: editDescription || null,
        priority: editPriority,
        assigned_to: editAssignedTo || null,
        deadline: editDeadline || null,
        category: editCategory,
      })
      .eq('id', editTask.id)

    if (error) {
      toast.error('Ошибка редактирования')
    } else {
      setTasks(prev => prev.map(t =>
        t.id === editTask.id
          ? { ...t, title: editTitle, description: editDescription || null, priority: editPriority,
              assigned_to: editAssignedTo || null, deadline: editDeadline || null, category: editCategory as Task['category'] }
          : t
      ))
      setEditOpen(false)
      toast.success('Задача обновлена')
      logActivity(editTask.id, 'edited', { title: editTitle })
      // Notify new assignee if changed
      if (editAssignedTo && editAssignedTo !== editTask.assigned_to && editAssignedTo !== profile.id) {
        sendNotification(editAssignedTo, 'task_assigned', 'Назначена задача',
          `${profile.full_name} назначил(а) вам задачу «${editTitle}»`, editTask.id)
      }
    }
    setLoading(false)
  }

  // ─── Delete task ────────────────────────────────────────────────────────────

  async function handleDeleteTask() {
    if (!deleteDialog) return
    const { error } = await supabase.from('tasks').delete().eq('id', deleteDialog.id)
    if (error) toast.error('Ошибка удаления')
    else {
      setTasks(prev => prev.filter(t => t.id !== deleteDialog.id))
      toast.success('Задача удалена')
    }
    setDeleteDialog(null)
  }

  // ─── Template actions ───────────────────────────────────────────────────────

  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault()
    if (tmplRecurrenceType === 'weekly' && tmplDays.length === 0) { toast.error('Выберите хотя бы один день'); return }
    if (tmplAssigneeMode === 'random' && tmplRandomAssignees.length < 2) { toast.error('Выберите минимум 2 сотрудников для случайного выбора'); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('task_templates')
      .insert({
        title: tmplTitle, description: tmplDescription || null,
        priority: tmplPriority,
        assigned_to: tmplAssigneeMode === 'single' ? (tmplAssignedTo || null) : null,
        random_assignees: tmplAssigneeMode === 'random' ? tmplRandomAssignees : null,
        restaurant_id: profile.restaurant_id, created_by: profile.id,
        recurrence_type: tmplRecurrenceType,
        recurrence_days: tmplRecurrenceType === 'weekly' ? tmplDays : null,
        category: tmplCategory,
        scheduled_time: tmplScheduledTime || null,
      })
      .select('*, assignee:profiles!task_templates_assigned_to_fkey(id, full_name)')
      .single()
    if (error) toast.error('Не удалось создать шаблон')
    else { setTemplates(prev => [data, ...prev]); setTemplateOpen(false); resetTemplateForm(); toast.success('Шаблон создан') }
    setLoading(false)
  }

  function resetTemplateForm() {
    setTmplTitle(''); setTmplDescription(''); setTmplPriority('medium'); setTmplAssignedTo('')
    setTmplAssigneeMode('single'); setTmplRandomAssignees([])
    setTmplRecurrenceType('daily'); setTmplDays([]); setTmplCategory('other')
    setTmplScheduledTime('')
  }

  async function handleDeleteTemplate(id: string) {
    const { error } = await supabase.from('task_templates').delete().eq('id', id)
    if (!error) { setTemplates(prev => prev.filter(t => t.id !== id)); toast.success('Шаблон удалён') }
  }

  async function handleToggleTemplate(tmpl: TaskTemplate) {
    const { error } = await supabase.from('task_templates').update({ active: !tmpl.active }).eq('id', tmpl.id)
    if (!error) setTemplates(prev => prev.map(t => t.id === tmpl.id ? { ...t, active: !t.active } : t))
  }

  // ─── Task card (list view) ─────────────────────────────────────────────────

  const TaskCard = ({ task }: { task: Task }) => {
    const overdueTask = isOverdue(task)
    const priorityCfg = PRIORITY_CONFIG[task.priority]
    const statusCfg = STATUS_CONFIG[task.status]
    const isExpanded = expandedId === task.id
    const stripeColor = overdueTask ? '#ef4444' : statusCfg.stripe
    const catIcon = CATEGORIES.find(c => c.value === (task.category || 'other'))?.icon || '📌'
    const isUrgent = (overdueTask || task.priority === 'high') && task.status !== 'done'

    return (
      <div className={`flex rounded-[14px] border overflow-hidden transition-all duration-200
        ${isUrgent ? 'border-red-200 bg-red-50/30' : 'bg-card border-[#e4ddd2]'}
        ${isExpanded ? 'shadow-md' : 'shadow-sm hover:shadow-md hover:-translate-y-px'}`}
      >
        <div className="w-[3px] shrink-0 rounded-l-sm" style={{ backgroundColor: stripeColor }} />
        <div className="flex-1 min-w-0 overflow-hidden">

          {/* Main content row */}
          <div className="p-3 sm:p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : task.id)}>
            <div className="flex items-start gap-2.5">
              <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${priorityCfg.dot}`} />
              <div className="flex-1 min-w-0">
                {/* Title + status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm leading-snug break-words ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {overdueTask && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-100 text-red-600 border border-red-200 leading-none">
                          Просрочено
                        </span>
                      )}
                      {!overdueTask && task.priority === 'high' && task.status !== 'done' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-50 text-red-500 border border-red-100 leading-none">
                          Срочно
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-lg border font-medium whitespace-nowrap ${statusCfg.cls}`}>
                      {statusCfg.label}
                    </span>
                    <button
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={e => { e.stopPropagation(); setExpandedId(isExpanded ? null : task.id) }}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {task.description && !isExpanded && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
                )}
                {task.completion_note && task.status === 'done' && !isExpanded && (
                  <p className="text-xs text-green-700 bg-green-50 rounded-lg px-2.5 py-1.5 mt-2 border border-green-100">
                    💬 {task.completion_note}
                  </p>
                )}
                {task.photo_url && task.status === 'done' && !isExpanded && (
                  <img src={task.photo_url} alt="Фото выполнения" className="mt-2 h-16 w-24 object-cover rounded-lg border" />
                )}

                {/* Meta */}
                <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">{catIcon}</span>
                  {(task as any).assignee && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-[80px]">{(task as any).assignee.full_name.split(' ')[0]}</span>
                    </span>
                  )}
                  {task.deadline && (
                    <span className={`flex items-center gap-1 text-xs font-medium whitespace-nowrap ${overdueTask ? 'text-red-500' : 'text-muted-foreground'}`}>
                      <Calendar className="h-3 w-3 shrink-0" />
                      до {new Date(task.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                  <span className={`flex items-center gap-1 text-xs whitespace-nowrap ${priorityCfg.color}`}>
                    <Flag className="h-3 w-3 shrink-0" />
                    {priorityCfg.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons — always below content */}
          {(statusCfg.next || isManager) && !isExpanded && (
            <div className="px-3 sm:px-4 pb-3 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
              {statusCfg.next && (
                <button
                  disabled={updatingId === task.id}
                  onClick={e => { e.stopPropagation(); handleStatusChange(task) }}
                  className={`flex-1 sm:flex-none h-8 px-3 text-xs font-semibold rounded-[8px] transition-all flex items-center justify-center gap-1.5
                    ${isUrgent ? 'bg-[#1a1a1a] text-white hover:bg-[#2d2d2d]' : task.status === 'new'
                      ? 'bg-white text-foreground border border-[#e4ddd2] hover:bg-[#f5f3f0]'
                      : 'bg-[#1a1a1a] text-white hover:bg-[#2d2d2d]'}`}
                >
                  {updatingId === task.id ? <Loader2 className="h-3 w-3 animate-spin" /> : statusCfg.nextLabel}
                </button>
              )}
              {isManager && task.status !== 'done' && (
                <button
                  className="h-8 w-8 flex items-center justify-center rounded-[8px] bg-[#f5f3f0] border border-[#e4ddd2] text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  onClick={e => { e.stopPropagation(); openEditDialog(task) }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {isManager && (
                <button
                  className="h-8 w-8 flex items-center justify-center rounded-[8px] bg-[#f5f3f0] border border-[#e4ddd2] text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  onClick={e => { e.stopPropagation(); setDeleteDialog(task) }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {isExpanded && (
            <div className="px-4 pb-4 border-t pt-4">
              {task.description && <p className="text-sm text-muted-foreground mb-4">{task.description}</p>}
              {task.completion_note && task.status === 'done' && (
                <p className="text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2.5 mb-4 border border-green-100">
                  💬 {task.completion_note}
                </p>
              )}
              {task.photo_url && task.status === 'done' && (
                <a href={task.photo_url} target="_blank" rel="noopener noreferrer">
                  <img src={task.photo_url} alt="Фото выполнения" className="mb-4 max-h-48 rounded-xl border object-cover" />
                </a>
              )}
              <TaskDetail task={task} profile={profile} />
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Task card (kanban view) ───────────────────────────────────────────────

  const KanbanCard = ({ task }: { task: Task }) => {
    const overdueTask = isOverdue(task)
    const priorityCfg = PRIORITY_CONFIG[task.priority]
    const statusCfg = STATUS_CONFIG[task.status]
    const stripeColor = overdueTask ? '#ef4444' : statusCfg.stripe
    const isUrgent = (overdueTask || task.priority === 'high') && task.status !== 'done'

    return (
      <div className={`flex rounded-[12px] border overflow-hidden shadow-sm hover:shadow-md transition-all
        ${isUrgent ? 'border-red-200 bg-red-50/30' : 'bg-white border-[#e4ddd2]'}`}
      >
        <div className="w-[3px] shrink-0" style={{ backgroundColor: stripeColor }} />
        <div className="flex-1 p-3 min-w-0">
          {/* Title row */}
          <div className="flex items-start gap-1.5 mb-1.5">
            <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${priorityCfg.dot}`} />
            <p className={`text-sm font-medium leading-snug flex-1 min-w-0 ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
              {task.title}
            </p>
          </div>

          {/* Urgency + description */}
          {isUrgent && (
            <div className="flex gap-1 mb-1.5 pl-3.5">
              {overdueTask && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600 border border-red-200 leading-none">
                  Просрочено
                </span>
              )}
              {!overdueTask && task.priority === 'high' && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-500 border border-red-100 leading-none">
                  Срочно
                </span>
              )}
            </div>
          )}

          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 pl-3.5 mb-2">{task.description}</p>
          )}

          {/* Meta */}
          <div className="flex flex-col gap-1 pl-3.5">
            {(task as any).assignee && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">{(task as any).assignee.full_name.split(' ')[0]}</span>
              </span>
            )}
            {task.deadline && (
              <span className={`flex items-center gap-1 text-xs ${overdueTask ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                <Calendar className="h-3 w-3 shrink-0" />
                {new Date(task.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>

          {/* Completion photo */}
          {task.photo_url && task.status === 'done' && (
            <a href={task.photo_url} target="_blank" rel="noopener noreferrer">
              <img src={task.photo_url} alt="Фото" className="mt-2 ml-3.5 h-14 w-20 object-cover rounded-lg border" />
            </a>
          )}

          {/* Action button */}
          {statusCfg.next && (
            <div className="mt-3 pl-3.5 flex gap-1">
              <button
                onClick={e => { e.stopPropagation(); handleStatusChange(task) }}
                disabled={updatingId === task.id}
                className={`flex-1 h-7 text-xs font-semibold rounded-[8px] transition-all flex items-center justify-center gap-1.5
                  ${isUrgent
                    ? 'bg-[#1a1a1a] text-white hover:bg-[#2d2d2d]'
                    : 'bg-[#f5f3f0] text-foreground hover:bg-[#ece8e1] border border-[#e4ddd2]'}
                `}
              >
                {updatingId === task.id
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : statusCfg.nextLabel}
              </button>
              {isManager && task.status !== 'done' && (
                <button
                  onClick={e => { e.stopPropagation(); openEditDialog(task) }}
                  className="h-7 w-7 flex items-center justify-center rounded-[8px] bg-[#f5f3f0] border border-[#e4ddd2] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
              {isManager && (
                <button
                  onClick={e => { e.stopPropagation(); setDeleteDialog(task) }}
                  className="h-7 w-7 flex items-center justify-center rounded-[8px] bg-[#f5f3f0] border border-[#e4ddd2] text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Reusable date/time fields ──────────────────────────────────────────────

  const DeadlineFields = ({
    value, onChange,
  }: { value: string; onChange: (v: string) => void }) => (
    <div className="space-y-2">
      <Label>Срок выполнения <span className="text-muted-foreground font-normal text-xs">(необязательно)</span></Label>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={value.split('T')[0] || ''}
          onChange={e => onChange(e.target.value ? `${e.target.value}T${value.split('T')[1] || '09:00'}` : '')}
          className={inputCls}
        />
        <input
          type="time"
          value={value.split('T')[1] || ''}
          onChange={e => onChange(value.split('T')[0] ? `${value.split('T')[0]}T${e.target.value}` : '')}
          disabled={!value.split('T')[0]}
          className={`${inputCls} disabled:opacity-40 disabled:cursor-not-allowed`}
        />
      </div>
      {value && (
        <button type="button" onClick={() => onChange('')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Очистить срок
        </button>
      )}
    </div>
  )

  const CategorySelect = ({
    value, onChange,
  }: { value: string; onChange: (v: string) => void }) => (
    <div className="space-y-2">
      <Label>Категория</Label>
      <Select value={value} onValueChange={(v) => v && onChange(v)}>
        <SelectTrigger>
          <SelectValue>
            {CATEGORIES.find(c => c.value === value)?.icon} {CATEGORIES.find(c => c.value === value)?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {CATEGORIES.map(c => (
            <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Задачи</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {tab === 'tasks' ? `${filteredTasks.length} из ${tasks.length}` : `${templates.length} шаблонов`}
          </p>
        </div>
        <button
          onClick={() => tab === 'tasks' ? setOpen(true) : setTemplateOpen(true)}
          className="flex items-center gap-2 h-10 px-4 rounded-[10px] bg-[#1a1a1a] text-white text-sm font-semibold hover:bg-[#2d2d2d] transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">{tab === 'tasks' ? 'Задача' : 'Шаблон'}</span>
        </button>
      </div>

      {/* Tabs + view toggle */}
      <div className="flex items-center gap-2 mb-4">
        {isManager && (
          <>
            <button onClick={() => setTab('tasks')} className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${tab === 'tasks' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
              Задачи
            </button>
            <button onClick={() => setTab('templates')} className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${tab === 'templates' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
              Повторяющиеся
            </button>
          </>
        )}
        {tab === 'tasks' && (
          <div className="ml-auto flex items-center gap-1 bg-muted p-1 rounded-xl">
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
              <List className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      {tab === 'tasks' && (
        <div className="space-y-2 mb-5">
          {/* Status + assignee row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="flex gap-1 bg-[#f5f3f0] p-1 rounded-[10px] w-fit">
                {(['all', 'new', 'in_progress', 'done'] as StatusFilter[]).map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`shrink-0 px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all ${statusFilter === s ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                    {s === 'all' ? 'Все' : STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>
            {isManager && workers.length > 0 && (
              <div className="overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:ml-auto">
                <div className="flex gap-1 bg-[#f5f3f0] p-1 rounded-[10px] w-fit">
                  <button onClick={() => setAssigneeFilter('all')}
                    className={`shrink-0 px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all ${assigneeFilter === 'all' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                    Все
                  </button>
                  {workers.map(w => (
                    <button key={w.id} onClick={() => setAssigneeFilter(w.id)}
                      className={`shrink-0 px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all ${assigneeFilter === w.id ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                      {w.full_name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Category filter */}
          <div className="overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-1 w-fit">
              <button onClick={() => setCategoryFilter('all')}
                className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-xs font-medium border transition-all ${categoryFilter === 'all' ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border hover:border-foreground'}`}>
                <Tag className="h-3 w-3" /> Все категории
              </button>
              {CATEGORIES.map(c => (
                <button key={c.value} onClick={() => setCategoryFilter(c.value)}
                  className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-xs font-medium border transition-all ${categoryFilter === c.value ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border hover:border-foreground'}`}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Templates tab */}
      {tab === 'templates' && (
        <div className="space-y-3">
          {templates.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <RefreshCw className="h-7 w-7 opacity-40" />
              </div>
              <p className="font-medium">Шаблонов нет</p>
              <p className="text-sm mt-1 text-muted-foreground">Создайте повторяющуюся задачу</p>
            </div>
          ) : (
            templates.map(tmpl => (
              <div key={tmpl.id} className={`rounded-2xl border bg-card p-4 ${!tmpl.active ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${PRIORITY_CONFIG[tmpl.priority].dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{tmpl.title}</p>
                    {tmpl.description && <p className="text-xs text-muted-foreground mt-0.5">{tmpl.description}</p>}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        {CATEGORIES.find(c => c.value === (tmpl.category || 'other'))?.icon}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <RefreshCw className="h-3 w-3" />
                        {tmpl.recurrence_type === 'daily' ? 'Каждый день' : `По: ${tmpl.recurrence_days?.map(d => DAYS[d]).join(', ')}`}
                      </span>
                      {(tmpl as any).assignee && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {(tmpl as any).assignee.full_name.split(' ')[0]}
                        </span>
                      )}
                      {!((tmpl as any).assignee) && (tmpl as any).random_assignees?.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                          🎲 {(tmpl as any).random_assignees.length} на выбор
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-lg border font-medium ${tmpl.active ? 'bg-green-50 text-green-700 border-green-100' : 'bg-muted text-muted-foreground border-border'}`}>
                        {tmpl.active ? 'Активен' : 'Отключён'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleToggleTemplate(tmpl)}>
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTemplate(tmpl.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Archive toggle + Export */}
      {tab === 'tasks' && (archivedCount > 0 || isManager) && (
        <div className="flex items-center gap-2 mb-4">
          {archivedCount > 0 && (
            <button onClick={() => setShowArchive(v => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Archive className="h-3.5 w-3.5" />
              {showArchive ? 'Скрыть архив' : `Архив (${archivedCount})`}
            </button>
          )}
          {isManager && filteredTasks.length > 0 && (
            <button onClick={exportCSV}
              className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Download className="h-3.5 w-3.5" />
              Скачать CSV
            </button>
          )}
        </div>
      )}

      {/* Tasks — list view */}
      {tab === 'tasks' && viewMode === 'list' && (
        filteredTasks.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Flag className="h-7 w-7 text-muted-foreground opacity-40" />
            </div>
            <p className="font-medium text-sm text-foreground">Задач нет</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isManager ? 'Создайте первую задачу для команды' : 'Вам пока не назначены задачи'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTasks.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        )
      )}

      {/* Tasks — kanban view */}
      {tab === 'tasks' && viewMode === 'kanban' && (
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-2">
        <div className="grid grid-cols-3 gap-4 min-w-[520px] sm:min-w-0">
          {(['new', 'in_progress', 'done'] as const).map(status => {
            const cfg = STATUS_CONFIG[status]
            const columnTasks = filteredTasks.filter(t => t.status === status)
            return (
              <div key={status} className="rounded-2xl bg-muted/40 border p-3">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${cfg.cls}`}>{cfg.label}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{columnTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {columnTasks.length === 0
                    ? <div className="text-center py-6 text-xs text-muted-foreground">Нет задач</div>
                    : columnTasks.map(task => <KanbanCard key={task.id} task={task} />)
                  }
                </div>
              </div>
            )
          })}
        </div>
        </div>
      )}

      {/* ── Dialogs ───────────────────────────────────────────────────────── */}

      {/* Complete Task */}
      <Dialog open={!!completeDialog} onOpenChange={v => { if (!v) { setCompleteDialog(null); setCompletionNote(''); setCompletionPhoto(null); setCompletionPhotoPreview(null) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Отметить выполненной</DialogTitle></DialogHeader>
          <div className="py-2 space-y-4">
            <div className="px-3 py-2.5 bg-[#f5f3f0] rounded-[10px] border border-[#e4ddd2]">
              <p className="text-sm font-medium">{completeDialog?.title}</p>
            </div>
            <div className="space-y-2">
              <Label>Комментарий <span className="text-muted-foreground font-normal text-xs">(необязательно)</span></Label>
              <Textarea placeholder="Что было сделано? Есть замечания?" value={completionNote} onChange={e => setCompletionNote(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Фотоотчёт <span className="text-muted-foreground font-normal text-xs">(необязательно)</span></Label>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={e => {
                  const file = e.target.files?.[0] || null
                  setCompletionPhoto(file)
                  if (file) {
                    const url = URL.createObjectURL(file)
                    setCompletionPhotoPreview(url)
                  } else {
                    setCompletionPhotoPreview(null)
                  }
                }}
              />
              {completionPhotoPreview ? (
                <div className="relative">
                  <img src={completionPhotoPreview} alt="Предпросмотр" className="w-full h-40 object-cover rounded-[10px] border border-[#e4ddd2]" />
                  <button
                    type="button"
                    onClick={() => { setCompletionPhoto(null); setCompletionPhotoPreview(null); if (photoInputRef.current) photoInputRef.current.value = '' }}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <p className="text-xs text-green-600 mt-1.5 font-medium">✓ Фото добавлено</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full h-24 rounded-[10px] border-2 border-dashed border-[#e4ddd2] flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-[#1a1a1a]/30 hover:text-foreground transition-all"
                >
                  <Camera className="h-6 w-6 opacity-50" />
                  <span className="text-xs font-medium">Добавить фото результата</span>
                </button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCompleteDialog(null); setCompletionNote(''); setCompletionPhoto(null); setCompletionPhotoPreview(null) }}>Отмена</Button>
            <Button onClick={handleComplete} disabled={!!updatingId} className="gap-2">
              {updatingId ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Выполнено ✓
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteDialog} onOpenChange={v => { if (!v) setDeleteDialog(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Удалить задачу?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Задача <span className="font-medium text-foreground">«{deleteDialog?.title}»</span> будет удалена безвозвратно.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Отмена</Button>
            <Button variant="destructive" onClick={handleDeleteTask}>Удалить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Task */}
      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Новая задача</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input placeholder="Что нужно сделать?" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea placeholder="Подробности..." value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Исполнитель *</Label>
                <Select value={assignedTo} onValueChange={v => setAssignedTo(v ?? '')}>
                  <SelectTrigger>
                    <span className={assignedTo ? 'text-foreground text-sm' : 'text-muted-foreground text-sm'}>
                      {assignedTo ? workers.find(w => w.id === assignedTo)?.full_name ?? 'Выберите...' : 'Выберите...'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {workers.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Приоритет</Label>
                <Select value={priority} onValueChange={v => setPriority(v as typeof priority)}>
                  <SelectTrigger><SelectValue>{PRIORITY_CONFIG[priority]?.label}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Низкий</SelectItem>
                    <SelectItem value="medium">Средний</SelectItem>
                    <SelectItem value="high">Высокий</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <CategorySelect value={category} onChange={setCategory} />
            <DeadlineFields value={deadline} onChange={setDeadline} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Создать
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Task */}
      <Dialog open={editOpen} onOpenChange={v => { setEditOpen(v) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Редактировать задачу</DialogTitle></DialogHeader>
          <form onSubmit={handleEditTask} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input placeholder="Что нужно сделать?" value={editTitle} onChange={e => setEditTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea placeholder="Подробности..." value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Исполнитель</Label>
                <Select value={editAssignedTo} onValueChange={v => setEditAssignedTo(v ?? '')}>
                  <SelectTrigger>
                    <span className={editAssignedTo ? 'text-foreground text-sm' : 'text-muted-foreground text-sm'}>
                      {editAssignedTo ? workers.find(w => w.id === editAssignedTo)?.full_name ?? 'Выберите...' : 'Выберите...'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {workers.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Приоритет</Label>
                <Select value={editPriority} onValueChange={v => setEditPriority(v as typeof editPriority)}>
                  <SelectTrigger><SelectValue>{PRIORITY_CONFIG[editPriority]?.label}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Низкий</SelectItem>
                    <SelectItem value="medium">Средний</SelectItem>
                    <SelectItem value="high">Высокий</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <CategorySelect value={editCategory} onChange={setEditCategory} />
            <DeadlineFields value={editDeadline} onChange={setEditDeadline} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Отмена</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Сохранить
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Template */}
      <Dialog open={templateOpen} onOpenChange={v => { setTemplateOpen(v); if (!v) resetTemplateForm() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Новый шаблон</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateTemplate} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input placeholder="Открытие смены, уборка..." value={tmplTitle} onChange={e => setTmplTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea placeholder="Что нужно сделать?" value={tmplDescription} onChange={e => setTmplDescription(e.target.value)} rows={2} />
            </div>
            {/* Assignee mode toggle */}
            <div className="space-y-2">
              <Label>Исполнитель</Label>
              <div className="flex gap-1 p-1 bg-muted rounded-[10px]">
                <button type="button" onClick={() => setTmplAssigneeMode('single')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-[8px] transition-all ${tmplAssigneeMode === 'single' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>
                  Конкретный
                </button>
                <button type="button" onClick={() => setTmplAssigneeMode('random')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-[8px] transition-all ${tmplAssigneeMode === 'random' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>
                  🎲 Случайный
                </button>
              </div>

              {tmplAssigneeMode === 'single' ? (
                <Select value={tmplAssignedTo} onValueChange={v => setTmplAssignedTo(v === '_none' ? '' : (v ?? ''))}>
                  <SelectTrigger>
                    <span className={tmplAssignedTo ? 'text-foreground text-sm' : 'text-muted-foreground text-sm'}>
                      {tmplAssignedTo ? workers.find(w => w.id === tmplAssignedTo)?.full_name ?? 'Без исполнителя' : 'Без исполнителя'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Без исполнителя</SelectItem>
                    {workers.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <div className="border rounded-[10px] p-3 space-y-2 bg-[#faf9f7]">
                  <p className="text-xs text-muted-foreground">Выберите минимум 2 сотрудника — один будет назначен случайно</p>
                  <div className="space-y-1.5">
                    {workers.map(w => {
                      const checked = tmplRandomAssignees.includes(w.id)
                      return (
                        <label key={w.id} className="flex items-center gap-2.5 cursor-pointer group">
                          <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all ${checked ? 'bg-[#1a1a1a] border-[#1a1a1a]' : 'border-border group-hover:border-[#1a1a1a]/40'}`}>
                            {checked && <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <input type="checkbox" className="sr-only" checked={checked}
                            onChange={() => setTmplRandomAssignees(prev => checked ? prev.filter(id => id !== w.id) : [...prev, w.id])} />
                          <span className="text-sm">{w.full_name}</span>
                        </label>
                      )
                    })}
                  </div>
                  {tmplRandomAssignees.length > 0 && (
                    <p className="text-xs text-[#f59e0b] font-medium">
                      🎲 Выбрано {tmplRandomAssignees.length} — назначение будет случайным каждый день
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Приоритет</Label>
              <Select value={tmplPriority} onValueChange={v => setTmplPriority(v as typeof tmplPriority)}>
                <SelectTrigger><SelectValue>{PRIORITY_CONFIG[tmplPriority]?.label}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Низкий</SelectItem>
                  <SelectItem value="medium">Средний</SelectItem>
                  <SelectItem value="high">Высокий</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <CategorySelect value={tmplCategory} onChange={setTmplCategory} />
            <div className="space-y-2">
              <Label>Повторение</Label>
              <Select value={tmplRecurrenceType} onValueChange={v => { setTmplRecurrenceType(v as 'daily' | 'weekly'); setTmplDays([]) }}>
                <SelectTrigger><SelectValue>{tmplRecurrenceType === 'daily' ? 'Каждый день' : 'По дням недели'}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Каждый день</SelectItem>
                  <SelectItem value="weekly">По дням недели</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {tmplRecurrenceType === 'weekly' && (
              <div className="space-y-2">
                <Label>Дни недели</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {DAYS.map((day, i) => (
                    <button key={i} type="button"
                      onClick={() => setTmplDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i])}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${tmplDays.includes(i) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-foreground'}`}>
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Время отправки</Label>
              <input
                type="time"
                value={tmplScheduledTime}
                onChange={e => setTmplScheduledTime(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">Задача появится у сотрудника не раньше указанного времени</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTemplateOpen(false)}>Отмена</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Создать
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
