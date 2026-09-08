import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client'

// Create a Registry which registers the metrics
const register = new Registry()

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'floework-api'
})

// Enable the collection of default metrics
collectDefaultMetrics({ register })

// Custom metrics
export const occCollisionsTotal = new Counter({
  name: 'occ_collisions_total',
  help: 'Total number of Optimistic Concurrency Control collisions',
  registers: [register]
})

export const circuitBreakerTripsTotal = new Counter({
  name: 'circuit_breaker_trips_total',
  help: 'Total number of times a circuit breaker has tripped',
  labelNames: ['service'],
  registers: [register]
})

export const websocketReconnectsTotal = new Counter({
  name: 'websocket_reconnects_total',
  help: 'Total number of websocket reconnect events reported by clients',
  registers: [register]
})

export const clientNetworkLatency = new Histogram({
  name: 'client_network_latency_seconds',
  help: 'Network latency metrics reported by the client (e.g. RTT, DNS, TLS)',
  labelNames: ['metric_type'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10], // buckets in seconds
  registers: [register]
})

// Handler for the /api/metrics endpoint
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    res.setHeader('Content-Type', register.contentType)
    const metrics = await register.metrics()
    return res.status(200).send(metrics)
  }
  
  if (req.method === 'POST') {
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

  res.status(405).json({ error: 'Method not allowed' })
}
