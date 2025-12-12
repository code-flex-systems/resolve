import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		setupFiles: ['./src/__tests__/integration/setup.ts'],
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
