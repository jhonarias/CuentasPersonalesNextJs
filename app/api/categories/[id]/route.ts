// app/api/categories/[id]/route.ts
// PUT y DELETE para una categoría específica (solo del usuario autenticado)

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUser } from '@/lib/auth/supabase-server'

// PUT /api/categories/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { name, icon, color, budget } = await req.json()

    if (!name || !color) {
      return NextResponse.json({ error: 'name y color son requeridos' }, { status: 400 })
    }

    const category = await prisma.category.update({
      where: { id: params.id, userId: user.id },
      data: {
        name: name.trim(),
        icon: icon?.trim() || '🏷️',
        color,
        budget: budget != null && budget !== '' ? Number(budget) : null,
      },
    })

    return NextResponse.json({ data: category })
  } catch (error) {
    console.error('[PUT /api/categories/[id]]', error)
    return NextResponse.json({ error: 'Error al actualizar categoría' }, { status: 500 })
  }
}

// DELETE /api/categories/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const expenseCount = await prisma.expense.count({
      where: { categoryId: params.id, userId: user.id },
    })

    if (expenseCount > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: tiene ${expenseCount} gasto(s) asociado(s)` },
        { status: 409 }
      )
    }

    await prisma.category.delete({ where: { id: params.id, userId: user.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/categories/[id]]', error)
    return NextResponse.json({ error: 'Error al eliminar categoría' }, { status: 500 })
  }
}
