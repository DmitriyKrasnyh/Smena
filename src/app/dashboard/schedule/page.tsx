import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ScheduleClient from './ScheduleClient'

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, restaurants(name)')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role === 'worker') redirect('/dashboard')

  // Monday of current week
  const today = new Date()
  const day = today.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const mondayStr = monday.toISOString().slice(0, 10)
  const sundayStr = sunday.toISOString().slice(0, 10)

  const isOwner = profile.role === 'owner'

  let restaurantGroups: { id: string; name: string }[] = []
  let restaurantIds: string[] = []

  if (isOwner) {
    const { data: ownedRests } = await supabase
      .from('owner_restaurants')
      .select('restaurant_id, restaurants(id, name)')
      .eq('owner_id', user.id)
    restaurantGroups = ((ownedRests || []).map((r: any) => r.restaurants).filter(Boolean)) as { id: string; name: string }[]
    restaurantIds = restaurantGroups.map(r => r.id)
  } else {
    restaurantGroups = [{ id: profile.restaurant_id, name: (profile as any).restaurants?.name || 'Заведение' }]
    restaurantIds = [profile.restaurant_id]
  }

  const [{ data: employees }, { data: shifts }, { data: templates }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, role, avatar_url, restaurant_id')
      .in('restaurant_id', restaurantIds)
      .in('role', ['manager', 'worker'])
      .order('full_name'),
    supabase
      .from('shifts')
      .select('*')
      .in('restaurant_id', restaurantIds)
      .gte('date', mondayStr)
      .lte('date', sundayStr),
    supabase
      .from('shift_templates')
      .select('*')
      .in('restaurant_id', restaurantIds)
      .eq('active', true),
  ])

  return (
    <ScheduleClient
      employees={employees || []}
      initialShifts={shifts || []}
      templates={templates || []}
      restaurantGroups={restaurantGroups}
      initialWeekStart={mondayStr}
    />
  )
}
