// app/api/expenses/route.ts
// CRUD de gastos: listar y crear manualmente

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { CreateExpenseInput, ApiResponse, ExpenseWithCategory } from '@/types'
import { z } from 'zod'

const CreateExpenseSchema = z.object({
  amount: z.number().positive('El monto debe ser positivo'),
  description: z.string().min(1, 'La descripción es requerida'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe ser YYYY-MM-DD'),
  merchant: z.string().optional(),
  categoryId: z.string().min(1, 'La categoría es requerida'),
  notes: z.string().optional(),
  isAiScanned: z.boolean().optional().default(false),
  confidence: z.number().min(0).max(1).optional(),
})

// GET /api/expenses?month=5&year=2026&categoryId=xxx
export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<ExpenseWithCategory[]>>> {
  try {
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const categoryId = searchParams.get('categoryId')
    const limit = Number(searchParams.get('limit')) || 50

    const where: Record<string, unknown> = {}

    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1)
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59)
      where.date = { gte: start, lte: end }
    }

    if (categoryId) where.categoryId = categoryId

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
        receipt: { select: { id: true, storageUrl: true, fileName: true } },
      },
      orderBy: { date: 'desc' },
      take: limit,
    })

    return NextResponse.json({ data: expenses as ExpenseWithCategory[] })
  } catch (error) {
    console.error('[GET /api/expenses]', error)
    return NextResponse.json({ error: 'Error al obtener gastos' }, { status: 500 })
  }
}

// POST /api/expenses — crear gasto manualmente
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<ExpenseWithCategory>>> {
  try {
    const body: CreateExpenseInput = await req.json()
    const validated = CreateExpenseSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      )
    }

    const { amount, description, date, merchant, categoryId, notes, isAiScanned, confidence } =
      validated.data

    const expense = await prisma.expense.create({
      data: {
        amount,
        description,
        date: new Date(date),
        merchant,
        categoryId,
        notes,
        isAiScanned: isAiScanned ?? false,
        confidence,
      },
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
        receipt: { select: { id: true, storageUrl: true, fileName: true } },
      },
    })

    return NextResponse.json({ data: expense as ExpenseWithCategory }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/expenses]', error)
    return NextResponse.json({ error: 'Error al crear gasto' }, { status: 500 })
  }
}
