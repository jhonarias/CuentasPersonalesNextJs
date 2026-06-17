export const dynamic = 'force-dynamic'
// app/api/debts/[id]/payments/route.ts
// POST: registrar un abono a una deuda

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUser } from '@/lib/auth/supabase-server'
import { z } from 'zod'

const PaymentSchema = z.object({
  amount: z.number().positive('El monto debe ser positivo'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // Verificar que la deuda pertenece al usuario
    const debt = await prisma.debt.findFirst({
      where: { id: params.id, userId: user.id },
      include: { payments: { select: { amount: true } } },
    })
    if (!debt) return NextResponse.json({ error: 'Deuda no encontrada' }, { status: 404 })

    const body = await req.json()
    const validated = PaymentSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.errors[0].message }, { status: 400 })
    }

    // Validar que el abono no supere el saldo pendiente
    const totalPaid = debt.payments.reduce((s, p) => s + p.amount, 0)
    const remaining = debt.totalAmount - totalPaid
    if (validated.data.amount > remaining + 0.01) {
      return NextResponse.json(
        {
          error: `El abono (${validated.data.amount}) supera el saldo pendiente (${remaining.toFixed(0)})`,
        },
        { status: 400 }
      )
    }

    const payment = await prisma.debtPayment.create({
      data: {
        amount: validated.data.amount,
        date: new Date(validated.data.date),
        notes: validated.data.notes,
        debtId: params.id,
      },
    })

    return NextResponse.json({ data: payment }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/debts/[id]/payments]', error)
    return NextResponse.json({ error: 'Error al registrar abono' }, { status: 500 })
  }
}
