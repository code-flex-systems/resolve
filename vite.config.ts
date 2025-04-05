import { defineConfig } from 'vite';

export default defineConfig({
	root: 'ui',
	plugins: [],
	server: {
		port: 3000,
	},
	build: {
		outDir: 'dist',
	},
});
