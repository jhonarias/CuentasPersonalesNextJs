'use client'
// app/components/ExpenseChart.tsx
// Gráfica de barras semanal usando Chart.js

import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { ExpenseWithCategory } from '@/types'
import { getWeeksOfMonth } from '@/lib/utils'

Chart.register(...registerables)

interface Props {
  expenses: ExpenseWithCategory[]
  month: number
  year: number
}

export default function ExpenseChart({ expenses, month, year }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    // Calcular totales por semana
    const weeks = getWeeksOfMonth(year, month)
    weeks.forEach((week) => {
      const weekStart = new Date(week.startDate)
      const weekEnd = new Date(week.endDate)
      week.total = expenses
        .filter((e) => {
          const d = new Date(e.date)
          return d >= weekStart && d <= weekEnd
        })
        .reduce((sum, e) => sum + e.amount, 0)
    })

    // Destruir gráfica anterior si existe
    if (chartRef.current) chartRef.current.destroy()

    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
    const textColor = isDark ? '#6b7280' : '#9ca3af'

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: weeks.map((w) => `Sem ${w.week}`),
        datasets: [
          {
            label: 'Gasto',
            data: weeks.map((w) => Math.round(w.total)),
            backgroundColor: weeks.map((_, i) =>
              i === weeks.length - 1 ? '#059669' : '#a7f3d0'
            ),
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { size: 11 } },
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { size: 11 },
              callback: (v) => '$' + Number(v).toLocaleString('es-CO'),
            },
          },
        },
      },
    })

    return () => { chartRef.current?.destroy() }
  }, [expenses, month, year])

  return (
    <div style={{ position: 'relative', height: '200px' }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Gráfica de gasto semanal del mes"
      />
    </div>
  )
}
