'use client'
// components/UserMenu.tsx
// Menú de usuario: cerrar sesión y acceso al panel de admin

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-client'
import ManualExpenseButton from '@/components/ManualExpenseButton'

type Props = {
  firstName: string
  role: string
  onExpenseSuccess?: () => void
}

export default function UserMenu({ firstName, role, onExpenseSuccess }: Props) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initial = firstName.charAt(0).toUpperCase()

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center
                   text-white text-sm font-semibold transition-colors"
        title={firstName}
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 py-1">
          <div className="px-3 py-2 border-b border-gray-800">
            <p className="text-sm font-medium text-white truncate">{firstName}</p>
            {role === 'admin' && (
              <p className="text-xs text-purple-400 mt-0.5">Administrador</p>
            )}
          </div>

          <Link
            href="/categories"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition"
          >
            🏷️ Categorías
          </Link>

          <div onClick={() => setOpen(false)}>
            <ManualExpenseButton
              onSuccess={onExpenseSuccess ?? (() => {})}
            />
          </div>

          {role === 'admin' && (
            <>
              <div className="border-t border-gray-800 my-1" />
              <Link
                href="/admin/users"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition"
              >
                👥 Gestión de usuarios
              </Link>
            </>
          )}

          <div className="border-t border-gray-800 my-1" />

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition"
          >
            🚪 Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
