import { User } from '../models/User';
import { sendSubscriptionExpiringSoonEmail } from '../utils/emailService';
import Stripe from 'stripe';
import { logger } from '../utils/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
	apiVersion: '2025-12-15.clover',
});

// Reminder thresholds in days
const REMINDER_DAYS = [7, 3];

/**
 * Check and send subscription expiry reminders
 * Runs once daily to find users whose subscriptions are expiring soon
 * Only sends one reminder per threshold (7 days, 3 days) to avoid spam
 */
export const checkSubscriptionExpiry = async (): Promise<void> => {
	logger.info('[SubscriptionReminder] Starting daily expiry check...');

	try {
		const now = new Date();

		for (const daysRemaining of REMINDER_DAYS) {
			// Calculate the target date range (users expiring in exactly X days, +/- 12 hours buffer)
			const targetDate = new Date(now);
			targetDate.setDate(targetDate.getDate() + daysRemaining);

			// Create a window: targetDate - 12 hours to targetDate + 12 hours
			const startWindow = new Date(targetDate);
			startWindow.setHours(startWindow.getHours() - 12);

			const endWindow = new Date(targetDate);
			endWindow.setHours(endWindow.getHours() + 12);

			// Find users with pending cancellation whose subscription ends in this window
			// AND who haven't received a reminder for this threshold yet
			const users = await User.find({
				userType: 'agent',
				isPaid: true,
				subscriptionEndDate: {
					$gte: startWindow,
					$lte: endWindow,
				},
				subscriptionStatus: {
					$in: ['active', 'pending_cancellation'],
				},
				// Check that we haven't sent this specific reminder
				// Using lastExpiryReminderDays to track which threshold was last sent
				$or: [
					{ lastExpiryReminderDays: { $exists: false } },
					{ lastExpiryReminderDays: null },
					{ lastExpiryReminderDays: { $gt: daysRemaining } }, // Only send if previous reminder was for more days
				],
			}).select(
				'email firstName lastName subscriptionEndDate stripeCustomerId lastExpiryReminderDays',
			);

			if (users.length === 0) {
				logger.info(
					`[SubscriptionReminder] No users found for ${daysRemaining}-day reminder`,
				);
				continue;
			}

			logger.info(
				`[SubscriptionReminder] Found ${users.length} users for ${daysRemaining}-day reminder`,
			);

			for (const user of users) {
				try {
					// Generate billing portal URL for user to reactivate
					let billingUrl = `${process.env.FRONTEND_URL}/payment`;

					if (user.stripeCustomerId) {
						try {
							const portalSession =
								await stripe.billingPortal.sessions.create({
									customer: user.stripeCustomerId,
									return_url: `${process.env.FRONTEND_URL}/dashboard`,
									locale: 'fr',
								});
							billingUrl = portalSession.url;
						} catch {
							// Use default payment URL if portal creation fails
						}
					}

					const endDate = user.subscriptionEndDate
						? user.subscriptionEndDate.toLocaleDateString('fr-FR')
						: 'bientôt';

					await sendSubscriptionExpiringSoonEmail({
						to: user.email,
						name: user.firstName || 'Agent',
						daysRemaining,
						endDate,
						billingUrl,
					});

					// Update user to mark reminder as sent
					await User.findByIdAndUpdate(user._id, {
						lastExpiryReminderDays: daysRemaining,
						lastExpiryReminderSentAt: new Date(),
					});

					logger.info(
						`[SubscriptionReminder] Sent ${daysRemaining}-day reminder to ${user.email}`,
					);
				} catch (emailError) {
					logger.error(
						`[SubscriptionReminder] Failed to send reminder to ${user.email}:`,
						emailError,
					);
				}
			}
		}

		logger.info('[SubscriptionReminder] Daily expiry check completed');
	} catch (error) {
		logger.error(
			'[SubscriptionReminder] Error during expiry check:',
			error,
		);
	}
};

/**
 * Initialize the subscription reminder scheduler
 * Runs once on startup, then once every 24 hours
 */
export const initSubscriptionReminderScheduler = (): void => {
	// Run once after a short delay (30 seconds after server starts)
	// This allows the server to fully initialize first
	setTimeout(() => {
		checkSubscriptionExpiry();
	}, 30 * 1000);

	// Then run once every 24 hours
	setInterval(
		() => {
			checkSubscriptionExpiry();
		},
		24 * 60 * 60 * 1000,
	);

	logger.info(
		'[SubscriptionReminder] Scheduler initialized (runs daily at startup + every 24h)',
	);
};
