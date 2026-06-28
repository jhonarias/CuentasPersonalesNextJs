export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUser } from '@/lib/auth/supabase-server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const doc = await prisma.vaultDocument.findFirst({
      where: { id: params.id, userId: user.id },
    })
    if (!doc) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas

    await prisma.vaultShare.create({
      data: { token, expiresAt, documentId: params.id },
    })

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/vault/share/${token}`
    return NextResponse.json({ data: { url: shareUrl, expiresAt } }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/vault/documents/[id]/share]', error)
    return NextResponse.json({ error: 'Error creando link' }, { status: 500 })
  }
}
