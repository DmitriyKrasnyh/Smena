import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3"/>
        <path d="M9 12l2 2 4-4"/>
        <path d="M7 7h2M7 12h2M7 17h2" strokeWidth="1.4"/>
      </svg>
    ),
    color: '#3b82f6',
    bg: '#eff6ff',
    title: 'Задачи и смены',
    desc: 'Создавайте задачи, назначайте сотрудников, отслеживайте выполнение в реальном времени.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 20h18"/>
        <path d="M5 20V14l4-4 4 3 4-6v13"/>
        <circle cx="5" cy="14" r="1" fill="currentColor"/>
        <circle cx="9" cy="10" r="1" fill="currentColor"/>
        <circle cx="13" cy="13" r="1" fill="currentColor"/>
        <circle cx="17" cy="7" r="1" fill="currentColor"/>
      </svg>
    ),
    color: '#10b981',
    bg: '#ecfdf5',
    title: 'Аналитика',
    desc: 'Статистика работы команды, нагрузка по дням, выполнение по категориям.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        <circle cx="18" cy="6" r="3" fill="#ef4444" stroke="none"/>
      </svg>
    ),
    color: '#f59e0b',
    bg: '#fffbeb',
    title: 'Уведомления',
    desc: 'Мгновенные оповещения о новых задачах и изменениях — никто ничего не пропустит.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="3"/>
        <circle cx="17" cy="9" r="2.5"/>
        <path d="M3 21v-1a6 6 0 0 1 6-6h2"/>
        <path d="M13 21v-1a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v1"/>
      </svg>
    ),
    color: '#8b5cf6',
    bg: '#f5f3ff',
    title: 'Команда',
    desc: 'Пригласите сотрудников по ссылке, управляйте ролями: владелец, управляющий, сотрудник.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    ),
    color: '#ef4444',
    bg: '#fef2f2',
    title: 'Несколько точек',
    desc: 'Управляйте несколькими заведениями из одного аккаунта — переключайтесь в один клик.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <path d="M7 9l-2 2 2 2"/>
        <path d="M17 9l2 2-2 2"/>
        <path d="M13 8l-2 8"/>
      </svg>
    ),
    color: '#1a1a1a',
    bg: '#f5f3f0',
    title: 'Быстрые действия',
    desc: 'Command Palette (⌘K) и режим киоска для планшета — для тех, кто ценит скорость.',
  },
]

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-[#f0ece4] font-[var(--font-geologica)]">

      {/* Nav */}
      <nav className="sticky top-0 z-10 bg-[#f0ece4]/80 backdrop-blur-md border-b border-[#e4ddd2]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] overflow-hidden">
              <img src="/icon.svg" alt="Смена" className="w-full h-full" />
            </div>
            <span className="font-bold text-base text-[#1a1a1a]">Смена</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors"
            >
              Войти
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-[#1a1a1a] text-[#f0ece4] rounded-[10px] text-sm font-semibold hover:bg-[#2d2d2d] transition-colors"
            >
              Начать бесплатно
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a]/[0.06] rounded-full text-xs font-semibold text-[#1a1a1a]/70 mb-10 border border-[#1a1a1a]/10">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Для ресторанов и кафе
        </div>

        <h1 className="text-5xl md:text-[72px] font-bold leading-[1.05] tracking-tight text-[#1a1a1a] mb-6">
          Управляйте<br />
          <span className="relative inline-block">
            сменами легко
            <svg className="absolute -bottom-2 left-0 w-full" height="6" viewBox="0 0 300 6" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
              <path d="M 0 5 Q 150 0 300 5" stroke="#f59e0b" strokeWidth="3" fill="none" strokeLinecap="round"/>
            </svg>
          </span>
        </h1>

        <p className="text-lg text-[#1a1a1a]/50 max-w-lg mx-auto mb-10 leading-relaxed">
          Задачи, команда, аналитика — всё в одном месте.<br />
          Ваши сотрудники всегда знают, что делать.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/register"
            className="px-7 py-3.5 bg-[#1a1a1a] text-[#f0ece4] rounded-[12px] font-semibold hover:bg-[#2d2d2d] transition-colors shadow-lg shadow-[#1a1a1a]/20"
          >
            Начать бесплатно →
          </Link>
          <Link
            href="/login"
            className="px-7 py-3.5 bg-white border border-[#e4ddd2] rounded-[12px] font-semibold hover:bg-[#faf9f7] transition-colors"
          >
            Войти в аккаунт
          </Link>
        </div>
      </section>

      {/* Mock UI preview */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="bg-[#1a1a1a] rounded-[24px] p-4 sm:p-6 shadow-2xl shadow-[#1a1a1a]/30">
          {/* Mock sidebar + content */}
          <div className="flex gap-4 min-h-[220px] sm:min-h-[280px]">
            {/* Sidebar mock */}
            <div className="hidden sm:block w-44 shrink-0 space-y-1">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-[7px] overflow-hidden">
                  <img src="/icon.svg" alt="" className="w-full h-full" />
                </div>
                <div>
                  <div className="h-2.5 w-12 bg-[#f0ece4] rounded-full" />
                  <div className="h-1.5 w-16 bg-[#3d3d3d] rounded-full mt-1" />
                </div>
              </div>
              {['Главная', 'Задачи', 'Команда', 'Аналитика'].map((item, i) => (
                <div key={item} className={`flex items-center gap-2 px-2.5 py-2 rounded-[8px] ${i === 1 ? 'bg-[#f0ece4]' : ''}`}>
                  <div className={`w-3.5 h-3.5 rounded-sm ${i === 1 ? 'bg-[#1a1a1a]' : 'bg-[#3d3d3d]'}`} />
                  <span className={`text-xs font-medium ${i === 1 ? 'text-[#1a1a1a]' : 'text-[#78736a]'}`}>{item}</span>
                </div>
              ))}
            </div>

            {/* Content mock */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between mb-4">
                <div className="h-4 w-32 bg-[#f0ece4] rounded-full" />
                <div className="h-7 w-24 bg-[#f0ece4]/10 rounded-[8px]" />
              </div>
              {/* Task cards */}
              {[
                { status: 'bg-amber-500', title: 'Подготовить зал к открытию', w: 'w-52' },
                { status: 'bg-blue-500', title: 'Проверить запасы бара', w: 'w-44' },
                { status: 'bg-amber-500', title: 'Обучение нового сотрудника', w: 'w-48' },
                { status: 'bg-emerald-500', title: 'Отчёт за вчерашний день', w: 'w-40' },
              ].map((card, i) => (
                <div key={i} className="flex items-center gap-3 bg-[#2d2d2d] rounded-[10px] p-3 border-l-[3px]" style={{ borderColor: card.status.replace('bg-', '').includes('amber') ? '#f59e0b' : card.status.includes('blue') ? '#3b82f6' : '#10b981' }}>
                  <div className={`w-2 h-2 rounded-full ${card.status} shrink-0`} />
                  <div className={`h-2 ${card.w} bg-[#f0ece4]/30 rounded-full`} />
                  <div className="ml-auto h-5 w-12 bg-[#3d3d3d] rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold text-center mb-12 text-[#1a1a1a]">
          Всё что нужно для работы
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-white rounded-[20px] p-6 border border-[#e4ddd2] hover:shadow-md hover:border-[#d4cfc8] transition-all">
              <div className="w-12 h-12 rounded-[14px] flex items-center justify-center mb-4" style={{ backgroundColor: f.bg, color: f.color }}>
                {f.icon}
              </div>
              <h3 className="font-bold text-base mb-2 text-[#1a1a1a]">{f.title}</h3>
              <p className="text-sm text-[#1a1a1a]/50 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="bg-[#1a1a1a] rounded-[24px] p-10 text-center">
          <h2 className="text-3xl font-bold text-[#f0ece4] mb-3">Готовы начать?</h2>
          <p className="text-[#78736a] mb-8">Зарегистрируйтесь бесплатно и настройте первую точку за 2 минуты</p>
          <Link
            href="/register"
            className="inline-flex px-8 py-4 bg-[#f0ece4] text-[#1a1a1a] rounded-[12px] font-bold hover:bg-white transition-colors text-base"
          >
            Создать аккаунт →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e4ddd2] py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center gap-2 sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-[5px] overflow-hidden">
              <img src="/icon.svg" alt="" className="w-full h-full" />
            </div>
            <span className="text-sm font-semibold text-[#1a1a1a]/50">Смена</span>
          </div>
          <p className="text-xs text-[#1a1a1a]/30 text-center sm:text-right">Управление задачами для ресторанов и кафе</p>
        </div>
      </footer>
    </div>
  )
}
