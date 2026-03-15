'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, User, Store, Mail, Lock, Eye, EyeOff, Check } from 'lucide-react'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [restaurantName, setRestaurantName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const passwordStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-emerald-500'][passwordStrength]
  const strengthLabel = ['', 'Слабый', 'Средний', 'Надёжный'][passwordStrength]

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    if (password.length < 6) {
      toast.error('Пароль должен быть не менее 6 символов')
      setLoading(false)
      return
    }

    const emailRedirectTo = `${window.location.origin}/auth/callback`

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    })

    if (authError || !authData.user) {
      toast.error(authError?.message || 'Ошибка регистрации')
      setLoading(false)
      return
    }

    // Create profile immediately (register_owner is SECURITY DEFINER, works without session)
    const { error: rpcError } = await supabase.rpc('register_owner', {
      p_user_id: authData.user.id,
      p_email: email,
      p_full_name: fullName,
      p_restaurant_name: restaurantName,
    })

    if (rpcError) {
      toast.error('Ошибка создания профиля: ' + rpcError.message)
      setLoading(false)
      return
    }

    if (authData.session) {
      // Email confirmation disabled in Supabase — log in directly
      toast.success('Добро пожаловать в Смену!')
      router.push('/dashboard')
      router.refresh()
    } else {
      // Email confirmation required — show check email page
      router.push(`/auth/confirm?email=${encodeURIComponent(email)}&type=signup`)
    }
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
            Бесплатно · Быстро · Просто
          </p>
          <h2 className="text-[#f0ece4] text-[32px] font-bold leading-[1.15] mb-5">
            Запустите свою<br />Смену за 2 минуты.
          </h2>
          <p className="text-[#78736a] text-sm leading-relaxed mb-10">
            Создайте аккаунт, добавьте команду и начните<br />управлять заведением уже сегодня.
          </p>

          {/* Checklist */}
          <div className="space-y-3">
            {[
              'Неограниченное количество задач',
              'Приглашение сотрудников по ссылке',
              'Аналитика и отчёты',
              'Поддержка нескольких точек',
            ].map(item => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#f59e0b]/20 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-[#f59e0b]" strokeWidth={2.5} />
                </div>
                <span className="text-[#a09a90] text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 pt-6 border-t border-[#2d2d2d]">
          <p className="text-[#3a3a3a] text-xs">© 2025 Смена</p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-[400px] py-8 animate-slide-up">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-[10px] overflow-hidden">
              <img src="/icon.svg" alt="Смена" className="w-full h-full" />
            </div>
            <span className="font-bold text-[#1a1a1a]">Смена</span>
          </div>

          {/* Heading */}
          <h1 className="text-[28px] font-bold text-[#1a1a1a] mb-1 leading-tight">
            Создать аккаунт
          </h1>
          <p className="text-sm text-[#9a9490] mb-8">Вы станете владельцем и сможете добавить команду</p>

          {/* Form card */}
          <div className="bg-white rounded-[20px] p-7 shadow-sm shadow-[#1a1a1a]/5 border border-[#ece8e1]">
            <form onSubmit={handleRegister} className="space-y-4">

              {/* Full name */}
              <div className="space-y-1.5">
                <label htmlFor="fullName" className="text-xs font-semibold text-[#1a1a1a]/60 uppercase tracking-wide">
                  Ваше имя
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#c0bab4]" />
                  <input
                    id="fullName"
                    placeholder="Иван Иванов"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                    className="w-full h-[46px] pl-10 pr-4 rounded-[12px] border border-[#ece8e1] bg-[#faf9f7] text-sm text-[#1a1a1a] placeholder:text-[#c0bab4] focus:outline-none focus:border-[#1a1a1a] focus:ring-2 focus:ring-[#1a1a1a]/8 transition-all"
                  />
                </div>
              </div>

              {/* Restaurant name */}
              <div className="space-y-1.5">
                <label htmlFor="restaurantName" className="text-xs font-semibold text-[#1a1a1a]/60 uppercase tracking-wide">
                  Название заведения
                </label>
                <div className="relative">
                  <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#c0bab4]" />
                  <input
                    id="restaurantName"
                    placeholder="Кафе «Уют»"
                    value={restaurantName}
                    onChange={e => setRestaurantName(e.target.value)}
                    required
                    className="w-full h-[46px] pl-10 pr-4 rounded-[12px] border border-[#ece8e1] bg-[#faf9f7] text-sm text-[#1a1a1a] placeholder:text-[#c0bab4] focus:outline-none focus:border-[#1a1a1a] focus:ring-2 focus:ring-[#1a1a1a]/8 transition-all"
                  />
                </div>
              </div>

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

              {/* Password + strength */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-semibold text-[#1a1a1a]/60 uppercase tracking-wide">
                  Пароль
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#c0bab4]" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Минимум 6 символов"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
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

                {/* Password strength bar */}
                {password.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3].map(i => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            i <= passwordStrength ? strengthColor : 'bg-[#ece8e1]'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-[11px] font-semibold ${
                      passwordStrength === 1 ? 'text-red-400' : passwordStrength === 2 ? 'text-amber-500' : 'text-emerald-500'
                    }`}>
                      {strengthLabel}
                    </span>
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[46px] rounded-[12px] bg-[#1a1a1a] text-white text-sm font-bold hover:bg-[#2d2d2d] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2 shadow-md shadow-[#1a1a1a]/20"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Создание...' : 'Зарегистрироваться →'}
              </button>
            </form>
          </div>

          {/* Footer link */}
          <p className="text-sm text-[#9a9490] text-center mt-5">
            Уже есть учётная запись?{' '}
            <Link href="/login" className="text-[#1a1a1a] font-bold hover:underline underline-offset-2">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
