import type { VercelRequest, VercelResponse } from '@vercel/node'
import { clientNetworkLatency, websocketReconnectsTotal } from './index'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const data = req.body

    if (data.event === 'websocket_reconnect') {
      websocketReconnectsTotal.inc()
      return res.status(200).json({ success: true })
    }

    // Process network telemetry metrics
    if (data.resourcesSampled > 0) {
      // Divide by 1000 since Prometheus client expects seconds
      if (data.rtt > 0) clientNetworkLatency.labels('rtt').observe(data.rtt / 1000)
      if (data.dnsLookupTime > 0) clientNetworkLatency.labels('dns').observe(data.dnsLookupTime / 1000)
      if (data.tlsHandshakeTime > 0) clientNetworkLatency.labels('tls').observe(data.tlsHandshakeTime / 1000)
      if (data.tcpConnectionTime > 0) clientNetworkLatency.labels('tcp').observe(data.tcpConnectionTime / 1000)
      if (data.apiLatency > 0) clientNetworkLatency.labels('api').observe(data.apiLatency / 1000)
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Failed to process diagnostics payload', error)
    return res.status(400).json({ error: 'Invalid payload' })
  }
}
