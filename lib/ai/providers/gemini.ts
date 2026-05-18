// lib/ai/providers/gemini.ts
// Implementación de escaneo de facturas usando Google Gemini Vision

import { GoogleGenerativeAI } from '@google/generative-ai'
import { ExpenseAIExtraction } from '@/types'
import { SYSTEM_PROMPT, USER_PROMPT, parseAIResponse } from '../prompts'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function scanWithGemini(
  imageSource: { base64: string; mimeType: string } | { url: string }
): Promise<ExpenseAIExtraction> {
  // gemini-1.5-flash tiene tier gratuito real (1500 req/día)
  // Usamos apiVersion 'v1' porque v1beta ya no lo soporta
  const model = genAI.getGenerativeModel(
    { model: 'gemini-1.5-flash', systemInstruction: SYSTEM_PROMPT },
    { apiVersion: 'v1' }
  )

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

  const result = await model.generateContent([USER_PROMPT, imagePart])
  const rawContent = result.response.text()

  if (!rawContent) throw new Error('Gemini no devolvió respuesta')

  return parseAIResponse(rawContent)
}
