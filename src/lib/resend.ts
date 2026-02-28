import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const DEFAULT_FROM = 'ExportFlow <noreply@exportflow.io>'

interface SendEmailOptions {
  to: string | string[]
  subject: string
  react: React.ReactElement
  replyTo?: string
}

export async function sendEmail({ to, subject, react, replyTo }: SendEmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      react,
      ...(replyTo ? { replyTo } : {}),
    })

    if (error) {
      console.error('[Resend] Failed to send email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (err) {
    console.error('[Resend] Unexpected error:', err)
    return { success: false, error: err }
  }
}

export async function sendCompanyEmail(
  companyId: string,
  to: string | string[],
  subject: string,
  react: React.ReactElement
) {
  const { prisma } = await import('@/lib/prisma')
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { senderEmail: true },
  })

  return sendEmail({
    to,
    subject,
    react,
    replyTo: company?.senderEmail || undefined,
  })
}
