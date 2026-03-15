'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const passwordStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-emerald-500'][passwordStrength]
  const strengthLabel = ['', 'Слабый', 'Средний', 'Надёжный'][passwordStrength]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { toast.error('Пароль должен быть не менее 6 символов'); return }
    if (password !== confirm) { toast.error('Пароли не совпадают'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error('Ошибка: ' + error.message)
      setLoading(false)
      return
    }
    setDone(true)
    setTimeout(() => {
      router.push('/dashboard')
      router.refresh()
    }, 2000)
  }

  return (
    <div className="min-h-screen flex bg-[#f0ece4]">

      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex w-[460px] shrink-0 bg-[#1a1a1a] flex-col p-12 relative overflow-hidden">
        <div className="absolute top-[-80px] right-[-80px] w-[320px] h-[320px] rounded-full bg-[#f59e0b]/8 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-60px] left-[-60px] w-[240px] h-[240px] rounded-full bg-[#f0ece4]/4 blur-[60px] pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-[12px] overflow-hidden shadow-lg shadow-black/40">
            <img src="/icon.svg" alt="Смена" className="w-full h-full" />
          </div>
          <span className="text-[#f0ece4] font-bold text-lg tracking-tight">Смена</span>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <p className="text-[10px] font-bold tracking-[0.2em] text-[#f59e0b] uppercase mb-4">
            Безопасность аккаунта
          </p>
          <h2 className="text-[#f0ece4] text-[32px] font-bold leading-[1.15] mb-5">
            Придумайте<br />надёжный пароль.
          </h2>
          <p className="text-[#78736a] text-sm leading-relaxed">
            Используйте минимум 10 символов,<br />цифры и спецсимволы.
          </p>
        </div>

        <div className="relative z-10 pt-6 border-t border-[#2d2d2d]">
          <p className="text-[#3a3a3a] text-xs">© 2025 Смена</p>
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

          {done ? (
            <div className="bg-white rounded-[20px] p-10 shadow-sm border border-[#ece8e1] text-center">
              <div className="w-16 h-16 rounded-full bg-[#ecfdf5] flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <h2 className="text-[22px] font-bold text-[#1a1a1a] mb-2">Пароль изменён!</h2>
              <p className="text-sm text-[#9a9490]">Перенаправляем вас в личный кабинет...</p>
            </div>
          ) : (
            <>
              <h1 className="text-[28px] font-bold text-[#1a1a1a] mb-1 leading-tight">
                Новый пароль
              </h1>
              <p className="text-sm text-[#9a9490] mb-8">Придумайте новый пароль для вашего аккаунта</p>

              <div className="bg-white rounded-[20px] p-7 shadow-sm shadow-[#1a1a1a]/5 border border-[#ece8e1]">
                <form onSubmit={handleSubmit} className="space-y-4">

                  {/* New password */}
                  <div className="space-y-1.5">
                    <label htmlFor="password" className="text-xs font-semibold text-[#1a1a1a]/60 uppercase tracking-wide">
                      Новый пароль
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
                        autoFocus
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

                    {/* Strength bar */}
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

                  {/* Confirm password */}
                  <div className="space-y-1.5">
                    <label htmlFor="confirm" className="text-xs font-semibold text-[#1a1a1a]/60 uppercase tracking-wide">
                      Подтвердите пароль
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#c0bab4]" />
                      <input
                        id="confirm"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Повторите пароль"
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        required
                        autoComplete="new-password"
                        className={`w-full h-[46px] pl-10 pr-4 rounded-[12px] border bg-[#faf9f7] text-sm text-[#1a1a1a] placeholder:text-[#c0bab4] focus:outline-none focus:ring-2 transition-all ${
                          confirm.length > 0 && confirm !== password
                            ? 'border-red-300 focus:border-red-400 focus:ring-red-400/10'
                            : 'border-[#ece8e1] focus:border-[#1a1a1a] focus:ring-[#1a1a1a]/8'
                        }`}
                      />
                    </div>
                    {confirm.length > 0 && confirm !== password && (
                      <p className="text-[11px] text-red-400 font-medium">Пароли не совпадают</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || (confirm.length > 0 && confirm !== password)}
                    className="w-full h-[46px] rounded-[12px] bg-[#1a1a1a] text-white text-sm font-bold hover:bg-[#2d2d2d] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2 shadow-md shadow-[#1a1a1a]/20"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {loading ? 'Сохранение...' : 'Сохранить пароль →'}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
