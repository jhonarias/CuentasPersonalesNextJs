export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUser } from '@/lib/auth/supabase-server'
import { z } from 'zod'

const CategorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  icon: z.string().min(1, 'El ícono es requerido'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido'),
})

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const categories = await prisma.vaultCategory.findMany({
      where: { userId: user.id },
      include: { _count: { select: { documents: true } } },
      orderBy: { createdAt: 'asc' },
    })

    const data = categories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      documentCount: c._count.documents,
      createdAt: c.createdAt,
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[GET /api/vault/categories]', error)
    return NextResponse.json({ error: 'Error al obtener categorías' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const body = await req.json()
    const validated = CategorySchema.safeParse(body)
    if (!validated.success) return NextResponse.json({ error: validated.error.errors[0].message }, { status: 400 })

    const category = await prisma.vaultCategory.create({
      data: { ...validated.data, userId: user.id },
    })

    return NextResponse.json({ data: { ...category, documentCount: 0 } }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/vault/categories]', error)
    return NextResponse.json({ error: 'Error al crear categoría' }, { status: 500 })
  }
}
