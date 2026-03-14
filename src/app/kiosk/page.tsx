import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import KioskClient from './KioskClient'

export default async function KioskPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, restaurants(name)')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, status, priority, category, deadline, assigned_to, assignee:profiles!assigned_to(full_name)')
    .eq('restaurant_id', profile.restaurant_id)
    .neq('status', 'done')
    .order('deadline', { ascending: true, nullsFirst: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <KioskClient profile={profile} initialTasks={(tasks || []) as any} />
}
