import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.EMAIL_FROM ?? 'Community <noreply@community.app>'

export type SendEmailOptions = {
  to: string
  subject: string
  html: string
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  if (!process.env.RESEND_API_KEY) return
  try {
    await resend.emails.send({ from: FROM, ...opts })
  } catch {
    // Non-blocking — email failure must never break the main request
  }
}
