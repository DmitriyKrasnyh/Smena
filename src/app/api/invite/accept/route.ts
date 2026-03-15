import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { token, email, password, fullName } = await request.json()

    if (!token || !email || !password || !fullName) {
      return NextResponse.json({ error: 'Все поля обязательны' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Пароль должен быть не менее 6 символов' }, { status: 400 })
    }

    // Admin client — bypasses email confirmation
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Check invite is valid first
    const { data: inviteData, error: inviteCheckError } = await supabaseAdmin
      .rpc('check_invite_by_token', { p_token: token })

    if (inviteCheckError || !inviteData?.valid) {
      return NextResponse.json({ error: 'Ссылка недействительна или устарела' }, { status: 400 })
    }

    // Create user with email already confirmed (no confirmation email sent)
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError) {
      if (createError.message.includes('already registered') || createError.message.includes('already been registered')) {
        return NextResponse.json({ error: 'Этот email уже зарегистрирован. Войдите в существующий аккаунт.' }, { status: 400 })
      }
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    // Accept invite — create profile and mark invite as used
    const { data: result, error: rpcError } = await supabaseAdmin.rpc('accept_invite', {
      p_token:     token,
      p_user_id:   userData.user.id,
      p_email:     email,
      p_full_name: fullName,
    })

    if (rpcError || result?.error) {
      // Rollback: delete the created user
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
      return NextResponse.json({ error: result?.error || 'Ошибка создания профиля' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
