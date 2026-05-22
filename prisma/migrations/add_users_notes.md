# Instrucciones de migración — Módulo de usuarios

## Paso 1: SQL Editor en Supabase

Ejecuta el archivo `add_users.sql` en Supabase → SQL Editor.

## Paso 2: Eliminar unique constraint del nombre de categorías

Diferentes usuarios pueden tener categorías con el mismo nombre.
Ejecuta esto en Supabase → SQL Editor:

```sql
-- Eliminar el unique constraint del nombre de categoría
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;
```

## Paso 3: Asignar datos existentes al admin

Si ya tienes gastos y categorías creados antes del módulo de usuarios,
asígnalos al administrador. Primero obtén tu UUID de admin en
Supabase → Authentication → Users, luego ejecuta:

```sql
-- Reemplaza 'TU-UUID-AQUI' con tu UUID real de admin
UPDATE categories SET user_id = 'TU-UUID-AQUI' WHERE user_id IS NULL;
UPDATE expenses SET user_id = 'TU-UUID-AQUI' WHERE user_id IS NULL;
```

## Variables de entorno necesarias

Agrega estas variables en Vercel (Settings → Environment Variables):

```
RESEND_API_KEY=re_xxxxxxxxxxxx
ADMIN_EMAIL=tu-email@ejemplo.com
NEXT_PUBLIC_APP_URL=https://tu-app.vercel.app
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4XXXXXXXXXXXXXXXXX
TURNSTILE_SECRET_KEY=0x4XXXXXXXXXXXXXXXXX
```

### Dónde obtener cada una:

- **RESEND_API_KEY**: https://resend.com → API Keys → Create API Key (gratis: 3000 emails/mes)
- **ADMIN_EMAIL**: Tu correo donde recibirás notificaciones de nuevos usuarios
- **NEXT_PUBLIC_APP_URL**: La URL de tu app en Vercel (sin "/" al final)
- **Turnstile keys**: https://dash.cloudflare.com → Turnstile → Add site (gratis, sin tarjeta)

## Paso 4: Crear primer usuario admin

Tras el deploy, ve a Supabase → Authentication → Users → Add user.
Crea tu cuenta admin con email/contraseña.

Luego en SQL Editor ejecuta:

```sql
-- Convertir tu cuenta en admin activo
UPDATE profiles
SET role = 'admin', status = 'active'
WHERE id = (SELECT id FROM auth.users WHERE email = 'tu-email@ejemplo.com');
```
