import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { redis } from '../utils/redis';
import prisma from '../utils/prisma';

let io: SocketIOServer;

export const initSocket = (server: Server) => {
    io = new SocketIOServer(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:8080',
            methods: ["GET", "POST", "PATCH", "DELETE"]
        },
        transports: ['websocket', 'polling']
    });

    // JWT Authentication Middleware for WebSockets
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication Error: Token missing'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };

            // Optionally verify user exists in DB
            const user = await prisma.user.findUnique({ where: { id: decoded.id } });
            if (!user) {
                return next(new Error('Authentication Error: User not found'));
            }

            // Attach user info to socket
            (socket as any).user = user;
            next();
        } catch (error) {
            next(new Error('Authentication Error: Invalid token'));
        }
    });

    io.on('connection', (socket: Socket) => {
        const userId = (socket as any).user.id;
        console.log(`🔌 User connected to WebSocket: ${userId} (Socket ID: ${socket.id})`);

        // Track online presence in Redis (e.g., 'user:online:123' -> 'socket123')
        redis.set(`user:online:${userId}`, socket.id, 'EX', 3600); // Expire in 1 hr for safety

        // --- Channel/Room Subscription ---
        socket.on('join_project', (projectId: string) => {
            socket.join(`project:${projectId}`);
            console.log(`User ${userId} joined room project:${projectId}`);
        });

        socket.on('leave_project', (projectId: string) => {
            socket.leave(`project:${projectId}`);
            console.log(`User ${userId} left room project:${projectId}`);
        });

        // --- Real-time Activity Broadcasts ---
        socket.on('task_moved', (data: { taskId: string, projectId: string, phase: string }) => {
            // Broadcast to everyone else in this project room that a task moved
            socket.to(`project:${data.projectId}`).emit('task_updated', data);
        });

        // --- Conflict Resolution (Task Locking) ---
        // User declares intention to edit/drag a task
        socket.on('lock_task', async (data: { taskId: string, projectId: string }) => {
            // Use Redis NX to only set if key doesn't exist (atomic lock)
            // Lock expires automatically after 30 seconds for safety if client disconnects badly
            const acquired = await redis.set(`task:lock:${data.taskId}`, userId, 'EX', 30, 'NX');

            if (acquired) {
                // Lock successful, tell the rest of the room that THIS user is editing it
                socket.to(`project:${data.projectId}`).emit('task_locked', {
                    taskId: data.taskId,
                    lockedBy: userId
                });
                // Confirm back to the eager sender that they have permission
                socket.emit('lock_acquired', { taskId: data.taskId });
            } else {
                // Failed to acquire, tell sender
                socket.emit('lock_denied', { taskId: data.taskId });
            }
        });

        // User finishes editing/dragging
        socket.on('unlock_task', async (data: { taskId: string, projectId: string }) => {
            const currentLock = await redis.get(`task:lock:${data.taskId}`);

            // Only the lock owner can release it
            if (currentLock === userId) {
                await redis.del(`task:lock:${data.taskId}`);
                socket.to(`project:${data.projectId}`).emit('task_unlocked', { taskId: data.taskId });
            }
        });

        socket.on('disconnect', () => {
            console.log(`❌ User disconnected: ${userId}`);
            redis.del(`user:online:${userId}`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};
