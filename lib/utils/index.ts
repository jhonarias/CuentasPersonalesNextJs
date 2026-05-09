// lib/utils/index.ts
// Utilidades compartidas entre frontend y backend

import { format, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { CategorySummary, WeeklyTotal } from '@/types'

/**
 * Formatea un número como moneda
 */
export function formatCurrency(amount: number, currency = 'COP'): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Formatea una fecha en español
 */
export function formatDate(date: Date | string, fmt = 'dd MMM yyyy'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, fmt, { locale: es })
}

/**
 * Devuelve el rango de semanas de un mes dado
 */
export function getWeeksOfMonth(year: number, month: number): WeeklyTotal[] {
  const start = startOfMonth(new Date(year, month - 1))
  const end = endOfMonth(new Date(year, month - 1))

  const weeks: WeeklyTotal[] = []
  let current = start
  let weekNum = 1

  while (current <= end) {
    const weekStart = current
    const weekEnd = endOfWeek(current, { weekStartsOn: 1 })
    const actualEnd = weekEnd > end ? end : weekEnd

    weeks.push({
      week: weekNum,
      total: 0,
      startDate: weekStart.toISOString(),
      endDate: actualEnd.toISOString(),
    })

    current = addWeeks(startOfWeek(current, { weekStartsOn: 1 }), 1)
    current = addWeeks(current, 0)
    // Avanzar al lunes siguiente
    const next = new Date(weekStart)
    next.setDate(next.getDate() + 7)
    current = next
    weekNum++
    if (weekNum > 6) break
  }

  return weeks
}

/**
 * Calcula el porcentaje de cada categoría sobre el total
 */
export function calculateCategoryPercentages(
  summaries: Omit<CategorySummary, 'percentage'>[]
): CategorySummary[] {
  const total = summaries.reduce((sum, s) => sum + s.total, 0)
  return summaries.map((s) => ({
    ...s,
    percentage: total > 0 ? Math.round((s.total / total) * 100) : 0,
  }))
}

/**
 * Mapea el nombre de categoría sugerida por IA al ID real en la DB
 * Usa fuzzy matching básico
 */
export function matchCategoryName(
  guess: string,
  categories: { id: string; name: string }[]
): string | null {
  const normalized = guess.toLowerCase().trim()

  // Coincidencia exacta primero
  const exact = categories.find((c) => c.name.toLowerCase() === normalized)
  if (exact) return exact.id

  // Coincidencia parcial
  const partial = categories.find(
    (c) => c.name.toLowerCase().includes(normalized) || normalized.includes(c.name.toLowerCase())
  )
  if (partial) return partial.id

  // Buscar "Otros" como fallback
  const fallback = categories.find((c) => c.name.toLowerCase() === 'otros')
  return fallback?.id ?? null
}

/**
 * Clases CSS condicionales (similar a classnames)
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
