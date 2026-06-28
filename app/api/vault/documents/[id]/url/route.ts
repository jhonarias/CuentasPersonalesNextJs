export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUser } from '@/lib/auth/supabase-server'
import { getVaultSignedUrl } from '@/lib/db/supabase'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const doc = await prisma.vaultDocument.findFirst({
      where: { id: params.id, userId: user.id },
      select: { storagePath: true },
    })
    if (!doc) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const url = await getVaultSignedUrl(doc.storagePath, 3600) // válida 1 hora
    return NextResponse.json({ data: { url } })
  } catch (error) {
    console.error('[GET /api/vault/documents/[id]/url]', error)
    return NextResponse.json({ error: 'Error generando URL' }, { status: 500 })
  }
}
