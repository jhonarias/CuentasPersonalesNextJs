# Problemas Conocidos y Soluciones — GastosIA

## Tabla de errores resueltos

| Error | Causa | Solución |
|-------|-------|----------|
| `infinite recursion detected in policy for relation "profiles"` (code: 42P17) | Políticas RLS admin consultaban `profiles` recursivamente | Crear función `is_admin()` con `SECURITY DEFINER` |
| `The column expenses.userId does not exist` (Prisma P2022) | Prisma buscaba `userId` pero la columna en DB es `user_id` | Agregar `@map("user_id")` en `schema.prisma` |
| Middleware redirige a `/pending` aunque el perfil está activo | RLS bloqueaba lectura del perfil con anon key | Usar `createClient` con service role key en `middleware.ts` |
| `ERR_FAILED` al recargar la página | Service Worker cacheando respuestas de error | DevTools → Application → Clear site data |
| `Database error creating new user` en Supabase Auth UI | Trigger `handle_new_user` fallaba por `search_path` incorrecto | Recrear función con `SET search_path = public` |
| `useSearchParams() should be wrapped in a suspense boundary` | Next.js 14 requiere Suspense alrededor de `useSearchParams` | Separar en componente hijo y envolverlo en `<Suspense>` |
| API retorna 403 "Acceso denegado" aunque el usuario es admin | Lectura de profile con anon key falla por RLS | Usar `createSupabaseAdminClient()` para leer profiles en rutas API |
| `Type error: ... TurnstileInstance` | Ref de Turnstile mal tipado | Importar `TurnstileInstance` de `@marsidev/react-turnstile` y usarlo en `useRef<TurnstileInstance>` |
| `password is missing` en `generateLink` | API de Supabase requiere `password` en type `signup` | Pasar el campo `password` a `supabase.auth.admin.generateLink()` |
| Seed falla con `CategoryWhereUniqueInput` | `name` ya no es `@unique` en el schema | Reemplazar `upsert` con `findFirst` + `create` condicional |

---

## Detalle de problemas críticos

### 1. Recursión infinita en RLS de profiles

**Síntoma:** Al hacer cualquier consulta a la tabla `profiles` desde el cliente
(browser o anon key) aparece `infinite recursion detected in policy for relation "profiles"`.

**Causa:** La policy "Admins can view all profiles" usaba un `EXISTS (SELECT 1 FROM profiles ...)`
directamente, lo que hace que verificar si puedes leer profiles requiera leer profiles → loop.

**Solución aplicada:**
```sql
-- Función SECURITY DEFINER — corre como postgres, bypasea RLS → sin recursión
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Reemplazar todas las policies que referenciaban profiles directamente
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT USING (is_admin());
```

---

### 2. Columna `userId` no existe en la DB

**Síntoma:** `PrismaClientKnownRequestError: The column expenses.userId does not exist`

**Causa:** Prisma genera queries usando el nombre del campo en el schema (`userId`),
pero la columna real en PostgreSQL es `user_id` (snake_case, creada via SQL manual).
Sin `@map`, Prisma no hace la traducción.

**Solución aplicada en `schema.prisma`:**
```prisma
model Expense {
  userId String? @map("user_id")  // @map es OBLIGATORIO
}
model Category {
  userId String? @map("user_id")  // @map es OBLIGATORIO
}
```

Después de cambiar el schema, ejecutar `npx prisma generate` para regenerar el cliente.

---

### 3. Middleware redirige a /pending aunque el usuario es activo

**Síntoma:** Usuario con `status = 'active'` en la DB es redirigido a `/pending`
al intentar acceder al dashboard.

**Causa:** El middleware usaba el cliente con anon key para leer `profiles`. RLS
bloqueaba la lectura y retornaba null, que el middleware interpretaba como "pending".

**Solución aplicada en `middleware.ts`:**
```typescript
import { createClient } from '@supabase/supabase-js'

// Dentro del middleware, después de verificar el usuario:
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const { data: profile } = await adminClient
  .from('profiles').select('role, status').eq('id', user.id).single()
```

Esta misma lógica aplica a **todas** las rutas API que necesiten leer `profiles`:
siempre usar `createSupabaseAdminClient()` desde `lib/auth/supabase-server.ts`.

---

### 4. ERR_FAILED al recargar la página

**Síntoma:** Al recargar el dashboard (F5) aparece "No se puede acceder a este sitio
web" con `ERR_FAILED`.

**Causa:** El Service Worker de la PWA cachea las respuestas (incluyendo errores 500
anteriores) y las sirve directamente sin hacer petición al servidor.

**Solución:**
1. DevTools → Application → Service Workers → Unregister
2. DevTools → Application → Storage → Clear site data
3. Recargar la página

Para evitar que el SW cachee rutas API, revisar la configuración del service worker.

---

### 5. Trigger `handle_new_user` falla al crear usuario

**Síntoma:** `Database error creating new user` al crear usuario desde Supabase Auth UI
o desde la API.

**Causa A:** La función no tiene `SET search_path = public`, por lo que no encuentra
la tabla `profiles` cuando corre en el contexto del schema `auth`.

**Causa B:** Primera versión del trigger tenía `first_name TEXT NOT NULL` pero al crear
desde la UI de Supabase el `raw_user_meta_data` viene vacío.

**Solución aplicada:**
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, first_name, last_name, phone, role, status)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'first_name', ''), 'Admin'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'last_name', ''), 'User'),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'user'),
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'role', '') = 'admin'
         THEN 'active' ELSE 'pending' END
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

## Checklist de verificación post-deploy

- [ ] Variables de entorno configuradas en Vercel
- [ ] `add_users.sql` ejecutado en Supabase SQL Editor
- [ ] Constraint único de categorías eliminado
- [ ] Función `is_admin()` creada con SECURITY DEFINER
- [ ] Datos existentes asignados al usuario admin
- [ ] Usuario admin creado con "Auto confirm user" activado
- [ ] SQL ejecutado para promover a admin (`role='admin'`, `status='active'`)
- [ ] Vercel redeploy exitoso (sin errores TypeScript)
- [ ] Service Worker limpio en el navegador de prueba
