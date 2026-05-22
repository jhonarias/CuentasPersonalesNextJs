# API Routes — GastosIA

Todas las rutas API están en `app/api/` y siguen estos patrones:

- `export const dynamic = 'force-dynamic'` al inicio de cada archivo
- Autenticación propia con `getSessionUser()` — NO dependen del middleware
- Filtrado por `userId: user.id` en todos los queries de Prisma
- Respuesta estándar: `{ data: T }` en éxito, `{ error: string }` en error

---

## Autenticación en rutas API

```typescript
import { getSessionUser } from '@/lib/auth/supabase-server'

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  // ... usar user.id para filtrar datos
}
```

Para rutas admin, además verificar rol con `createSupabaseAdminClient()`:

```typescript
import { getSessionUser, createSupabaseAdminClient } from '@/lib/auth/supabase-server'

const user = await getSessionUser()
if (!user) return 401

const adminClient = createSupabaseAdminClient()
const { data: profile } = await adminClient
  .from('profiles').select('role').eq('id', user.id).single()

if (profile?.role !== 'admin') return 403
```

---

## Endpoints de Gastos

### `GET /api/expenses`
Lista gastos del usuario autenticado.

Query params: `month`, `year`, `categoryId`, `limit` (default 50)

```typescript
// Filtro base siempre incluye userId
const where = { userId: user.id }
// + filtro de fecha si month y year están presentes
// + filtro de categoría si categoryId está presente

prisma.expense.findMany({
  where,
  include: {
    category: { select: { id, name, icon, color } },
    receipt:  { select: { id, storageUrl, fileName } },
  },
  orderBy: { date: 'desc' },
  take: limit,
})
```

### `POST /api/expenses`
Crea un gasto manual. Body validado con Zod:
```typescript
{ amount, description, date (YYYY-MM-DD), merchant?, categoryId, notes?, isAiScanned?, confidence? }
```
Siempre agrega `userId: user.id` al crear.

### `GET /api/expenses/[id]`
Retorna un gasto específico. Filtra por `{ id: params.id, userId: user.id }` — si no
pertenece al usuario retorna 404.

### `PUT /api/expenses/[id]`
Actualiza un gasto. Mismo filtro `{ id, userId }` para prevenir edición cross-user.

### `DELETE /api/expenses/[id]`
Elimina un gasto y su recibo asociado (cascade en DB). Filtra por `{ id, userId }`.

---

## Endpoints de Categorías

### `GET /api/categories`
Retorna categorías con resumen de gastos del mes actual.

Query params: `month`, `year`

Usa `prisma.expense.groupBy` para calcular totales por categoría, filtrando por
`userId: user.id`. Luego hace join con las categorías del usuario.

### `POST /api/categories`
Crea categoría. Body: `{ name, icon, color, budget? }`. Agrega `userId: user.id`.

### `GET /api/categories/list`
Lista simple de categorías (id + name + icon + color) para usar en selects de la UI.
Filtra por `userId: user.id`.

### `PUT /api/categories/[id]`
Actualiza categoría. Filtra por `{ id: params.id, userId: user.id }`.

### `DELETE /api/categories/[id]`
Elimina categoría solo si no tiene gastos asociados. Verifica con `prisma.expense.count`
filtrando por `{ categoryId, userId }`.

---

## Endpoint de Escaneo IA

### `POST /api/scan`
Recibe una imagen de factura, la procesa con IA y crea el gasto.

Flujo:
1. Verifica auth con `getSessionUser()`
2. Lee `formData` con el archivo de imagen
3. Llama a `scanReceipt(file)` — orquesta Gemini → OpenAI fallback
4. Busca la categoría más similar entre las del usuario (`userId: user.id`)
5. Crea el gasto con `isAiScanned: true` y `confidence` de la IA
6. Guarda la imagen en Supabase Storage y crea el `Receipt`

---

## Endpoints de Auth

### `POST /api/auth/register`
Registra un nuevo usuario. Body:
```typescript
{ firstName, lastName, email, phone?, password, turnstileToken }
```

Flujo:
1. Valida con Zod
2. Verifica Turnstile con Cloudflare siteverify API (server-side)
3. `supabase.auth.admin.createUser({ email, password, email_confirm: false, user_metadata: {...} })`
4. `supabase.auth.admin.generateLink({ type: 'signup', email, password, options: { redirectTo } })`
5. `sendNewUserNotification()` al admin (best-effort, no bloquea)
6. Retorna 201

---

## Endpoints de Admin

### `GET /api/admin/users`
Lista todos los perfiles de usuario. Solo accesible para admins.

Combina datos de `profiles` (Supabase table) con emails de `auth.users`
usando `adminClient.auth.admin.listUsers()`.

### `PATCH /api/admin/users/[id]`
Aprueba o bloquea un usuario. Body: `{ status: 'active' | 'blocked' | 'pending' }`

- Si `status = 'active'`: guarda `approved_at` y `approved_by`, envía email al usuario
- Usa `createSupabaseAdminClient()` para todas las operaciones de profiles
