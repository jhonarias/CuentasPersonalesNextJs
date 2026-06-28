// lib/db/supabase.ts
// Cliente de Supabase — usado principalmente para Storage (imágenes de facturas)

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cliente público (browser) — solo lectura de archivos públicos
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente de servicio (servidor) — operaciones con permisos elevados
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export const RECEIPTS_BUCKET = 'receipts'

/**
 * Comprime una imagen antes de subirla
 * - Redimensiona a máx 1200px de ancho manteniendo proporción
 * - Convierte a JPEG con calidad 80%
 * - Típicamente reduce de 3-10MB a menos de 300KB
 */
async function compressImage(buffer: Buffer, mimeType: string): Promise<{ buffer: Buffer; mimeType: string }> {
  // Los PDFs no se comprimen con sharp
  if (mimeType === 'application/pdf') {
    return { buffer, mimeType }
  }

  const compressed = await sharp(buffer)
    .resize(1200, 1600, {
      fit: 'inside',        // no estira, solo reduce si es más grande
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80, progressive: true })
    .toBuffer()

  return { buffer: compressed, mimeType: 'image/jpeg' }
}

/**
 * Sube una imagen de factura a Supabase Storage con compresión automática
 * Retorna la URL pública del archivo
 */
export async function uploadReceipt(
  file: File | Blob,
  fileName: string
): Promise<{ url: string; path: string; originalSize: number; compressedSize: number }> {
  const timestamp = Date.now()
  const originalSize = file.size

  // Convertir File/Blob a Buffer para procesar con sharp
  const arrayBuffer = await file.arrayBuffer()
  const inputBuffer = Buffer.from(arrayBuffer)
  const mimeType = file instanceof File ? file.type : 'image/jpeg'

  // Comprimir imagen
  const { buffer: compressedBuffer, mimeType: outputMimeType } = await compressImage(inputBuffer, mimeType)

  // Nombre del archivo siempre .jpg después de comprimir (salvo PDF)
  const ext = outputMimeType === 'application/pdf' ? 'pdf' : 'jpg'
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.[^.]+$/, '')
  const path = `${timestamp}_${safeName}.${ext}`

  const { error } = await supabaseAdmin.storage
    .from(RECEIPTS_BUCKET)
    .upload(path, compressedBuffer, {
      contentType: outputMimeType,
      upsert: false,
    })

  if (error) throw new Error(`Error subiendo archivo: ${error.message}`)

  const { data: urlData } = supabaseAdmin.storage
    .from(RECEIPTS_BUCKET)
    .getPublicUrl(path)

  console.log(`[Storage] ${fileName}: ${(originalSize / 1024).toFixed(0)}KB → ${(compressedBuffer.length / 1024).toFixed(0)}KB`)

  return {
    url: urlData.publicUrl,
    path,
    originalSize,
    compressedSize: compressedBuffer.length,
  }
}

/**
 * Elimina una imagen de Supabase Storage a partir de su URL pública.
 * Extrae el path del bucket desde la URL y lo elimina.
 * No lanza error si el archivo no existe — operación idempotente.
 */
export async function deleteReceipt(storageUrl: string): Promise<void> {
  try {
    // URL pública: https://<project>.supabase.co/storage/v1/object/public/receipts/<path>
    const marker = `/${RECEIPTS_BUCKET}/`
    const idx = storageUrl.indexOf(marker)
    if (idx === -1) {
      console.warn('[Storage] No se pudo extraer el path de la URL:', storageUrl)
      return
    }
    const filePath = storageUrl.slice(idx + marker.length)

    const { error } = await supabaseAdmin.storage
      .from(RECEIPTS_BUCKET)
      .remove([filePath])

    if (error) {
      console.error('[Storage] Error eliminando archivo:', error.message)
    } else {
      console.log('[Storage] Archivo eliminado:', filePath)
    }
  } catch (err) {
    console.error('[Storage] Error inesperado al eliminar:', err)
  }
}

// ── Módulo Bóveda ──────────────────────────────────────────────────────────────

export const VAULT_BUCKET = 'vault'

/**
 * Sube un documento a la Bóveda en Supabase Storage (bucket privado)
 * Para imágenes aplica compresión, PDFs se suben tal cual.
 * Retorna path en el bucket (usado para generar signed URLs)
 */
export async function uploadVaultDocument(
  file: File | Blob,
  fileName: string,
  userId: string,
  docId: string
): Promise<{ path: string; sizeBytes: number; mimeType: string }> {
  const arrayBuffer = await file.arrayBuffer()
  const inputBuffer = Buffer.from(arrayBuffer)
  const mimeType = file instanceof File ? file.type : 'application/octet-stream'

  const { buffer: finalBuffer, mimeType: finalMimeType } = await compressImage(inputBuffer, mimeType)

  const ext = finalMimeType === 'application/pdf' ? 'pdf' : 'jpg'
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.[^.]+$/, '')
  const path = `${userId}/${docId}_${safeName}.${ext}`

  const { error } = await supabaseAdmin.storage
    .from(VAULT_BUCKET)
    .upload(path, finalBuffer, { contentType: finalMimeType, upsert: false })

  if (error) throw new Error(`Error subiendo documento: ${error.message}`)

  return { path, sizeBytes: finalBuffer.length, mimeType: finalMimeType }
}

/**
 * Genera una URL firmada temporal para acceder a un documento privado de la Bóveda
 */
export async function getVaultSignedUrl(path: string, expiresInSeconds = 3600): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(VAULT_BUCKET)
    .createSignedUrl(path, expiresInSeconds)

  if (error || !data?.signedUrl) throw new Error(`Error generando URL: ${error?.message}`)
  return data.signedUrl
}

/**
 * Elimina un documento del bucket vault
 */
export async function deleteVaultDocument(storagePath: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin.storage.from(VAULT_BUCKET).remove([storagePath])
    if (error) console.error('[Vault Storage] Error eliminando:', error.message)
  } catch (err) {
    console.error('[Vault Storage] Error inesperado:', err)
  }
}
