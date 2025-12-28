/**
 * Global Application Constants
 * App-wide shared values used across multiple features
 */

// ============================================================================
// CDN CONFIGURATION
// ============================================================================

export const CDN_URL = 'https://cdn.monhubimmo.fr' as const;
export const CDN_FALLBACK_URL =
	'https://d2of14y3b5uig5.cloudfront.net' as const;
export const S3_URL = 'https://monhubimmo.s3.amazonaws.com' as const;

// ============================================================================
// APP METADATA
// ============================================================================

export const APP_NAME = 'MonHubImmo' as const;
export const APP_TAGLINE =
	'Votre plateforme de collaboration immobilière' as const;
export const APP_VERSION = '1.0.0' as const;

// ============================================================================
// BRAND COLORS
// ============================================================================

export const BRAND_COLORS = {
	primary: '#6AD1E3',
	primaryHover: '#59c4d8',
	secondary: '#1F2937',
	accent: '#10B981',
	danger: '#EF4444',
	warning: '#F59E0B',
	info: '#3B82F6',
} as const;

// ============================================================================
// USER TYPES
// ============================================================================

export const USER_TYPES = {
	AGENT: 'agent',
	APPORTEUR: 'apporteur',
} as const;

export const USER_TYPE_LABELS = {
	[USER_TYPES.AGENT]: 'Agent Immobilier',
	[USER_TYPES.APPORTEUR]: "Apporteur d'Affaires",
} as const;

// ============================================================================
// DATE & TIME FORMATS
// ============================================================================

export const DATE_FORMATS = {
	SHORT: 'DD/MM/YYYY',
	LONG: 'DD MMMM YYYY',
	WITH_TIME: 'DD/MM/YYYY HH:mm',
	TIME_ONLY: 'HH:mm',
} as const;

// ============================================================================
// CURRENCY & NUMBER FORMATS
// ============================================================================

export const CURRENCY = {
	symbol: '€',
	code: 'EUR',
	locale: 'fr-FR',
} as const;

export const NUMBER_FORMATS = {
	locale: 'fr-FR',
	decimalSeparator: ',',
	thousandSeparator: ' ',
} as const;

// ============================================================================
// PAGINATION
// ============================================================================

export const PAGINATION_DEFAULTS = {
	itemsPerPage: 20,
	maxItemsPerPage: 100,
	showEllipsis: true,
	maxVisiblePages: 5,
} as const;

// ============================================================================
// FILE UPLOAD
// ============================================================================

export const FILE_UPLOAD = {
	maxSizeBytes: 10 * 1024 * 1024, // 10MB
	maxSizeMB: 10,
	allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
	allowedDocTypes: ['application/pdf', 'application/msword'],
	maxImagesPerUpload: 10,
} as const;

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const VALIDATION = {
	email: {
		pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
		maxLength: 255,
	},
	password: {
		minLength: 8,
		maxLength: 128,
		requireUppercase: true,
		requireLowercase: true,
		requireNumber: true,
		requireSpecialChar: false,
	},
	phone: {
		pattern: /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/,
		minLength: 10,
		maxLength: 15,
	},
	postalCode: {
		pattern: /^\d{5}$/,
		length: 5,
	},
} as const;

// ============================================================================
// GEOLOCATION
// ============================================================================

export const GEOLOCATION = {
	defaultRadius: 25, // km
	minRadius: 5,
	maxRadius: 100,
	defaultCenter: {
		lat: 48.8566, // Paris
		lng: 2.3522,
	},
} as const;

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================

export const TOAST_CONFIG = {
	position: 'top-right',
	autoClose: 3000,
	hideProgressBar: false,
	closeOnClick: true,
	pauseOnHover: true,
	draggable: true,
} as const;

// ============================================================================
// GENERAL MESSAGES
// ============================================================================

export const GENERAL_MESSAGES = {
	LOADING: 'Chargement...',
	SAVING: 'Enregistrement...',
	SAVED: 'Enregistré avec succès',
	ERROR: 'Une erreur est survenue',
	NO_DATA: 'Aucune donnée disponible',
	CONFIRM_DELETE: 'Êtes-vous sûr de vouloir supprimer ?',
	UNSAVED_CHANGES: 'Vous avez des modifications non enregistrées',
} as const;

// ============================================================================
// ROUTES
// ============================================================================

export const PUBLIC_ROUTES = [
	'/',
	'/auth/login',
	'/auth/signup',
	'/auth/forgot-password',
	'/auth/reset-password',
	'/auth/verify-email',
	'/monagentimmo',
] as const;

export const PROTECTED_ROUTES = [
	'/dashboard',
	'/chat',
	'/collaboration',
	'/search-ads/create',
	'/appointments',
] as const;
