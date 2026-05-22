'use client'
// app/admin/users/page.tsx
// Panel de administración de usuarios

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Profile = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  role: string
  status: 'pending' | 'active' | 'blocked'
  created_at: string
  approved_at: string | null
}

const STATUS_LABELS = {
  pending: { label: 'Pendiente', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
  active: { label: 'Activo', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' },
  blocked: { label: 'Bloqueado', color: 'text-red-400 bg-red-400/10 border-red-400/30' },
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'blocked'>('all')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    if (data.data) setUsers(data.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function updateStatus(userId: string, status: 'active' | 'blocked' | 'pending') {
    setActionLoading(userId)
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await fetchUsers()
    setActionLoading(null)
  }

  const filtered = filter === 'all' ? users : users.filter(u => u.status === filter)
  const pendingCount = users.filter(u => u.status === 'pending').length

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-white transition">
              ← Dashboard
            </Link>
            <span className="text-gray-700">|</span>
            <h1 className="text-lg font-semibold">Gestión de usuarios</h1>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 bg-yellow-400 text-gray-900 text-xs font-bold rounded-full">
                {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Filtros */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['all', 'pending', 'active', 'blocked'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filter === f
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' ? `Todos (${users.length})` :
               f === 'pending' ? `Pendientes (${users.filter(u => u.status === 'pending').length})` :
               f === 'active' ? `Activos (${users.filter(u => u.status === 'active').length})` :
               `Bloqueados (${users.filter(u => u.status === 'blocked').length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            Cargando usuarios…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            No hay usuarios en esta categoría.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(u => (
              <div
                key={u.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-white">
                      {u.first_name} {u.last_name}
                    </p>
                    {u.role === 'admin' && (
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">
                        Admin
                      </span>
                    )}
                    <span className={`px-2 py-0.5 text-xs rounded-full border ${STATUS_LABELS[u.status].color}`}>
                      {STATUS_LABELS[u.status].label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5 truncate">{u.email}</p>
                  {u.phone && <p className="text-sm text-gray-500">{u.phone}</p>}
                  <p className="text-xs text-gray-600 mt-1">
                    Registrado: {new Date(u.created_at).toLocaleDateString('es-MX', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                    {u.approved_at && ` · Aprobado: ${new Date(u.approved_at).toLocaleDateString('es-MX', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}`}
                  </p>
                </div>

                {/* Acciones (no sobre uno mismo) */}
                {u.role !== 'admin' && (
                  <div className="flex gap-2 shrink-0">
                    {u.status !== 'active' && (
                      <button
                        onClick={() => updateStatus(u.id, 'active')}
                        disabled={actionLoading === u.id}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50
                                   text-white text-sm font-medium rounded-lg transition"
                      >
                        {actionLoading === u.id ? '…' : 'Aprobar'}
                      </button>
                    )}
                    {u.status !== 'blocked' && (
                      <button
                        onClick={() => updateStatus(u.id, 'blocked')}
                        disabled={actionLoading === u.id}
                        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400
                                   text-sm font-medium rounded-lg border border-red-500/30 transition"
                      >
                        {actionLoading === u.id ? '…' : 'Bloquear'}
                      </button>
                    )}
                    {u.status === 'blocked' && (
                      <button
                        onClick={() => updateStatus(u.id, 'pending')}
                        disabled={actionLoading === u.id}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300
                                   text-sm font-medium rounded-lg transition"
                      >
                        Desbloquear
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
