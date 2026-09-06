// api/_lib/ses.ts
// ==============================================================================
// Amazon SES Transactional Email Engine
// Dispatches branded HTML workspace invitations, notification digests,
// and password resets via AWS SES.
// ==============================================================================

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { logger } from './logger'

const region = process.env.AWS_REGION || 'us-east-1'
const isSesEnabled = process.env.AWS_SES_ENABLED === 'true'
const defaultSender = process.env.SES_SENDER_EMAIL || 'notifications@floework.internal'

export const sesClient = new SESClient({
  region,
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    sessionToken: process.env.AWS_SESSION_TOKEN
  } : undefined
})

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text: string
  from?: string
}

export interface WorkspaceInviteEmailOptions {
  to: string
  inviterName: string
  teamName: string
  inviteToken: string
  expiresAt?: string
  appUrl?: string
}

export interface SendEmailResult {
  messageId: string
  sent: boolean
  mocked: boolean
}

/**
 * Sends a transactional email via Amazon SES (or mock mode in local/test environments)
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const recipients = Array.isArray(options.to) ? options.to : [options.to]
  const from = options.from || defaultSender

  if (!isSesEnabled || process.env.NODE_ENV === 'test') {
    const mockId = `ses-mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    logger.info(`[SES Mock] Transactional email dispatched to ${recipients.join(', ')}`, {
      subject: options.subject,
      messageId: mockId
    })
    return {
      messageId: mockId,
      sent: true,
      mocked: true
    }
  }

  const command = new SendEmailCommand({
    Source: from,
    Destination: {
      ToAddresses: recipients
    },
    Message: {
      Subject: {
        Data: options.subject,
        Charset: 'UTF-8'
      },
      Body: {
        Html: {
          Data: options.html,
          Charset: 'UTF-8'
        },
        Text: {
          Data: options.text,
          Charset: 'UTF-8'
        }
      }
    }
  })

  const response = await sesClient.send(command)

  return {
    messageId: response.MessageId || 'unknown',
    sent: true,
    mocked: false
  }
}

/**
 * Formats and dispatches a branded team invitation email
 */
export async function sendWorkspaceInviteEmail(
  options: WorkspaceInviteEmailOptions
): Promise<SendEmailResult> {
  const baseUrl = options.appUrl || process.env.APP_URL || 'http://localhost:5173'
  const inviteLink = `${baseUrl.replace(/\/$/, '')}/invite?token=${encodeURIComponent(options.inviteToken)}`
  const subject = `You've been invited to join ${options.teamName} on Floework`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #09090b; color: #f4f4f5; margin: 0; padding: 40px 20px; }
    .card { max-width: 540px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
    .logo { font-size: 20px; font-weight: 700; color: #f4f4f5; margin-bottom: 24px; letter-spacing: -0.5px; }
    .logo span { color: #f59e0b; }
    h1 { font-size: 22px; font-weight: 600; margin: 0 0 16px; color: #fafafa; }
    p { font-size: 15px; line-height: 24px; color: #a1a1aa; margin: 0 0 24px; }
    .btn { display: inline-block; background-color: #f59e0b; color: #09090b; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 15px; }
    .footer { font-size: 12px; color: #71717a; margin-top: 32px; border-top: 1px solid #27272a; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">FLOE<span>WORK</span></div>
    <h1>Join ${options.teamName}</h1>
    <p><strong>${options.inviterName}</strong> has invited you to collaborate on the <strong>${options.teamName}</strong> workspace in Floework.</p>
    <p><a href="${inviteLink}" class="btn">Accept Invitation</a></p>
    <p style="font-size: 13px; color: #71717a;">Or paste this URL into your browser: <br><a href="${inviteLink}" style="color: #f59e0b;">${inviteLink}</a></p>
    <div class="footer">
      This invitation link will expire in 7 days. If you did not expect this email, you can safely ignore it.
    </div>
  </div>
</body>
</html>
`

  const text = `
Join ${options.teamName} on Floework

${options.inviterName} has invited you to collaborate on the ${options.teamName} workspace in Floework.

Accept your invitation here:
${inviteLink}

This invitation link expires in 7 days.
`

  return sendEmail({
    to: options.to,
    subject,
    html,
    text
  })
}
