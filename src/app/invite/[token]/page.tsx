'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Building2, UserPlus, CheckCircle2 } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  manager: 'Управляющий',
  worker:  'Сотрудник',
}

interface InviteData {
  valid: boolean
  id?: string
  role?: string
  email?: string | null
  restaurant_id?: string
  restaurant_name?: string
}

export default function InvitePage() {
  const params    = useParams()
  const token     = params.token as string
  const router    = useRouter()
  const supabase  = createClient()

  const [invite,    setInvite]    = useState<InviteData | null>(null)
  const [fullName,  setFullName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [checking,  setChecking]  = useState(true)
  const [done,      setDone]      = useState(false)  // email confirmation pending

  useEffect(() => {
    async function checkInvite() {
      const { data, error } = await supabase.rpc('check_invite_by_token', {
        p_token: token,
      })

      if (error || !data?.valid) {
        toast.error('Ссылка недействительна или устарела')
        setInvite({ valid: false })
        setChecking(false)
        return
      }

      setInvite(data)
      if (data.email) setEmail(data.email)
      setChecking(false)
    }
    checkInvite()
  }, [token])

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!invite?.valid) return

    if (password.length < 6) {
      toast.error('Пароль должен быть не менее 6 символов')
      return
    }

    setLoading(true)

    // 1. Register in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError || !authData.user) {
      toast.error(authError?.message || 'Ошибка регистрации')
      setLoading(false)
      return
    }

    // 2. Create profile via SECURITY DEFINER (works without session)
    const { data: result, error: rpcError } = await supabase.rpc('accept_invite', {
      p_token:     token,
      p_user_id:   authData.user.id,
      p_email:     email,
      p_full_name: fullName,
    })

    if (rpcError || result?.error) {
      toast.error(result?.error || 'Ошибка создания профиля')
      setLoading(false)
      return
    }

    const hasSession = !!authData.session

    if (hasSession) {
      toast.success('Добро пожаловать в команду!')
      router.push('/dashboard')
      router.refresh()
    } else {
      // Email confirmation required
      setDone(true)
    }

    setLoading(false)
  }

  const fieldClass = "w-full h-11 px-3.5 rounded-[10px] border border-[#e4ddd2] bg-[#faf9f7] text-sm text-foreground placeholder:text-[#b0a99f] focus:outline-none focus:border-[#1a1a1a] focus:ring-2 focus:ring-[#1a1a1a]/10 transition-all"

  // Loading state
  if (checking) {
    return (
      <div className="min-h-screen bg-[#f0ece4] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Invalid invite
  if (!invite?.valid) {
    return (
      <div className="min-h-screen bg-[#f0ece4] flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center animate-slide-up">
          <div className="w-14 h-14 rounded-[14px] bg-[#fef2f2] border border-[#fecaca] flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔗</span>
          </div>
          <h1 className="text-lg font-bold text-foreground mb-2">Ссылка не работает</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Эта ссылка-приглашение устарела или уже была использована.
            Попросите руководителя создать новую.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="px-5 py-2.5 rounded-[10px] bg-[#1a1a1a] text-white text-sm font-semibold hover:bg-[#2d2d2d] transition-colors"
          >
            Перейти ко входу
          </button>
        </div>
      </div>
    )
  }

  // Email confirmation sent
  if (done) {
    return (
      <div className="min-h-screen bg-[#f0ece4] flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center animate-slide-up">
          <div className="w-14 h-14 rounded-[14px] bg-[#ecfdf5] border border-[#a7f3d0] flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          </div>
          <h1 className="text-lg font-bold text-foreground mb-2">Почти готово!</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Письмо с подтверждением отправлено на <span className="font-semibold text-foreground">{email}</span>.
            После подтверждения войдите в систему.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="px-5 py-2.5 rounded-[10px] bg-[#1a1a1a] text-white text-sm font-semibold hover:bg-[#2d2d2d] transition-colors"
          >
            Перейти ко входу
          </button>
        </div>
      </div>
    )
  }

  // Main form
  return (
    <div className="min-h-screen bg-[#f0ece4] flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-slide-up">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-[10px] bg-[#1a1a1a] flex items-center justify-center text-white font-bold text-base">
            С
          </div>
          <span className="font-bold text-foreground">Смена</span>
        </div>

        {/* Invite info */}
        <div className="bg-card rounded-[14px] border border-[#e4ddd2] p-4 mb-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-[#f5f3f0] flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">
                {invite.restaurant_name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Роль: <span className="font-medium text-foreground">
                  {ROLE_LABELS[invite.role || ''] || invite.role}
                </span>
              </p>
            </div>
            <div className="ml-auto shrink-0">
              <UserPlus className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Form */}
        <h1 className="text-2xl font-bold text-foreground mb-1">Создать аккаунт</h1>
        <p className="text-sm text-muted-foreground mb-6">Заполните данные, чтобы присоединиться к команде</p>

        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="fullName" className="text-sm font-medium text-foreground">Ваше имя</label>
            <input
              id="fullName"
              placeholder="Иван Иванов"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              className={fieldClass}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">Электронная почта</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              readOnly={!!invite.email}
              className={fieldClass + (invite.email ? ' opacity-60 cursor-not-allowed' : '')}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">Придумайте пароль</label>
            <input
              id="password"
              type="password"
              placeholder="Минимум 6 символов"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className={fieldClass}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-[10px] bg-[#1a1a1a] text-white text-sm font-semibold hover:bg-[#2d2d2d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Подождите...' : 'Присоединиться'}
          </button>
        </form>

        <p className="text-sm text-muted-foreground text-center mt-6">
          Уже есть аккаунт?{' '}
          <button
            onClick={() => router.push('/login')}
            className="text-foreground font-semibold hover:underline underline-offset-2"
          >
            Войти
          </button>
        </p>
      </div>
    </div>
  )
}
