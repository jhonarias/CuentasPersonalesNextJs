export const dynamic = 'force-dynamic'
// app/api/debts/route.ts
// GET: lista deudas (filtrar por ?personId=xxx)
// POST: crear deuda

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUser } from '@/lib/auth/supabase-server'
import { z } from 'zod'

const DebtSchema = z.object({
  description: z.string().min(1, 'La descripción es requerida'),
  totalAmount: z.number().positive('El monto debe ser positivo'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes: z.string().optional(),
  type: z.enum(['receivable', 'payable']),
  personId: z.string().min(1),
})

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const personId = searchParams.get('personId')

    const where: Record<string, unknown> = { userId: user.id }
    if (personId) where.personId = personId

    const debts = await prisma.debt.findMany({
      where,
      include: {
        payments: { orderBy: { date: 'asc' } },
      },
      orderBy: { date: 'desc' },
    })

    const data = debts.map((d) => {
      const paid = d.payments.reduce((s, p) => s + p.amount, 0)
      return {
        id: d.id,
        description: d.description,
        totalAmount: d.totalAmount,
        paid,
        remaining: d.totalAmount - paid,
        date: d.date,
        dueDate: d.dueDate,
        notes: d.notes,
        type: d.type,
        personId: d.personId,
        payments: d.payments,
        createdAt: d.createdAt,
      }
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[GET /api/debts]', error)
    return NextResponse.json({ error: 'Error al obtener deudas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const body = await req.json()
    const validated = DebtSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.errors[0].message }, { status: 400 })
    }

    // Verificar que la persona pertenece al usuario
    const person = await prisma.person.findFirst({
      where: { id: validated.data.personId, userId: user.id },
    })
    if (!person) return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 })

    const { date, dueDate, ...rest } = validated.data
    const debt = await prisma.debt.create({
      data: {
        ...rest,
        date: new Date(date),
        dueDate: dueDate ? new Date(dueDate) : null,
        userId: user.id,
      },
      include: { payments: true },
    })

    return NextResponse.json(
      { data: { ...debt, paid: 0, remaining: debt.totalAmount } },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/debts]', error)
    return NextResponse.json({ error: 'Error al crear deuda' }, { status: 500 })
  }
}
