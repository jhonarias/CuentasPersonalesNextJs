'use client'

import { useState, useEffect } from 'react'

interface Category {
  id: string
  name: string
  icon: string
  color: string
}

interface Expense {
  id: string
  amount: number
  description: string
  merchant: string | null
  date: string | Date
  notes: string | null
  isAiScanned: boolean
  confidence: number | null
  categoryId: string
  category: Category
  receipt?: { storageUrl: string; fileName: string } | null
  createdAt: string | Date
}

interface ExpenseActionsProps {
  expense: Expense
  onUpdate: () => void
  onDelete: () => void
}

type Mode = 'detail' | 'edit' | 'confirm-delete'

export default function ExpenseActions({ expense, onUpdate, onDelete }: ExpenseActionsProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('detail')
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    amount: String(expense.amount),
    description: expense.description,
    merchant: expense.merchant ?? '',
    date: new Date(expense.date).toISOString().split('T')[0],
    categoryId: expense.categoryId,
    notes: expense.notes ?? '',
  })

  useEffect(() => {
    if (open && mode === 'edit' && categories.length === 0) {
      fetch('/api/categories/list')
        .then((r) => r.json())
        .then((data) => setCategories(data.data ?? []))
    }
  }, [open, mode])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/expenses/${expense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(form.amount),
          description: form.description,
          merchant: form.merchant || null,
          date: form.date,
          categoryId: form.categoryId,
          notes: form.notes || null,
        }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      setOpen(false)
      setMode('detail')
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      await fetch(`/api/expenses/${expense.id}`, { method: 'DELETE' })
      setOpen(false)
      onDelete()
    } catch {
      setError('Error al eliminar')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <>
      {/* Botón de apertura — tres puntos */}
      <button
        onClick={() => { setOpen(true); setMode('detail') }}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="Ver opciones"
      >
        ⋯
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md">

            {/* ── DETALLE ── */}
            {mode === 'detail' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Detalle del gasto</h2>
                  <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                {/* Monto destacado */}
                <div className="text-center py-4 mb-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(expense.amount)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{formatDate(typeof expense.date === 'string' ? expense.date : expense.date.toISOString())}</p>
                </div>

                <div className="space-y-3 mb-6">
                  {[
                    { label: 'Descripción', value: expense.description },
                    { label: 'Comercio', value: expense.merchant ?? '—' },
                    { label: 'Categoría', value: expense.category.name },
                    { label: 'Origen', value: expense.isAiScanned ? `🤖 Escaneado con IA (${Math.round((expense.confidence ?? 0) * 100)}%)` : '✏️ Manual' },
                    ...(expense.notes ? [{ label: 'Notas', value: expense.notes }] : []),
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">{label}</span>
                      <span className="font-medium text-gray-900 dark:text-white text-right max-w-[60%]">{value}</span>
                    </div>
                  ))}
                </div>

                {expense.receipt?.storageUrl && (
                  <a
                    href={expense.receipt.storageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center text-sm text-emerald-600 hover:underline mb-4"
                  >
                    📎 Ver factura adjunta
                  </a>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setMode('confirm-delete')}
                    className="flex-1 py-2 rounded-lg border border-red-200 dark:border-red-900 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                  >
                    🗑 Eliminar
                  </button>
                  <button
                    onClick={() => setMode('edit')}
                    className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm text-white font-medium transition-colors"
                  >
                    ✏️ Editar
                  </button>
                </div>
              </div>
            )}

            {/* ── EDITAR ── */}
            {mode === 'edit' && (
              <form onSubmit={handleSave} className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Editar gasto</h2>
                  <button type="button" onClick={() => setMode('detail')} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Monto *</label>
                    <input name="amount" type="number" step="0.01" min="0" required value={form.amount} onChange={handleChange}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Descripción *</label>
                    <input name="description" type="text" required value={form.description} onChange={handleChange}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Comercio</label>
                      <input name="merchant" type="text" value={form.merchant} onChange={handleChange}
                        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Fecha *</label>
                      <input name="date" type="date" required value={form.date} onChange={handleChange}
                        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Categoría *</label>
                    <select name="categoryId" required value={form.categoryId} onChange={handleChange}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notas</label>
                    <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                  </div>

                  {error && <p className="text-xs text-red-500">{error}</p>}

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setMode('detail')}
                      className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50">
                      Cancelar
                    </button>
                    <button type="submit" disabled={loading}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-sm text-white font-medium">
                      {loading ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* ── CONFIRMAR ELIMINACIÓN ── */}
            {mode === 'confirm-delete' && (
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="text-5xl mb-3">🗑</div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    ¿Eliminar este gasto?
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Esta acción no se puede deshacer. Se eliminará permanentemente
                    <span className="font-medium text-gray-900 dark:text-white"> {expense.description} </span>
                    por
                    <span className="font-medium text-gray-900 dark:text-white"> {formatCurrency(expense.amount)}</span>.
                  </p>
                </div>

                {error && <p className="text-xs text-red-500 text-center mb-4">{error}</p>}

                <div className="flex gap-3">
                  <button
                    onClick={() => setMode('detail')}
                    className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-sm text-white font-medium"
                  >
                    {loading ? 'Eliminando...' : 'Sí, eliminar'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  )
}
