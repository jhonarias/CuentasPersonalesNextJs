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
    <div style={{ position: 'relative', height: '140px' }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Distribución de gastos por categoría"
      />
    </div>
  )
}
