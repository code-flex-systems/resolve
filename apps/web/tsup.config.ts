import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/api/database/migrate-to-latest.ts', 'src/api/database/migrate-down.ts'],
	format: ['cjs'],
	platform: 'node',
	target: 'node20',
	outDir: 'dist-migrator',
	sourcemap: true,
	clean: true,
});
