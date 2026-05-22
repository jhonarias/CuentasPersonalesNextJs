// app/api/admin/users/route.ts
// Lista todos los perfiles de usuario (solo admins)

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/auth/supabase-server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()

    // Verificar que el usuario autenticado es admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Usar service role para bypass RLS al leer perfiles
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: myProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (myProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Obtener todos los perfiles con sus emails de auth.users
    const { data: profiles, error } = await adminClient
      .from('profiles')
      .select('id, first_name, last_name, phone, role, status, created_at, approved_at')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Obtener emails de Supabase Auth
    const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers()
    const emailMap = Object.fromEntries(authUsers.map(u => [u.id, u.email || '']))

    const result = profiles?.map(p => ({
      ...p,
      email: emailMap[p.id] || '',
    })) ?? []

    return NextResponse.json({ data: result })
  } catch (err) {
    console.error('[GET /api/admin/users]', err)
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 })
  }
}
