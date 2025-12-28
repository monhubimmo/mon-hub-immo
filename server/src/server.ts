import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import stripeWebhookHandler from './routes/stripeWebhook';
import authRoutes from './routes/auth';
import messageRoutes from './routes/chat';
import propertyRoutes from './routes/property';
import collaborationRoutes from './routes/collaboration';
import contractRoutes from './routes/contract';
import searchAdRoutes from './routes/searchAds';
import uploadRoutes from './routes/uploadRoutes';
import notificationRoutes from './routes/notifications';
import favoritesRoutes from './routes/favorites';
import appointmentRoutes from './routes/appointments';
import { createSocketServer, createSocketService } from './chat';
import { requestLogger } from './middleware/requestLogger';
import { logger } from './utils/logger';
import {
	csrfProtection,
	generateCsrfToken,
	ensureCsrfSession,
	csrfErrorHandler,
	clearStaleCsrfCookies,
} from './middleware/csrf';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiter';
import adminRouter from './routes/admin';
import adminChatRoutes from './routes/adminChat';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const server = createServer(app);

// Create Socket.IO server
const io = createSocketServer(server);

// Initialize socket service using functional factory
const socketService = createSocketService(io);

// Helper to parse comma-separated FRONTEND_URL env into a clean string[]
const parseEnvOrigins = (csv?: string): string[] =>
	(csv || '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
		.map((s) => (s.endsWith('/') ? s.slice(0, -1) : s));

const FRONTEND_ORIGINS = parseEnvOrigins(process.env.FRONTEND_URL);

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Trust proxy - required for apps behind reverse proxies (Render, Heroku, etc.)
// This allows Express to correctly read X-Forwarded-* headers for rate limiting and IP detection
app.set('trust proxy', 1);

app.use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				scriptSrc: ["'self'", "'unsafe-inline'"],
				styleSrc: [
					"'self'",
					"'unsafe-inline'",
					'https://fonts.googleapis.com',
				],
				fontSrc: ["'self'", 'https://fonts.gstatic.com'],
				imgSrc: [
					"'self'",
					'data:',
					'blob:',
					'https://cdn.monhubimmo.fr',
					'https://d2of14y3b5uig5.cloudfront.net',
					'https://*.amazonaws.com',
					'https://mon-hub-immo.s3.eu-west-3.amazonaws.com',
				],
				connectSrc: [
					"'self'",
					// Allow localhost during development
					process.env.NODE_ENV === 'development'
						? 'http://localhost:3000'
						: null,
					process.env.NODE_ENV === 'development'
						? 'http://localhost:4000'
						: null,
					process.env.NODE_ENV === 'development'
						? 'ws://localhost:4000'
						: null,
					// Known frontends
					'https://monhubimmo.fr',
					'https://www.monhubimmo.fr',
					'https://mon-hub-immo.vercel.app',
					...FRONTEND_ORIGINS,
				].filter((src): src is string => Boolean(src)),
				mediaSrc: ["'self'", 'https://*.amazonaws.com'],
				objectSrc: ["'none'"],
				frameSrc: ["'none'"],
				baseUri: ["'self'"],
				formAction: ["'self'"],
			},
		},
		hsts: {
			maxAge: 31536000, // 1 year
			includeSubDomains: true,
			preload: true,
		},
		frameguard: { action: 'deny' },
		noSniff: true,
		xssFilter: true,
		referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
		// Additional security headers
		permittedCrossDomainPolicies: { permittedPolicies: 'none' },
		dnsPrefetchControl: { allow: false },
	}),
);

// Additional security headers not covered by Helmet
app.use((req, res, next) => {
	// Permissions-Policy: Control browser features
	res.setHeader(
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=(self), payment=(), usb=(), interest-cohort=()',
	);

	// Expect-CT: Certificate Transparency enforcement
	if (process.env.NODE_ENV === 'production') {
		res.setHeader('Expect-CT', 'max-age=86400, enforce');
	}

	// X-Permitted-Cross-Domain-Policies: Restrict cross-domain policy files
	res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

	next();
});
// Handle Private Network Access preflight required by newer browsers (Access-Control-Request-Private-Network)
// Must run before CORS middleware so the header is present on preflight responses.
app.use((req, res, next) => {
	// If the browser asks to access a private network resource, we must explicitly allow it.
	// The preflight will include the header 'Access-Control-Request-Private-Network: true'.
	if (
		req.method === 'OPTIONS' &&
		req.headers['access-control-request-private-network']
	) {
		// Respond with the required header to allow the request from secure contexts to private addresses
		res.setHeader('Access-Control-Allow-Private-Network', 'true');
	}
	next();
});

