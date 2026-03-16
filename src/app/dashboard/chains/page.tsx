import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ChainsClient from './ChainsClient'

export default async function ChainsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role === 'worker') redirect('/dashboard')

  const [{ data: chains }, { data: workers }] = await Promise.all([
    supabase
      .from('task_chains')
      .select('*, steps:task_chain_steps(id)')
      .eq('restaurant_id', profile.restaurant_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('restaurant_id', profile.restaurant_id)
      .order('full_name'),
  ])

  return (
    <ChainsClient
      chains={(chains || []).map((c: any) => ({ ...c, step_count: c.steps?.length ?? 0 }))}
      workers={workers || []}
      restaurantId={profile.restaurant_id}
    />
  )
}
