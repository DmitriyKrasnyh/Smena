import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TeamClient from './TeamClient'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'manager'].includes(profile.role)) redirect('/dashboard')

  const [{ data: members }, { data: invites }, { data: tasks }] = await Promise.all([
    supabase.from('profiles').select('*').eq('restaurant_id', profile.restaurant_id).order('created_at'),
    supabase.from('invites').select('*').eq('restaurant_id', profile.restaurant_id).eq('used', false).order('created_at', { ascending: false }),
    supabase.from('tasks').select('assigned_to, status, deadline').eq('restaurant_id', profile.restaurant_id),
  ])

  return (
    <TeamClient
      profile={profile}
      members={members || []}
      invites={invites || []}
      tasks={tasks || []}
    />
  )
}
