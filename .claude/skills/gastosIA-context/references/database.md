# Base de datos — GastosIA

## Schema Prisma (`prisma/schema.prisma`)

```prisma
model Category {
  id        String    @id @default(cuid())
  name      String                          // SIN @unique — usuarios distintos pueden tener mismo nombre
  icon      String                          // emoji, ej: "🛒"
  color     String                          // hex, ej: "#1D9E75"
  budget    Float?                          // presupuesto mensual opcional
  userId    String?   @map("user_id")       // UUID del propietario — IMPORTANTE: @map a snake_case
  createdAt DateTime  @default(now())
  expenses  Expense[]

  @@map("categories")
}

model Expense {
  id          String   @id @default(cuid())
  amount      Float
  description String
  date        DateTime
  merchant    String?                        // comercio extraído por IA
  notes       String?
  isAiScanned Boolean  @default(false)
  confidence  Float?                         // confianza de extracción IA (0.0–1.0)
  rawOcrData  Json?                          // respuesta cruda de la IA para auditoría
  userId      String?  @map("user_id")       // UUID del propietario — IMPORTANTE: @map a snake_case
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  receipt     Receipt?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("expenses")
}

model Receipt {
  id          String   @id @default(cuid())
  storageUrl  String                         // URL en Supabase Storage
  fileName    String
  mimeType    String
  sizeBytes   Int
  processedAt DateTime @default(now())
  expenseId   String   @unique
  expense     Expense  @relation(fields: [expenseId], references: [id], onDelete: Cascade)

  @@map("receipts")
}

model MonthlyBudget {
  id        String   @id @default(cuid())
  year      Int
  month     Int                              // 1-12
  amount    Float
  createdAt DateTime @default(now())

  @@unique([year, month])
  @@map("monthly_budgets")
}
```

### Regla crítica: @map("user_id")

Prisma usa camelCase (`userId`) pero la DB tiene snake_case (`user_id`). Sin `@map("user_id")`
Prisma busca una columna `userId` que no existe y lanza `P2022`. Siempre verificar que
ambos campos tengan el `@map`.

---

## Tabla `profiles` (fuera de Prisma — manejada por Supabase)

```sql
CREATE TABLE profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name  TEXT,
  last_name   TEXT,
  phone       TEXT,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'blocked')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id)
);
```

No está en Prisma porque Supabase la gestiona junto con `auth.users`. Se lee con
`createSupabaseAdminClient()` (service role) para evitar problemas de RLS.

---

## Row Level Security (RLS)

RLS está activo en `profiles`, `categories` y `expenses`.

### Problema de recursión infinita (ya resuelto)

Las políticas de admin NO deben consultar `profiles` directamente dentro de la política
— eso causa recursión infinita (`42P17`). La solución es una función `SECURITY DEFINER`:

```sql
-- Función helper — corre como postgres (superuser), bypasea RLS sin recursión
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
```

### Políticas actuales

```sql
-- profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE USING (is_admin());

-- categories
CREATE POLICY "Users can manage own categories"
  ON categories FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all categories"
  ON categories FOR ALL USING (is_admin());

-- expenses
CREATE POLICY "Users can manage own expenses"
  ON expenses FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all expenses"
  ON expenses FOR ALL USING (is_admin());
```

> **Nota:** Las rutas API del servidor usan Prisma con `DATABASE_URL` (conexión directa
> como postgres) que bypasea RLS. El filtrado por `userId` se hace a nivel de aplicación
> en el `where` de Prisma.

---

## Trigger SQL: handle_new_user

Se dispara en cada INSERT en `auth.users` y crea automáticamente el perfil:

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
    CASE
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', '') = 'admin' THEN 'active'
      ELSE 'pending'
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- SET search_path = public es OBLIGATORIO para que encuentre la tabla profiles

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## Promover un usuario a admin (SQL)

```sql
UPDATE profiles
SET role = 'admin', status = 'active'
WHERE id = (SELECT id FROM auth.users WHERE email = 'email@ejemplo.com');
```

## Asignar datos existentes a un usuario

```sql
-- Reemplazar UUID con el id real del usuario admin
UPDATE categories SET user_id = 'UUID-AQUI' WHERE user_id IS NULL;
UPDATE expenses  SET user_id = 'UUID-AQUI' WHERE user_id IS NULL;
```

## Eliminar constraint único de nombre de categoría

```sql
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;
```
