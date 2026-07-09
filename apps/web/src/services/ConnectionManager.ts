import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { networkDiagnostics } from './NetworkDiagnostics'

type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING'

export class ConnectionManager {
    private supabase: SupabaseClient
    private channel: RealtimeChannel | null = null
    private state: ConnectionState = 'DISCONNECTED'
    private reconnectAttempts = 0
    private maxReconnectAttempts = 5
    private baseDelay = 1000
    private heartbeatInterval: NodeJS.Timeout | null = null
    private channelName: string
    private messageQueue: any[] = []
    private messageSubject: (messages: any[]) => void
    private backpressureTimer: NodeJS.Timeout | null = null
    private backpressureWindow = 500 // Batch messages every 500ms

    constructor(supabase: SupabaseClient, channelName: string, onBatchReceived: (messages: any[]) => void) {
        this.supabase = supabase
        this.channelName = channelName
        this.messageSubject = onBatchReceived
        this.setupOfflineDetection()
    }

    public connect() {
        if (this.state === 'CONNECTED' || this.state === 'CONNECTING') return

        this.state = this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING'
        
        this.channel = this.supabase.channel(this.channelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
                this.handleIncomingMessage(payload)
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    this.state = 'CONNECTED'
                    this.reconnectAttempts = 0
                    this.startHeartbeat()
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    this.handleDisconnect()
                }
            })
    }

    private handleIncomingMessage(payload: any) {
        // Backpressure Implementation: Queue incoming messages instead of processing immediately
        this.messageQueue.push(payload)
        
        if (!this.backpressureTimer) {
            this.backpressureTimer = setTimeout(() => {
                this.flushQueue()
            }, this.backpressureWindow)
        }
    }

    private flushQueue() {
        if (this.messageQueue.length > 0) {
            const batch = [...this.messageQueue]
            this.messageQueue = []
            this.messageSubject(batch)
        }
        this.backpressureTimer = null
    }

    private handleDisconnect() {
        this.stopHeartbeat()
        if (this.channel) {
            this.channel.unsubscribe()
            this.channel = null
        }
        this.state = 'DISCONNECTED'
        this.attemptReconnect()
    }

    private attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('ConnectionManager: Max reconnect attempts reached')
            return
        }

        this.reconnectAttempts++
        networkDiagnostics.reportWebSocketReconnect()

        // Exponential backoff with jitter
        const delay = Math.min(this.baseDelay * Math.pow(2, this.reconnectAttempts - 1), 30000)
        const jitter = Math.random() * 1000
        
        setTimeout(() => {
            if (navigator.onLine) {
                this.connect()
            }
        }, delay + jitter)
    }

    private startHeartbeat() {
        this.stopHeartbeat()
        // Ping every 30 seconds
        this.heartbeatInterval = setInterval(async () => {
            if (this.state !== 'CONNECTED' || !this.channel) return
            
            const start = performance.now()
            try {
                const response = await this.channel.track({ ping: true })
                if (response === 'ok') {
                    const rtt = performance.now() - start
                    // Optionally report heartbeat latency to NetworkDiagnostics
                } else {
                    throw new Error('Heartbeat failed')
                }
            } catch (e) {
                this.handleDisconnect()
            }
        }, 30000)
    }

    private stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval)
            this.heartbeatInterval = null
        }
    }

    private setupOfflineDetection() {
        if (typeof window !== 'undefined') {
            window.addEventListener('offline', () => this.handleDisconnect())
            window.addEventListener('online', () => {
                this.reconnectAttempts = 0
                this.connect()
            })
        }
    }

    public disconnect() {
        this.maxReconnectAttempts = 0 // Prevent reconnecting
        this.handleDisconnect()
    }
}
