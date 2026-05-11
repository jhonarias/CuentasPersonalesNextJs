// app/api/categories/list/route.ts
// Retorna todas las categorías sin filtro de mes (para formularios)

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      select: { id: true, name: true, icon: true, color: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ data: categories })
  } catch (error) {
    console.error('[GET /api/categories/list]', error)
    return NextResponse.json({ error: 'Error al obtener categorías' }, { status: 500 })
  }
}
