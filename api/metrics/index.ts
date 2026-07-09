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
  
  res.status(405).json({ error: 'Method not allowed' })
}
