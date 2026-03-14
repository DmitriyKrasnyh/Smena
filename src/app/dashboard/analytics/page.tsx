import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AnalyticsClient from './AnalyticsClient'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, restaurants(name)')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/register')
  if (profile.role !== 'owner' && profile.role !== 'manager') redirect('/dashboard')

  const [{ data: tasks }, { data: members }] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, status, priority, category, deadline, created_at, updated_at, assigned_to')
      .eq('restaurant_id', profile.restaurant_id),
    supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('restaurant_id', profile.restaurant_id),
  ])

  return (
    <AnalyticsClient
      tasks={tasks || []}
      members={members || []}
    />
  )
}
