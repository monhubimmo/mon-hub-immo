import { Router, Response } from 'express';
import Stripe from 'stripe';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types/auth';
import { User } from '../models/User';
import { logger } from '../utils/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
	apiVersion: '2025-12-15.clover',
});

const router = Router();

// Price IDs from Stripe Dashboard
const MONTHLY_PRICE_ID = process.env.STRIPE_PRICE_ID as string;
const ANNUAL_PRICE_ID = process.env.STRIPE_ANNUAL_PRICE_ID as string;

// Map price IDs to plan types
const PRICE_TO_PLAN: Record<string, 'monthly' | 'annual'> = {
	[MONTHLY_PRICE_ID]: 'monthly',
	[ANNUAL_PRICE_ID]: 'annual',
};

/**
 * Create Stripe Checkout Session
 * Redirects user to Stripe's hosted checkout page
 */
router.post(
	'/create-checkout-session',
	authenticateToken,
	async (req: AuthRequest, res: Response) => {
		try {
			const { plan = 'monthly' } = req.body;
			const userId = req.userId;
			if (!userId) {
				return res.status(401).json({ error: 'Non authentifié' });
			}

			const user = await User.findById(userId);
			if (!user) {
				return res
					.status(404)
					.json({ error: 'Utilisateur non trouvé' });
			}

			// Only agents need to pay
			if (user.userType !== 'agent') {
				return res.status(400).json({
					error: 'Seuls les agents doivent souscrire un abonnement',
				});
			}

			// Check if already paid
			if (user.isPaid || user.accessGrantedByAdmin) {
				return res.status(400).json({
					error: 'Vous avez déjà un abonnement actif',
				});
			}

			// Get or create Stripe customer
			let stripeCustomerId = user.stripeCustomerId;

			if (!stripeCustomerId) {
				const customer = await stripe.customers.create({
					email: user.email,
					name: `${user.firstName} ${user.lastName}`,
					metadata: { userId: userId.toString() },
				});
				stripeCustomerId = customer.id;
				await User.findByIdAndUpdate(userId, { stripeCustomerId });
			}

			// Select price ID based on plan
			const priceId =
				plan === 'annual' ? ANNUAL_PRICE_ID : MONTHLY_PRICE_ID;

			if (!priceId) {
				return res.status(400).json({ error: 'Plan non disponible' });
			}

			// Create checkout session
			const session = await stripe.checkout.sessions.create({
				customer: stripeCustomerId,
				payment_method_types: ['card'],
				mode: 'subscription',
				locale: 'fr',
				line_items: [
					{
						price: priceId,
						quantity: 1,
					},
				],
				success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
				cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
				metadata: {
					userId: userId.toString(),
					plan: plan,
				},
				subscription_data: {
					metadata: {
						userId: userId.toString(),
						plan: plan,
					},
				},
				// Collect billing address for invoices
				billing_address_collection: 'required',
				// Allow promotion codes
				allow_promotion_codes: true,
			});

			logger.info(
				`[Payment] Checkout session created for user ${userId}`,
			);

			res.json({
				sessionId: session.id,
				url: session.url,
			});
		} catch (error) {
			logger.error('[Payment] Error creating checkout session:', error);
			const message =
				error instanceof Error ? error.message : 'Erreur inconnue';
			res.status(500).json({ error: message });
		}
	},
);

/**
 * Create Stripe Customer Portal session
 * Allows users to manage their subscription, update payment method, cancel, etc.
 */
router.post(
	'/create-portal-session',
	authenticateToken,
	async (req: AuthRequest, res: Response) => {
		try {
			const userId = req.userId;
			if (!userId) {
				return res.status(401).json({ error: 'Non authentifié' });
			}

			const user = await User.findById(userId);
			if (!user) {
				return res
					.status(404)
					.json({ error: 'Utilisateur non trouvé' });
			}

			if (!user.stripeCustomerId) {
				return res.status(400).json({
					error: 'Aucun compte de facturation trouvé',
				});
			}

			const portalSession = await stripe.billingPortal.sessions.create({
				customer: user.stripeCustomerId,
				return_url: `${process.env.FRONTEND_URL}/dashboard`,
				locale: 'fr',
			});

			logger.info(`[Payment] Portal session created for user ${userId}`);

			res.json({ url: portalSession.url });
		} catch (error) {
			logger.error('[Payment] Error creating portal session:', error);
			const message =
				error instanceof Error ? error.message : 'Erreur inconnue';
			res.status(500).json({ error: message });
		}
	},
);

