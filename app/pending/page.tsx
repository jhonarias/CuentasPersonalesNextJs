'use client'
// app/pending/page.tsx
// Pantalla que se muestra mientras la cuenta espera aprobación del admin

import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-client'

export default function PendingPage() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <div className="text-5xl mb-4">⏳</div>
          <h1 className="text-2xl font-bold text-white mb-2">Cuenta pendiente</h1>
          <p className="text-gray-400 mb-6">
            Tu registro fue recibido correctamente. El administrador revisará tu solicitud
            y te notificará por correo electrónico cuando tu cuenta sea aprobada.
          </p>

          <div className="bg-gray-800 rounded-xl p-4 mb-6 text-left space-y-2">
            <div className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <p className="text-sm text-gray-300">Registro completado</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <p className="text-sm text-gray-300">Email verificado</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-yellow-400 mt-0.5">◷</span>
              <p className="text-sm text-gray-300">Esperando aprobación del administrador</p>
            </div>
          </div>

          <p className="text-xs text-gray-600 mb-5">
            Si tienes dudas, contacta al administrador directamente.
          </p>

          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-300 transition"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
