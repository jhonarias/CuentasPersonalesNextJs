export const dynamic = 'force-dynamic'
// app/api/people/[id]/route.ts
// PUT: editar persona
// DELETE: eliminar persona (cascade en DB elimina sus deudas y abonos)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUser } from '@/lib/auth/supabase-server'
import { z } from 'zod'

const PersonSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const body = await req.json()
    const validated = PersonSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.errors[0].message }, { status: 400 })
    }

    const person = await prisma.person.updateMany({
      where: { id: params.id, userId: user.id },
      data: validated.data,
    })

    if (person.count === 0) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    return NextResponse.json({ data: { id: params.id } })
  } catch (error) {
    console.error('[PUT /api/people/[id]]', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const deleted = await prisma.person.deleteMany({
      where: { id: params.id, userId: user.id },
    })

    if (deleted.count === 0) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    return NextResponse.json({ data: { id: params.id } })
  } catch (error) {
    console.error('[DELETE /api/people/[id]]', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
