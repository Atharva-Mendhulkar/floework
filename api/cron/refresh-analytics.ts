// api/cron/refresh-analytics.ts
// ==============================================================================
// Scheduled Analytics Cron Job
// Refreshes materialized views in Amazon RDS PostgreSQL.
// ==============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { query } from '../_lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Protect from non-cron callers
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_focus_stability')
  } catch (err: any) {
    // If view not found or not supporting concurrent refresh, try normal refresh
    try {
      await query('REFRESH MATERIALIZED VIEW mv_focus_stability')
    } catch {
      // Graceful fallback if view has not yet been defined
    }
  }

  return res.status(200).json({ ok: true, refreshed_at: new Date().toISOString() })
}