app.use(
	cors({
		origin: [
			'http://localhost:3000',
			'http://localhost:3001',
			'https://monhubimmo.fr',
			'https://www.monhubimmo.fr',
			'https://mon-hub-immo.vercel.app',
			...FRONTEND_ORIGINS,
		],
		credentials: true,
		// Let the client request include the Private-Network preflight header
		allowedHeaders: [
			'Content-Type',
			'Authorization',
			'X-Requested-With',
			'X-CSRF-Token',
			'Access-Control-Request-Private-Network',
		],
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
	}),
);
// Stripe webhook must receive raw body for signature verification
app.post(
	'/api/webhook/stripe',
	express.raw({ type: 'application/json' }),
	stripeWebhookHandler as express.RequestHandler,
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
	app.use((req, res, next) => {
		if (req.header('x-forwarded-proto') !== 'https') {
			res.redirect(301, `https://${req.header('host')}${req.url}`);
		} else {
			next();
		}
	});
}

// Request logging middleware (only in development or with explicit flag)
if (
	process.env.NODE_ENV !== 'production' ||
	process.env.ENABLE_REQUEST_LOGGING === 'true'
) {
	app.use(requestLogger);
}

// Apply global rate limiting to all API routes
app.use('/api', generalLimiter);

// ============================================================================
// ROUTES
// ============================================================================

// Health check route
app.get('/api/health', (req, res) => {
	res.json({
		status: 'OK',
		message: 'HubImmo API is running',
		timestamp: new Date().toISOString(),
		socketIO: 'Connected',
		onlineUsers: socketService.getOnlineUsers().length,
	});
});

// CSRF token endpoint (must be before protected routes)
// Note: clearStaleCsrfCookies and ensureCsrfSession must run before generateCsrfToken
app.get(
	'/api/csrf-token',
	clearStaleCsrfCookies,
	ensureCsrfSession,
	generateCsrfToken,
);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/message', messageRoutes);
app.use(
	'/api/property',
	clearStaleCsrfCookies,
	ensureCsrfSession,
	csrfProtection,
	propertyRoutes,
);
app.use(
	'/api/collaboration',
	clearStaleCsrfCookies,
	ensureCsrfSession,
	csrfProtection,
	collaborationRoutes,
);
app.use(
	'/api/contract',
	clearStaleCsrfCookies,
	ensureCsrfSession,
	csrfProtection,
	contractRoutes,
);
app.use(
	'/api/search-ads',
	clearStaleCsrfCookies,
	ensureCsrfSession,
	csrfProtection,
	searchAdRoutes,
);
app.use(
	'/api/upload',
	clearStaleCsrfCookies,
	ensureCsrfSession,
	csrfProtection,
	uploadRoutes,
);
app.use('/api/notifications', notificationRoutes);
app.use(
	'/api/favorites',
	clearStaleCsrfCookies,
	ensureCsrfSession,
	csrfProtection,
	favoritesRoutes,
);
app.use(
	'/api/appointments',
	clearStaleCsrfCookies,
	ensureCsrfSession,
	csrfProtection,
	appointmentRoutes,
);
app.use('/api/admin', adminRouter);
app.use('/api/admin/chat', adminChatRoutes);
// Mount payment routes (requires authentication inside route)
import paymentRoutes from './routes/payment';
app.use('/api/payment', paymentRoutes);

// CSRF error handler (must be after routes that use CSRF)
app.use(csrfErrorHandler);

// Global error handler (catches Multer, S3, and other unhandled errors)
app.use(errorHandler);

// Handle 404 routes
app.use('*', (req, res) => {
	res.status(404).json({
		success: false,
		message: "Cette route n'existe pas",
	});
});

// ============================================================================
// SOCKET INTEGRATION
// ============================================================================

// Make socket service available to message controller for real-time updates
// This allows the controller to emit socket events after database operations
export const getSocketService = () => socketService;

// ============================================================================
// SERVER STARTUP
// ============================================================================

const startServer = async () => {
	try {
		await connectDB();
		server.listen(PORT, () => {
			logger.info(`🚀 Server is running on port ${PORT}`);
			logger.info(`📊 Health check: http://localhost:${PORT}/api/health`);
			logger.info(`🔌 Socket.IO: http://localhost:${PORT}/socket.io/`);
		});
	} catch (error) {
		logger.error('❌ Failed to start server:', error);
		process.exit(1);
	}
};

if (!process.env.MONGODB_URL) {
	logger.error(
		'❌ Environment variables not loaded. Please check your .env file',
	);
	process.exit(1);
}

startServer();

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

process.on('SIGTERM', () => {
	logger.info('SIGTERM received, shutting down gracefully');
	io.close(() => {
		logger.info('Socket.IO server closed');
		process.exit(0);
	});
});

process.on('SIGINT', () => {
	logger.info('SIGINT received, shutting down gracefully');
	io.close(() => {
		logger.info('Socket.IO server closed');
		process.exit(0);
	});
});
