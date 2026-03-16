import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    })

    if (error) {
      return NextResponse.json(
        { error: error.message, error_description: error.message },
        { status: error.status ?? 400 }
      )
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}
