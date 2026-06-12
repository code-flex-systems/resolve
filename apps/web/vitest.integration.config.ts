import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		// setup-env must run first: it pins DB_* env vars to the local test
		// database at module scope, before any app module is imported
		setupFiles: ['./src/__tests__/integration/setup-env.ts', './src/__tests__/integration/setup.ts'],
		include: ['**/*.integration.test.ts'],
		testTimeout: 30000, // 30 seconds for database operations
		hookTimeout: 30000,
		pool: 'forks', // Use forks for better isolation
		poolOptions: {
			forks: {
				singleFork: true, // Run tests sequentially to avoid database conflicts
			},
		},
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
});
