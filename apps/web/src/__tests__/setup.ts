import { beforeAll, afterAll, vi } from 'vitest';

// Mock environment variables
beforeAll(() => {
	process.env.DB_SCHEMA = 'test';
	process.env.DB_HOST = 'localhost';
	process.env.DB_PORT = '5432';
	process.env.DB_DATABASE = 'resolve_test';
	process.env.DB_USER = 'owen';
	process.env.DB_PASSWORD = 'password';
});

// Cleanup
afterAll(() => {
	vi.clearAllMocks();
});
