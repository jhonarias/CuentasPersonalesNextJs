export const dynamic = 'force-dynamic'
// app/api/people/route.ts
// GET: lista personas con resumen de deudas
// POST: crear persona

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUser } from '@/lib/auth/supabase-server'
import { z } from 'zod'

const PersonSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  phone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // 'receivable' | 'payable' | null

    const people = await prisma.person.findMany({
      where: { userId: user.id },
      include: {
        debts: {
          where: type ? { type } : undefined,
          include: {
            payments: { select: { amount: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const data = people.map((p) => {
      const totalDebt = p.debts.reduce((s, d) => s + d.totalAmount, 0)
      const totalPaid = p.debts.reduce(
        (s, d) => s + d.payments.reduce((ps, pay) => ps + pay.amount, 0),
        0
      )
      const remaining = totalDebt - totalPaid
      const debtCount = p.debts.filter((d) => {
        const paid = d.payments.reduce((s, pay) => s + pay.amount, 0)
        return d.totalAmount - paid > 0
      }).length
      return {
        id: p.id,
        name: p.name,
        phone: p.phone,
        notes: p.notes,
        totalDebt,
        totalPaid,
        remaining,
        debtCount,
        createdAt: p.createdAt,
      }
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[GET /api/people]', error)
    return NextResponse.json({ error: 'Error al obtener personas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const body = await req.json()
    const validated = PersonSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.errors[0].message }, { status: 400 })
    }

    const person = await prisma.person.create({
      data: { ...validated.data, userId: user.id },
    })

    return NextResponse.json({ data: person }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/people]', error)
    return NextResponse.json({ error: 'Error al crear persona' }, { status: 500 })
  }
}
