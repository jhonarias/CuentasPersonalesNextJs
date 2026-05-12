'use client'
// app/components/ScanButton.tsx
// Botón de escaneo: abre cámara nativa del navegador (PWA), envía a /api/scan

import { useRef, useState } from 'react'

interface ScanButtonProps {
  onSuccess: () => void
}

type ScanState = 'idle' | 'uploading' | 'processing' | 'confirming' | 'error'

interface ExtractionResult {
  expenseId: string
  extraction: {
    amount: number
    description: string
    merchant: string
    date: string
    categoryGuess: string
    confidence: number
    currency: string
  }
}

export default function ScanButton({ onSuccess }: ScanButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<ScanState>('idle')
  const [result, setResult] = useState<ExtractionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setState('uploading')
    setError(null)

    const formData = new FormData()
    formData.append('receipt', file)

    try {
      setState('processing')
      const res = await fetch('/api/scan', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al procesar la factura')
      }

      setResult({ expenseId: data.expenseId, extraction: data.extraction })
      setState('confirming')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setState('error')
    } finally {
      // Limpiar input para permitir re-escaneo del mismo archivo
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleConfirm = () => {
    setState('idle')
    setResult(null)
    onSuccess()
  }

  const handleDiscard = async () => {
    // Si el usuario rechaza, eliminar el gasto creado
    if (result?.expenseId) {
      await fetch(`/api/expenses/${result.expenseId}`, { method: 'DELETE' }).catch(() => {})
    }
    setState('idle')
    setResult(null)
  }

  return (
    <>
      {/* Input oculto — acepta imagen y captura de cámara */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment" // activa cámara trasera en móvil (PWA)
        className="hidden"
        onChange={handleFileChange}
        aria-label="Seleccionar factura"
      />

      {/* Botón principal */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={state !== 'idle'}
        className="flex items-center gap-1.5 text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors whitespace-nowrap"
      >
        {state === 'idle' && <><span>📷</span><span className="hidden sm:inline"> Escanear factura</span><span className="sm:hidden"> Scan</span></>}
        {state === 'uploading' && <><span>⏫</span><span className="hidden sm:inline"> Subiendo...</span></>}
        {state === 'processing' && <><span className="animate-spin inline-block">⚙️</span><span className="hidden sm:inline"> Analizando...</span></>}
        {state === 'confirming' && <><span>✅</span><span className="hidden sm:inline"> ¡Listo!</span></>}
        {state === 'error' && <><span>❌</span> Reintentar</>}
      </button>

      {/* Modal de confirmación — muestra los datos extraídos por IA */}
      {state === 'confirming' && result && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">🤖</div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Factura procesada
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Confianza: {Math.round(result.extraction.confidence * 100)}%
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {[
                { label: 'Comercio', value: result.extraction.merchant },
                { label: 'Monto', value: `${result.extraction.currency} ${result.extraction.amount.toLocaleString()}` },
                { label: 'Fecha', value: result.extraction.date },
                { label: 'Categoría sugerida', value: result.extraction.categoryGuess },
                { label: 'Descripción', value: result.extraction.description },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{label}</span>
                  <span className="font-medium text-gray-900 dark:text-white text-right max-w-[60%] truncate">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDiscard}
                className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50"
              >
                Descartar
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm text-white font-medium"
              >
                Guardar ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de error */}
      {state === 'error' && error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white text-sm px-4 py-3 rounded-xl shadow-lg z-50 max-w-sm text-center">
          {error}
        </div>
      )}
    </>
  )
}
