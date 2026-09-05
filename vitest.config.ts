import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/api/**/*.test.ts'],
    globals: true,
  },
});
