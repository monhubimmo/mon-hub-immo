import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			// Primary CDN
			{
				protocol: 'https',
				hostname: 'cdn.monhubimmo.fr',
				port: '',
				pathname: '/**',
			},
			// Fallback CDN (CloudFront)
			{
				protocol: 'https',
				hostname: 'd2of14y3b5uig5.cloudfront.net',
				port: '',
				pathname: '/**',
			},
			// S3 direct (legacy/fallback)
			{
				protocol: 'https',
				hostname: 'monhubimmo.s3.amazonaws.com',
				port: '',
				pathname: '/**',
			},
			{
				protocol: 'https',
				hostname: 'mon-hub-immo.s3.eu-west-3.amazonaws.com',
				port: '',
				pathname: '/**',
			},
		],
	},
};

export default nextConfig;