/**
 * Get current subscription details
 */
router.get(
	'/subscription',
	authenticateToken,
	async (req: AuthRequest, res: Response) => {
		try {
			const userId = req.userId;
			if (!userId) {
				return res.status(401).json({ error: 'Non authentifié' });
			}

			const user = await User.findById(userId);
			if (!user) {
				return res
					.status(404)
					.json({ error: 'Utilisateur non trouvé' });
			}

			// If admin granted free access
			if (user.accessGrantedByAdmin) {
				return res.json({
					status: 'active',
					plan: 'free_admin_granted',
					isPaid: true,
					message: "Accès gratuit accordé par l'administrateur",
				});
			}

			// If no subscription
			if (!user.stripeSubscriptionId) {
				return res.json({
					status: 'none',
					isPaid: false,
				});
			}

			// Fetch subscription from Stripe with expanded data
			const subscription = (await stripe.subscriptions.retrieve(
				user.stripeSubscriptionId,
				{ expand: ['default_payment_method'] },
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			)) as any;

			// Access billing period from items if not on root
			const periodStart =
				subscription.current_period_start ||
				subscription.items?.data?.[0]?.current_period_start;
			const periodEnd =
				subscription.current_period_end ||
				subscription.items?.data?.[0]?.current_period_end;

			logger.info(
				`[Payment] Subscription ${subscription.id}: status=${subscription.status}, cancel_at_period_end=${subscription.cancel_at_period_end}, cancel_at=${subscription.cancel_at}, period_start=${periodStart}, period_end=${periodEnd}`,
			);

			// Check if subscription is scheduled for cancellation
			// Stripe uses cancel_at_period_end OR cancel_at (timestamp) depending on how cancellation was triggered
			const isCanceled = Boolean(
				subscription.cancel_at_period_end || subscription.cancel_at,
			);

			// Use cancel_at date if available, otherwise use period end
			const endDate = subscription.cancel_at
				? new Date(subscription.cancel_at * 1000).toISOString()
				: periodEnd
					? new Date(periodEnd * 1000).toISOString()
					: null;

			// Determine plan type from subscription price ID or user's stored plan
			const subscriptionPriceId =
				subscription.items?.data?.[0]?.price?.id;
			const planType =
				PRICE_TO_PLAN[subscriptionPriceId] ||
				user.subscriptionPlan ||
				'monthly';

			res.json({
				status: subscription.status,
				plan: planType,
				currentPeriodStart: periodStart
					? new Date(periodStart * 1000).toISOString()
					: null,
				currentPeriodEnd: endDate,
				cancelAtPeriodEnd: isCanceled,
				isPaid: ['active', 'trialing'].includes(subscription.status),
			});
		} catch (error) {
			logger.error('[Payment] Error fetching subscription:', error);
			const message =
				error instanceof Error ? error.message : 'Erreur inconnue';
			res.status(500).json({ error: message });
		}
	},
);

/**
 * Cancel subscription (at period end)
 * User keeps access until the end of their billing period
 */
router.post(
	'/cancel-subscription',
	authenticateToken,
	async (req: AuthRequest, res: Response) => {
		try {
			const userId = req.userId;
			if (!userId) {
				return res.status(401).json({ error: 'Non authentifié' });
			}

			const user = await User.findById(userId);
			if (!user) {
				return res
					.status(404)
					.json({ error: 'Utilisateur non trouvé' });
			}

			if (!user.stripeSubscriptionId) {
				return res.status(400).json({
					error: 'Aucun abonnement actif',
				});
			}

			// Cancel at period end (user keeps access until end date)
			const subscription = (await stripe.subscriptions.update(
				user.stripeSubscriptionId,
				{ cancel_at_period_end: true },
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			)) as any;

			await User.findByIdAndUpdate(userId, {
				subscriptionStatus: 'canceled',
			});

			logger.info(`[Payment] Subscription canceled for user ${userId}`);

			res.json({
				message: 'Abonnement annulé avec succès',
				endDate: new Date(subscription.current_period_end * 1000),
			});
		} catch (error) {
			logger.error('[Payment] Error canceling subscription:', error);
			const message =
				error instanceof Error ? error.message : 'Erreur inconnue';
			res.status(500).json({ error: message });
		}
	},
);

