// prisma/seed.ts
// Ejecutar con: npx ts-node prisma/seed.ts
// O agregar al package.json: "prisma": { "seed": "ts-node prisma/seed.ts" }

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_CATEGORIES = [
  { name: 'Alimentación',   icon: 'ti-shopping-cart',     color: '#059669' },
  { name: 'Restaurantes',   icon: 'ti-tools-kitchen-2',   color: '#D85A30' },
  { name: 'Transporte',     icon: 'ti-car',               color: '#B45309' },
  { name: 'Servicios',      icon: 'ti-bolt',              color: '#2563EB' },
  { name: 'Salud',          icon: 'ti-heart-rate-monitor',color: '#DC2626' },
  { name: 'Entretenimiento',icon: 'ti-device-tv',         color: '#7C3AED' },
  { name: 'Ropa',           icon: 'ti-shirt',             color: '#DB2777' },
  { name: 'Hogar',          icon: 'ti-home',              color: '#0891B2' },
  { name: 'Suscripciones',  icon: 'ti-device-laptop',     color: '#6D28D9' },
  { name: 'Educación',      icon: 'ti-school',            color: '#065F46' },
  { name: 'Otros',          icon: 'ti-dots',              color: '#6B7280' },
]

async function main() {
  console.log('🌱 Creando categorías por defecto...')

  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    })
  }

  console.log(`✅ ${DEFAULT_CATEGORIES.length} categorías creadas`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
