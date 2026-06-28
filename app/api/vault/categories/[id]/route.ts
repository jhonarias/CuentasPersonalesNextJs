export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUser } from '@/lib/auth/supabase-server'
import { deleteVaultDocument } from '@/lib/db/supabase'
import { z } from 'zod'

const CategoryUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  icon: z.string().min(1).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const body = await req.json()
    const validated = CategoryUpdateSchema.safeParse(body)
    if (!validated.success) return NextResponse.json({ error: validated.error.errors[0].message }, { status: 400 })

    const updated = await prisma.vaultCategory.updateMany({
      where: { id: params.id, userId: user.id },
      data: validated.data,
    })

    if (updated.count === 0) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
    return NextResponse.json({ data: { id: params.id } })
  } catch (error) {
    console.error('[PUT /api/vault/categories/[id]]', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // Obtener todos los documentos para limpiar storage
    const docs = await prisma.vaultDocument.findMany({
      where: { categoryId: params.id, userId: user.id },
      select: { storagePath: true },
    })

    // Eliminar archivos del storage en paralelo
    await Promise.all(docs.map((d) => deleteVaultDocument(d.storagePath)))

    const deleted = await prisma.vaultCategory.deleteMany({
      where: { id: params.id, userId: user.id },
    })

    if (deleted.count === 0) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
    return NextResponse.json({ data: { id: params.id } })
  } catch (error) {
    console.error('[DELETE /api/vault/categories/[id]]', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
