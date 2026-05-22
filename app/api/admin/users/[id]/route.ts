// app/api/admin/users/[id]/route.ts
// Aprobar o bloquear un usuario (solo admins)

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/auth/supabase-server'
import { sendApprovalEmail } from '@/lib/auth/resend'
import { z } from 'zod'

const UpdateSchema = z.object({
  status: z.enum(['active', 'blocked', 'pending']),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServerClient()

    // Verificar admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Usar service role para bypass RLS
    const adminClient = createSupabaseAdminClient()

    const { data: myProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (myProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await req.json()
    const validated = UpdateSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }

    const { status } = validated.data

    // Actualizar perfil
    const updateData: Record<string, unknown> = { status }
    if (status === 'active') {
      updateData.approved_at = new Date().toISOString()
      updateData.approved_by = user.id
    }

    const { data: updatedProfile, error } = await adminClient
      .from('profiles')
      .update(updateData)
      .eq('id', params.id)
      .select('first_name, last_name')
      .single()

    if (error) throw error

    // Si se aprobó, enviar email al usuario
    if (status === 'active') {
      const { data: { user: targetUser } } = await adminClient.auth.admin.getUserById(params.id)
      if (targetUser?.email) {
        await sendApprovalEmail(targetUser.email, updatedProfile?.first_name || '')
      }
    }

    return NextResponse.json({ data: { status } })
  } catch (err) {
    console.error('[PATCH /api/admin/users/[id]]', err)
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 })
  }
}
