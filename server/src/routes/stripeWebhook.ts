import { Request, Response } from 'express';
import Stripe from 'stripe';
import { User } from '../models/User';
import { Payment } from '../models/Payment';
import { logger } from '../utils/logger';
import {
	sendPaymentSuccessEmail,
	sendPaymentFailedEmail,
	sendSubscriptionCanceledEmail,
} from '../utils/emailService';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
	apiVersion: '2025-12-15.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

// Price IDs from Stripe Dashboard
const MONTHLY_PRICE_ID = process.env.STRIPE_PRICE_ID as string;
const ANNUAL_PRICE_ID = process.env.STRIPE_ANNUAL_PRICE_ID as string;

// Map price IDs to plan types
const PRICE_TO_PLAN: Record<string, 'monthly' | 'annual'> = {
	[MONTHLY_PRICE_ID]: 'monthly',
	[ANNUAL_PRICE_ID]: 'annual',
};

// Log webhook secret status at import time (helps debug configuration issues)
logger.info(
	`[Stripe Webhook] Initializing - webhookSecret configured: ${Boolean(webhookSecret)}, length: ${webhookSecret?.length || 0}`,
);

// Grace period: Number of days to keep access after failed payment
const FAILED_PAYMENT_GRACE_DAYS = 7;

// Idempotency: Track processed events to prevent duplicate processing
// Events are cached for 24 hours (Stripe retries for up to 72 hours)
const processedEvents = new Map<string, number>();
const EVENT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

// Cleanup old events periodically (every hour)
setInterval(
	() => {
		const now = Date.now();
		let cleaned = 0;
		for (const [eventId, timestamp] of processedEvents) {
			if (now - timestamp > EVENT_CACHE_TTL) {
				processedEvents.delete(eventId);
				cleaned++;
			}
		}
		if (cleaned > 0) {
			logger.info(
				`[Stripe Webhook] Cleaned ${cleaned} old events from idempotency cache`,
			);
		}
	},
	60 * 60 * 1000,
); // Run every hour

// Type helpers for handling both old and new Stripe API structures
interface SubscriptionWithLegacyFields extends Stripe.Subscription {
	current_period_start?: number;
	current_period_end?: number;
}

interface InvoiceWithLegacyFields extends Stripe.Invoice {
	subscription?: string | Stripe.Subscription;
}

interface LineItemWithLegacyFields extends Stripe.InvoiceLineItem {
	subscription_item?: string;
}

/**
 * Extract subscription period dates from subscription object
 * In newer Stripe API versions (2025+), dates are in items.data[0]
 */
function getSubscriptionPeriodDates(sub: Stripe.Subscription): {
	startDate: Date | undefined;
	endDate: Date | undefined;
} {
	const subExt = sub as SubscriptionWithLegacyFields;

	// Try root level first (older API versions)
	let startTimestamp = subExt.current_period_start;
	let endTimestamp = subExt.current_period_end;

	// If not found at root, try items.data[0] (newer API versions)
	const firstItem = sub.items?.data?.[0];
	if (!startTimestamp && firstItem?.current_period_start) {
		startTimestamp = firstItem.current_period_start;
	}
	if (!endTimestamp && firstItem?.current_period_end) {
		endTimestamp = firstItem.current_period_end;
	}

	return {
		startDate: safeDate(startTimestamp),
		endDate: safeDate(endTimestamp),
	};
}

/**
 * Extract subscription ID from invoice object
 * In newer Stripe API versions (2025+), subscription may be nested in lines.data
 */
function getSubscriptionIdFromInvoice(inv: Stripe.Invoice): string | undefined {
	const invExt = inv as InvoiceWithLegacyFields;

	// Try root level first (older API)
	if (invExt.subscription) {
		if (typeof invExt.subscription === 'string') {
			return invExt.subscription;
		}
		return invExt.subscription.id;
	}

	// Try lines.data for subscription info (newer API)
	if (inv.lines?.data?.length > 0) {
		for (const line of inv.lines.data) {
			const lineExt = line as LineItemWithLegacyFields;

			// Check parent.subscription_item_details (newer structure)
			if (line.parent?.subscription_item_details?.subscription) {
				return line.parent.subscription_item_details.subscription;
			}

			// Check subscription field on line item
			if (line.subscription) {
				if (typeof line.subscription === 'string') {
					return line.subscription;
				}
				return line.subscription.id;
			}

			// Check subscription_item (legacy)
			if (lineExt.subscription_item) {
				return undefined; // subscription_item is not the subscription ID
			}
		}
	}

	// Try parent.subscription_details (another possible location)
	if (inv.parent?.subscription_details?.subscription) {
		const sub = inv.parent.subscription_details.subscription;
		return typeof sub === 'string' ? sub : sub.id;
	}

	return undefined;
}

