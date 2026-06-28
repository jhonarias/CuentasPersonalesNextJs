export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getVaultSignedUrl } from '@/lib/db/supabase'

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const share = await prisma.vaultShare.findUnique({
      where: { token: params.token },
      include: { document: { select: { storagePath: true, fileName: true } } },
    })

    if (!share) return NextResponse.json({ error: 'Link no válido' }, { status: 404 })
    if (share.expiresAt < new Date()) return NextResponse.json({ error: 'Link expirado' }, { status: 410 })

    const url = await getVaultSignedUrl(share.document.storagePath, 300) // 5 minutos para descargar
    return NextResponse.redirect(url)
  } catch (error) {
    console.error('[GET /api/vault/share/[token]]', error)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
