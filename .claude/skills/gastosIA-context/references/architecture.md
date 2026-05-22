# Arquitectura — GastosIA

## Estructura de carpetas

```
/
├── app/
│   ├── layout.tsx                    # Root layout, PWA meta tags
│   ├── page.tsx                      # Redirect a /dashboard
│   ├── dashboard/page.tsx            # Dashboard principal (Client Component)
│   ├── login/page.tsx                # Login — useSearchParams dentro de <Suspense>
│   ├── register/page.tsx             # Registro con Turnstile CAPTCHA
│   ├── pending/page.tsx              # Pantalla "cuenta pendiente de aprobación"
│   ├── categories/page.tsx           # CRUD de categorías
│   ├── admin/users/page.tsx          # Panel admin — aprobar/bloquear usuarios
│   └── api/
│       ├── expenses/                 # GET list / POST crear
│       ├── expenses/[id]/            # GET / PUT / DELETE por ID
│       ├── categories/               # GET con resumen mensual / POST
│       ├── categories/list/          # GET lista simple (para selects en UI)
│       ├── categories/[id]/          # PUT / DELETE por ID
│       ├── scan/                     # POST — escanear factura con IA
│       ├── auth/register/            # POST — registro de nuevo usuario
│       └── admin/users/              # GET — listar todos los usuarios
│           └── [id]/                 # PATCH — aprobar/bloquear usuario
├── components/
│   ├── UserMenu.tsx                  # Avatar + dropdown (logout, link admin)
│   ├── ScanButton.tsx                # Botón escanear factura con IA
│   ├── ManualExpenseButton.tsx       # Modal agregar gasto manual
│   ├── ExpenseActions.tsx            # Botones editar / eliminar gasto
│   ├── ExpenseChart.tsx              # Gráfica semanal (Recharts)
│   ├── CategoryPieChart.tsx          # Pie chart por categoría (Recharts)
│   └── ServiceWorkerRegistrar.tsx    # Registro del SW para PWA
├── lib/
│   ├── auth/
│   │   ├── supabase-server.ts        # Clientes y helpers de servidor
│   │   ├── supabase-client.ts        # Cliente browser para Client Components
│   │   └── resend.ts                 # Emails: notificación admin + aprobación
│   ├── ai/
│   │   ├── scanReceipt.ts            # Orquesta: imagen → IA → datos estructurados
│   │   ├── prompts.ts                # Prompts para extracción de facturas
│   │   └── providers/               # Implementaciones Gemini y OpenAI
│   └── db/
│       └── prisma.ts                 # Singleton de PrismaClient
├── types/index.ts                    # Tipos TypeScript compartidos
├── middleware.ts                     # Protección de rutas (Edge runtime)
└── prisma/
    ├── schema.prisma
    └── migrations/
        ├── add_users.sql             # Migración manual: profiles, RLS, trigger
        └── add_users_notes.md        # Instrucciones paso a paso de deploy
```

---

## Flujo de autenticación

### Clientes Supabase usados

```typescript
// lib/auth/supabase-server.ts — para Route Handlers y Server Components
createSupabaseServerClient()   // anon key + cookies de sesión
getSessionUser()               // → User | null (verifica JWT con Supabase)
getSessionProfile()            // → profile con role/status (usa service role)
createSupabaseAdminClient()    // service role — bypass de RLS

// lib/auth/supabase-client.ts — para Client Components
createSupabaseBrowserClient()  // anon key, browser
```

### Regla crítica: service role vs anon key

- **Anon key + cookies** → solo para `supabase.auth.getUser()` (verificar identidad)
- **Service role** → para leer/escribir `profiles`, operaciones admin, y en el middleware
- **Prisma (DATABASE_URL)** → para todas las operaciones sobre expenses/categories/receipts

Esto es necesario porque RLS bloquea las consultas con anon key en el servidor incluso
cuando el usuario está autenticado. El middleware y las rutas API que leen `profiles`
usan `createSupabaseAdminClient()` para bypass.

### Middleware (`middleware.ts`)

Protege todas las rutas excepto `_next/static`, `_next/image`, `favicon`, `icons`,
`manifest.json`, `sw.js` y rutas `/api/*` (estas tienen su propia auth).

Lógica de redirección:
```
Sin sesión           → /login
status = pending     → /pending
status = blocked     → signOut + /login?error=blocked
status = active en ruta pública → /dashboard
/admin/* y role ≠ admin → /dashboard
```

### Roles y estados

```
profiles.role:   'admin' | 'user'
profiles.status: 'pending' | 'active' | 'blocked'
```

### Flujo de registro de nuevo usuario

1. `/register` → formulario con Turnstile CAPTCHA
2. POST `/api/auth/register` → valida Turnstile server-side → `supabase.auth.admin.createUser()`
3. Trigger SQL `handle_new_user()` se dispara → inserta en `profiles` con `status='pending'`
4. Se envía email al admin (Resend)
5. Admin aprueba en `/admin/users` → PATCH `/api/admin/users/[id]`
6. Usuario aprobado recibe email y puede acceder al dashboard

---

## Aislamiento de datos por usuario

Todos los queries de Prisma incluyen `where: { userId: user.id }`:

```typescript
// En GET /api/expenses
const user = await getSessionUser()
if (!user) return 401

const expenses = await prisma.expense.findMany({
  where: { userId: user.id, ... },
  ...
})
```

El `user.id` viene de `getSessionUser()` que verifica el JWT con Supabase Auth.
Si un usuario intenta acceder a un recurso de otro, Prisma no lo encuentra → 404.

---

## Patrones de código importantes

### `export const dynamic = 'force-dynamic'`
Todas las rutas API tienen esta directiva al inicio para evitar que Next.js las cachee
en el build de producción.

### PWA / Service Worker
La app es una PWA instalable. Cuando hay errores `ERR_FAILED` al recargar, la solución
es limpiar el caché del Service Worker en DevTools → Application → Clear site data.

### IA con fallback automático
`lib/ai/scanReceipt.ts` orquesta el escaneo: primero intenta Gemini, si falla usa
OpenAI como fallback. Los prompts están en `lib/ai/prompts.ts`.

### Emails opcionales
Resend es best-effort — si `RESEND_API_KEY` no está configurado, el registro funciona
igual pero sin notificaciones por email.
