export const dynamic = 'force-dynamic'
// app/api/debts/[id]/payments/[paymentId]/route.ts
// DELETE: eliminar un abono específico

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUser } from '@/lib/auth/supabase-server'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; paymentId: string } }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // Verificar que la deuda pertenece al usuario
    const debt = await prisma.debt.findFirst({ where: { id: params.id, userId: user.id } })
    if (!debt) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    await prisma.debtPayment.delete({ where: { id: params.paymentId } })
    return NextResponse.json({ data: { id: params.paymentId } })
  } catch (error) {
    console.error('[DELETE /api/debts/[id]/payments/[paymentId]]', error)
    return NextResponse.json({ error: 'Error al eliminar abono' }, { status: 500 })
  }
}
