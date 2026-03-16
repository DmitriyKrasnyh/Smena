import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OverviewClient from './OverviewClient'

export default async function OverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'owner') redirect('/dashboard')

  const { data } = await supabase.rpc('get_owner_overview')

  const restaurants: RestaurantOverview[] = Array.isArray(data) ? data : (data ? JSON.parse(data as string) : [])

  return <OverviewClient restaurants={restaurants} />
}

export interface StaffMember {
  id: string
  full_name: string
  email: string
  role: string
  avatar_url: string | null
}

export interface RestaurantOverview {
  id: string
  name: string
  staff: StaffMember[]
  tasks_total: number
  tasks_done: number
  tasks_overdue: number
}
