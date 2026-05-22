# Deploy y Configuración — GastosIA

## Variables de entorno (Vercel → Settings → Environment Variables)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=           # URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Anon/public key
SUPABASE_SERVICE_ROLE_KEY=          # Service role key (para bypass de RLS en servidor)
DATABASE_URL=                        # postgresql://... con ?pgbouncer=true&connection_limit=1
DIRECT_URL=                          # postgresql://... sin pgbouncer (para migrations)

# IA
GOOGLE_GENERATIVE_AI_API_KEY=        # Google AI Studio → API Keys
OPENAI_API_KEY=                      # platform.openai.com → API Keys (fallback)

# Email
RESEND_API_KEY=                      # resend.com → API Keys (gratis: 3000 emails/mes)
ADMIN_EMAIL=                         # Email del admin para recibir notificaciones de registro

# App
NEXT_PUBLIC_APP_URL=                 # https://tu-app.vercel.app (sin "/" al final)

# CAPTCHA
NEXT_PUBLIC_TURNSTILE_SITE_KEY=      # Cloudflare Turnstile → Site Key
TURNSTILE_SECRET_KEY=                # Cloudflare Turnstile → Secret Key
```

### Dónde obtener cada variable

| Variable | Dónde obtenerla |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (¡mantener secreta!) |
| `DATABASE_URL` | Supabase → Settings → Database → Connection string → Transaction |
| `DIRECT_URL` | Supabase → Settings → Database → Connection string → Direct |
| `GOOGLE_GENERATIVE_AI_API_KEY` | https://aistudio.google.com/app/apikey |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| `RESEND_API_KEY` | https://resend.com → API Keys |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | https://dash.cloudflare.com → Turnstile → Add site |
| `TURNSTILE_SECRET_KEY` | https://dash.cloudflare.com → Turnstile → Add site |

---

## Setup inicial de Supabase (orden de pasos)

### Paso 1: Ejecutar migración SQL
En **Supabase → SQL Editor**, ejecutar `prisma/migrations/add_users.sql`.

Esto crea:
- Tabla `profiles` con roles y estados
- Columnas `user_id` en `categories` y `expenses`
- Trigger `handle_new_user()`
- Políticas RLS
- Función `is_admin()` con SECURITY DEFINER

### Paso 2: Eliminar constraint único de categorías
```sql
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;
```

### Paso 3: Asignar datos existentes al admin
Si ya había datos antes del módulo de usuarios, asignarlos al admin:
```sql
-- Obtener el UUID del admin en Supabase → Authentication → Users
UPDATE categories SET user_id = 'UUID-DEL-ADMIN' WHERE user_id IS NULL;
UPDATE expenses  SET user_id = 'UUID-DEL-ADMIN' WHERE user_id IS NULL;
```

### Paso 4: Crear el usuario admin
En **Supabase → Authentication → Users → Add user**:
- Activar "Auto confirm user?"
- Ingresar email y contraseña del admin

### Paso 5: Promover a admin
```sql
UPDATE profiles
SET role = 'admin', status = 'active'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@ejemplo.com');
```

---

## Deploy en Vercel

El deploy es automático con cada push a `main`:
```bash
git push origin main
```

Para forzar un redeploy sin cambios de código, desde el dashboard de Vercel usar
"Redeploy" en el último deployment.

### Comandos útiles

```bash
# Desarrollo local
npm run dev

# Regenerar cliente Prisma después de cambiar schema.prisma
npx prisma generate

# Explorar la DB localmente
npx prisma studio

# Verificar tipos TypeScript
npx tsc --noEmit
```

---

## Configuración de Cloudflare Turnstile

1. Ir a https://dash.cloudflare.com → Turnstile → Add widget
2. Widget name: cualquier nombre (ej: "GastosIA")
3. Hostname: el dominio de Vercel (ej: `cuentas-personales-next-js.vercel.app`)
4. Widget Mode: Managed (default)
5. Pre-clearance: desactivado
6. Copiar Site Key → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
7. Copiar Secret Key → `TURNSTILE_SECRET_KEY`

Gratis, sin tarjeta de crédito requerida.

---

## Configuración de Resend

1. Crear cuenta en https://resend.com
2. API Keys → Create API Key
3. Para enviar emails a cualquier dirección (no solo @resend.dev), verificar un dominio
   en Resend → Domains
4. El `from` en `lib/auth/resend.ts` debe usar un email del dominio verificado

Free tier: 3000 emails/mes.
