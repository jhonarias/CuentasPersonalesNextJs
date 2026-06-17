export const dynamic = 'force-dynamic'
// app/api/debts/[id]/route.ts
// PUT: editar deuda
// DELETE: eliminar deuda (cascade elimina sus abonos)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUser } from '@/lib/auth/supabase-server'
import { z } from 'zod'

const DebtUpdateSchema = z.object({
  description: z.string().min(1).optional(),
  totalAmount: z.number().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const body = await req.json()
    const validated = DebtUpdateSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.errors[0].message }, { status: 400 })
    }

    const { date, dueDate, ...rest } = validated.data
    const updated = await prisma.debt.updateMany({
      where: { id: params.id, userId: user.id },
      data: {
        ...rest,
        ...(date ? { date: new Date(date) } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      },
    })

    if (updated.count === 0) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
    return NextResponse.json({ data: { id: params.id } })
  } catch (error) {
    console.error('[PUT /api/debts/[id]]', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const deleted = await prisma.debt.deleteMany({
      where: { id: params.id, userId: user.id },
    })

    if (deleted.count === 0) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
    return NextResponse.json({ data: { id: params.id } })
  } catch (error) {
    console.error('[DELETE /api/debts/[id]]', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
