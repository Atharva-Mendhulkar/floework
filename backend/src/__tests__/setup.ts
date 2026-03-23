import { vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.ENCRYPTION_KEY = '0000000000000000000000000000000000000000000000000000000000000000';

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
