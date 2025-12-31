import validator from 'validator';
import sanitizeHtml from 'sanitize-html';

/**
 * Unified Sanitization Utilities
 * Protects against XSS attacks and NoSQL injection
 */

// ==================== XSS Prevention ====================

/**
 * Sanitize a single string input
 * Removes leading/trailing whitespace and escapes HTML entities
 */
export const sanitizeString = (input: string | undefined | null): string => {
	if (!input || typeof input !== 'string') return '';
	return validator.escape(validator.trim(input));
};

/**
 * Sanitize a city/location name
 * Trims whitespace but does NOT escape HTML entities to preserve apostrophes
 * Only allows letters, accented characters, spaces, apostrophes, and hyphens
 */
export const sanitizeCityName = (input: string | undefined | null): string => {
	if (!input || typeof input !== 'string') return '';
	const trimmed = input.trim();
	// Remove any characters that aren't allowed in city names
	// This is a whitelist approach - only keep valid characters
	return trimmed.replace(
		/[^a-zA-Z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\u0100-\u017F\s'''`-]/g,
		'',
	);
};

/**
 * Sanitize HTML content (for rich text fields)
 * Allows safe HTML tags while removing dangerous elements
 */
export const sanitizeHtmlContent = (
	input: string | undefined | null,
): string => {
	if (!input || typeof input !== 'string') return '';

	return sanitizeHtml(input.trim(), {
		allowedTags: [
			'b',
			'i',
			'u',
			'strong',
			'em',
			'br',
			'p',
			'ul',
			'ol',
			'li',
			'font',
			// Allow links
			'a',
		],
		allowedAttributes: {
			font: ['size', 'color'],
			a: ['href', 'target', 'rel', 'title'],
		},
		allowedStyles: {
			'*': {
				color: [/^#[0-9a-fA-F]{6}$/],
				'font-size': [/^\d+(?:px|em|%)$/],
			},
		},
		// Restrict link protocols to safe schemes
		allowedSchemes: ['http', 'https', 'mailto', 'tel'],
		// Ensure rel is safe when target=_blank
		transformTags: {
			a: (tagName: string, attribs: Record<string, string>) => {
				const attrs = { ...attribs };
				if (attrs.target === '_blank') {
					// Preserve existing rel but ensure noopener noreferrer
					const rel = (attrs.rel || '').split(/\s+/).filter(Boolean);
					if (!rel.includes('noopener')) rel.push('noopener');
					if (!rel.includes('noreferrer')) rel.push('noreferrer');
					attrs.rel = rel.join(' ').trim();
				}
				return { tagName, attribs: attrs };
			},
		},
	});
};

/**
 * Sanitize an email address
 * Normalizes and validates email format
 */
export const sanitizeEmail = (email: string | undefined | null): string => {
	if (!email || typeof email !== 'string') return '';
	return validator.trim(email.toLowerCase());
};

/**
 * Sanitize a phone number
 * Removes all non-numeric characters except + at the start
 */
export const sanitizePhone = (
	phone: string | undefined | null,
): string | undefined => {
	if (!phone || typeof phone !== 'string') return undefined;
	const trimmed = validator.trim(phone);
	// Keep only digits and + at start
	return trimmed.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
};

/**
 * Sanitize an object with multiple string fields
 * Recursively sanitizes all string values
 */
export const sanitizeObject = <T extends Record<string, unknown>>(
	obj: T,
): T => {
	const sanitized: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(obj)) {
		if (typeof value === 'string') {
			sanitized[key] = sanitizeString(value);
		} else if (
			value &&
			typeof value === 'object' &&
			!Array.isArray(value)
		) {
			sanitized[key] = sanitizeObject(value as Record<string, unknown>);
		} else if (Array.isArray(value)) {
			sanitized[key] = value.map((item) =>
				typeof item === 'string'
					? sanitizeString(item)
					: typeof item === 'object' && item !== null
						? sanitizeObject(item as Record<string, unknown>)
						: item,
			);
		} else {
			sanitized[key] = value;
		}
	}

	return sanitized as T;
};

/**
 * Sanitize user input data for signup/profile updates
 */
export const sanitizeUserInput = (data: {
	firstName?: string;
	lastName?: string;
	email?: string;
	phone?: string;
	[key: string]: unknown;
}) => {
	return {
		...data,
		firstName: data.firstName ? sanitizeString(data.firstName) : undefined,
		lastName: data.lastName ? sanitizeString(data.lastName) : undefined,
		email: data.email ? sanitizeEmail(data.email) : undefined,
		phone: data.phone ? sanitizePhone(data.phone) : undefined,
	};
};

// ==================== NoSQL Injection Prevention ====================

/**
 * Sanitize user input to prevent NoSQL injection
 * Removes MongoDB operators like $gt, $ne, etc.
 */
export const sanitizeInput = (input: unknown): unknown => {
	if (input === null || input === undefined) {
		return input;
	}

	// Handle arrays
	if (Array.isArray(input)) {
		return input.map((item) => sanitizeInput(item));
	}

	// Handle objects
	if (typeof input === 'object') {
		const sanitized: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(input)) {
			// Remove keys starting with $ (MongoDB operators)
			if (
				!key.startsWith('$') &&
				key !== '__proto__' &&
				key !== 'constructor'
			) {
				sanitized[key] = sanitizeInput(value);
			}
		}
		return sanitized;
	}

	// Primitives are safe
	return input;
};

/**
 * Escape special regex characters to prevent ReDoS attacks
 */
export const escapeRegex = (str: string): string => {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Sanitize MongoDB query filters
 * Use this before passing user input to MongoDB queries
 */
export const sanitizeMongoQuery = (
	query: Record<string, unknown>,
): Record<string, unknown> => {
	return sanitizeInput(query) as Record<string, unknown>;
};

/**
 * Create safe regex for search queries
 */
export const createSafeRegex = (searchTerm: string): RegExp => {
	const escaped = escapeRegex(searchTerm);
	return new RegExp(escaped, 'i');
};

/**
 * Validate and sanitize MongoDB ObjectId
 */
export const isValidObjectId = (id: string): boolean => {
	return /^[a-f\d]{24}$/i.test(id);
};

// ==================== HTML -> Plain Text Helpers ====================

/**
 * Decode common HTML entities and numeric entities to unicode
 */
const decodeHtmlEntities = (input: string): string => {
	return input
		.replace(/&#(\d+);/g, (_, dec) => {
			const code = parseInt(dec, 10);
			return Number.isFinite(code) ? String.fromCodePoint(code) : _;
		})
		.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
			const code = parseInt(hex, 16);
			return Number.isFinite(code) ? String.fromCodePoint(code) : _;
		})
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'");
};

/**
 * Convert HTML string to normalized plain text suitable for length checks
 * - Strips tags
 * - Decodes entities
 * - Removes zero-width characters
 * - Collapses whitespace
 */
export const htmlToPlainText = (html: string | undefined | null): string => {
	if (!html || typeof html !== 'string') return '';
	// Strip all tags using sanitize-html with no allowed tags
	const stripped = sanitizeHtml(html, {
		allowedTags: [],
		allowedAttributes: {},
	});
	const decoded = decodeHtmlEntities(stripped);
	return decoded
		.replace(/[\u200B-\u200D\uFEFF]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
};

/**
 * Get the length of visible text from an HTML string
 */
export const htmlTextLength = (html: string | undefined | null): number => {
	return htmlToPlainText(html).length;
};
