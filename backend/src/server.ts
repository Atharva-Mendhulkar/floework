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
app.use(cors()); // Allow all origins in development to prevent localhost/127.0.0.1 mismatches
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

// Start the server using the HTTP instance instead of express app
server.listen(PORT, () => {
    console.log(`[floework backend] Server is running on port ${PORT}`);
});
