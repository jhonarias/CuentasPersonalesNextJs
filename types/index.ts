// types/index.ts
// Tipos compartidos entre frontend y backend (ventaja del monorepo)

export interface ExpenseAIExtraction {
  amount: number
  description: string
  merchant: string
  date: string          // ISO 8601
  categoryGuess: string // nombre de categoría sugerida por IA
  confidence: number    // 0.0 - 1.0
  currency: string      // "COP", "USD", "MXN", etc.
  rawText: string       // texto plano extraído de la imagen
}

export interface CreateExpenseInput {
  amount: number
  description: string
  date: string
  merchant?: string
  categoryId: string
  notes?: string
  isAiScanned?: boolean
  confidence?: number
  rawOcrData?: Record<string, unknown>
}

export interface ExpenseWithCategory {
  id: string
  amount: number
  description: string
  date: Date
  merchant: string | null
  notes: string | null
  isAiScanned: boolean
  confidence: number | null
  categoryId: string
  category: {
    id: string
    name: string
    icon: string
    color: string
  }
  receipt: {
    id: string
    storageUrl: string
    fileName: string
  } | null
  createdAt: Date
}

export interface CategorySummary {
  categoryId: string
  categoryName: string
  categoryIcon: string
  categoryColor: string
  total: number
  count: number
  percentage: number
  budget: number | null
}

export interface MonthlyReport {
  year: number
  month: number
  totalSpent: number
  totalBudget: number | null
  expenseCount: number
  aiScannedCount: number
  categorySummaries: CategorySummary[]
  weeklyBreakdown: WeeklyTotal[]
}

export interface WeeklyTotal {
  week: number      // 1-5
  total: number
  startDate: string
  endDate: string
}

export interface ScanReceiptResponse {
  success: boolean
  extraction?: ExpenseAIExtraction
  expenseId?: string
  error?: string
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}
