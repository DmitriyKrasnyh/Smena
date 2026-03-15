'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error('Неверная почта или пароль')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex bg-[#f0ece4]">

      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex w-[460px] shrink-0 bg-[#1a1a1a] flex-col p-12 relative overflow-hidden">

        {/* Ambient glow */}
        <div className="absolute top-[-80px] right-[-80px] w-[320px] h-[320px] rounded-full bg-[#f59e0b]/8 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-60px] left-[-60px] w-[240px] h-[240px] rounded-full bg-[#f0ece4]/4 blur-[60px] pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-[12px] overflow-hidden shadow-lg shadow-black/40">
            <img src="/icon.svg" alt="Смена" className="w-full h-full" />
          </div>
          <span className="text-[#f0ece4] font-bold text-lg tracking-tight">Смена</span>
        </div>

        {/* Tagline */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <p className="text-[10px] font-bold tracking-[0.2em] text-[#f59e0b] uppercase mb-4">
            Управление командой
          </p>
          <h2 className="text-[#f0ece4] text-[32px] font-bold leading-[1.15] mb-5">
            Ваша команда.<br />Под контролем.
          </h2>
          <p className="text-[#78736a] text-sm leading-relaxed mb-10">
            Задачи, смены и аналитика — в одном месте<br />для вашего ресторана или кафе.
          </p>

          {/* Feature list */}
          <div className="space-y-3.5">
            {[
              { emoji: '📋', label: 'Задачи и смены', sub: 'Назначайте, отслеживайте' },
              { emoji: '📊', label: 'Аналитика', sub: 'Статистика команды' },
              { emoji: '🔔', label: 'Уведомления', sub: 'В реальном времени' },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-[10px] bg-[#2d2d2d] flex items-center justify-center text-lg shrink-0">
                  {f.emoji}
                </div>
                <div>
                  <p className="text-[#f0ece4] text-sm font-semibold leading-tight">{f.label}</p>
                  <p className="text-[#4a4a4a] text-xs mt-0.5">{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="relative z-10 pt-6 border-t border-[#2d2d2d] flex items-center gap-8">
          {[['∞', 'задач'], ['2 мин', 'настройка'], ['24/7', 'доступность']].map(([val, label]) => (
            <div key={label}>
              <p className="text-[#f0ece4] font-bold text-base">{val}</p>
              <p className="text-[#4a4a4a] text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[400px] animate-slide-up">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-[10px] overflow-hidden">
              <img src="/icon.svg" alt="Смена" className="w-full h-full" />
            </div>
            <span className="font-bold text-[#1a1a1a]">Смена</span>
          </div>

          {/* Heading */}
          <h1 className="text-[28px] font-bold text-[#1a1a1a] mb-1 leading-tight">
            С возвращением 👋
          </h1>
          <p className="text-sm text-[#9a9490] mb-8">Войдите, чтобы продолжить</p>

          {/* Form card */}
          <div className="bg-white rounded-[20px] p-7 shadow-sm shadow-[#1a1a1a]/5 border border-[#ece8e1]">
            <form onSubmit={handleLogin} className="space-y-4">

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-[#1a1a1a]/60 uppercase tracking-wide">
                  Электронная почта
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#c0bab4]" />
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full h-[46px] pl-10 pr-4 rounded-[12px] border border-[#ece8e1] bg-[#faf9f7] text-sm text-[#1a1a1a] placeholder:text-[#c0bab4] focus:outline-none focus:border-[#1a1a1a] focus:ring-2 focus:ring-[#1a1a1a]/8 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-semibold text-[#1a1a1a]/60 uppercase tracking-wide">
                  Пароль
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#c0bab4]" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full h-[46px] pl-10 pr-11 rounded-[12px] border border-[#ece8e1] bg-[#faf9f7] text-sm text-[#1a1a1a] placeholder:text-[#c0bab4] focus:outline-none focus:border-[#1a1a1a] focus:ring-2 focus:ring-[#1a1a1a]/8 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#c0bab4] hover:text-[#1a1a1a] transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div className="flex justify-end -mt-1">
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-[#9a9490] hover:text-[#1a1a1a] transition-colors"
                >
                  Забыли пароль?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[46px] rounded-[12px] bg-[#1a1a1a] text-white text-sm font-bold hover:bg-[#2d2d2d] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2 shadow-md shadow-[#1a1a1a]/20"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Вход...' : 'Войти'}
              </button>
            </form>
          </div>

          {/* Footer link */}
          <p className="text-sm text-[#9a9490] text-center mt-5">
            Нет учётной записи?{' '}
            <Link href="/register" className="text-[#1a1a1a] font-bold hover:underline underline-offset-2">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
