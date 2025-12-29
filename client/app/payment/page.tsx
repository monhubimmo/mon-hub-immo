'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { logger } from '@/lib/utils/logger';
import { handleApiError } from '@/lib/utils/errorHandler';
import { toast } from 'react-toastify';
import { FiCheck, FiCreditCard, FiShield, FiRefreshCw } from 'react-icons/fi';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const features = [
	'Accès illimité à la plateforme',
	'Publication de biens immobiliers',
	"Création d'annonces de recherche",
	'Collaboration avec les apporteurs',
	'Messagerie en temps réel',
	'Gestion des rendez-vous',
	'Tableau de bord complet',
	'Support prioritaire',
];

type PlanType = 'monthly' | 'annual';

interface PlanConfig {
	id: PlanType;
	name: string;
	priceTTC: string;
	priceHT: string;
	tva: string;
	period: string;
	periodLabel: string;
	badge?: string;
	savings?: string;
}

const plans: PlanConfig[] = [
	{
		id: 'monthly',
		name: 'Mensuel',
		priceTTC: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE || '2.40',
		priceHT: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_HT || '2.00',
		tva: '0,40',
		period: '/mois',
		periodLabel: 'mois',
	},
	{
		id: 'annual',
		name: 'Annuel',
		priceTTC: process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE || '24.00',
		priceHT: process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_HT || '20.00',
		tva: '4,00',
		period: '/an',
		periodLabel: 'an',
		badge: '2 mois offerts',
		savings: 'Équivalent : 1,67€ TTC / mois',
	},
];

