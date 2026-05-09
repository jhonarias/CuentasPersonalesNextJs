// lib/db/supabase.ts
// Cliente de Supabase — usado principalmente para Storage (imágenes de facturas)

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cliente público (browser) — solo lectura de archivos públicos
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente de servicio (servidor) — operaciones con permisos elevados
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export const RECEIPTS_BUCKET = 'receipts'

/**
 * Sube una imagen de factura a Supabase Storage
 * Retorna la URL pública del archivo
 */
export async function uploadReceipt(
  file: File | Blob,
  fileName: string
): Promise<{ url: string; path: string }> {
  const timestamp = Date.now()
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${timestamp}_${safeName}`

  const { error } = await supabaseAdmin.storage
    .from(RECEIPTS_BUCKET)
    .upload(path, file, {
      contentType: file instanceof File ? file.type : 'image/jpeg',
      upsert: false,
    })

  if (error) throw new Error(`Error subiendo archivo: ${error.message}`)

  const { data: urlData } = supabaseAdmin.storage
    .from(RECEIPTS_BUCKET)
    .getPublicUrl(path)

  return { url: urlData.publicUrl, path }
}
