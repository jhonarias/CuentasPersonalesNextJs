// lib/ai/providers/gemini.ts
// Implementación de escaneo de facturas usando Google Gemini Vision

import { GoogleGenerativeAI } from '@google/generative-ai'
import { ExpenseAIExtraction } from '@/types'
import { SYSTEM_PROMPT, USER_PROMPT, parseAIResponse } from '../prompts'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function scanWithGemini(
  imageSource: { base64: string; mimeType: string } | { url: string }
): Promise<ExpenseAIExtraction> {
  // gemini-1.5-flash: tier gratuito 1500 req/día
  // systemInstruction no está disponible en v1, se incluye en el prompt
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' })

  let imagePart: { inlineData: { data: string; mimeType: string } } | { fileData: { mimeType: string; fileUri: string } }

  if ('base64' in imageSource) {
    imagePart = {
      inlineData: {
        data: imageSource.base64,
        mimeType: imageSource.mimeType,
      },
    }
  } else {
    imagePart = {
      fileData: {
        mimeType: 'image/jpeg',
        fileUri: imageSource.url,
      },
    }
  }

  // Combinar system prompt + user prompt en un solo mensaje
  const fullPrompt = `${SYSTEM_PROMPT}\n\n${USER_PROMPT}`

  const result = await model.generateContent([fullPrompt, imagePart])
  const rawContent = result.response.text()

  if (!rawContent) throw new Error('Gemini no devolvió respuesta')

  return parseAIResponse(rawContent)
}