export default function PaymentPage() {
	const router = useRouter();
	const { user, loading: authLoading } = useAuth();
	const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null);

	useEffect(() => {
		if (!authLoading && !user) {
			router.push('/auth/login?redirect=/payment');
			return;
		}
		if (!authLoading && user && user.userType !== 'agent') {
			router.push('/dashboard');
			return;
		}
		if (!authLoading && user && !user.profileCompleted) {
			router.push('/auth/complete-profile');
			return;
		}
		if (
			!authLoading &&
			user &&
			(user.isPaid || user.accessGrantedByAdmin)
		) {
			router.push('/dashboard');
			return;
		}
	}, [user, authLoading, router]);

	const handleSubscribe = async (plan: PlanType) => {
		setLoadingPlan(plan);
		try {
			const response = await api.post(
				'/payment/create-checkout-session',
				{ plan },
			);
			const { url } = response.data;

			if (url) {
				window.location.href = url;
			} else {
				toast.error(
					'Erreur lors de la création de la session de paiement',
				);
			}
		} catch (error) {
			const apiError = handleApiError(
				error,
				'PaymentPage',
				'Erreur lors du paiement',
			);
			logger.error('[PaymentPage] Checkout error:', apiError);
			toast.error(apiError.message);
		} finally {
			setLoadingPlan(null);
		}
	};

	if (authLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-50">
				<LoadingSpinner size="lg" />
			</div>
		);
	}

	if (!user || user.userType !== 'agent') {
		return null;
	}

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Hero Section */}
			<div className="bg-brand-gradient relative overflow-hidden">
				<div className="absolute inset-0 opacity-10">
					<div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
					<div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2"></div>
				</div>
				<div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-white">
					<h1 className="text-3xl sm:text-4xl font-bold mb-4">
						Accédez à MonHubImmo
					</h1>
					<p className="text-lg text-brand-100 max-w-2xl mx-auto">
						Rejoignez la plateforme de collaboration immobilière et
						développez votre activité
					</p>
				</div>
			</div>

			{/* Pricing Cards */}
			<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				<div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
					{plans.map((plan) => (
						<div
							key={plan.id}
							className={`bg-white rounded-2xl shadow-lg overflow-hidden border transition-all ${
								plan.id === 'annual'
									? 'border-brand ring-2 ring-brand/20'
									: 'border-gray-100'
							}`}
						>
							{/* Badge for annual plan */}
							{plan.badge && (
								<div className="bg-yellow-400 text-gray-900 text-center py-2 text-sm font-semibold">
									{plan.badge}
								</div>
							)}

							{/* Card Header - Brand gradient for both */}
							<div className="bg-brand-gradient px-8 py-10 text-center text-white">
								<h2 className="text-2xl font-semibold mb-2">
									Abonnement {plan.name}
								</h2>
								<div className="flex items-baseline justify-center">
									<span className="text-5xl font-bold">
										{plan.priceTTC}€
									</span>
									<span className="text-xl ml-2 text-brand-100">
										{plan.period}
									</span>
								</div>
								{plan.savings ? (
									<p className="mt-3 text-brand-100">
										{plan.savings}
									</p>
								) : (
									<p className="mt-3 text-brand-100">
										Annulez à tout moment
									</p>
								)}
								<div className="mt-4 text-sm text-brand-100 space-y-1">
									<p>
										Abonnement Agent : {plan.priceHT} € HT /{' '}
										{plan.periodLabel}
									</p>
									<p>TVA : {plan.tva} €</p>
									<p className="font-semibold text-white">
										Total : {plan.priceTTC} € TTC /{' '}
										{plan.periodLabel}
									</p>
								</div>
							</div>

							{/* Features */}
							<div className="px-8 py-8">
								<ul className="space-y-4">
									{features.map((feature, index) => (
										<li
											key={index}
											className="flex items-start"
										>
											<div className="w-5 h-5 rounded-full bg-brand-50 flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">
												<FiCheck className="h-3 w-3 text-brand" />
											</div>
											<span className="text-gray-700">
												{feature}
											</span>
										</li>
									))}
								</ul>
							</div>

							{/* CTA Button */}
							<div className="px-8 pb-8">
								<button
									onClick={() => handleSubscribe(plan.id)}
									disabled={loadingPlan !== null}
									className="w-full bg-brand hover:bg-brand-dark text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-brand hover:shadow-brand-lg"
								>
									{loadingPlan === plan.id ? (
										<>
											<LoadingSpinner size="sm" />
											<span>Redirection...</span>
										</>
									) : (
										<>
											<FiCreditCard className="h-5 w-5" />
											<span>Souscrire maintenant</span>
										</>
									)}
								</button>
							</div>

							{/* Trust Badges */}
							<div className="bg-gray-50 px-8 py-6 border-t border-gray-100">
								<div className="flex items-center justify-center gap-6 text-sm text-gray-500">
									<div className="flex items-center gap-2">
										<FiShield className="h-4 w-4 text-brand" />
										<span>Paiement sécurisé</span>
									</div>
									<div className="flex items-center gap-2">
										<FiRefreshCw className="h-4 w-4 text-brand" />
										<span>
											{plan.id === 'annual'
												? 'Engagement 12 mois'
												: 'Sans engagement'}
										</span>
									</div>
								</div>
							</div>
						</div>
					))}
				</div>

				<p className="text-center text-xs text-gray-400 mt-6">
					Paiement géré par Stripe. Vos données bancaires ne sont
					jamais stockées sur nos serveurs.
				</p>

				{/* FAQ Section */}
				<div className="mt-12">
					<h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">
						Questions fréquentes
					</h3>
					<div className="space-y-4 max-w-2xl mx-auto">
						<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
							<h4 className="font-medium text-gray-900">
								Comment annuler mon abonnement ?
							</h4>
							<p className="text-gray-600 mt-2 text-sm">
								Vous pouvez annuler votre abonnement à tout
								moment depuis votre tableau de bord. Vous
								conserverez l&apos;accès jusqu&apos;à la fin de
								votre période de facturation.
							</p>
						</div>
						<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
							<h4 className="font-medium text-gray-900">
								Puis-je changer de formule ?
							</h4>
							<p className="text-gray-600 mt-2 text-sm">
								Oui, vous pouvez passer du mensuel à
								l&apos;annuel (ou inversement) à tout moment
								depuis votre portail de facturation. Le
								changement prendra effet à la prochaine période.
							</p>
						</div>
						<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
							<h4 className="font-medium text-gray-900">
								Quels moyens de paiement acceptez-vous ?
							</h4>
							<p className="text-gray-600 mt-2 text-sm">
								Nous acceptons toutes les cartes bancaires
								(Visa, Mastercard, American Express) via notre
								partenaire de paiement sécurisé Stripe.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
