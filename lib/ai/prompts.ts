// lib/ai/prompts.ts
// Prompts compartidos entre todos los providers de IA

import { ExpenseAIExtraction } from '@/types'

export const SYSTEM_PROMPT = `Eres un asistente especializado en extraer información de facturas y recibos.
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

export const USER_PROMPT = `Analiza esta factura/recibo y devuelve un JSON con esta estructura exacta:
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
 * Parsea y valida la respuesta JSON de cualquier proveedor de IA
 */
export function parseAIResponse(rawContent: string): ExpenseAIExtraction {
  // Limpiar posibles markdown fences
  const cleaned = rawContent.replace(/```json\n?|\n?```/g, '').trim()

  let parsed: ExpenseAIExtraction
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`No se pudo parsear la respuesta de IA: ${rawContent}`)
  }

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
