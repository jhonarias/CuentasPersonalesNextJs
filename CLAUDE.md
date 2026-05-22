# GastosIA — Contexto del Proyecto

## ¿Qué es GastosIA?

Aplicación web PWA de finanzas personales construida con Next.js 14. Permite registrar gastos manualmente o escaneando facturas con IA (OCR + extracción de datos). Incluye dashboard con gráficas, categorías con presupuesto, y un módulo de gestión de usuarios con aprobación por admin.

**URL producción:** https://cuentas-personales-next-js.vercel.app  
**Repo:** GitHub → Vercel (auto-deploy en push a main)  
**Base de datos:** PostgreSQL en Supabase

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript |
| ORM | Prisma 5 |
| Base de datos | PostgreSQL via Supabase |
| Auth | Supabase Auth (`@supabase/ssr`) |
| Estilos | Tailwind CSS |
| IA / OCR | Google Gemini (principal) + OpenAI (fallback) |
| Email | Resend |
| CAPTCHA | Cloudflare Turnstile |
| Deploy | Vercel |
| Storage | Supabase Storage (recibos/facturas) |

---

## Arquitectura de Autenticación

### Flujo de sesión
- Supabase Auth con cookies (`@supabase/ssr`) — SSR-compatible
- `lib/auth/supabase-server.ts` — cliente servidor (SSR, Route Handlers)
- `lib/auth/supabase-client.ts` — cliente browser (Client Components)
- `middleware.ts` — protege rutas, verifica status del perfil

### Roles y estados de usuario
```
profiles.role:   'admin' | 'user'
profiles.status: 'pending' | 'active' | 'blocked'
```

### Flujo de registro
1. Usuario llena formulario en `/register` (con Turnstile CAPTCHA)
2. POST `/api/auth/register` → valida Turnstile → crea user en Supabase Auth
3. Trigger SQL `handle_new_user()` crea automáticamente el perfil en `profiles`
4. Usuario queda en `status = 'pending'` → ve página `/pending`
5. Admin recibe email (via Resend) → aprueba en `/admin/users`
6. Usuario aprobado recibe email y puede acceder al dashboard

### Middleware (`middleware.ts`)
- Sin sesión → `/login`
- `status = pending` → `/pending`
- `status = blocked` → signOut + `/login?error=blocked`
- `status = active` en ruta pública → `/dashboard`
- Ruta `/admin/*` y `role !== 'admin'` → `/dashboard`
- **Usa `createClient` con service role key** para leer el perfil (evita problema de RLS)

---

## Base de Datos

### Schema Prisma (`prisma/schema.prisma`)

```
Category    — id, name, icon, color, budget?, userId? @map("user_id"), createdAt
Expense     — id, amount, description, date, merchant?, notes?, isAiScanned, confidence?, rawOcrData?, userId? @map("user_id"), categoryId, createdAt, updatedAt
Receipt     — id, storageUrl, fileName, mimeType, sizeBytes, processedAt, expenseId (unique)
MonthlyBudget — id, year, month, amount, createdAt (unique: year+month)
```

> **Importante:** `userId` en Prisma mapea a `user_id` (snake_case) en la DB via `@map("user_id")`.  
> **Importante:** `name` en Category ya NO tiene `@unique` (distintos usuarios pueden tener categorías con el mismo nombre).

### Tabla `profiles` (fuera de Prisma, manejada por Supabase)
```sql
profiles: id (UUID FK auth.users), first_name, last_name, phone, role, status, 
          created_at, approved_at, approved_by
```

### RLS (Row Level Security)
- **Activo** en `profiles`, `categories`, `expenses`
- Las políticas de admin usan la función `is_admin()` con `SECURITY DEFINER` para **evitar recursión infinita**
- Las API routes del servidor usan **service role key** (`createSupabaseAdminClient()`) para bypass de RLS

### Trigger SQL
```sql
handle_new_user() — AFTER INSERT ON auth.users
-- Crea automáticamente el perfil en profiles con role='user', status='pending'
-- Necesita SET search_path = public para funcionar correctamente
```

---

## Estructura de Archivos