/**
 * Safely create a Date from a Unix timestamp
 */
function safeDate(timestamp: number | undefined | null): Date | undefined {
	if (!timestamp) return undefined;
	if (typeof timestamp !== 'number') return undefined;
	if (timestamp <= 0) return undefined;
	const date = new Date(timestamp * 1000);
	if (isNaN(date.getTime())) return undefined;
	return date;
}

/**
 * Stripe Webhook Handler
 * Handles subscription lifecycle events from Stripe
 */
const stripeWebhookHandler = async (req: Request, res: Response) => {
	const sig = req.headers['stripe-signature'] as string;

	// Log incoming webhook request details
	logger.info(
		`[Stripe Webhook] Incoming request - Content-Type: ${req.headers['content-type']}, Body type: ${typeof req.body}, Body length: ${req.body?.length || 'N/A'}`,
	);

	if (!sig) {
		logger.error(
			'[Stripe Webhook] Missing stripe-signature header. Headers received:',
			JSON.stringify(Object.keys(req.headers)),
		);
		return res.status(400).send('Missing stripe-signature header');
	}

	if (!webhookSecret) {
		logger.error(
			'[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not configured in environment variables!',
		);
		return res.status(500).send('Webhook secret not configured');
	}

	let event: Stripe.Event;

	try {
		event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
		logger.info(
			`[Stripe Webhook] ✅ Signature verified successfully for event: ${event.type} (ID: ${event.id})`,
		);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		logger.error(
			`[Stripe Webhook] ❌ Signature verification failed: ${message}`,
		);
		logger.error(
			`[Stripe Webhook] Debug info - sig length: ${sig?.length}, body type: ${typeof req.body}, is Buffer: ${Buffer.isBuffer(req.body)}`,
		);
		return res.status(400).send(`Webhook Error: ${message}`);
	}

	// Idempotency check: Skip if event was already processed
	if (processedEvents.has(event.id)) {
		logger.info(
			`[Stripe Webhook] Skipping duplicate event: ${event.id} (${event.type})`,
		);
		return res.json({ received: true, duplicate: true });
	}

	// Mark event as being processed
	processedEvents.set(event.id, Date.now());

	logger.info(
		`[Stripe Webhook] Processing event: ${event.type} (ID: ${event.id}, Created: ${new Date(event.created * 1000).toISOString()})`,
	);

	try {
		switch (event.type) {
			case 'checkout.session.completed':
				await handleCheckoutCompleted(
					event.data.object as Stripe.Checkout.Session,
				);
				break;

			case 'customer.subscription.created':
			case 'customer.subscription.updated':
				await handleSubscriptionUpdate(
					event.data.object as Stripe.Subscription,
				);
				break;

			case 'customer.subscription.deleted':
				await handleSubscriptionDeleted(
					event.data.object as Stripe.Subscription,
				);
				break;

			case 'invoice.payment_succeeded':
				await handlePaymentSucceeded(
					event.data.object as Stripe.Invoice,
				);
				break;

			case 'invoice.payment_failed':
				await handlePaymentFailed(event.data.object as Stripe.Invoice);
				break;

			default:
				logger.info(
					`[Stripe Webhook] Unhandled event type: ${event.type}`,
				);
		}

		logger.info(
			`[Stripe Webhook] ✅ Successfully processed event: ${event.type}`,
		);
		res.json({ received: true });
	} catch (error) {
		logger.error(
			`[Stripe Webhook] ❌ Error processing event ${event.type}:`,
			error,
		);
		res.status(500).json({ error: 'Webhook handler failed' });
	}
};

