// lib/ai/scanReceipt.ts
// Núcleo de la IA: envía la imagen a GPT-4o y extrae datos estructurados

import OpenAI from 'openai'
import { ExpenseAIExtraction } from '@/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

const SYSTEM_PROMPT = `Eres un asistente especializado en extraer información de facturas y recibos.
Tu tarea es analizar la imagen proporcionada y extraer los datos clave en formato JSON.

REGLAS:
- Extrae SOLO los datos que puedas ver claramente en la imagen
- Si no puedes leer un campo con certeza, usa null
- El campo "confidence" refleja tu confianza general (0.0 = ninguna, 1.0 = total)
- Para "categoryGuess" elige la más apropiada: Alimentación, Transporte, Servicios, 
  Restaurantes, Salud, Entretenimiento, Ropa, Hogar, Suscripciones, Educación, Otros
- Las fechas deben estar en formato ISO 8601 (YYYY-MM-DD)
- Los montos deben ser números sin símbolo de moneda
- Responde ÚNICAMENTE con el objeto JSON, sin explicaciones adicionales`

const USER_PROMPT = `Analiza esta factura/recibo y devuelve un JSON con esta estructura exacta:
{
  "amount": <número>,
  "description": "<descripción breve del gasto>",
  "merchant": "<nombre del comercio>",
  "date": "<YYYY-MM-DD>",
  "categoryGuess": "<categoría>",
  "confidence": <0.0 a 1.0>,
  "currency": "<código de moneda>",
  "rawText": "<todo el texto visible en la imagen>"
}`

/**
 * Escanea una factura usando GPT-4o Vision
 * Acepta imagen en base64 o URL pública
 */
export async function scanReceiptWithAI(
  imageSource: { base64: string; mimeType: string } | { url: string }
): Promise<ExpenseAIExtraction> {
  const imageContent =
    'base64' in imageSource
      ? {
          type: 'image_url' as const,
          image_url: {
            url: `data:${imageSource.mimeType};base64,${imageSource.base64}`,
            detail: 'high' as const,
          },
        }
      : {
          type: 'image_url' as const,
          image_url: {
            url: imageSource.url,
            detail: 'high' as const,
          },
        }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [{ type: 'text', text: USER_PROMPT }, imageContent],
      },
    ],
  })

  const rawContent = response.choices[0]?.message?.content
  if (!rawContent) throw new Error('GPT-4o no devolvió respuesta')

  // Limpiar posibles markdown fences antes de parsear
  const cleaned = rawContent.replace(/```json\n?|\n?```/g, '').trim()

  let parsed: ExpenseAIExtraction
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`No se pudo parsear la respuesta de IA: ${rawContent}`)
  }

  // Validación básica de campos requeridos
  if (!parsed.amount || isNaN(Number(parsed.amount))) {
    throw new Error('La IA no pudo extraer el monto de la factura')
  }

  return {
    amount: Number(parsed.amount),
    description: parsed.description || 'Gasto escaneado',
    merchant: parsed.merchant || 'Comercio desconocido',
    date: parsed.date || new Date().toISOString().split('T')[0],
    categoryGuess: parsed.categoryGuess || 'Otros',
    confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
    currency: parsed.currency || 'COP',
    rawText: parsed.rawText || '',
  }
}

/**
 * Convierte un File/Blob a base64 para enviarlo a la API
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remover el prefijo "data:image/...;base64,"
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
