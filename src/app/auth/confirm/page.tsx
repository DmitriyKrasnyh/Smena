'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Mail, ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react'

function ConfirmContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const type = searchParams.get('type') ?? 'signup'
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [countdown])

  async function handleResend() {
    if (!email || resending || countdown > 0) return
    setResending(true)
    try {
      if (type === 'signup') {
        const { error } = await supabase.auth.resend({ type: 'signup', email })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
        })
        if (error) throw error
      }
      setResent(true)
      setCountdown(60)
      toast.success('Письмо отправлено повторно')
    } catch {
      toast.error('Не удалось отправить письмо. Попробуйте позже.')
    } finally {
      setResending(false)
    }
  }

  const isRecovery = type === 'recovery'
  const title = isRecovery ? 'Проверьте почту' : 'Подтвердите email'
  const description = isRecovery
    ? 'Мы отправили ссылку для сброса пароля на:'
    : 'Мы отправили письмо с подтверждением на:'
  const instruction = isRecovery
    ? 'Перейдите по ссылке в письме, чтобы установить новый пароль.'
    : 'Перейдите по ссылке в письме, чтобы активировать аккаунт.'

  return (
    <div className="min-h-screen flex bg-[#f0ece4] items-center justify-center p-6">
      <div className="w-full max-w-[420px]">

        {/* Mobile logo */}
        <div className="flex items-center gap-2.5 mb-10 justify-center">
          <div className="w-9 h-9 rounded-[10px] overflow-hidden">
            <img src="/icon.svg" alt="Смена" className="w-full h-full" />
          </div>
          <span className="font-bold text-[#1a1a1a]">Смена</span>
        </div>

        <div className="bg-white rounded-[24px] p-8 shadow-sm border border-[#ece8e1] text-center">

          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-[#eff6ff] flex items-center justify-center mx-auto mb-6">
            <Mail className="h-8 w-8 text-[#3b82f6]" />
          </div>

          <h1 className="text-[22px] font-bold text-[#1a1a1a] mb-2 leading-tight">
            {title}
          </h1>
          <p className="text-sm text-[#9a9490] mb-2">{description}</p>
          {email && (
            <p className="text-sm font-semibold text-[#1a1a1a] mb-5 break-all">{email}</p>
          )}
          <p className="text-sm text-[#9a9490] mb-8 leading-relaxed">{instruction}</p>

          {/* Steps */}
          <div className="space-y-3 text-left mb-8">
            {[
              'Откройте письмо от Смена',
              'Нажмите кнопку в письме',
              isRecovery ? 'Введите новый пароль' : 'Аккаунт будет активирован',
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#f0ece4] flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-[#1a1a1a]/50">{i + 1}</span>
                </div>
                <span className="text-sm text-[#4a4a4a]">{step}</span>
              </div>
            ))}
          </div>

          {/* Resend */}
          <div className="border-t border-[#f0ece4] pt-6">
            <p className="text-xs text-[#9a9490] mb-3">Не получили письмо? Проверьте папку «Спам».</p>
            <button
              onClick={handleResend}
              disabled={resending || countdown > 0}
              className="flex items-center gap-2 mx-auto text-sm font-semibold text-[#1a1a1a] hover:text-[#3b82f6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {resending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : resent ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {countdown > 0
                ? `Отправить снова (${countdown}с)`
                : resent
                ? 'Письмо отправлено'
                : 'Отправить снова'
              }
            </button>
          </div>
        </div>

        {/* Back link */}
        <div className="text-center mt-6">
          <Link
            href={isRecovery ? '/login' : '/register'}
            className="inline-flex items-center gap-1.5 text-sm text-[#9a9490] hover:text-[#1a1a1a] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {isRecovery ? 'Вернуться к входу' : 'Вернуться к регистрации'}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmContent />
    </Suspense>
  )
}
