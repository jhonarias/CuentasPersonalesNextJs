'use client'
// app/register/page.tsx

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const turnstileRef = useRef<TurnstileInstance>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (!turnstileToken) {
      setError('Completa la verificación de seguridad.')
      return
    }

    setLoading(true)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        turnstileToken,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Error al registrarse.')
      turnstileRef.current?.reset()
      setTurnstileToken(null)
      setLoading(false)
      return
    }

    router.push('/login?info=registered')
  }

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-2xl mb-4 text-3xl">
            💸
          </div>
          <h1 className="text-2xl font-bold text-white">Crear cuenta</h1>
          <p className="text-gray-400 mt-1">Solicita acceso a GastosIA</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Nombre</label>
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5
                             text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500
                             focus:ring-1 focus:ring-emerald-500 transition"
                  placeholder="Juan"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Apellido</label>
                <input
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5
                             text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500
                             focus:ring-1 focus:ring-emerald-500 transition"
                  placeholder="Pérez"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Correo electrónico</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5
                           text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500
                           focus:ring-1 focus:ring-emerald-500 transition"
                placeholder="tu@correo.com"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Teléfono <span className="text-gray-600">(opcional)</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5
                           text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500
                           focus:ring-1 focus:ring-emerald-500 transition"
                placeholder="+52 55 1234 5678"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Contraseña</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="new-password"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5
                           text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500
                           focus:ring-1 focus:ring-emerald-500 transition"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Confirmar contraseña</label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                autoComplete="new-password"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5
                           text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500
                           focus:ring-1 focus:ring-emerald-500 transition"
                placeholder="Repite tu contraseña"
              />
            </div>

            {/* Cloudflare Turnstile */}
            {siteKey && (
              <div className="flex justify-center">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={siteKey}
                  onSuccess={setTurnstileToken}
                  onError={() => setTurnstileToken(null)}
                  onExpire={() => setTurnstileToken(null)}
                  options={{ theme: 'dark' }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (!turnstileToken && !!siteKey)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50
                         text-white font-semibold py-2.5 rounded-lg transition"
            >
              {loading ? 'Registrando…' : 'Crear cuenta'}
            </button>
          </form>

          <div className="mt-5 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-blue-300 text-xs text-center">
              📋 Tu solicitud será revisada por el administrador antes de activar tu cuenta.
            </p>
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-emerald-400 hover:text-emerald-300">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
