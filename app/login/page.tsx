'use client'
// app/login/page.tsx

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-client'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam === 'blocked') {
      setError('Tu cuenta ha sido bloqueada. Contacta al administrador.')
    }
    const infoParam = searchParams.get('info')
    if (infoParam === 'registered') {
      setInfo('Registro exitoso. Revisa tu correo para verificar tu cuenta.')
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createSupabaseBrowserClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(
        authError.message === 'Email not confirmed'
          ? 'Debes verificar tu correo antes de iniciar sesión.'
          : authError.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos.'
          : authError.message
      )
      setLoading(false)
      return
    }

    // El middleware se encarga de redirigir según el estado del perfil
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-2xl mb-4 text-3xl">
            💸
          </div>
          <h1 className="text-2xl font-bold text-white">GastosIA</h1>
          <p className="text-gray-400 mt-1">Inicia sesión en tu cuenta</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          {info && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
              {info}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5
                           text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500
                           focus:ring-1 focus:ring-emerald-500 transition"
                placeholder="tu@correo.com"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5
                           text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500
                           focus:ring-1 focus:ring-emerald-500 transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50
                         text-white font-semibold py-2.5 rounded-lg transition"
            >
              {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-emerald-400 hover:text-emerald-300">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
