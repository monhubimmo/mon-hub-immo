import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';
// Load environment variables
dotenv.config();

const MONGODB = process.env.MONGODB_URL || '';

if (!MONGODB) {
	logger.error(
		'[Database] MONGODB_URL is not defined in environment variables',
	);
	process.exit(1);
}

export const connectDB = async (): Promise<void> => {
	try {
		await mongoose.connect(MONGODB, {
			serverSelectionTimeoutMS: 10000, // Increased timeout for Atlas
			socketTimeoutMS: 45000,
			bufferCommands: false,
			maxPoolSize: 10,
			dbName: 'monhubimmo',
		});
		logger.info(
			`[Database] MongoDB Connected: ${mongoose.connection.host}`,
		);
	} catch (error) {
		logger.error('[Database] MongoDB connection error:', error);
		process.exit(1);
	}
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
	logger.warn('[Database] MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
	logger.info('[Database] MongoDB reconnected');
});

mongoose.connection.on('error', (err) => {
	logger.error('[Database] MongoDB error:', err);
});
