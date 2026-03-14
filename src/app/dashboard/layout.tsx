import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import CommandPalette from '@/components/CommandPalette'
import NavigationProgress from '@/components/NavigationProgress'
import TopBar from '@/components/TopBar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, restaurants(name)')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/register')

  // Для владельца загружаем все его точки
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

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar profile={profile} ownedRestaurants={ownedRestaurants} />
      <main className="flex-1 overflow-auto flex flex-col">
        <TopBar profile={profile} />
        {children}
      </main>
      <CommandPalette restaurantId={profile.restaurant_id} role={profile.role} />
      <NavigationProgress />
    </div>
  )
}