/**
 * Handle successful checkout session completion
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
	const userId = session.metadata?.userId;
	const customerId = session.customer as string;
	const subscriptionId = session.subscription as string;

	logger.info(
		`[Stripe Webhook] handleCheckoutCompleted - Session ID: ${session.id}, Payment Status: ${session.payment_status}`,
	);
	logger.info(
		`[Stripe Webhook] handleCheckoutCompleted - userId: ${userId}, customerId: ${customerId}, subscriptionId: ${subscriptionId}`,
	);
	logger.info(
		`[Stripe Webhook] handleCheckoutCompleted - Full metadata: ${JSON.stringify(session.metadata)}`,
	);

	if (!userId) {
		logger.error(
			'[Stripe Webhook] ❌ No userId in checkout session metadata! Cannot update user.',
		);
		return;
	}

	// Check if user exists before proceeding
	const existingUser = await User.findById(userId);
	if (!existingUser) {
		logger.error(
			`[Stripe Webhook] ❌ User not found with ID: ${userId}. Cannot update subscription status.`,
		);
		return;
	}

	logger.info(
		`[Stripe Webhook] Found user: ${existingUser.email}, current isPaid: ${existingUser.isPaid}, subscriptionStatus: ${existingUser.subscriptionStatus}`,
	);

	// Fetch subscription details
	let subscription;
	try {
		subscription = await stripe.subscriptions.retrieve(subscriptionId);
		logger.info(
			`[Stripe Webhook] Subscription retrieved: status=${subscription.status}`,
		);
	} catch (subErr) {
		logger.error(
			`[Stripe Webhook] ❌ Failed to retrieve subscription ${subscriptionId}:`,
			subErr,
		);
		return;
	}

	// Cast to any to access period properties (Stripe types may be incomplete for this API version)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const sub = subscription as any;

	// Use helper function to get dates from either root or items.data[0]
	const { startDate, endDate } = getSubscriptionPeriodDates(sub);

	// Accept both 'active' and 'trialing' as valid paid statuses
	const isActive = ['active', 'trialing'].includes(sub.status);

	// Determine plan type from subscription price ID or metadata
	const subscriptionPriceId = sub.items?.data?.[0]?.price?.id;
	const planFromMetadata = session.metadata?.plan || sub.metadata?.plan;
	const planType =
		PRICE_TO_PLAN[subscriptionPriceId] || planFromMetadata || 'monthly';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const updateData: any = {
		stripeCustomerId: customerId,
		stripeSubscriptionId: subscriptionId,
		subscriptionStatus: sub.status,
		subscriptionPlan: planType,
		isPaid: isActive,
	};

	if (startDate) updateData.subscriptionStartDate = startDate;
	if (endDate) updateData.subscriptionEndDate = endDate;

	logger.info(
		`[Stripe Webhook] Preparing to update user ${userId} with: ${JSON.stringify(updateData)}`,
	);

	try {
		const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
			new: true,
		});
		if (updatedUser) {
			logger.info(
				`[Stripe Webhook] ✅ User ${userId} (${updatedUser.email}) subscription ACTIVATED - isPaid: ${updatedUser.isPaid}, status: ${updatedUser.subscriptionStatus}`,
			);
		} else {
			logger.error(
				`[Stripe Webhook] ❌ User.findByIdAndUpdate returned null for userId: ${userId}`,
			);
		}
	} catch (updateErr) {
		logger.error(
			`[Stripe Webhook] ❌ Failed to update user ${userId}:`,
			updateErr,
		);
	}
}

/**
 * Handle subscription updates (renewals, plan changes, cancellation scheduling, etc.)
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const sub = subscription as any;
	const customerId = sub.customer as string;

	logger.info(
		`[Stripe Webhook] handleSubscriptionUpdate called for customer ${customerId}`,
	);
	logger.info(
		`[Stripe Webhook] Subscription data: status=${sub.status}, cancel_at_period_end=${sub.cancel_at_period_end}, cancel_at=${sub.cancel_at}`,
	);

	const user = await User.findOne({ stripeCustomerId: customerId });
	if (!user) {
		logger.warn(
			`[Stripe Webhook] No user found for customer ${customerId}`,
		);
		return;
	}

	logger.info(
		`[Stripe Webhook] Found user ${user._id} for customer ${customerId}`,
	);

	const isActive = ['active', 'trialing'].includes(sub.status);
	// Use helper function to get dates from either root or items.data[0]
	const { startDate, endDate } = getSubscriptionPeriodDates(sub);

	// Determine plan type from subscription price ID
	const subscriptionPriceId = sub.items?.data?.[0]?.price?.id;
	const planType =
		PRICE_TO_PLAN[subscriptionPriceId] ||
		user.subscriptionPlan ||
		'monthly';

	// Check if cancellation is scheduled
	// Stripe has two ways to schedule cancellation:
	// 1. cancel_at_period_end: true - cancels at end of billing period
	// 2. cancel_at: timestamp - cancels at a specific future date
	const cancelAt = safeDate(sub.cancel_at);
	const isCancellationScheduled =
		sub.cancel_at_period_end === true ||
		(cancelAt !== undefined && cancelAt > new Date());

	logger.info(
		`[Stripe Webhook] isCancellationScheduled=${isCancellationScheduled}, isActive=${isActive}, cancelAt=${cancelAt}`,
	);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const updateData: any = {
		stripeSubscriptionId: sub.id,
		subscriptionStatus: isCancellationScheduled
			? 'pending_cancellation'
			: sub.status,
		subscriptionPlan: planType,
		isPaid: isActive,
	};

	if (startDate) updateData.subscriptionStartDate = startDate;
	if (endDate) updateData.subscriptionEndDate = endDate;

	// Handle scheduled cancellation
	if (isCancellationScheduled) {
		updateData.canceledAt = cancelAt || new Date();
		updateData.cancellationReason =
			sub.cancellation_details?.reason ||
			sub.cancellation_details?.comment ||
			'user_requested';
		logger.info(
			`[Stripe Webhook] Subscription cancellation scheduled for user ${user._id}, ends at ${cancelAt || endDate}`,
		);

		// Send cancellation confirmation email (only if user wasn't already in pending_cancellation)
		if (user.subscriptionStatus !== 'pending_cancellation') {
			try {
				const accessEndDate = cancelAt || endDate || new Date();
				await sendSubscriptionCanceledEmail({
					to: user.email,
					name: user.firstName || 'Agent',
					endDate: accessEndDate.toLocaleDateString('fr-FR'),
				});
				logger.info(
					`[Stripe Webhook] Cancellation confirmation email sent to ${user.email}`,
				);
			} catch (emailError) {
				logger.error(
					`[Stripe Webhook] Failed to send cancellation email to ${user.email}:`,
					emailError,
				);
			}
		}
	} else {
		// If cancellation was reversed (reactivated), clear cancellation fields
		if (user.canceledAt && sub.status === 'active') {
			updateData.canceledAt = null;
			updateData.cancellationReason = null;
			logger.info(
				`[Stripe Webhook] Subscription reactivated for user ${user._id}`,
			);
		}
	}

	await User.findByIdAndUpdate(user._id, updateData);

	logger.info(
		`[Stripe Webhook] Subscription updated for user ${user._id}: ${updateData.subscriptionStatus}`,
	);
}

/**
 * Handle subscription cancellation/deletion
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
	const customerId = subscription.customer as string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const sub = subscription as any;

	const user = await User.findOne({ stripeCustomerId: customerId });
	if (!user) {
		logger.warn(
			`[Stripe Webhook] No user found for customer ${customerId}`,
		);
		return;
	}

	// Get cancellation reason if available
	const cancellationReason =
		sub.cancellation_details?.reason ||
		sub.cancellation_details?.comment ||
		'user_requested';

	await User.findByIdAndUpdate(user._id, {
		subscriptionStatus: 'canceled',
		isPaid: false,
		canceledAt: new Date(),
		cancellationReason: cancellationReason,
	});

	logger.info(
		`[Stripe Webhook] Subscription canceled for user ${user._id}, reason: ${cancellationReason}`,
	);

	// Send subscription canceled confirmation email
	try {
		const endDate = sub.current_period_end
			? new Date(sub.current_period_end * 1000)
			: new Date();

		await sendSubscriptionCanceledEmail({
			to: user.email,
			name: user.firstName || 'Agent',
			endDate: endDate.toLocaleDateString('fr-FR'),
		});
		logger.info(
			`[Stripe Webhook] Cancellation confirmation email sent to ${user.email}`,
		);
	} catch (emailError) {
		logger.error(
			`[Stripe Webhook] Failed to send cancellation email to ${user.email}:`,
			emailError,
		);
	}
}

/**
 * Handle successful invoice payment (subscription renewal)
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
	const customerId = invoice.customer as string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const inv = invoice as any;

	// Use helper function to extract subscription ID from various locations
	const subscriptionId = getSubscriptionIdFromInvoice(inv);

	if (!subscriptionId) {
		// Check if this is a subscription-related invoice
		if (inv.billing_reason?.includes('subscription')) {
			logger.warn(
				`[Stripe Webhook] handlePaymentSucceeded - Subscription invoice but no subscriptionId found. Invoice ID: ${inv.id}, billing_reason: ${inv.billing_reason}`,
			);
		} else {
			logger.info(
				`[Stripe Webhook] handlePaymentSucceeded - One-time payment (not subscription). Invoice ID: ${inv.id}`,
			);
		}
		return;
	}

	const user = await User.findOne({ stripeCustomerId: customerId });
	if (!user) {
		logger.warn(
			`[Stripe Webhook] handlePaymentSucceeded - No user found for customer ${customerId}`,
		);
		return;
	}

	logger.info(
		`[Stripe Webhook] handlePaymentSucceeded - Found user ${user._id} (${user.email}) for customer ${customerId}`,
	);

	// Fetch updated subscription details
	const subscription = (await stripe.subscriptions.retrieve(
		subscriptionId,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	)) as any;

	// Get payment amount in euros (Stripe uses cents)
	const amountPaid = inv.amount_paid ? inv.amount_paid / 100 : null;
	// Use helper function to get dates
	const { startDate, endDate } = getSubscriptionPeriodDates(subscription);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const updateData: any = {
		subscriptionStatus: 'active',
		isPaid: true,
		// Payment tracking
		lastPaymentDate: new Date(),
		lastPaymentAmount: amountPaid,
		lastInvoiceId: inv.id,
		failedPaymentCount: 0, // Reset on successful payment
		// Reset expiry reminder tracking for new billing cycle
		lastExpiryReminderDays: null,
		lastExpiryReminderSentAt: null,
	};

	if (startDate) updateData.subscriptionStartDate = startDate;
	if (endDate) updateData.subscriptionEndDate = endDate;

	logger.info(
		`[Stripe Webhook] handlePaymentSucceeded - Updating user ${user._id} with: ${JSON.stringify(updateData)}`,
	);

	await User.findByIdAndUpdate(user._id, updateData);

	logger.info(
		`[Stripe Webhook] handlePaymentSucceeded - User ${user._id} updated successfully`,
	);

	// Record payment in Payment history
	try {
		await Payment.findOneAndUpdate(
			{ stripeInvoiceId: inv.id },
			{
				userId: user._id,
				stripeInvoiceId: inv.id,
				stripePaymentIntentId: inv.payment_intent,
				stripeSubscriptionId: subscriptionId,
				stripeCustomerId: customerId,
				amount: inv.amount_paid || 0,
				amountFormatted: amountPaid || 0,
				currency: inv.currency || 'eur',
				status: 'succeeded',
				description: inv.description || 'Abonnement MonHubImmo',
				invoicePdf: inv.invoice_pdf,
				receiptUrl: inv.hosted_invoice_url,
				hostedInvoiceUrl: inv.hosted_invoice_url,
				paidAt: new Date(),
				billingReason: inv.billing_reason || 'subscription_cycle',
			},
			{ upsert: true, new: true },
		);
	} catch (err) {
		logger.error('[Stripe Webhook] Failed to record payment:', err);
	}

	logger.info(
		`[Stripe Webhook] Payment succeeded for user ${user._id}, amount: €${amountPaid}`,
	);

	// Send payment confirmation email
	logger.info(
		`[Stripe Webhook] handlePaymentSucceeded - About to send payment success email to ${user.email}`,
	);
	try {
		await sendPaymentSuccessEmail({
			to: user.email,
			name: user.firstName || 'Client',
			amount: `€${amountPaid?.toFixed(2) || '19.00'}`,
			invoiceUrl: inv.hosted_invoice_url,
		});
		logger.info(
			`[Stripe Webhook] handlePaymentSucceeded - Payment success email SENT to ${user.email}`,
		);
	} catch (emailErr) {
		logger.error(
			'[Stripe Webhook] Failed to send payment success email:',
			emailErr,
		);
	}
}

/**
 * Handle failed invoice payment
 * Implements grace period: user keeps access for FAILED_PAYMENT_GRACE_DAYS after first failure
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
	const customerId = invoice.customer as string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const inv = invoice as any;

	const user = await User.findOne({ stripeCustomerId: customerId });
	if (!user) {
		logger.warn(
			`[Stripe Webhook] No user found for customer ${customerId}`,
		);
		return;
	}

	// Increment failed payment count
	const newFailedCount = (user.failedPaymentCount || 0) + 1;
	const amountDue = inv.amount_due ? inv.amount_due / 100 : 19;

	// Grace period logic: Keep isPaid=true during grace period
	// Only revoke access after grace period expires OR after too many failures
	const firstFailureDate = user.lastFailedPaymentDate || new Date();
	const daysSinceFirstFailure = Math.floor(
		(Date.now() - new Date(firstFailureDate).getTime()) /
			(1000 * 60 * 60 * 24),
	);
	const gracePeriodExpired =
		daysSinceFirstFailure >= FAILED_PAYMENT_GRACE_DAYS;
	const shouldRevokeAccess = gracePeriodExpired || newFailedCount >= 4;

	// Calculate grace period end date for user notification
	const graceEndDate = new Date(firstFailureDate);
	graceEndDate.setDate(graceEndDate.getDate() + FAILED_PAYMENT_GRACE_DAYS);

	await User.findByIdAndUpdate(user._id, {
		subscriptionStatus: 'past_due',
		failedPaymentCount: newFailedCount,
		lastFailedPaymentDate:
			newFailedCount === 1 ? new Date() : user.lastFailedPaymentDate,
		// Only revoke access if grace period expired
		...(shouldRevokeAccess && { isPaid: false }),
	});

	// Record failed payment in Payment history
	try {
		await Payment.findOneAndUpdate(
			{ stripeInvoiceId: inv.id },
			{
				userId: user._id,
				stripeInvoiceId: inv.id,
				stripePaymentIntentId: inv.payment_intent,
				stripeSubscriptionId: inv.subscription,
				stripeCustomerId: customerId,
				amount: inv.amount_due || 0,
				amountFormatted: amountDue,
				currency: inv.currency || 'eur',
				status: 'failed',
				description: inv.description || 'Abonnement MonHubImmo',
				failedAt: new Date(),
				billingReason: inv.billing_reason || 'subscription_cycle',
			},
			{ upsert: true, new: true },
		);
	} catch (err) {
		logger.error('[Stripe Webhook] Failed to record failed payment:', err);
	}

	logger.warn(
		`[Stripe Webhook] Payment failed for user ${user._id}, attempt #${newFailedCount}, grace period ${gracePeriodExpired ? 'EXPIRED' : `ends ${graceEndDate.toISOString()}`}`,
	);

	// Send payment failed notification email
	try {
		// Generate billing portal URL for user to update payment method
		const portalSession = await stripe.billingPortal.sessions.create({
			customer: customerId,
			return_url: `${process.env.FRONTEND_URL}/dashboard`,
		});

		await sendPaymentFailedEmail({
			to: user.email,
			name: user.firstName || 'Client',
			amount: `€${amountDue.toFixed(2)}`,
			attemptNumber: newFailedCount,
			billingUrl: portalSession.url,
		});
	} catch (emailErr) {
		logger.error(
			'[Stripe Webhook] Failed to send payment failed email:',
			emailErr,
		);
	}
}

export default stripeWebhookHandler;
