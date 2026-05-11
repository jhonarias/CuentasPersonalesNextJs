// app/api/expenses/[id]/route.ts
// GET, PUT, DELETE para un gasto específico

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const UpdateExpenseSchema = z.object({
  amount: z.number().positive().optional(),
  description: z.string().min(1).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  merchant: z.string().optional().nullable(),
  categoryId: z.string().min(1).optional(),
  notes: z.string().optional().nullable(),
})

// GET /api/expenses/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        receipt: true,
      },
    })

    if (!expense) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ data: expense })
  } catch (error) {
    console.error('[GET /api/expenses/[id]]', error)
    return NextResponse.json({ error: 'Error al obtener gasto' }, { status: 500 })
  }
}

// PUT /api/expenses/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const validated = UpdateExpenseSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      )
    }

    const { amount, description, date, merchant, categoryId, notes } = validated.data

    const expense = await prisma.expense.update({
      where: { id: params.id },
      data: {
        ...(amount !== undefined && { amount }),
        ...(description !== undefined && { description }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(merchant !== undefined && { merchant }),
        ...(categoryId !== undefined && { categoryId }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
        receipt: { select: { id: true, storageUrl: true, fileName: true } },
      },
    })

    return NextResponse.json({ data: expense })
  } catch (error) {
    console.error('[PUT /api/expenses/[id]]', error)
    return NextResponse.json({ error: 'Error al actualizar gasto' }, { status: 500 })
  }
}

// DELETE /api/expenses/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.expense.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/expenses/[id]]', error)
    return NextResponse.json({ error: 'Error al eliminar gasto' }, { status: 500 })
  }
}
