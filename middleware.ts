// middleware.ts
// Protege rutas según estado de autenticación y aprobación del perfil

import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({
    request: { headers: req.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return req.cookies.get(name)?.value },
        set(name, value, options) {
          req.cookies.set({ name, value, ...options })
          res.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          req.cookies.set({ name, value: '', ...options })
          res.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = req.nextUrl.pathname

  // Rutas que no requieren autenticación
  const isPublicPath =
    path.startsWith('/login') ||
    path.startsWith('/register') ||
    path.startsWith('/pending')

  // Si no está autenticado y accede a ruta protegida → login
  if (!user && !isPublicPath) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  // Si está autenticado, verificar estado del perfil
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    const status = profile?.status
    const role = profile?.role

    if (status === 'pending' || !profile) {
      // Cuenta pendiente de aprobación
      if (!path.startsWith('/pending')) {
        return NextResponse.redirect(new URL('/pending', req.url))
      }
    } else if (status === 'blocked') {
      // Cuenta bloqueada → logout + login con mensaje
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/login?error=blocked', req.url))
    } else if (status === 'active') {
      // Usuario activo: redirigir fuera de páginas públicas
      if (isPublicPath) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
      // Rutas de admin solo para admins
      if (path.startsWith('/admin') && role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon, iconos, manifest, service worker
     * - rutas de API (tienen su propia autenticación)
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|api/).*)',
  ],
}
