'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Category {
  id: string
  name: string
  icon: string
  color: string
  budget: number | null
}

const PRESET_COLORS = [
  '#1D9E75', '#3B82F6', '#8B5CF6', '#EF4444',
  '#F59E0B', '#EC4899', '#06B6D4', '#6B7280',
  '#10B981', '#F97316', '#84CC16', '#A855F7',
]

type ModalMode = 'create' | 'edit' | 'confirm-delete' | null

const emptyForm = { name: '', icon: '💰', color: '#1D9E75', budget: '' }

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<Category | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/categories/list')
      const data = await res.json()
      setCategories(data.data ?? [])
    } catch {
      setError('Error cargando categorías')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCategories() }, [])

  const openCreate = () => {
    setForm(emptyForm)
    setSelected(null)
    setError(null)
    setMode('create')
  }

  const openEdit = (cat: Category) => {
    setForm({ name: cat.name, icon: cat.icon, color: cat.color, budget: cat.budget ? String(cat.budget) : '' })
    setSelected(cat)
    setError(null)
    setMode('edit')
  }

  const openDelete = (cat: Category) => {
    setSelected(cat)
    setError(null)
    setMode('confirm-delete')
  }

  const closeModal = () => { setMode(null); setSelected(null); setError(null) }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const body = {
      name: form.name.trim(),
      icon: form.icon.trim(),
      color: form.color,
      budget: form.budget ? parseFloat(form.budget) : null,
    }

    try {
      const url = mode === 'edit' ? `/api/categories/${selected!.id}` : '/api/categories'
      const method = mode === 'edit' ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      closeModal()
      fetchCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/categories/${selected.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al eliminar')
      closeModal()
      fetchCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 overflow-x-hidden">

      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
              ←
            </Link>
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">Categorías</h1>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            + Nueva
          </button>
        </div>
      </header>

      {/* Lista */}
      <main className="max-w-4xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-16 text-gray-400 text-sm">Cargando...</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-600">
            <p className="text-5xl mb-3">🏷️</p>
            <p className="text-sm mb-4">No hay categorías aún</p>
            <button onClick={openCreate} className="text-sm text-emerald-600 hover:underline">
              Crear primera categoría
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-3"
              >
                {/* Ícono */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: cat.color + '22' }}
                >
                  {cat.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{cat.name}</p>
                  {cat.budget ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Presupuesto: ${cat.budget.toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">Sin presupuesto</p>
                  )}
                </div>

                {/* Color pill */}
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />

                {/* Acciones */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(cat)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors"
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => openDelete(cat)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                    title="Eliminar"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── MODAL CREAR / EDITAR ── */}
      {(mode === 'create' || mode === 'edit') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {mode === 'create' ? 'Nueva categoría' : 'Editar categoría'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Ícono + Preview */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Ícono (emoji)
                </label>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ backgroundColor: form.color + '22' }}
                  >
                    {form.icon || '?'}
                  </div>
                  <input
                    type="text"
                    value={form.icon}
                    onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
                    placeholder="💰"
                    maxLength={4}
                    className="w-24 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-center text-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ej: Alimentación"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, color: c }))}
                      className="w-7 h-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                      style={{ backgroundColor: c }}
                    >
                      {form.color === c && <span className="text-white text-xs font-bold">✓</span>}
                    </button>
                  ))}
                  {/* Color personalizado */}
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                    className="w-7 h-7 rounded-full cursor-pointer border-0 p-0"
                    title="Color personalizado"
                  />
                </div>
              </div>

              {/* Presupuesto mensual */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Presupuesto mensual (opcional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.budget}
                  onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))}
                  placeholder="0.00"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal}
                  className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-sm text-white font-medium">
                  {saving ? 'Guardando...' : mode === 'create' ? 'Crear categoría' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIRMAR ELIMINACIÓN ── */}
      {mode === 'confirm-delete' && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="text-center mb-6">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3"
                style={{ backgroundColor: selected.color + '22' }}
              >
                {selected.icon}
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                ¿Eliminar categoría?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Se eliminará permanentemente
                <span className="font-medium text-gray-900 dark:text-white"> {selected.name}</span>.
                Esta acción no se puede deshacer.
              </p>
            </div>

            {error && <p className="text-xs text-red-500 text-center mb-4">{error}</p>}

            <div className="flex gap-3">
              <button onClick={closeModal}
                className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={saving}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-sm text-white font-medium">
                {saving ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
