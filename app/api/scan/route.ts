// app/api/scan/route.ts
// Endpoint principal: recibe foto de factura → GPT-4o → guarda en DB

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { uploadReceipt } from '@/lib/db/supabase'
import { scanReceiptWithAI } from '@/lib/ai/scanReceipt'
import { matchCategoryName } from '@/lib/utils'
import { ScanReceiptResponse } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 30 // segundos (necesario para GPT-4o)

export async function POST(req: NextRequest): Promise<NextResponse<ScanReceiptResponse>> {
  try {
    const formData = await req.formData()
    const file = formData.get('receipt') as File | null

    if (!file) {
      return NextResponse.json({ success: false, error: 'No se recibió ningún archivo' }, { status: 400 })
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Formato no soportado. Usa JPG, PNG, WebP o PDF.' },
        { status: 400 }
      )
    }

    // Validar tamaño (máx 10MB)
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'El archivo supera el límite de 10MB' },
        { status: 400 }
      )
    }

    // 1. Convertir archivo a base64 para enviar a GPT-4o
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = file.type === 'application/pdf' ? 'image/jpeg' : file.type

    // 2. Llamar a GPT-4o Vision
    const extraction = await scanReceiptWithAI({ base64, mimeType })

    // 3. Subir imagen a Supabase Storage
    const { url: storageUrl } = await uploadReceipt(file, file.name || 'receipt.jpg')

    // 4. Mapear categoría sugerida por IA a una categoría real en DB
    const categories = await prisma.category.findMany({ select: { id: true, name: true } })
    const categoryId =
      matchCategoryName(extraction.categoryGuess, categories) ?? categories[0]?.id

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: 'No hay categorías configuradas en la base de datos' },
        { status: 500 }
      )
    }

    // 5. Guardar gasto en PostgreSQL
    const expense = await prisma.expense.create({
      data: {
        amount: extraction.amount,
        description: extraction.description,
        date: new Date(extraction.date),
        merchant: extraction.merchant,
        isAiScanned: true,
        confidence: extraction.confidence,
        rawOcrData: JSON.parse(JSON.stringify(extraction)),
        categoryId,
        receipt: {
          create: {
            storageUrl,
            fileName: file.name || 'receipt.jpg',
            mimeType: file.type,
            sizeBytes: file.size,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      extraction,
      expenseId: expense.id,
    })
  } catch (error) {
    console.error('[/api/scan] Error:', error)
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
