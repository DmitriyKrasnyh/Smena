'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Mail, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    })
    if (error) {
      toast.error('Не удалось отправить письмо. Проверьте адрес почты.')
      setLoading(false)
      return
    }
    window.location.href = `/auth/confirm?email=${encodeURIComponent(email)}&type=recovery`
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
            Восстановление доступа
          </p>
          <h2 className="text-[#f0ece4] text-[32px] font-bold leading-[1.15] mb-5">
            Забыли пароль?<br />Не беда.
          </h2>
          <p className="text-[#78736a] text-sm leading-relaxed">
            Введите адрес почты, и мы отправим<br />ссылку для сброса пароля.
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

          <h1 className="text-[28px] font-bold text-[#1a1a1a] mb-1 leading-tight">
            Сброс пароля
          </h1>
          <p className="text-sm text-[#9a9490] mb-8">Введите почту и мы вышлем ссылку для входа</p>

          <div className="bg-white rounded-[20px] p-7 shadow-sm shadow-[#1a1a1a]/5 border border-[#ece8e1]">
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    autoFocus
                    className="w-full h-[46px] pl-10 pr-4 rounded-[12px] border border-[#ece8e1] bg-[#faf9f7] text-sm text-[#1a1a1a] placeholder:text-[#c0bab4] focus:outline-none focus:border-[#1a1a1a] focus:ring-2 focus:ring-[#1a1a1a]/8 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[46px] rounded-[12px] bg-[#1a1a1a] text-white text-sm font-bold hover:bg-[#2d2d2d] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2 shadow-md shadow-[#1a1a1a]/20"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Отправка...' : 'Отправить ссылку →'}
              </button>
            </form>
          </div>

          <div className="text-center mt-5">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-[#9a9490] hover:text-[#1a1a1a] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Вернуться к входу
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
