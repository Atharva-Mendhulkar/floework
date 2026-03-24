import { vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.ENCRYPTION_KEY = '0000000000000000000000000000000000000000000000000000000000000000';
process.env.FRONTEND_URL = 'http://localhost:5173';

// Mock BullMQ queue to avoid connecting to real Redis
vi.mock('bullmq', () => {
    return {
        Queue: class {
            add = vi.fn();
            on = vi.fn();
        },
        Worker: class {
            on = vi.fn();
        },
    };
});

// Mock Redis client
vi.mock('ioredis', () => {
    return {
        default: class {
            on = vi.fn();
            get = vi.fn();
            set = vi.fn();
            del = vi.fn();
        },
    };
});

// Mock Socket.io to prevent WebSocket server from starting during tests
vi.mock('socket.io', () => ({
    Server: class {
        on = vi.fn();
        use = vi.fn();
        to = vi.fn(function() { return { emit: vi.fn() }; });
        emit = vi.fn();
    },
}));

// Mock socketService globally so initSocket doesn't require a real HTTP server
vi.mock('../services/socketService', () => ({
    initSocket: vi.fn(),
    getIO: vi.fn(() => ({ to: vi.fn(() => ({ emit: vi.fn() })), use: vi.fn(), on: vi.fn() })),
}));
