export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUser } from '@/lib/auth/supabase-server'
import { uploadVaultDocument } from '@/lib/db/supabase'

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId')
    const search = searchParams.get('search')?.trim().toLowerCase()
    const tagsParam = searchParams.get('tags')
    const filterTags = tagsParam ? tagsParam.split(',').filter(Boolean) : []

    const where: Record<string, unknown> = { userId: user.id }
    if (categoryId) where.categoryId = categoryId
    if (filterTags.length > 0) where.tags = { hasEvery: filterTags }

    let documents = await prisma.vaultDocument.findMany({
      where,
      include: { category: { select: { id: true, name: true, icon: true, color: true } } },
      orderBy: { createdAt: 'desc' },
    })

    // Filtro de búsqueda en memoria (título, descripción, tags)
    if (search) {
      documents = documents.filter(
        (d) =>
          d.title.toLowerCase().includes(search) ||
          (d.description ?? '').toLowerCase().includes(search) ||
          d.tags.some((t) => t.toLowerCase().includes(search))
      )
    }

    return NextResponse.json({ data: documents })
  } catch (error) {
    console.error('[GET /api/vault/documents]', error)
    return NextResponse.json({ error: 'Error al obtener documentos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string
    const description = formData.get('description') as string | null
    const categoryId = formData.get('categoryId') as string
    const tagsRaw = formData.get('tags') as string | null

    if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    if (!title?.trim()) return NextResponse.json({ error: 'Título requerido' }, { status: 400 })
    if (!categoryId) return NextResponse.json({ error: 'Categoría requerida' }, { status: 400 })

    // Verificar que la categoría pertenece al usuario
    const category = await prisma.vaultCategory.findFirst({
      where: { id: categoryId, userId: user.id },
    })
    if (!category) return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })

    const tags: string[] = tagsRaw ? JSON.parse(tagsRaw) : []
    const docId = crypto.randomUUID()

    // Subir archivo al storage
    const { path, sizeBytes, mimeType } = await uploadVaultDocument(file, file.name, user.id, docId)

    const document = await prisma.vaultDocument.create({
      data: {
        id: docId,
        title: title.trim(),
        description: description?.trim() || null,
        storageUrl: path,
        storagePath: path,
        fileName: file.name,
        mimeType,
        sizeBytes,
        tags,
        userId: user.id,
        categoryId,
      },
      include: { category: { select: { id: true, name: true, icon: true, color: true } } },
    })

    return NextResponse.json({ data: document }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/vault/documents]', error)
    return NextResponse.json({ error: 'Error al subir documento' }, { status: 500 })
  }
}