```
/
├── app/
│   ├── layout.tsx                    # Root layout, PWA meta tags
│   ├── page.tsx                      # Redirect a /dashboard
│   ├── dashboard/page.tsx            # Dashboard principal (Client Component)
│   ├── login/page.tsx                # Login — useSearchParams dentro de <Suspense>
│   ├── register/page.tsx             # Registro con Turnstile
│   ├── pending/page.tsx              # Pantalla cuenta pendiente
│   ├── categories/page.tsx           # CRUD de categorías
│   ├── admin/users/page.tsx          # Panel admin de usuarios
│   └── api/
│       ├── expenses/                 # GET (list) / POST (crear)
│       ├── expenses/[id]/            # GET / PUT / DELETE
│       ├── categories/               # GET con resumen mensual / POST
│       ├── categories/list/          # GET lista simple (para selects)
│       ├── categories/[id]/          # PUT / DELETE
│       ├── scan/                     # POST — escanear factura con IA
│       ├── auth/register/            # POST — registro de usuario
│       └── admin/users/              # GET — listar usuarios
│           └── [id]/                 # PATCH — aprobar/bloquear
├── components/
│   ├── UserMenu.tsx                  # Avatar + dropdown (logout, admin link)
│   ├── ScanButton.tsx                # Botón escanear factura con IA
│   ├── ManualExpenseButton.tsx       # Modal agregar gasto manual
│   ├── ExpenseActions.tsx            # Editar / eliminar gasto
│   ├── ExpenseChart.tsx              # Gráfica semanal (Recharts)
│   ├── CategoryPieChart.tsx          # Pie chart por categoría
│   └── ServiceWorkerRegistrar.tsx    # Registro del SW para PWA
├── lib/
│   ├── auth/
│   │   ├── supabase-server.ts        # createSupabaseServerClient(), getSessionUser(), 
│   │   │                             # getSessionProfile(), createSupabaseAdminClient()
│   │   ├── supabase-client.ts        # createSupabaseBrowserClient()
│   │   └── resend.ts                 # sendNewUserNotification(), sendApprovalEmail()
│   ├── ai/
│   │   ├── scanReceipt.ts            # Orquesta el escaneo: imagen → IA → datos
│   │   ├── prompts.ts                # Prompts para extracción de datos de facturas
│   │   └── providers/               # Gemini y OpenAI (con fallback automático)
│   └── db/
│       └── prisma.ts                 # Singleton de PrismaClient
├── types/index.ts                    # Tipos compartidos (ExpenseWithCategory, etc.)
├── middleware.ts                     # Protección de rutas (Edge runtime)
└── prisma/
    ├── schema.prisma
    └── migrations/
        ├── add_users.sql             # Migración manual: profiles, RLS, trigger
        └── add_users_notes.md        # Instrucciones de despliegue
```

---

## Variables de Entorno Necesarias

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # Para operaciones admin (bypass RLS)
DATABASE_URL=                        # Para Prisma (con pgbouncer)
DIRECT_URL=                          # Para Prisma migrations

# IA
GOOGLE_GENERATIVE_AI_API_KEY=        # Gemini (proveedor principal)
OPENAI_API_KEY=                      # OpenAI (fallback)

# Email
RESEND_API_KEY=                      # Notificaciones admin + aprobación usuarios
ADMIN_EMAIL=                         # Email del admin para recibir notificaciones

# App
NEXT_PUBLIC_APP_URL=                 # URL de producción (sin "/" al final)

# CAPTCHA
NEXT_PUBLIC_TURNSTILE_SITE_KEY=      # Cloudflare Turnstile
TURNSTILE_SECRET_KEY=
```

---

## Patrones Importantes

### Aislamiento de datos por usuario
Todos los queries de Prisma incluyen `where: { userId: user.id }` para que cada usuario solo vea sus propios datos. El `user.id` viene de `getSessionUser()`.

### Service Role vs Anon Key
- **Anon key + cookies** → autenticación del usuario (`getSessionUser()`)
- **Service role** → leer/escribir perfiles, operaciones admin, middleware (`createSupabaseAdminClient()`)
- **Prisma (DATABASE_URL)** → todas las operaciones de expenses/categories/receipts (bypasea RLS por conexión directa)

### Rutas API excluidas del middleware
Las rutas `/api/*` están excluidas del middleware — manejan su propia autenticación con `getSessionUser()`.

### `export const dynamic = 'force-dynamic'`
Todas las rutas API tienen esta directiva para evitar que Next.js las cachee en el build.

### PWA / Service Worker
La app es una PWA. Al limpiar caché del navegador (DevTools → Application → Clear site data) se soluciona la mayoría de problemas de carga en desarrollo/testing.

---

## Problemas Conocidos y Sus Soluciones

| Problema | Causa | Solución |
|----------|-------|----------|
| `infinite recursion detected in policy for relation "profiles"` | Políticas RLS de admin consultaban `profiles` recursivamente | Usar función `is_admin()` con `SECURITY DEFINER` |
| `The column expenses.userId does not exist` | Prisma no mapeaba camelCase a snake_case | Agregar `@map("user_id")` en schema.prisma |
| Middleware redirige a `/pending` aunque el perfil es activo | RLS bloqueaba lectura del perfil con anon key | Usar service role key en middleware |
| `ERR_FAILED` al recargar la página | Service Worker cacheando respuestas de error | Limpiar site data en DevTools |
| `Database error creating new user` en Supabase UI | Trigger `handle_new_user` sin `SET search_path = public` | Recrear función con ese parámetro |
| `useSearchParams() should be wrapped in a suspense boundary` | Next.js 14 requiere Suspense alrededor de useSearchParams | Separar componente y envolverlo en `<Suspense>` |

---

## Comandos Útiles

```bash
# Desarrollo local
npm run dev

# Regenerar cliente Prisma después de cambiar schema
npx prisma generate

# Ver la DB en local
npx prisma studio

# Deploy (automático al hacer push)
git push origin main
```

---

## Estado Actual del Proyecto

- ✅ Dashboard con gráficas (semanal + por categoría)
- ✅ Escaneo de facturas con IA (Gemini + OpenAI fallback)
- ✅ CRUD de gastos (manual y por IA)
- ✅ CRUD de categorías con presupuesto
- ✅ Módulo de usuarios completo (registro, aprobación, roles)
- ✅ Aislamiento de datos por usuario
- ✅ PWA (instalable, service worker)
- ✅ Deploy en Vercel + Supabase
