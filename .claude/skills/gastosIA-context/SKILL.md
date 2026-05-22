---
name: gastosIA-context
description: >
  Contexto completo del proyecto GastosIA — una PWA de finanzas personales construida
  con Next.js 14, Prisma, Supabase Auth y IA (Gemini + OpenAI). Usa este skill cuando
  alguien trabaje en este proyecto y necesite entender su arquitectura, base de datos,
  API routes, flujo de autenticación, cómo hacer deploy, o cómo resolver errores conocidos.
  Activa este skill ante cualquier pregunta sobre el código, la estructura, los patrones
  usados, variables de entorno, RLS, middleware, o el módulo de usuarios.
---

# GastosIA — Agente de Contexto del Proyecto

## ¿Qué es GastosIA?

PWA de finanzas personales que permite registrar gastos manualmente o escaneando facturas
con IA (OCR). Incluye dashboard con gráficas, categorías con presupuesto, módulo de
gestión de usuarios con aprobación por admin, y aislamiento de datos por usuario.

- **URL producción:** https://cuentas-personales-next-js.vercel.app
- **Deploy:** GitHub → Vercel (auto-deploy en push a `main`)
- **Base de datos:** PostgreSQL en Supabase

---

## Cómo usar este skill

Antes de responder cualquier pregunta técnica sobre el proyecto, lee el archivo de
referencia correspondiente al tema:

| Si la pregunta es sobre… | Lee este archivo |
|--------------------------|-----------------|
| Stack, auth, estructura de carpetas, patrones de código | `references/architecture.md` |
| Schema de la DB, Prisma, RLS, triggers SQL, tabla profiles | `references/database.md` |
| Endpoints de la API, cómo se filtran los datos por usuario | `references/api-routes.md` |
| Variables de entorno, setup de Vercel/Supabase, cómo hacer deploy | `references/deployment.md` |
| Errores conocidos, bugs resueltos, problemas de RLS o middleware | `references/troubleshooting.md` |

Para preguntas amplias que toquen varios temas, lee múltiples archivos en paralelo.

---

## Stack resumido

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
