'use client'
// app/components/CategoryPieChart.tsx

import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { CategorySummary } from '@/types'
import { formatCurrency } from '@/lib/utils'

Chart.register(...registerables)

interface Props {
  categories: CategorySummary[]
}

export default function CategoryPieChart({ categories }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current || categories.length === 0) return
    if (chartRef.current) chartRef.current.destroy()

    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: categories.map((c) => c.categoryName),
        datasets: [
          {
            data: categories.map((c) => Math.round(c.total)),
            backgroundColor: categories.map((c) => c.categoryColor),
            borderWidth: 0,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}`,
            },
          },
        },
      },
    })

    return () => { chartRef.current?.destroy() }
  }, [categories])

  return (
    <div>
      <div style={{ position: 'relative', height: '140px', marginBottom: '1rem' }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Distribución de gastos por categoría"
        />
      </div>
      <ul className="space-y-2">
        {categories.slice(0, 6).map((cat) => (
          <li key={cat.categoryId} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: cat.categoryColor }}
              />
              {cat.categoryName}
            </span>
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {cat.percentage}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
