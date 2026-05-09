# 💳 GastosIA — Control Financiero con IA

App personal para gestionar gastos escaneando facturas con GPT-4o Vision.  
Monorepo Next.js 14 + TypeScript + PostgreSQL (Supabase) + PWA instalable.

---

## 🏗️ Arquitectura

```
gastosIA/
├── app/
│   ├── api/
│   │   ├── scan/route.ts          ← Recibe foto → GPT-4o → guarda en DB
│   │   ├── expenses/route.ts      ← CRUD de gastos
│   │   └── categories/route.ts    ← Categorías + resúmenes
│   ├── dashboard/page.tsx         ← Dashboard principal
│   ├── components/
│   │   ├── ScanButton.tsx         ← Cámara PWA + confirmación IA
│   │   ├── ExpenseChart.tsx       ← Gráfica semanal (Chart.js)
│   │   └── CategoryPieChart.tsx   ← Donut por categoría
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── ai/scanReceipt.ts          ← Lógica GPT-4o Vision
│   ├── db/prisma.ts               ← Singleton Prisma
│   ├── db/supabase.ts             ← Storage de imágenes
│   └── utils/index.ts             ← Utilidades compartidas
├── prisma/
│   ├── schema.prisma              ← Modelos DB
│   └── seed.ts                    ← Categorías por defecto
├── public/
│   ├── manifest.json              ← PWA config
│   └── sw.js                      ← Service Worker
└── types/index.ts                 ← Tipos compartidos TS
```

---

## 🚀 Setup en 5 pasos

### 1. Clonar e instalar
```bash
git clone <tu-repo>
cd gastosIA
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env.local
# Edita .env.local con tus credenciales
```

### 3. Configurar Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **Storage** → crea un bucket llamado `receipts` (público)
3. Copia las URLs y claves al `.env.local`

### 4. Inicializar la base de datos
```bash
npm run db:push      # Crea las tablas en PostgreSQL
npx ts-node prisma/seed.ts  # Crea las 11 categorías por defecto
```

### 5. Correr en desarrollo
```bash
npm run dev
# Abre http://localhost:3000
```

---

## 📱 Instalar como PWA (móvil)

1. Abre la app en Chrome/Safari en tu teléfono
2. Toca **"Añadir a pantalla de inicio"**
3. ¡Listo! La app funciona como nativa con acceso a cámara

---

## 🤖 Flujo de escaneo

```
📷 Foto  →  POST /api/scan  →  GPT-4o Vision  →  JSON estructurado
                                                        ↓
                                              Validación + mapeo de categoría
                                                        ↓
                                              Supabase Storage (imagen)
                                                        ↓
                                              PostgreSQL (gasto + recibo)
                                                        ↓
                                              ✅ Confirmación al usuario
```

---

## 🗄️ Modelos de datos

| Tabla | Descripción |
|-------|-------------|
| `categories` | Categorías con icono, color y presupuesto opcional |
| `expenses` | Gastos con datos extraídos por IA y metadata |
| `receipts` | URLs de imágenes en Supabase Storage |
| `monthly_budgets` | Presupuesto mensual global |

---

## 🌐 Deploy en Vercel

```bash
npx vercel deploy
# Configura las mismas variables de entorno en el dashboard de Vercel
```

---

## 📦 Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript |
| Base de datos | PostgreSQL via Supabase |
| ORM | Prisma |
| IA | OpenAI GPT-4o Vision |
| Storage | Supabase Storage |
| Deploy | Vercel |
| UI | Tailwind CSS + Chart.js |
| PWA | Web App Manifest + Service Worker |
# CuentasPersonalesNextJs
