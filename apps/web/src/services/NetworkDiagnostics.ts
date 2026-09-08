class NetworkDiagnostics {
    private static instance: NetworkDiagnostics;
    private timer: NodeJS.Timeout | null = null;

    private constructor() {
        this.startTelemetryLoop();
    }

    public static getInstance(): NetworkDiagnostics {
        if (!NetworkDiagnostics.instance) {
            NetworkDiagnostics.instance = new NetworkDiagnostics();
        }
        return NetworkDiagnostics.instance;
    }

    private startTelemetryLoop() {
        // Collect and send telemetry every 30 seconds
        if (typeof window !== 'undefined') {
            this.timer = setInterval(() => this.collectAndSend(), 30000);
        }
    }

    public stopTelemetryLoop() {
        if (this.timer) clearInterval(this.timer);
    }

    private async collectAndSend() {
        try {
            const telemetry = this.gatherPerformanceMetrics();
            
            // We'll POST to a new backend endpoint
            await fetch('/api/metrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(telemetry)
            });
        } catch (e) {
            console.error('Failed to send network diagnostics', e);
        }
    }

    private gatherPerformanceMetrics() {
        const metrics = {
            rtt: 0,
            dnsLookupTime: 0,
            tlsHandshakeTime: 0,
            tcpConnectionTime: 0,
            apiLatency: 0,
            resourcesSampled: 0,
        };

        if (typeof window === 'undefined' || !window.performance) return metrics;

        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        // Filter to our API endpoints to get relevant network metrics
        const apiResources = resources.filter(r => r.name.includes('/api/'));

        if (apiResources.length === 0) return metrics;

        let totalRtt = 0;
        let totalDns = 0;
        let totalTls = 0;
        let totalTcp = 0;
        let totalLatency = 0;

        apiResources.forEach(r => {
            // RTT approximation (fetch duration)
            totalRtt += (r.responseEnd - r.startTime);
            // DNS lookup
            totalDns += (r.domainLookupEnd - r.domainLookupStart);
            // TCP Connection
            totalTcp += (r.connectEnd - r.connectStart);
            // TLS Handshake (if applicable, connectEnd - secureConnectionStart)
            if (r.secureConnectionStart > 0) {
                totalTls += (r.connectEnd - r.secureConnectionStart);
            }
            // Backend Latency (Time to First Byte)
            totalLatency += (r.responseStart - r.requestStart);
        });

        const count = apiResources.length;
        metrics.resourcesSampled = count;
        metrics.rtt = Number((totalRtt / count).toFixed(2));
        metrics.dnsLookupTime = Number((totalDns / count).toFixed(2));
        metrics.tlsHandshakeTime = Number((totalTls / count).toFixed(2));
        metrics.tcpConnectionTime = Number((totalTcp / count).toFixed(2));
        metrics.apiLatency = Number((totalLatency / count).toFixed(2));

        // Clear the resource timings buffer to avoid processing the same requests again
        performance.clearResourceTimings();

        return metrics;
    }

    // This can be called from ConnectionManager to report reconnects
    public reportWebSocketReconnect() {
        fetch('/api/metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'websocket_reconnect' })
        }).catch(() => {});
    }
}

export const networkDiagnostics = NetworkDiagnostics.getInstance();
