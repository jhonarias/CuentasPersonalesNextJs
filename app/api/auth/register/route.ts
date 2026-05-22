// app/api/auth/register/route.ts
// Registro de nuevos usuarios: valida Turnstile, crea usuario en Supabase Auth
// y envía notificación al admin

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendNewUserNotification } from '@/lib/auth/resend'
import { z } from 'zod'

const RegisterSchema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Correo electrónico inválido'),
  phone: z.string().optional(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  turnstileToken: z.string().min(1, 'Token de Turnstile requerido'),
})

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY
  if (!secretKey) {
    console.warn('[Turnstile] TURNSTILE_SECRET_KEY no configurado — omitiendo verificación')
    return true
  }

  const formData = new FormData()
  formData.append('secret', secretKey)
  formData.append('response', token)
  formData.append('remoteip', ip)

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  })

  const data = await res.json()
  return data.success === true
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = RegisterSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      )
    }

    const { firstName, lastName, email, phone, password, turnstileToken } = validated.data

    // Verificar Turnstile
    const ip = req.headers.get('cf-connecting-ip') ||
               req.headers.get('x-forwarded-for') ||
               '127.0.0.1'
    const turnstileValid = await verifyTurnstile(turnstileToken, ip)
    if (!turnstileValid) {
      return NextResponse.json(
        { error: 'Verificación de seguridad fallida. Intenta de nuevo.' },
        { status: 400 }
      )
    }

    // Crear usuario en Supabase Auth (service role para evitar redirect de email en server)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // requiere verificación de email
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        role: 'user',
      },
    })

    if (authError) {
      const message = authError.message.includes('already registered')
        ? 'Este correo ya está registrado.'
        : authError.message
      return NextResponse.json({ error: message }, { status: 400 })
    }

    // Enviar email de verificación al usuario
    await supabase.auth.admin.generateLink({
      type: 'signup',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || ''}/login?info=registered`,
      },
    })

    // Notificar al admin
    await sendNewUserNotification({
      firstName,
      lastName,
      email,
      phone,
    })

    return NextResponse.json(
      { message: 'Registro exitoso. Revisa tu correo para verificar tu cuenta.' },
      { status: 201 }
    )
  } catch (err) {
    console.error('[POST /api/auth/register]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
