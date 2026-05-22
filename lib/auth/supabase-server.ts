// lib/auth/supabase-server.ts
// Cliente Supabase para uso en Server Components y Route Handlers

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createSupabaseServerClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // En Server Components no se puede setear cookies — ignorar
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // En Server Components no se puede setear cookies — ignorar
          }
        },
      },
    }
  )
}

/**
 * Obtiene el usuario autenticado actual desde la sesión.
 * Retorna null si no hay sesión activa.
 */
export async function getSessionUser() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Obtiene el perfil del usuario actual (role, status, nombre).
 * Retorna null si no hay sesión o perfil.
 */
export async function getSessionProfile() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, phone, role, status')
    .eq('id', user.id)
    .single()

  return profile
}
