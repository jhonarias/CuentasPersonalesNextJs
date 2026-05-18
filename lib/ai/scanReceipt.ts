// lib/ai/scanReceipt.ts
// Router de providers de IA — selecciona el proveedor según AI_PROVIDER env var
//
// Para cambiar de proveedor, solo ajusta en tu .env:
//   AI_PROVIDER=openai   → usa GPT-4o        (requiere OPENAI_API_KEY)
//   AI_PROVIDER=gemini   → usa Gemini Flash  (requiere GEMINI_API_KEY)
//
// Por defecto usa Gemini si no se especifica.

import { ExpenseAIExtraction } from '@/types'
import { scanWithOpenAI } from './providers/openai'
import { scanWithGemini } from './providers/gemini'

export type AIProvider = 'openai' | 'gemini'

function getProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase()
  if (provider === 'openai') return 'openai'
  return 'gemini' // default
}

/**
 * Escanea una factura usando el proveedor configurado en AI_PROVIDER
 */
export async function scanReceiptWithAI(
  imageSource: { base64: string; mimeType: string } | { url: string }
): Promise<ExpenseAIExtraction> {
  const provider = getProvider()
  console.log(`[AI] Usando proveedor: ${provider}`)

  switch (provider) {
    case 'openai':
      return scanWithOpenAI(imageSource)
    case 'gemini':
      return scanWithGemini(imageSource)
    default:
      throw new Error(`Proveedor de IA no soportado: ${provider}`)
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
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
