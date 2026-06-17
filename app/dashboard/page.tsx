'use client'
// app/dashboard/page.tsx

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ExpenseWithCategory, CategorySummary } from '@/types'
import ExpenseChart from '@/components/ExpenseChart'
import CategoryPieChart from '@/components/CategoryPieChart'
import ScanButton from '@/components/ScanButton'
import ExpenseActions from '@/components/ExpenseActions'
import UserMenu from '@/components/UserMenu'
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-client'

const CURRENT_MONTH = new Date().getMonth() + 1
const CURRENT_YEAR = new Date().getFullYear()
const PAGE_SIZE = 10

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
  const [userInfo, setUserInfo] = useState<{ firstName: string; role: string } | null>(null)

  // Búsqueda, filtro por categoría y paginación (client-side)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showAll, setShowAll] = useState(false)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])

  // Cargar datos del usuario para el menú
  useEffect(() => {
    async function loadUser() {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, role')
          .eq('id', user.id)
          .single()
        if (profile) {
          setUserInfo({ firstName: profile.first_name, role: profile.role })
        }
      }
    }
    loadUser()
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [expRes, catRes] = await Promise.all([
        fetch(`/api/expenses?month=${month}&year=${year}`),
        fetch(`/api/categories?month=${month}&year=${year}`),
      ])
      const expData = await expRes.json()
      const catData = await catRes.json()
      setExpenses(expData.data ?? [])
      setCategories(catData.data ?? [])
      setSearch('')
      setPage(1)
      setShowAll(false)
      setSelectedCategoryIds([])
    } catch (err) {
      console.error('Error cargando datos:', err)
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { fetchData() }, [fetchData])

  // Métricas sobre el total del mes completo
  const totalSpent = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses])
  const aiScanned = useMemo(() => expenses.filter((e) => e.isAiScanned).length, [expenses])

  // Categorías que superaron su presupuesto este mes
  const overBudgetCategories = useMemo(
    () => categories.filter((c) => c.budget != null && c.total > c.budget),
    [categories]
  )

  // Lista filtrada por búsqueda y/o categorías seleccionadas
  const filteredExpenses = useMemo(() => {
    let result = expenses
    // Filtro por categorías
    if (selectedCategoryIds.length > 0) {
      result = result.filter((e) => selectedCategoryIds.includes(e.categoryId))
    }
    // Filtro por texto
    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter((e) =>
        e.description.toLowerCase().includes(q) ||
        (e.merchant ?? '').toLowerCase().includes(q) ||
        e.category.name.toLowerCase().includes(q)
      )
    }
    return result
  }, [expenses, search, selectedCategoryIds])

  // Paginación sobre la lista filtrada
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE))
  const paginatedExpenses = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredExpenses.slice(start, start + PAGE_SIZE)
  }, [filteredExpenses, page])

  // Resetear página cuando cambia la búsqueda
  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  // Toggle de filtro por categoría
  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
    setPage(1)
  }

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
            <ScanButton onSuccess={fetchData} />
            {userInfo && (
              <UserMenu
                firstName={userInfo.firstName}
                role={userInfo.role}
                onExpenseSuccess={fetchData}
              />
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">

        {/* Metric cards */}
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

        {/* Alertas de presupuesto */}
        {overBudgetCategories.length > 0 && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">⚠️</span>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                {overBudgetCategories.length === 1
                  ? '1 categoría superó su presupuesto'
                  : `${overBudgetCategories.length} categorías superaron su presupuesto`} en {MONTHS[month - 1]}
              </p>
            </div>
            <ul className="space-y-2">
              {overBudgetCategories.map((cat) => {
                const excess = cat.total - cat.budget!
                const pct = Math.round((cat.total / cat.budget!) * 100)
                return (
                  <li key={cat.categoryId} className="flex items-center gap-3">
                    {/* Color de categoría */}
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
                      style={{ backgroundColor: cat.categoryColor + '33' }}
                    >
                      {cat.categoryIcon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-medium text-red-800 dark:text-red-300 truncate">
                          {cat.categoryName}
                        </span>
                        <span className="text-xs text-red-600 dark:text-red-400 flex-shrink-0">
                          {pct}% del presupuesto
                        </span>
                      </div>
                      {/* Barra de progreso */}
                      <div className="h-1.5 bg-red-200 dark:bg-red-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 dark:bg-red-400 rounded-full"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                        {formatCurrency(cat.total)} gastado · presupuesto {formatCurrency(cat.budget!)} · exceso {formatCurrency(excess)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Gasto semanal — {MONTHS[month - 1]}
            </p>
            <ExpenseChart expenses={expenses} month={month} year={year} />
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Por categoría
              </p>
              {selectedCategoryIds.length > 0 && (
                <button
                  onClick={() => { setSelectedCategoryIds([]); setPage(1) }}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Limpiar filtro
                </button>
              )}
            </div>
            <CategoryPieChart categories={categories} />

            {/* Lista de categorías con checkboxes para filtrar */}
            {categories.length > 0 && (
              <ul className="mt-3 space-y-1">
                {categories.map((cat) => {
                  const isSelected = selectedCategoryIds.includes(cat.categoryId)
                  return (
                    <li key={cat.categoryId}>
                      <button
                        type="button"
                        onClick={() => toggleCategory(cat.categoryId)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                          isSelected
                            ? 'bg-gray-100 dark:bg-gray-800'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                        }`}
                      >
                        {/* Checkbox visual */}
                        <span
                          className={`w-3.5 h-3.5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors`}
                          style={{
                            borderColor: cat.categoryColor,
                            backgroundColor: isSelected ? cat.categoryColor : 'transparent',
                          }}
                        >
                          {isSelected && (
                            <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 10 8">
                              <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </span>
                        {/* Ícono */}
                        <span className="text-sm">{cat.categoryIcon}</span>
                        {/* Nombre */}
                        <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">
                          {cat.categoryName}
                        </span>
                        {/* Monto */}
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">
                          {formatCurrency(cat.total)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Transacciones */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">

          {/* Cabecera + buscador */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Transacciones — {MONTHS[month - 1]}
            </p>
            <div className="relative w-full sm:w-56">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Buscar por descripción..."
                className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {search && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
              Cargando...
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-600">
              <p className="text-4xl mb-2">🧾</p>
              <p className="text-sm">Sin gastos este mes. ¡Agrega tu primer gasto!</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-600">
              <p className="text-4xl mb-2">🔍</p>
              <p className="text-sm">Sin resultados para &quot;{search}&quot;</p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                {(showAll ? filteredExpenses : paginatedExpenses).map((expense) => (
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

              {/* Paginador */}
              {(totalPages > 1 || showAll) && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50 dark:border-gray-800">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {filteredExpenses.length} resultado{filteredExpenses.length !== 1 ? 's' : ''}
                    {selectedCategoryIds.length > 0 && ` · ${selectedCategoryIds.length} categoría${selectedCategoryIds.length !== 1 ? 's' : ''}`}
                    {search && ` · "${search}"`}
                  </p>
                  <div className="flex items-center gap-1">
                    {/* Toggle Ver todas / Paginar */}
                    <button
                      onClick={() => { setShowAll((v) => !v); setPage(1) }}
                      className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors mr-2"
                    >
                      {showAll ? 'Paginar' : 'Ver todas'}
                    </button>

                    {/* Botones de página — solo si no está en modo "Ver todas" */}
                    {!showAll && (
                      <>
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          ←
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                          .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                            if (idx > 0 && (arr[idx - 1] as number) + 1 < p) acc.push('...')
                            acc.push(p)
                            return acc
                          }, [])
                          .map((p, idx) =>
                            p === '...' ? (
                              <span key={`dots-${idx}`} className="px-1 text-xs text-gray-400">…</span>
                            ) : (
                              <button
                                key={p}
                                onClick={() => setPage(p as number)}
                                className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                                  page === p
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                              >
                                {p}
                              </button>
                            )
                          )}
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          →
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