/**
 * Reactivate a canceled subscription (before period end)
 */
router.post(
	'/reactivate-subscription',
	authenticateToken,
	async (req: AuthRequest, res: Response) => {
		try {
			const userId = req.userId;
			if (!userId) {
				return res.status(401).json({ error: 'Non authentifié' });
			}

			const user = await User.findById(userId);
			if (!user) {
				return res
					.status(404)
					.json({ error: 'Utilisateur non trouvé' });
			}

			if (!user.stripeSubscriptionId) {
				return res.status(400).json({
					error: 'Aucun abonnement trouvé',
				});
			}

			// Reactivate subscription
			const subscription = await stripe.subscriptions.update(
				user.stripeSubscriptionId,
				{ cancel_at_period_end: false },
			);

			await User.findByIdAndUpdate(userId, {
				subscriptionStatus: subscription.status,
			});

			logger.info(
				`[Payment] Subscription reactivated for user ${userId}`,
			);

			res.json({
				message: 'Abonnement réactivé avec succès',
			});
		} catch (error) {
			logger.error('[Payment] Error reactivating subscription:', error);
			const message =
				error instanceof Error ? error.message : 'Erreur inconnue';
			res.status(500).json({ error: message });
		}
	},
);

/**
 * Verify checkout session (called after successful payment)
 * Also updates user's payment status as fallback if webhook didn't fire
 */
router.get(
	'/verify-session',
	authenticateToken,
	async (req: AuthRequest, res: Response) => {
		try {
			const { session_id } = req.query;
			const userId = req.userId;

			if (!session_id || typeof session_id !== 'string') {
				return res.status(400).json({ error: 'session_id requis' });
			}

			const session = await stripe.checkout.sessions.retrieve(session_id);

			if (session.payment_status === 'paid') {
				// Fallback: Update user if webhook hasn't done so yet
				// This ensures user gets access even if webhook is delayed or fails
				if (userId && session.subscription) {
					const subscriptionId = session.subscription as string;
					const customerId = session.customer as string;

					try {
						// Fetch subscription details from Stripe
						const subscription =
							(await stripe.subscriptions.retrieve(
								subscriptionId,
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
							)) as any;

						// Check if user needs updating
						const user = await User.findById(userId);
						if (user && !user.isPaid) {
							// Determine isPaid based on subscription status
							// Active or trialing subscriptions grant access
							const isActive = ['active', 'trialing'].includes(
								subscription.status,
							);

							// Calculate dates safely - check items.data[0] for newer API versions
							const startTimestamp =
								subscription.current_period_start ||
								subscription.items?.data?.[0]
									?.current_period_start;
							const endTimestamp =
								subscription.current_period_end ||
								subscription.items?.data?.[0]
									?.current_period_end;

							const startDate = startTimestamp
								? new Date(startTimestamp * 1000)
								: undefined;
							const endDate = endTimestamp
								? new Date(endTimestamp * 1000)
								: undefined;

							// Determine plan type from subscription price ID
							const subscriptionPriceId =
								subscription.items?.data?.[0]?.price?.id;
							const planType =
								PRICE_TO_PLAN[subscriptionPriceId] || 'monthly';

							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							const updateData: any = {
								stripeCustomerId: customerId,
								stripeSubscriptionId: subscriptionId,
								subscriptionStatus: subscription.status,
								subscriptionPlan: planType,
								isPaid: isActive,
							};

							if (startDate)
								updateData.subscriptionStartDate = startDate;
							if (endDate)
								updateData.subscriptionEndDate = endDate;

							await User.findByIdAndUpdate(userId, updateData);

							logger.info(
								`[Payment] User ${userId} updated via verify-session fallback: isPaid=${isActive}, status=${subscription.status}`,
							);
						}
					} catch (subError) {
						// Log but don't fail - session verification was still successful
						logger.warn(
							`[Payment] Could not update user ${userId} during verify-session:`,
							subError,
						);
					}
				}

				res.json({
					success: true,
					status: session.payment_status,
				});
			} else {
				res.json({
					success: false,
					status: session.payment_status,
				});
			}
		} catch (error) {
			logger.error('[Payment] Error verifying session:', error);
			const message =
				error instanceof Error ? error.message : 'Erreur inconnue';
			res.status(500).json({ error: message });
		}
	},
);

export default router;
