'use client'
// app/dashboard/page.tsx

import { useEffect, useState, useCallback } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ExpenseWithCategory, CategorySummary } from '@/types'
import ExpenseChart from '@/components/ExpenseChart'
import CategoryPieChart from '@/components/CategoryPieChart'
import ScanButton from '@/components/ScanButton'
import ManualExpenseButton from '@/components/ManualExpenseButton'
import ExpenseActions from '@/components/ExpenseActions'

const CURRENT_MONTH = new Date().getMonth() + 1
const CURRENT_YEAR = new Date().getFullYear()

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([])
  const [categories, setCategories] = useState<CategorySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(CURRENT_MONTH)
  const [year, setYear] = useState(CURRENT_YEAR)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [expRes, catRes] = await Promise.all([
        fetch(`/api/expenses?month=${month}&year=${year}&limit=10`),
        fetch(`/api/categories?month=${month}&year=${year}`),
      ])
      const expData = await expRes.json()
      const catData = await catRes.json()
      setExpenses(expData.data ?? [])
      setCategories(catData.data ?? [])
    } catch (err) {
      console.error('Error cargando datos:', err)
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { fetchData() }, [fetchData])

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0)
  const aiScanned = expenses.filter((e) => e.isAiScanned).length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 overflow-x-hidden">

      {/* ── HEADER ── */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">

          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs">💳</span>
            </div>
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">GastosIA</h1>
          </div>

          {/* Controles */}
          <div className="flex items-center gap-2">
            <select
              value={`${year}-${month}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-')
                setYear(Number(y)); setMonth(Number(m))
              }}
              className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 max-w-[110px]"
            >
              {MONTHS.map((name, i) => (
                <option key={i} value={`${CURRENT_YEAR}-${i + 1}`}>
                  {name} {CURRENT_YEAR}
                </option>
              ))}
            </select>
            <ManualExpenseButton onSuccess={fetchData} />
            <ScanButton onSuccess={fetchData} />
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">

        {/* Metric cards — 2 columnas en móvil, 4 en desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Gasto total', value: formatCurrency(totalSpent), sub: `${MONTHS[month - 1]} ${year}` },
            { label: 'Con IA', value: String(aiScanned), sub: 'facturas escaneadas' },
            { label: 'Categorías', value: String(categories.length), sub: 'con movimientos' },
            { label: 'Transacciones', value: String(expenses.length), sub: 'registradas' },
          ].map((m) => (
            <div key={m.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 truncate">{m.label}</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{m.value}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Charts — apilados en móvil, lado a lado en desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Gasto semanal — {MONTHS[month - 1]}
            </p>
            <ExpenseChart expenses={expenses} month={month} year={year} />
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Por categoría
            </p>
            <CategoryPieChart categories={categories} />
          </div>
        </div>

        {/* Transacciones recientes */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Transacciones recientes
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
              Cargando...
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-600">
              <p className="text-4xl mb-2">🧾</p>
              <p className="text-sm">Sin gastos este mes. ¡Agrega tu primer gasto!</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 dark:divide-gray-800">
              {expenses.map((expense) => (
                <li key={expense.id} className="flex items-center gap-2 py-3 min-w-0">

                  {/* Ícono categoría */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: expense.category.color + '22' }}
                  >
                    <span style={{ color: expense.category.color }} className="text-xs">●</span>
                  </div>

                  {/* Descripción + fecha */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {expense.merchant || expense.description}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                      {formatDate(expense.date)} · {expense.isAiScanned ? '🤖 IA' : '✏️ Manual'}
                    </p>
                  </div>

                  {/* Categoría — solo en pantallas medianas+ */}
                  <span
                    className="hidden sm:inline text-xs px-2 py-1 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: expense.category.color + '22',
                      color: expense.category.color,
                    }}
                  >
                    {expense.category.name}
                  </span>

                  {/* Monto */}
                  <span className="text-sm font-semibold text-gray-900 dark:text-white flex-shrink-0">
                    -{formatCurrency(expense.amount)}
                  </span>

                  {/* Acciones */}
                  <ExpenseActions
                    expense={expense}
                    onUpdate={fetchData}
                    onDelete={fetchData}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
