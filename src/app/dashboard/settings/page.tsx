import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, restaurants(id, name)')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  let ownedRestaurants: { id: string; name: string }[] = []
  if (profile.role === 'owner') {
    const { data } = await supabase
      .from('owner_restaurants')
      .select('restaurant_id, restaurants(id, name)')
      .eq('owner_id', user.id)
    ownedRestaurants = (data || [])
      .map((r: any) => r.restaurants)
      .filter(Boolean) as { id: string; name: string }[]
  }

  return <SettingsClient profile={profile} ownedRestaurants={ownedRestaurants} />
}
