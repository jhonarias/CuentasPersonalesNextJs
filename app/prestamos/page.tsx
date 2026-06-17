'use client'
// app/prestamos/page.tsx
// Módulo de Préstamos — personas deudoras/acreedoras con deudas y abonos parciales

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate, formatThousands, parseNumberInput } from '@/lib/utils'
import type { PersonWithSummary, DebtWithPayments } from '@/types'

// ── Tipos de modal ────────────────────────────────────────────────────────────

type ModalType =
  | { type: 'person-create' }
  | { type: 'person-edit'; person: PersonWithSummary }
  | { type: 'debt-create'; personId: string; debtType: 'receivable' | 'payable' }
  | { type: 'payment-create'; debt: DebtWithPayments }
  | null

type Tab = 'receivable' | 'payable'

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function PrestamosPage() {
  const [tab, setTab] = useState<Tab>('receivable')
  const [people, setPeople] = useState<PersonWithSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [personDebts, setPersonDebts] = useState<Record<string, DebtWithPayments[]>>({})
  const [loadingDebts, setLoadingDebts] = useState<string | null>(null)

  // Inline confirm-delete state
  const [confirmDeletePerson, setConfirmDeletePerson] = useState<string | null>(null)
  const [confirmDeleteDebt, setConfirmDeleteDebt] = useState<string | null>(null)
  const [confirmDeletePayment, setConfirmDeletePayment] = useState<string | null>(null)

  const [modal, setModal] = useState<ModalType>(null)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  // Form states
  const [personForm, setPersonForm] = useState({ name: '', phone: '', notes: '' })
  const [debtForm, setDebtForm] = useState({
    description: '',
    totalAmount: '',
    date: todayISO(),
    notes: '',
  })
  const [paymentForm, setPaymentForm] = useState({ amount: '', date: todayISO(), notes: '' })

  // ── Data fetching ───────────────────────────────────────────────────────────

  const fetchPeople = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/people?type=${tab}`)
      const json = await res.json()
      setPeople(json.data ?? [])
    } catch {
      // silently fail — table shows empty state
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    fetchPeople()
    setExpandedId(null)
    setPersonDebts({})
  }, [fetchPeople])

  const fetchDebtsForPerson = useCallback(
    async (personId: string) => {
      setLoadingDebts(personId)
      try {
        const res = await fetch(`/api/debts?personId=${personId}`)
        const json = await res.json()
        // Only show debts matching current tab
        const filtered = (json.data ?? []).filter((d: DebtWithPayments) => d.type === tab)
        setPersonDebts((prev) => ({ ...prev, [personId]: filtered }))
      } finally {
        setLoadingDebts(null)
      }
    },
    [tab]
  )

  const refreshDebtsForPerson = useCallback(
    async (personId: string) => {
      const res = await fetch(`/api/debts?personId=${personId}`)
      const json = await res.json()
      const filtered = (json.data ?? []).filter((d: DebtWithPayments) => d.type === tab)
      setPersonDebts((prev) => ({ ...prev, [personId]: filtered }))
    },
    [tab]
  )

  // ── Summary cards ───────────────────────────────────────────────────────────

  // We need totals across both types — fetch unfiltered for summary
  const [summary, setSummary] = useState({ receivable: 0, payable: 0 })
  useEffect(() => {
    Promise.all([
      fetch('/api/people?type=receivable').then((r) => r.json()),
      fetch('/api/people?type=payable').then((r) => r.json()),
    ]).then(([recJson, payJson]) => {
      const recTotal = (recJson.data ?? []).reduce(
        (s: number, p: PersonWithSummary) => s + p.remaining,
        0
      )
      const payTotal = (payJson.data ?? []).reduce(
        (s: number, p: PersonWithSummary) => s + p.remaining,
        0
      )
      setSummary({ receivable: recTotal, payable: payTotal })
    })
  }, [people]) // re-fetch when people list changes

  const balance = summary.receivable - summary.payable

  // ── Toggle expand ───────────────────────────────────────────────────────────

  function handleToggleExpand(personId: string) {
    if (expandedId === personId) {
      setExpandedId(null)
    } else {
      setExpandedId(personId)
      if (!personDebts[personId]) {
        fetchDebtsForPerson(personId)
      }
    }
  }

  // ── Delete person ───────────────────────────────────────────────────────────

  async function handleDeletePerson(id: string) {
    setSaving(true)
    try {
      await fetch(`/api/people/${id}`, { method: 'DELETE' })
      setConfirmDeletePerson(null)
      if (expandedId === id) setExpandedId(null)
      fetchPeople()
    } finally {
      setSaving(false)
    }
  }

  // ── Delete debt ─────────────────────────────────────────────────────────────

  async function handleDeleteDebt(debtId: string, personId: string) {
    setSaving(true)
    try {
      await fetch(`/api/debts/${debtId}`, { method: 'DELETE' })
      setConfirmDeleteDebt(null)
      await refreshDebtsForPerson(personId)
      fetchPeople()
    } finally {
      setSaving(false)
    }
  }

  // ── Delete payment ──────────────────────────────────────────────────────────

  async function handleDeletePayment(debtId: string, paymentId: string, personId: string) {
    setSaving(true)
    try {
      await fetch(`/api/debts/${debtId}/payments/${paymentId}`, { method: 'DELETE' })
      setConfirmDeletePayment(null)
      await refreshDebtsForPerson(personId)
      fetchPeople()
    } finally {
      setSaving(false)
    }
  }

  // ── Open modals ─────────────────────────────────────────────────────────────

  function openPersonCreate() {
    setPersonForm({ name: '', phone: '', notes: '' })
    setModalError(null)
    setModal({ type: 'person-create' })
  }

  function openPersonEdit(person: PersonWithSummary) {
    setPersonForm({ name: person.name, phone: person.phone ?? '', notes: person.notes ?? '' })
    setModalError(null)
    setModal({ type: 'person-edit', person })
  }

  function openDebtCreate(personId: string) {
    setDebtForm({ description: '', totalAmount: '', date: todayISO(), notes: '' })
    setModalError(null)
    setModal({ type: 'debt-create', personId, debtType: tab })
  }

  function openPaymentCreate(debt: DebtWithPayments) {
    setPaymentForm({ amount: '', date: todayISO(), notes: '' })
    setModalError(null)
    setModal({ type: 'payment-create', debt })
  }

  function closeModal() {
    setModal(null)
    setModalError(null)
  }

  // ── Save person ─────────────────────────────────────────────────────────────

  async function handleSavePerson(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setModalError(null)
    try {
      const isEdit = modal?.type === 'person-edit'
      const url = isEdit ? `/api/people/${(modal as { type: 'person-edit'; person: PersonWithSummary }).person.id}` : '/api/people'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: personForm.name.trim(),
          phone: personForm.phone.trim() || null,
          notes: personForm.notes.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al guardar')
      closeModal()
      fetchPeople()
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  // ── Save debt ───────────────────────────────────────────────────────────────

  async function handleSaveDebt(e: React.FormEvent) {
    e.preventDefault()
    if (modal?.type !== 'debt-create') return
    setSaving(true)
    setModalError(null)
    try {
      const amount = parseFloat(debtForm.totalAmount)
      if (!amount || amount <= 0) throw new Error('El monto debe ser positivo')
      const res = await fetch('/api/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: debtForm.description.trim(),
          totalAmount: amount,
          date: debtForm.date,
          notes: debtForm.notes.trim() || undefined,
          type: modal.debtType,
          personId: modal.personId,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al guardar')
      closeModal()
      await refreshDebtsForPerson(modal.personId)
      fetchPeople()
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  // ── Save payment ────────────────────────────────────────────────────────────

  async function handleSavePayment(e: React.FormEvent) {
    e.preventDefault()
    if (modal?.type !== 'payment-create') return
    setSaving(true)
    setModalError(null)
    try {
      const amount = parseFloat(paymentForm.amount)
      if (!amount || amount <= 0) throw new Error('El monto debe ser positivo')
      const res = await fetch(`/api/debts/${modal.debt.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          date: paymentForm.date,
          notes: paymentForm.notes.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al registrar')
      closeModal()
      // Find person for this debt
      const personId = modal.debt.personId
      await refreshDebtsForPerson(personId)
      fetchPeople()
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  // ── Input classes ───────────────────────────────────────────────────────────

  const inputCls =
    'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500'
  const labelCls = 'block text-xs font-medium text-gray-400 mb-1'

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 overflow-x-hidden">

      {/* ── Header ── */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-200 transition-colors">
              ←
            </Link>
            <h1 className="text-base font-semibold text-white">🤝 Préstamos</h1>
          </div>
          <button
            onClick={openPersonCreate}
            className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            + Nueva persona
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Me deben</p>
            <p className="text-lg font-bold text-emerald-400">{formatCurrency(summary.receivable)}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Le debo a</p>
            <p className="text-lg font-bold text-red-400">{formatCurrency(summary.payable)}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Balance neto</p>
            <p className={`text-lg font-bold ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(Math.abs(balance))}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{balance >= 0 ? 'a favor' : 'en contra'}</p>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
          {(['receivable', 'payable'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t === 'receivable' ? '📥 Me deben' : '📤 Le debo a'}
            </button>
          ))}
        </div>

        {/* ── People list ── */}
        {loading ? (
          <div className="text-center py-16 text-gray-500 text-sm">Cargando...</div>
        ) : people.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">🤝</p>
            <p className="text-sm text-gray-400 mb-4">
              {tab === 'receivable'
                ? 'Nadie te debe nada en este tab'
                : 'No le debes a nadie en este tab'}
            </p>
            <button onClick={openPersonCreate} className="text-sm text-emerald-500 hover:underline">
              Agregar persona
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {people.map((person) => {
              const isExpanded = expandedId === person.id
              const debts = personDebts[person.id] ?? []

              return (
                <div
                  key={person.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
                >
                  {/* ── Person row ── */}
                  <div className="px-4 py-3 flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center text-white font-semibold text-base flex-shrink-0">
                      {person.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0" onClick={() => handleToggleExpand(person.id)} style={{ cursor: 'pointer' }}>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{person.name}</p>
                        {person.debtCount > 0 && (
                          <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded-full">
                            {person.debtCount} activa{person.debtCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {person.phone && (
                        <p className="text-xs text-gray-500 mt-0.5">{person.phone}</p>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-semibold ${tab === 'receivable' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(person.remaining)}
                      </p>
                      {person.totalPaid > 0 && (
                        <p className="text-xs text-gray-500">
                          Pagado: {formatCurrency(person.totalPaid)}
                        </p>
                      )}
                    </div>

                    {/* Expand arrow */}
                    <button
                      onClick={() => handleToggleExpand(person.id)}
                      className="text-gray-500 hover:text-gray-300 ml-1"
                    >
                      {isExpanded ? '▲' : '▼'}
                    </button>

                    {/* Edit / Delete */}
                    <button
                      onClick={() => openPersonEdit(person)}
                      className="p-1.5 text-gray-500 hover:text-emerald-400 transition-colors"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setConfirmDeletePerson(person.id)}
                      className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                      title="Eliminar"
                    >
                      🗑
                    </button>
                  </div>

                  {/* Confirm delete person */}
                  {confirmDeletePerson === person.id && (
                    <div className="px-4 pb-3 border-t border-gray-800 pt-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-red-400">
                        ¿Eliminar a <strong>{person.name}</strong> y todas sus deudas?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmDeletePerson(null)}
                          className="text-xs text-gray-400 hover:text-white px-2 py-1"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleDeletePerson(person.id)}
                          disabled={saving}
                          className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg disabled:opacity-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Expanded: debts ── */}
                  {isExpanded && (
                    <div className="border-t border-gray-800">
                      {loadingDebts === person.id ? (
                        <div className="px-4 py-4 text-xs text-gray-500">Cargando deudas...</div>
                      ) : (
                        <div className="px-4 py-3 space-y-4">
                          {debts.length === 0 && (
                            <p className="text-xs text-gray-500 text-center py-2">Sin deudas registradas</p>
                          )}

                          {debts.map((debt) => {
                            const pct = debt.totalAmount > 0
                              ? Math.min(100, Math.round((debt.paid / debt.totalAmount) * 100))
                              : 0
                            const settled = debt.remaining <= 0

                            return (
                              <div
                                key={debt.id}
                                className="bg-gray-800/50 rounded-xl border border-gray-700 p-3 space-y-2"
                              >
                                {/* Debt header */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm font-medium text-white">{debt.description}</p>
                                      {settled && (
                                        <span className="text-xs bg-emerald-900 text-emerald-400 px-2 py-0.5 rounded-full">
                                          Saldada
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      {formatDate(debt.date)}
                                      {debt.dueDate && ` · Vence: ${formatDate(debt.dueDate)}`}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => setConfirmDeleteDebt(debt.id)}
                                    className="text-gray-600 hover:text-red-400 text-sm flex-shrink-0"
                                    title="Eliminar deuda"
                                  >
                                    🗑
                                  </button>
                                </div>

                                {/* Confirm delete debt */}
                                {confirmDeleteDebt === debt.id && (
                                  <div className="flex items-center justify-between gap-3 bg-red-950/40 rounded-lg px-3 py-2">
                                    <p className="text-xs text-red-400">¿Eliminar esta deuda?</p>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => setConfirmDeleteDebt(null)}
                                        className="text-xs text-gray-400 hover:text-white"
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        onClick={() => handleDeleteDebt(debt.id, person.id)}
                                        disabled={saving}
                                        className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded disabled:opacity-50"
                                      >
                                        Eliminar
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Amount summary */}
                                <div className="grid grid-cols-3 gap-2 text-center">
                                  <div>
                                    <p className="text-xs text-gray-500">Original</p>
                                    <p className="text-sm font-medium text-white">{formatCurrency(debt.totalAmount)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Pagado</p>
                                    <p className="text-sm font-medium text-emerald-400">{formatCurrency(debt.paid)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Pendiente</p>
                                    <p className={`text-sm font-medium ${settled ? 'text-gray-400' : 'text-red-400'}`}>
                                      {formatCurrency(debt.remaining)}
                                    </p>
                                  </div>
                                </div>

                                {/* Progress bar */}
                                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <p className="text-xs text-gray-500 text-right">{pct}% pagado</p>

                                {/* Payments list */}
                                {debt.payments.length > 0 && (
                                  <div className="space-y-1 border-t border-gray-700 pt-2 mt-1">
                                    <p className="text-xs text-gray-500 mb-1">Abonos</p>
                                    {debt.payments.map((pay) => (
                                      <div key={pay.id} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className="text-gray-400">{formatDate(pay.date)}</span>
                                          {pay.notes && (
                                            <span className="text-gray-500 truncate">{pay.notes}</span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          <span className="text-emerald-400 font-medium">
                                            +{formatCurrency(pay.amount)}
                                          </span>
                                          {confirmDeletePayment === pay.id ? (
                                            <div className="flex gap-1 items-center">
                                              <button
                                                onClick={() => setConfirmDeletePayment(null)}
                                                className="text-gray-500 hover:text-white"
                                              >
                                                ✕
                                              </button>
                                              <button
                                                onClick={() => handleDeletePayment(debt.id, pay.id, person.id)}
                                                disabled={saving}
                                                className="text-red-400 hover:text-red-300 disabled:opacity-50"
                                              >
                                                🗑
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              onClick={() => setConfirmDeletePayment(pay.id)}
                                              className="text-gray-600 hover:text-red-400 transition-colors"
                                            >
                                              ×
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Register payment button */}
                                {!settled && (
                                  <button
                                    onClick={() => openPaymentCreate(debt)}
                                    className="w-full text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-800 hover:border-emerald-600 rounded-lg py-1.5 transition-colors"
                                  >
                                    + Registrar abono
                                  </button>
                                )}
                              </div>
                            )
                          })}

                          {/* Add debt button */}
                          <button
                            onClick={() => openDebtCreate(person.id)}
                            className="w-full text-xs text-gray-400 hover:text-white border border-dashed border-gray-700 hover:border-gray-500 rounded-xl py-2.5 transition-colors"
                          >
                            + Nueva deuda
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODALS
          ═══════════════════════════════════════════════════════════════════════ */}

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">

            {/* ── Modal: persona (crear / editar) ── */}
            {(modal.type === 'person-create' || modal.type === 'person-edit') && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold text-white">
                    {modal.type === 'person-create' ? 'Nueva persona' : 'Editar persona'}
                  </h2>
                  <button onClick={closeModal} className="text-gray-500 hover:text-white text-xl">✕</button>
                </div>
                <form onSubmit={handleSavePerson} className="space-y-4">
                  <div>
                    <label className={labelCls}>Nombre *</label>
                    <input
                      type="text"
                      required
                      value={personForm.name}
                      onChange={(e) => setPersonForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Ej: Juan Pérez"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Teléfono (opcional)</label>
                    <input
                      type="text"
                      value={personForm.phone}
                      onChange={(e) => setPersonForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+57 300 000 0000"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Notas (opcional)</label>
                    <textarea
                      value={personForm.notes}
                      onChange={(e) => setPersonForm((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Contexto del préstamo..."
                      rows={2}
                      className={inputCls + ' resize-none'}
                    />
                  </div>
                  {modalError && <p className="text-xs text-red-400">{modalError}</p>}
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={closeModal}
                      className="flex-1 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:bg-gray-800 transition-colors">
                      Cancelar
                    </button>
                    <button type="submit" disabled={saving}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-sm text-white font-medium transition-colors">
                      {saving ? 'Guardando...' : modal.type === 'person-create' ? 'Crear persona' : 'Guardar cambios'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* ── Modal: nueva deuda ── */}
            {modal.type === 'debt-create' && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold text-white">
                    Nueva deuda — {modal.debtType === 'receivable' ? 'me deben' : 'le debo'}
                  </h2>
                  <button onClick={closeModal} className="text-gray-500 hover:text-white text-xl">✕</button>
                </div>
                <form onSubmit={handleSaveDebt} className="space-y-4">
                  <div>
                    <label className={labelCls}>Descripción *</label>
                    <input
                      type="text"
                      required
                      value={debtForm.description}
                      onChange={(e) => setDebtForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Ej: Préstamo para arriendo"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Monto total *</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      value={formatThousands(debtForm.totalAmount)}
                      onChange={(e) =>
                        setDebtForm((p) => ({ ...p, totalAmount: parseNumberInput(e.target.value) }))
                      }
                      placeholder="0"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Fecha *</label>
                    <input
                      type="date"
                      required
                      value={debtForm.date}
                      onChange={(e) => setDebtForm((p) => ({ ...p, date: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Notas (opcional)</label>
                    <textarea
                      value={debtForm.notes}
                      onChange={(e) => setDebtForm((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Detalles adicionales..."
                      rows={2}
                      className={inputCls + ' resize-none'}
                    />
                  </div>
                  {modalError && <p className="text-xs text-red-400">{modalError}</p>}
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={closeModal}
                      className="flex-1 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:bg-gray-800 transition-colors">
                      Cancelar
                    </button>
                    <button type="submit" disabled={saving}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-sm text-white font-medium transition-colors">
                      {saving ? 'Guardando...' : 'Registrar deuda'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* ── Modal: registrar abono ── */}
            {modal.type === 'payment-create' && (
              <>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-semibold text-white">Registrar abono</h2>
                  <button onClick={closeModal} className="text-gray-500 hover:text-white text-xl">✕</button>
                </div>
                <p className="text-xs text-gray-500 mb-4">{modal.debt.description}</p>

                {/* Reference card */}
                <div className="bg-gray-800 rounded-xl px-4 py-3 mb-4 flex justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Saldo pendiente</p>
                    <p className="text-base font-bold text-red-400">{formatCurrency(modal.debt.remaining)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Total original</p>
                    <p className="text-sm text-gray-300">{formatCurrency(modal.debt.totalAmount)}</p>
                  </div>
                </div>

                <form onSubmit={handleSavePayment} className="space-y-4">
                  <div>
                    <label className={labelCls}>Monto del abono *</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      value={formatThousands(paymentForm.amount)}
                      onChange={(e) =>
                        setPaymentForm((p) => ({ ...p, amount: parseNumberInput(e.target.value) }))
                      }
                      placeholder={`Máximo ${formatCurrency(modal.debt.remaining)}`}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Fecha *</label>
                    <input
                      type="date"
                      required
                      value={paymentForm.date}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, date: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Notas (opcional)</label>
                    <input
                      type="text"
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Ej: Transferencia Nequi"
                      className={inputCls}
                    />
                  </div>
                  {modalError && <p className="text-xs text-red-400">{modalError}</p>}
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={closeModal}
                      className="flex-1 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:bg-gray-800 transition-colors">
                      Cancelar
                    </button>
                    <button type="submit" disabled={saving}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-sm text-white font-medium transition-colors">
                      {saving ? 'Registrando...' : 'Registrar abono'}
                    </button>
                  </div>
                </form>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  )
}
