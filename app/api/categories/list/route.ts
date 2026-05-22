// app/api/categories/list/route.ts
// Retorna todas las categorías del usuario sin filtro de mes (para formularios)

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUser } from '@/lib/auth/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const categories = await prisma.category.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, icon: true, color: true, budget: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ data: categories })
  } catch (error) {
    console.error('[GET /api/categories/list]', error)
    return NextResponse.json({ error: 'Error al obtener categorías' }, { status: 500 })
  }
}
