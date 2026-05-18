// lib/ai/providers/openai.ts
// Implementación de escaneo de facturas usando GPT-4o Vision

import OpenAI from 'openai'
import { ExpenseAIExtraction } from '@/types'
import { SYSTEM_PROMPT, USER_PROMPT, parseAIResponse } from '../prompts'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function scanWithOpenAI(
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
          image_url: { url: imageSource.url, detail: 'high' as const },
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

  return parseAIResponse(rawContent)
}
