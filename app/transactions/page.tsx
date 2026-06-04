'use client'
// app/transactions/page.tsx
// Últimas transacciones del usuario — sin filtro de mes, ordenadas por fecha de creación

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ExpenseWithCategory } from '@/types'
import ExpenseActions from '@/components/ExpenseActions'

export default function TransactionsPage() {
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([])
  const [loading, setLoading] = useState(true)

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/expenses?limit=10&orderBy=createdAt')
      const data = await res.json()
      setExpenses(data.data ?? [])
    } catch (err) {
      console.error('Error cargando transacciones:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            ←
          </Link>
          <h1 className="text-base font-semibold text-gray-900 dark:text-white">
            Últimas transacciones
          </h1>
        </div>
      </header>

      {/* Lista */}
      <main className="max-w-2xl mx-auto px-4 py-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">

          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            Las 10 más recientes sin importar el mes, ordenadas por fecha de registro.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
              Cargando...
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-600">
              <p className="text-4xl mb-2">🧾</p>
              <p className="text-sm">Sin transacciones aún.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 dark:divide-gray-800">
              {expenses.map((expense) => (
                <li key={expense.id} className="flex items-center gap-2 py-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: expense.category.color + '22' }}
                  >
                    <span style={{ color: expense.category.color }} className="text-xs">●</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {expense.merchant || expense.description}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                      {formatDate(expense.date)} · {expense.isAiScanned ? '🤖 IA' : '✏️ Manual'}
                    </p>
                  </div>

                  <span
                    className="hidden sm:inline text-xs px-2 py-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: expense.category.color + '22', color: expense.category.color }}
                  >
                    {expense.category.name}
                  </span>

                  <span className="text-sm font-semibold text-gray-900 dark:text-white flex-shrink-0">
                    -{formatCurrency(expense.amount)}
                  </span>

                  <ExpenseActions
                    expense={expense}
                    onUpdate={fetchExpenses}
                    onDelete={fetchExpenses}
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
