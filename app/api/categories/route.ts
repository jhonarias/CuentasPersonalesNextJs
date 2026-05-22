// app/api/categories/route.ts
// Gestión de categorías con sus resúmenes mensuales

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUser } from '@/lib/auth/supabase-server'
import { calculateCategoryPercentages } from '@/lib/utils'
import { ApiResponse, CategorySummary } from '@/types'

// GET /api/categories?month=5&year=2026
export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<CategorySummary[]>>> {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') ?? String(new Date().getMonth() + 1)
    const year = searchParams.get('year') ?? String(new Date().getFullYear())

    const start = new Date(Number(year), Number(month) - 1, 1)
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59)

    const aggregated = await prisma.expense.groupBy({
      by: ['categoryId'],
      where: { date: { gte: start, lte: end }, userId: user.id },
      _sum: { amount: true },
      _count: { id: true },
    })

    const categories = await prisma.category.findMany({
      where: { userId: user.id },
    })

    const summariesRaw = categories.map((cat) => {
      const agg = aggregated.find((a) => a.categoryId === cat.id)
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        categoryColor: cat.color,
        total: agg?._sum.amount ?? 0,
        count: agg?._count.id ?? 0,
        budget: cat.budget,
      }
    })

    const withExpenses = summariesRaw.filter((s) => s.total > 0)
    const withPercentages = calculateCategoryPercentages(withExpenses)

    return NextResponse.json({ data: withPercentages })
  } catch (error) {
    console.error('[GET /api/categories]', error)
    return NextResponse.json({ error: 'Error al obtener categorías' }, { status: 500 })
  }
}

// POST /api/categories — crear nueva categoría
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { name, icon, color, budget } = await req.json()

    if (!name || !icon || !color) {
      return NextResponse.json({ error: 'name, icon y color son requeridos' }, { status: 400 })
    }

    const category = await prisma.category.create({
      data: { name, icon, color, budget, userId: user.id },
    })

    return NextResponse.json({ data: category }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/categories]', error)
    return NextResponse.json({ error: 'Error al crear categoría' }, { status: 500 })
  }
}
