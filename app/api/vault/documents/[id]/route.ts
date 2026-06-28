export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUser } from '@/lib/auth/supabase-server'
import { deleteVaultDocument } from '@/lib/db/supabase'
import { z } from 'zod'

const UpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  categoryId: z.string().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const body = await req.json()
    const validated = UpdateSchema.safeParse(body)
    if (!validated.success) return NextResponse.json({ error: validated.error.errors[0].message }, { status: 400 })

    const updated = await prisma.vaultDocument.updateMany({
      where: { id: params.id, userId: user.id },
      data: validated.data,
    })

    if (updated.count === 0) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json({ data: { id: params.id } })
  } catch (error) {
    console.error('[PUT /api/vault/documents/[id]]', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const doc = await prisma.vaultDocument.findFirst({
      where: { id: params.id, userId: user.id },
      select: { storagePath: true },
    })
    if (!doc) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    await deleteVaultDocument(doc.storagePath)
    await prisma.vaultDocument.delete({ where: { id: params.id } })

    return NextResponse.json({ data: { id: params.id } })
  } catch (error) {
    console.error('[DELETE /api/vault/documents/[id]]', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
