import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TasksClient from './TasksClient'

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Generate recurring tasks for today
  await supabase.rpc('generate_recurring_tasks', { p_restaurant_id: profile.restaurant_id })

  const isManager = profile.role === 'owner' || profile.role === 'manager'

  // Get tasks
  let tasksQuery = supabase
    .from('tasks')
    .select('*, assignee:profiles!tasks_assigned_to_fkey(id, full_name), creator:profiles!tasks_created_by_fkey(id, full_name)')
    .eq('restaurant_id', profile.restaurant_id)
    .or('chain_unlocked.eq.true,chain_id.is.null')
    .order('created_at', { ascending: false })

  if (!isManager) {
    tasksQuery = tasksQuery.eq('assigned_to', user.id)
  }

  const { data: tasks = [] } = await tasksQuery

  // Get workers for assignment (managers only)
  let workers: { id: string; full_name: string; role: string }[] = []
  if (isManager) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('restaurant_id', profile.restaurant_id)
    workers = data || []
  }

  // Get templates (managers only)
  let templates = []
  if (isManager) {
    const { data } = await supabase
      .from('task_templates')
      .select('*, assignee:profiles!task_templates_assigned_to_fkey(id, full_name)')
      .eq('restaurant_id', profile.restaurant_id)
      .order('created_at', { ascending: false })
    templates = data || []
  }

  return <TasksClient tasks={tasks || []} workers={workers} profile={profile} templates={templates} />
}
