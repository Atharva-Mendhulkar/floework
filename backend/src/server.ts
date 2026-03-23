import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import http from 'http';
import { initSocket } from './services/socketService';
import { errorHandler } from './middleware/errorHandler';
import apiRoutes from './routes';

// Start BullMQ signal worker (gracefully handles missing Redis)
import './workers/signalWorker';
import { scheduleWeeklyFocusAuditor } from './workers/weeklyFocusAuditor';
import { schedulePRStatusChecker } from './workers/prStatusChecker';
import { scheduleGlobalGcalSync } from './workers/gcalSync';
import { scheduleNarrativeGenerator } from './workers/narrativeGenerator';
import { scheduleAIDisplacementRoller } from './workers/aiDisplacementRoller';
import './workers/prStatusChecker';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001; // Changed port to 5001

// Create standard HTTP server so we can attach WebSockets
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Rate Limiting (100 requests per 10 minutes per IP)
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100, // Limit each IP to 100 requests per `window`
    message: 'Too many requests from this IP, please try again in 10 minutes',
});

// Security and Logging Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(limiter); // Apply rate limiter to all requests
app.use(morgan('dev'));
app.use(express.json());

// API Routes
app.use('/api/v1', apiRoutes);

// Basic Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use(errorHandler);

// Export for testing
export { app, server };

// Start the server using the HTTP instance instead of express app
if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, async () => {
        console.log(`[floework backend] Server is running on port ${PORT}`);
        // Schedule automated background tasks
        await scheduleWeeklyFocusAuditor().catch(console.error);
        await schedulePRStatusChecker().catch(console.error);
        await scheduleGlobalGcalSync().catch(console.error);
        await scheduleNarrativeGenerator().catch(console.error);
        await scheduleAIDisplacementRoller().catch(console.error);
    });
}
