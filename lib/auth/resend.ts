// lib/auth/resend.ts
// Envío de emails transaccionales con Resend

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://gastos-ia.vercel.app'

/**
 * Envía email al administrador cuando un nuevo usuario se registra
 */
export async function sendNewUserNotification(user: {
  firstName: string
  lastName: string
  email: string
  phone?: string
}) {
  if (!process.env.RESEND_API_KEY || !ADMIN_EMAIL) {
    console.warn('[Resend] Variables de entorno faltantes — email no enviado')
    return
  }

  try {
    await resend.emails.send({
      from: 'GastosIA <onboarding@resend.dev>',
      to: ADMIN_EMAIL,
      subject: `Nuevo usuario pendiente de aprobación: ${user.firstName} ${user.lastName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #10b981;">GastosIA — Nuevo usuario pendiente</h2>
          <p>Un nuevo usuario se ha registrado y está esperando aprobación:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px; color: #6b7280; width: 140px;">Nombre</td>
              <td style="padding: 8px; font-weight: 600;">${user.firstName} ${user.lastName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px; color: #6b7280;">Email</td>
              <td style="padding: 8px;">${user.email}</td>
            </tr>
            ${user.phone ? `
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px; color: #6b7280;">Teléfono</td>
              <td style="padding: 8px;">${user.phone}</td>
            </tr>` : ''}
          </table>
          <a href="${APP_URL}/admin/users"
             style="display: inline-block; background: #10b981; color: white; padding: 12px 24px;
                    border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
            Ver panel de administración
          </a>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
            Este email fue enviado automáticamente por GastosIA.
          </p>
        </div>
      `,
    })
  } catch (err) {
    // No bloqueamos el registro si falla el email
    console.error('[Resend] Error enviando notificación:', err)
  }
}

/**
 * Envía email al usuario cuando el administrador aprueba su cuenta
 */
export async function sendApprovalEmail(userEmail: string, firstName: string) {
  if (!process.env.RESEND_API_KEY) return

  try {
    await resend.emails.send({
      from: 'GastosIA <onboarding@resend.dev>',
      to: userEmail,
      subject: '¡Tu cuenta ha sido aprobada! — GastosIA',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #10b981;">¡Bienvenido a GastosIA, ${firstName}!</h2>
          <p>Tu cuenta ha sido aprobada por el administrador. Ya puedes iniciar sesión y comenzar a registrar tus gastos.</p>
          <a href="${APP_URL}/login"
             style="display: inline-block; background: #10b981; color: white; padding: 12px 24px;
                    border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
            Iniciar sesión
          </a>
        </div>
      `,
    })
  } catch (err) {
    console.error('[Resend] Error enviando aprobación:', err)
  }
}
