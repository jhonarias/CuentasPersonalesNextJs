'use client'
// app/reports/page.tsx
// Módulo de reportes: filtra transacciones por meses, años y búsqueda, genera PDF

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ExpenseWithCategory } from '@/types'

const CURRENT_MONTH = new Date().getMonth() + 1
const CURRENT_YEAR = new Date().getFullYear()

const MONTHS = [
  { value: 1,  label: 'Enero' },
  { value: 2,  label: 'Febrero' },
  { value: 3,  label: 'Marzo' },
  { value: 4,  label: 'Abril' },
  { value: 5,  label: 'Mayo' },
  { value: 6,  label: 'Junio' },
  { value: 7,  label: 'Julio' },
  { value: 8,  label: 'Agosto' },
  { value: 9,  label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
]

const YEARS = Array.from({ length: 4 }, (_, i) => CURRENT_YEAR - i)

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
}

export default function ReportsPage() {
  const [selectedMonths, setSelectedMonths] = useState<number[]>([CURRENT_MONTH])
  const [selectedYears, setSelectedYears]   = useState<number[]>([CURRENT_YEAR])
  const [search, setSearch]                 = useState('')
  const [expenses, setExpenses]             = useState<ExpenseWithCategory[]>([])
  const [loading, setLoading]               = useState(false)
  const [generated, setGenerated]           = useState(false)

  // Fetch en paralelo por cada combinación mes+año seleccionada
  const handleGenerate = async () => {
    if (selectedMonths.length === 0 || selectedYears.length === 0) return
    setLoading(true)
    setGenerated(false)

    try {
      const combos: [number, number][] = []
      for (const year of selectedYears)
        for (const month of selectedMonths)
          combos.push([month, year])

      const results = await Promise.all(
        combos.map(([month, year]) =>
          fetch(`/api/expenses?month=${month}&year=${year}`)
            .then((r) => r.json())
            .then((d) => (d.data ?? []) as ExpenseWithCategory[])
        )
      )

      // Fusionar, ordenar por fecha desc y aplicar búsqueda
      const merged = results.flat().sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      setExpenses(merged)
      setGenerated(true)
    } catch (err) {
      console.error('Error generando reporte:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filtro de búsqueda client-side
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return expenses
    return expenses.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        (e.merchant ?? '').toLowerCase().includes(q) ||
        e.category.name.toLowerCase().includes(q)
    )
  }, [expenses, search])

  const total = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered])

  // Etiqueta del período seleccionado para el encabezado del PDF
  const periodLabel = useMemo(() => {
    const months = selectedMonths
      .sort((a, b) => a - b)
      .map((m) => MONTHS[m - 1].label)
    const years = selectedYears.sort((a, b) => a - b)
    return `${months.join(', ')} ${years.join(', ')}`
  }, [selectedMonths, selectedYears])

  const handlePrint = () => window.print()

  return (
    <>
      {/* ══════════════════════════════════════════
          ESTILOS DE IMPRESIÓN — solo se aplican al imprimir
      ══════════════════════════════════════════ */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; inset: 0; padding: 24px; }
          .no-print { display: none !important; }
          table { border-collapse: collapse; width: 100%; font-size: 11px; }
          th, td { border: 1px solid #e5e7eb; padding: 6px 10px; text-align: left; }
          th { background: #f9fafb; font-weight: 600; }
          tr:nth-child(even) td { background: #f9fafb; }
          .print-header { margin-bottom: 20px; }
          .print-title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
          .print-subtitle { font-size: 12px; color: #6b7280; }
          .print-total { margin-top: 16px; text-align: right; font-size: 14px; font-weight: 700; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

        {/* Header */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 sticky top-0 z-10 no-print">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">←</Link>
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">Reportes</h1>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">

          {/* ── FORMULARIO ── */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 no-print">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
              Filtros del reporte
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              {/* Meses */}
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Meses</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {MONTHS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setSelectedMonths((prev) => toggle(prev, m.value))}
                      className={`text-xs px-2 py-1.5 rounded-lg border transition-colors ${
                        selectedMonths.includes(m.value)
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Años */}
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Años</p>
                <div className="flex flex-col gap-1.5">
                  {YEARS.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setSelectedYears((prev) => toggle(prev, y))}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        selectedYears.includes(y)
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Búsqueda */}
            <div className="mb-5">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Buscar (opcional)
              </p>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Descripción, comercio o categoría..."
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerate}
                disabled={loading || selectedMonths.length === 0 || selectedYears.length === 0}
                className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg transition-colors font-medium"
              >
                {loading ? 'Generando...' : 'Generar reporte'}
              </button>
              {generated && (
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  🖨️ Imprimir / Guardar PDF
                </button>
              )}
            </div>
          </div>

          {/* ── RESULTADOS ── */}
          {generated && (
            <div id="print-area">

              {/* Encabezado del reporte (visible en impresión) */}
              <div className="print-header hidden print:block mb-4">
                <p className="print-title">Reporte de gastos — GastosIA</p>
                <p className="print-subtitle">
                  Período: {periodLabel}
                  {search && ` · Búsqueda: "${search}"`}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between mb-3 no-print">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Resultados — {periodLabel}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {filtered.length} transacción{filtered.length !== 1 ? 'es' : ''}
                  </p>
                </div>

                {filtered.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 dark:text-gray-600 no-print">
                    <p className="text-4xl mb-2">🔍</p>
                    <p className="text-sm">Sin resultados para los filtros seleccionados.</p>
                  </div>
                ) : (
                  <>
                    {/* Tabla */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-800">
                            <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 py-2 pr-3">Fecha</th>
                            <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 py-2 pr-3">Descripción / Comercio</th>
                            <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 py-2 pr-3">Categoría</th>
                            <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 py-2 pr-3">Origen</th>
                            <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 py-2">Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((expense) => (
                            <tr key={expense.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className="py-2 pr-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {formatDate(expense.date)}
                              </td>
                              <td className="py-2 pr-3">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {expense.merchant || expense.description}
                                </p>
                                {expense.merchant && (
                                  <p className="text-xs text-gray-400 dark:text-gray-500">{expense.description}</p>
                                )}
                              </td>
                              <td className="py-2 pr-3">
                                <span
                                  className="text-xs px-2 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: expense.category.color + '22',
                                    color: expense.category.color,
                                  }}
                                >
                                  {expense.category.name}
                                </span>
                              </td>
                              <td className="py-2 pr-3 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                {expense.isAiScanned ? '🤖 IA' : '✏️ Manual'}
                              </td>
                              <td className="py-2 text-right text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                                -{formatCurrency(expense.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 print-total">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {filtered.length} transacción{filtered.length !== 1 ? 'es' : ''}
                        {search && ` · Búsqueda: "${search}"`}
                      </p>
                      <p className="text-base font-bold text-gray-900 dark:text-white">
                        Total: {formatCurrency(total)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
