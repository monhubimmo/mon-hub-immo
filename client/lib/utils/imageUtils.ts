import { CDN_URL, CDN_FALLBACK_URL, S3_URL } from '@/lib/constants/global';

interface ImageData {
	url?: string;
	key?: string;
	// Legacy support
	original?: string;
	large?: string;
	medium?: string;
	thumbnail?: string;
}

// Simple gray placeholder as data URL
const PLACEHOLDER_IMAGE =
	'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vbiBkaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg==';

/**
 * Convert S3 URL to CDN URL
 * Transforms direct S3 URLs to use CDN for better performance
 */
export const toCdnUrl = (url: string): string => {
	if (!url || url.startsWith('data:')) return url;

	// Already a CDN URL
	if (url.startsWith(CDN_URL) || url.startsWith(CDN_FALLBACK_URL)) {
		return url;
	}

	// Convert S3 URL to CDN URL
	if (
		url.includes('s3.amazonaws.com') ||
		url.includes('s3.eu-west-3.amazonaws.com')
	) {
		// Extract the key from S3 URL (everything after the bucket name)
		const s3Patterns = [
			/https:\/\/[^/]+\.s3\.amazonaws\.com\/(.*)/,
			/https:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com\/(.*)/,
		];

		for (const pattern of s3Patterns) {
			const match = url.match(pattern);
			if (match?.[1]) {
				return `${CDN_URL}/${match[1]}`;
			}
		}
	}

	return url;
};

/**
 * Get fallback CDN URL if primary CDN fails
 */
export const getFallbackCdnUrl = (url: string): string => {
	if (url.startsWith(CDN_URL)) {
		return url.replace(CDN_URL, CDN_FALLBACK_URL);
	}
	return url;
};

export const getImageUrl = (
	imageData: ImageData | string | undefined,
	size: 'original' | 'large' | 'medium' | 'thumbnail' = 'large',
	fallback = PLACEHOLDER_IMAGE,
): string => {
	let url: string;

	// Handle legacy string URLs
	if (typeof imageData === 'string') {
		url = imageData || fallback;
	} else if (imageData && typeof imageData === 'object') {
		// Handle new S3 image structure
		// New format: single optimized image
		if (imageData.url) {
			url = imageData.url;
		} else {
			// Legacy format: multiple sizes
			url =
				imageData[size] ||
				imageData.large ||
				imageData.original ||
				fallback;
		}
	} else {
		url = fallback;
	}

	// Convert to CDN URL
	return toCdnUrl(url);
};

export const getGalleryImages = (
	galleryImages: (ImageData | string)[] = [],
	size: 'original' | 'large' | 'medium' | 'thumbnail' = 'large',
): string[] => {
	return galleryImages.map((img) => getImageUrl(img, size));
};
