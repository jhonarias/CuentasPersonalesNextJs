'use client'
// app/dashboard/page.tsx
// Dashboard principal — muestra resumen mensual, gráficas y transacciones recientes

import { useEffect, useState, useCallback } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ExpenseWithCategory, CategorySummary, MonthlyReport } from '@/types'
import ExpenseChart from '@/components/ExpenseChart'
import CategoryPieChart from '@/components/CategoryPieChart'
import ScanButton from '@/components/ScanButton'
import ManualExpenseButton from '@/components/ManualExpenseButton'

const CURRENT_MONTH = new Date().getMonth() + 1
const CURRENT_YEAR = new Date().getFullYear()

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

  const MONTHS = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">💳</span>
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">GastosIA</h1>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={`${year}-${month}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-')
                setYear(Number(y)); setMonth(Number(m))
              }}
              className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
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

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Gasto total', value: formatCurrency(totalSpent), sub: `${MONTHS[month - 1]} ${year}` },
            { label: 'Facturas escaneadas', value: String(aiScanned), sub: 'con IA este mes' },
            { label: 'Categorías', value: String(categories.length), sub: 'con movimientos' },
            { label: 'Transacciones', value: String(expenses.length), sub: 'registradas' },
          ].map((m) => (
            <div key={m.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{m.label}</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{m.value}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
              Gasto semanal — {MONTHS[month - 1]}
            </p>
            <ExpenseChart expenses={expenses} month={month} year={year} />
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
              Por categoría
            </p>
            <CategoryPieChart categories={categories} />
          </div>
        </div>

        {/* Recent transactions */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
            Transacciones recientes
          </p>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-400">Cargando...</div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-600">
              <p className="text-4xl mb-2">🧾</p>
              <p className="text-sm">Sin gastos este mes. ¡Escanea tu primera factura!</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 dark:divide-gray-800">
              {expenses.map((expense) => (
                <li key={expense.id} className="flex items-center gap-3 py-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{ backgroundColor: expense.category.color + '22' }}
                  >
                    <span style={{ color: expense.category.color }}>●</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {expense.merchant || expense.description}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {formatDate(expense.date)} ·{' '}
                      {expense.isAiScanned ? '🤖 Escaneado con IA' : '✏️ Manual'}
                    </p>
                  </div>
                  <span
                    className="text-xs px-2 py-1 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: expense.category.color + '22',
                      color: expense.category.color,
                    }}
                  >
                    {expense.category.name}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white flex-shrink-0">
                    -{formatCurrency(expense.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
