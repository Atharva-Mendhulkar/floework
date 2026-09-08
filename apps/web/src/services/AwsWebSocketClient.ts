// apps/web/src/services/AwsWebSocketClient.ts
// ==============================================================================
// AWS Native WebSocket Client
// Native Amazon API Gateway WebSockets + Redis PubSub realtime client.
// Features 500ms backpressure batching, heartbeat ping/pong, and jittered reconnection.
// ==============================================================================

type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING'

export interface RealtimeMessage {
  action?: string
  type: string
  workspaceId?: string
  projectId?: string
  data: any
}

export class AwsWebSocketClient {
  private ws: WebSocket | null = null
  private status: ConnectionStatus = 'DISCONNECTED'
  private url: string
  private token: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private baseDelay = 1000
  private heartbeatTimer: NodeJS.Timeout | null = null
  private subscribers = new Map<string, Set<(data: any) => void>>()

  // 500ms Backpressure Batching Queue
  private messageQueue: any[] = []
  private batchTimer: NodeJS.Timeout | null = null
  private batchWindow = 500
  private onBatchReceived?: (batch: any[]) => void

  constructor(url: string, token: string, onBatchReceived?: (batch: any[]) => void) {
    this.url = url
    this.token = token
    this.onBatchReceived = onBatchReceived
  }

  public connect(): void {
    if (this.status === 'CONNECTED' || this.status === 'CONNECTING') return

    this.status = this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING'
    const fullUrl = `${this.url}?token=${encodeURIComponent(this.token)}`

    try {
      this.ws = new WebSocket(fullUrl)

      this.ws.onopen = () => {
        this.status = 'CONNECTED'
        this.reconnectAttempts = 0
        this.startHeartbeat()
      }

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          this.handleIncoming(payload)
        } catch (err) {
          console.warn('[AwsWebSocket] Non-JSON message received:', event.data)
        }
      }

      this.ws.onclose = () => {
        this.handleDisconnect()
      }

      this.ws.onerror = (err) => {
        console.warn('[AwsWebSocket] Socket error:', err)
      }
    } catch (err) {
      console.error('[AwsWebSocket] Connection failed:', err)
      this.handleDisconnect()
    }
  }

  public disconnect(): void {
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.status = 'DISCONNECTED'
  }

  public send(action: string, data: Record<string, any>): void {
    if (this.ws && this.status === 'CONNECTED') {
      this.ws.send(JSON.stringify({ action, ...data }))
    }
  }

  public trackPresence(workspaceId: string, status: 'in_focus' | 'available', taskId?: string): void {
    this.send('track_presence', {
      workspaceId,
      status,
      taskId,
      timestamp: new Date().toISOString()
    })
  }

  public subscribe(channel: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set())
    }
    this.subscribers.get(channel)!.add(callback)

    return () => {
      const set = this.subscribers.get(channel)
      if (set) {
        set.delete(callback)
        if (set.size === 0) this.subscribers.delete(channel)
      }
    }
  }

  private handleIncoming(payload: any): void {
    if (payload.action === 'pong') return // Heartbeat response

    // Notify channel subscribers
    if (payload.type && this.subscribers.has(payload.type)) {
      this.subscribers.get(payload.type)!.forEach((cb) => cb(payload.data))
    }

    // Backpressure queue for batch notifications
    this.messageQueue.push(payload)
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushBatch()
      }, this.batchWindow)
    }
  }

  private flushBatch(): void {
    if (this.messageQueue.length > 0 && this.onBatchReceived) {
      this.onBatchReceived([...this.messageQueue])
    }
    this.messageQueue = []
    this.batchTimer = null
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      this.send('ping', { timestamp: Date.now() })
    }, 30000)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private handleDisconnect(): void {
    this.stopHeartbeat()
    this.status = 'DISCONNECTED'

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      // Exponential backoff with jitter
      const delay = this.baseDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 500
      this.reconnectAttempts++
      setTimeout(() => this.connect(), delay)
    }
  }

  public getStatus(): ConnectionStatus {
    return this.status
  }
}
