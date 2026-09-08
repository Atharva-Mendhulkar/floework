// api/billing/webhook.ts
// ==============================================================================
// Stripe Billing & Subscription Webhook Handler
// Manages subscription tier synchronizations, billing audits, and plan transitions
// backed by Amazon RDS PostgreSQL.
// ==============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { logger } from '../_lib/logger'
import { query } from '../_lib/db'

export interface StripeEvent {
  id: string
  type: string
  data: {
    object: Record<string, any>
  }
}

/**
 * Validates Stripe signature header using HMAC SHA-256
 */
export function verifyStripeSignature(
  rawPayload: string | Buffer,
  signatureHeader?: string,
  secret?: string
): boolean {
  if (!secret) {
    return true
  }

  if (!signatureHeader) {
    return false
  }

  try {
    const parts = signatureHeader.split(',').reduce((acc, curr) => {
      const [k, v] = curr.trim().split('=')
      if (k && v) acc[k] = v
      return acc
    }, {} as Record<string, string>)

    const timestamp = parts['t']
    const signature = parts['v1']

    if (!timestamp || !signature) return false

    const payloadStr = typeof rawPayload === 'string' ? rawPayload : rawPayload.toString('utf8')
    const signedPayload = `${timestamp}.${payloadStr}`

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch {
    return false
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const signatureHeader = req.headers['stripe-signature'] as string | undefined
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)

  if (webhookSecret && !verifyStripeSignature(rawBody, signatureHeader, webhookSecret)) {
    logger.warn('[Stripe Webhook] Invalid webhook signature rejected')
    return res.status(400).json({ error: 'Invalid webhook signature' })
  }

  const event: StripeEvent = typeof req.body === 'string' ? JSON.parse(req.body) : req.body

  if (!event || !event.type) {
    return res.status(400).json({ error: 'Malformed Stripe event' })
  }

  logger.info(`[Stripe Webhook] Processing event ${event.type} (${event.id})`)

  try {
    const obj = event.data?.object || {}

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const teamId = obj.metadata?.team_id
        const status = obj.status
        const planTier = obj.items?.data?.[0]?.price?.lookup_key || obj.metadata?.plan_tier || 'pro'

        if (teamId) {
          await query(
            `UPDATE teams
             SET subscription_status = $1,
                 subscription_tier = $2,
                 updated_at = NOW()
             WHERE id = $3`,
            [status, planTier, teamId]
          )
        }
        break
      }

      case 'customer.subscription.deleted': {
        const teamId = obj.metadata?.team_id
        if (teamId) {
          await query(
            `UPDATE teams
             SET subscription_status = 'canceled',
                 subscription_tier = 'free',
                 updated_at = NOW()
             WHERE id = $1`,
            [teamId]
          )
        }
        break
      }

      case 'invoice.payment_failed': {
        const customerId = obj.customer
        logger.warn(`[Stripe Webhook] Payment failed for customer ${customerId}`)
        break
      }
    }

    return res.status(200).json({ received: true, eventId: event.id })
  } catch (err: any) {
    logger.error(`[Stripe Webhook] Error processing event: ${err.message}`, err)
    return res.status(500).json({ error: 'Internal processing error' })
  }
}
