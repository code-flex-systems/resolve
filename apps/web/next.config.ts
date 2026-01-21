import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
	output: 'standalone',
	reactStrictMode: true,
	webpack: (config) => {
		config.resolve.alias['@'] = path.resolve(__dirname, 'src');
		return config;
	},
	eslint: {
		// Uncomment for building without eslint
		ignoreDuringBuilds: true,
	},
	typescript: {
		// Uncomment to ignore ts errors during build
		ignoreBuildErrors: true,
	},
};

export default nextConfig;
