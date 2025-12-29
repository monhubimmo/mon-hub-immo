'use client';

import React, { useState, useRef, useMemo } from 'react';
import Image from 'next/image';
import { AgentService, type Agent } from '@/lib/api/agentApi';
import { useFetch } from '@/hooks';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { BookAppointmentModal } from '@/components/appointments/BookAppointmentModal';
import {
	HeroSearchSection,
	FeatureCards,
	AgentsListSection,
} from '@/components/accueil';
import { getMunicipalitiesNearby } from '@/lib/services/frenchAddressApi';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { Footer } from '@/components/footer/footer';
export default function MonAgentImmoPage() {
	// Fetch agents using useFetch hook (replaces manual state management)
	const { data: agents = [], loading } = useFetch<Agent[]>(
		() => AgentService.getAllAgents(),
		{
			showErrorToast: true,
			errorMessage: 'Impossible de charger les agents',
		},
	);

	// Search state
	const [searchCity, setSearchCity] = useState('');
	const [searchPostalCode, setSearchPostalCode] = useState('');
	const [searchCoordinates, setSearchCoordinates] = useState<{
		lat: number;
		lon: number;
	} | null>(null);
	const [searchPerformed, setSearchPerformed] = useState(false);
	const [radiusSearchActive, setRadiusSearchActive] = useState(false);
	const [nearbyCities, setNearbyCities] = useState<string[]>([]);
	const [searching, setSearching] = useState(false);

	// UI refs
	const carouselRef = useRef<HTMLDivElement>(null);
	const searchSectionRef = useRef<HTMLDivElement>(null);

	// Booking modal state
	const [showBooking, setShowBooking] = useState(false);
	const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

	// Filtered agents based on search (using useMemo for performance)
	const filteredAgents = useMemo(() => {
		if (!searchPerformed || (!searchCity && !searchPostalCode)) {
			return agents;
		}

		const cityQuery = searchCity.toLowerCase().trim();
		const postalQuery = searchPostalCode.trim();

		// If radius search is active, filter by nearby cities
		if (radiusSearchActive && nearbyCities.length > 0) {
			return agents.filter((agent) => {
				const agentCity =
					agent.professionalInfo?.city?.toLowerCase() || '';
				const agentPostalCode =
					agent.professionalInfo?.postalCode || '';

				// Check if agent is in one of the nearby cities
				// We match by city name or postal code
				return nearbyCities.some(
					(city) =>
						city.toLowerCase() === agentCity ||
						(agentPostalCode && city.includes(agentPostalCode)), // Rough check, improved below
				);
			});
		}

		return agents.filter((agent) => {
			const agentCity = agent.professionalInfo?.city?.toLowerCase() || '';
			const agentPostalCode = agent.professionalInfo?.postalCode || '';

			const cityMatch = !cityQuery || agentCity.includes(cityQuery);
			const postalMatch =
				!postalQuery || agentPostalCode.includes(postalQuery);

			return cityMatch && postalMatch;
		});
	}, [
		agents,
		searchCity,
		searchPostalCode,
		searchPerformed,
		radiusSearchActive,
		nearbyCities,
	]);

	// Handle search button click
	const handleSearch = async () => {
		if (!searchCity.trim() && !searchPostalCode.trim()) {
			setSearchPerformed(false);
			return;
		}

		setSearching(true);
		setRadiusSearchActive(false);
		setNearbyCities([]);

		try {
			// First, check if we have exact matches
			const cityQuery = searchCity.toLowerCase().trim();
			const postalQuery = searchPostalCode.trim();

			const exactMatches = agents.filter((agent) => {
				const agentCity =
					agent.professionalInfo?.city?.toLowerCase() || '';
				const agentPostalCode =
					agent.professionalInfo?.postalCode || '';

				const cityMatch = !cityQuery || agentCity.includes(cityQuery);
				const postalMatch =
					!postalQuery || agentPostalCode.includes(postalQuery);

				return cityMatch && postalMatch;
			});

			// If no exact matches and we have coordinates, try radius search
			if (exactMatches.length === 0 && searchCoordinates) {
				console.log(
					'No exact matches found. Trying radius search with coordinates:',
					searchCoordinates,
				);

				// Fetch nearby municipalities within 50km
				const nearby = await getMunicipalitiesNearby(
					searchCoordinates.lat,
					searchCoordinates.lon,
					50, // 50km radius
				);

				if (nearby.length > 0) {
					console.log(`Found ${nearby.length} nearby municipalities`);
					// Create a list of city names and postal codes to match against
					const nearbyLocations = nearby.map((m) =>
						m.name.toLowerCase(),
					);
					// Also keep track of postal codes for better matching
					const nearbyPostcodes = nearby.map((m) => m.postcode);

					// Filter agents who are in these nearby locations
					const radiusMatches = agents.filter((agent) => {
						const agentCity =
							agent.professionalInfo?.city?.toLowerCase() || '';
						const agentPostalCode =
							agent.professionalInfo?.postalCode || '';

						return (
							nearbyLocations.includes(agentCity) ||
							nearbyPostcodes.includes(agentPostalCode)
						);
					});

					if (radiusMatches.length > 0) {
						setRadiusSearchActive(true);
						setNearbyCities(nearbyLocations); // We'll use this in useMemo, but logic is duplicated slightly for clarity here

						toast.success(
							`Aucun agent à ${searchCity}, mais voici des agents à proximité !`,
							{
								autoClose: 5000,
							},
						);
					} else {
						toast.error(
							'Aucun agent trouvé dans ce secteur ni aux alentours.',
						);
					}
				} else {
					toast.error('Aucun agent trouvé dans ce secteur.');
				}
			} else if (exactMatches.length === 0) {
				toast.error('Aucun agent trouvé dans ce secteur.');
			}
		} catch {
			toast.error('Une erreur est survenue lors de la recherche.');
		} finally {
			setSearchPerformed(true);
			setSearching(false);

			// Scroll to results
			setTimeout(() => {
				carouselRef.current?.scrollIntoView({
					behavior: 'smooth',
					block: 'start',
				});
			}, 100);
		}
	};

	const scrollCarousel = (direction: 'left' | 'right') => {
		if (carouselRef.current) {
			const scrollAmount = 320;
			carouselRef.current.scrollBy({
				left: direction === 'left' ? -scrollAmount : scrollAmount,
				behavior: 'smooth',
			});
		}
	};

	const openBookingForFirstAgent = () => {
		const availableAgents = searchPerformed ? filteredAgents : agents;
		if (availableAgents.length > 0) {
			setSelectedAgent(availableAgents[0]);
			setShowBooking(true);
			// Scroll to carousel region for context
			carouselRef.current?.scrollIntoView({
				behavior: 'smooth',
				block: 'center',
			});
		}
	};

	const scrollToSearch = () => {
		searchSectionRef.current?.scrollIntoView({
			behavior: 'smooth',
			block: 'center',
		});
	};

	// Show loading state
	if (loading) {
		return <PageLoader message="Chargement des agents..." />;
	}

	return (
		<>
			<div className="min-h-screen bg-white">
				{/* Hero Section with Search */}
				<HeroSearchSection
					searchCity={searchCity}
					searchPostalCode={searchPostalCode}
					searching={searching}
					searchPerformed={searchPerformed}
					onCitySelect={(location) => {
						setSearchCity(location.name);
						setSearchPostalCode(location.postcode);
						if (location.coordinates) {
							setSearchCoordinates(location.coordinates);
						} else {
							setSearchCoordinates(null);
						}
					}}
					onSearch={handleSearch}
				/>

				{/* Feature Cards - overlapping panel (only show when no search performed) */}
				{!searchPerformed && (
					<FeatureCards onBookingClick={openBookingForFirstAgent} />
				)}

				{/* Agent Cards List */}
				<AgentsListSection
					ref={searchSectionRef}
					carouselRef={carouselRef}
					searchPerformed={searchPerformed}
					filteredAgents={filteredAgents}
					searchCity={searchCity}
					searchPostalCode={searchPostalCode}
					radiusSearchActive={radiusSearchActive}
					onScrollCarousel={scrollCarousel}
					onResetSearch={() => {
						setSearchCity('');
						setSearchPostalCode('');
						setSearchCoordinates(null);
						setSearchPerformed(false);
						setRadiusSearchActive(false);
						setNearbyCities([]);
					}}
				/>

				{/* Info Section - Prenez rendez-vous (hide when search performed) */}
				{!searchPerformed && (
					<div className="bg-gray-50 py-8 sm:py-12 lg:py-16">
						<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
							<div className="grid lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12 items-center">
								<div className="order-2 lg:order-1">
									<div className="relative max-w-xs mx-auto lg:max-w-none">
										<Image
											src="/illustrations/search-properties.png"
											alt="Équipe professionnelle"
											width={500}
											height={400}
											className="w-full h-auto"
										/>
									</div>
								</div>
								<div className="order-1 lg:order-2">
									<h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">
										Prenez rendez-vous avec un professionnel
										de l&apos;immobilier.
									</h2>
									<p className="text-sm sm:text-base text-gray-700 mb-4 sm:mb-6 leading-relaxed">
										Estimez votre bien, préparez une mise en
										vente ou missionnez un agent pour votre
										recherche.
									</p>
									<p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4 leading-relaxed">
										Avec MonHubimmo, réservez simplement en
										ligne un rendez-vous avec un agent de
										votre secteur.
									</p>
									<p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4 leading-relaxed">
										Et une fois mandaté, votre bien peut
										être partagé sur la plateforme entre
										pros :
									</p>
									<ul className="space-y-2 mb-6 sm:mb-8">
										<li className="flex items-start gap-2 sm:gap-3">
											<span className="text-sm sm:text-base text-gray-700">
												- plus de visibilité
											</span>
										</li>
										<li className="flex items-start gap-2 sm:gap-3">
											<span className="text-sm sm:text-base text-gray-700">
												- plus d&apos;agents mobilisés
											</span>
										</li>
										<li className="flex items-start gap-2 sm:gap-3">
											<span className="text-sm sm:text-base text-gray-700">
												- une vente plus rapide et
												sécurisée
											</span>
										</li>
									</ul>
									<p className="text-sm sm:text-base text-gray-900 font-semibold mb-4 sm:mb-6">
										Avancez avec un pro de confiance.
									</p>
									<button
										onClick={scrollToSearch}
										className="bg-brand hover:bg-brand-dark text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-medium text-sm sm:text-base transition-colors shadow-md hover:shadow-lg active:scale-95 w-full sm:w-auto"
									>
										Prendre rendez-vous
									</button>
								</div>
								<div className="order-3 hidden lg:block">
									<div className="relative max-w-xs mx-auto lg:max-w-none">
										<Image
											src="/illustrations/team-group.png"
											alt="Équipe professionnelle"
											width={500}
											height={400}
											className="w-full h-auto"
										/>
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Bottom CTA Section (hide when search performed) */}
				{!searchPerformed && (
					<div className="bg-brand py-8 sm:py-12 lg:py-16">
						<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
							<div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center">
								<div className="text-white">
									<h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">
										Avec MonHubImmo, prendre rendez-vous
										avec un agent immobilier devient simple
										et rassurant.
									</h2>
									<ul className="space-y-2 sm:space-y-3">
										<li className="flex items-start gap-2 sm:gap-3">
											<span className="text-sm sm:text-base">
												• La réservation se fait en
												quelques clics, de manière
												sécurisée.
											</span>
										</li>
										<li className="flex items-start gap-2 sm:gap-3">
											<span className="text-sm sm:text-base">
												• Tous les agents présents sont
												certifiés et vérifiés pour vous
												garantir un accompagnement de
												qualité.
											</span>
										</li>
										<li className="flex items-start gap-2 sm:gap-3">
											<span className="text-sm sm:text-base">
												• Vous gagnez du temps : tout se
												fait en ligne, sans appels ni
												déplacements inutiles.
											</span>
										</li>
										<li className="flex items-start gap-2 sm:gap-3">
											<span className="text-sm sm:text-base">
												• Et surtout, vous êtes en
												contact direct avec un
												professionnel de confiance qui
												vous accompagne dans chaque
												étape de votre projet.
											</span>
										</li>
									</ul>
								</div>
								<div className="flex items-center justify-center">
									<Image
										src="/illustrations/secure-data.png"
										alt="Plateforme sécurisée et fiable"
										width={400}
										height={400}
										className="w-full h-auto max-w-sm"
									/>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Final Info Section (hide when search performed) */}
				{!searchPerformed && (
					<div className="bg-gray-50 py-8 sm:py-12 lg:py-16">
						<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
							<div className="flex flex-col lg:flex-row justify-between items-center gap-6 sm:gap-8 lg:gap-12">
								<div className="text-center lg:text-left flex-1">
									<h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
										La nouvelle façon de rencontrer un agent
										immobilier :
									</h2>
									<p className="text-base sm:text-xl text-gray-700 mb-6 sm:mb-8">
										simple, rapide, et connectée à toute une
										communauté.
									</p>
									<div className="flex justify-center lg:justify-start">
										<button
											onClick={scrollToSearch}
											className="bg-brand hover:bg-brand-dark text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-medium text-sm sm:text-base transition-colors shadow-md hover:shadow-lg active:scale-95"
										>
											Prendre rendez-vous
										</button>
									</div>
								</div>
								<div className="flex-shrink-0">
									<Image
										src="/illustrations/appointment-scheduling.png"
										alt="Agent immobilier"
										width={300}
										height={300}
										className="w-48 sm:w-64 lg:w-80 h-auto"
									/>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Agent CTA Section (hide when search performed) */}
				{!searchPerformed && (
					<div className="bg-brand py-8 sm:py-12 lg:py-16">
						<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
							<div className="bg-white/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-6 sm:p-8 lg:p-12">
								<div className="grid md:grid-cols-2 gap-6 sm:gap-8 items-center">
									<div className="flex items-center justify-center order-2 md:order-1">
										<Image
											src="/illustrations/puzzle-collaboration.png"
											alt="Collaboration entre agents"
											width={300}
											height={300}
											className="w-48 sm:w-64 lg:w-full h-auto max-w-sm"
										/>
									</div>
									<div className="text-white order-1 md:order-2">
										<h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">
											Vous êtes agent immobilier ?
										</h3>
										<p className="mb-4 sm:mb-6 text-sm sm:text-base text-white/90 leading-relaxed">
											Découvrez MonHubimmo, la plateforme
											qui rapproche les professionnels et
											les particuliers
										</p>
										<ul className="space-y-2 mb-6 sm:mb-8 text-xs sm:text-sm">
											<li className="flex items-start gap-1.5 sm:gap-2">
												<span>
													• Collaborez facilement avec
													d&apos;autres agents pour
													proposer plus de biens et de
													solutions
												</span>
											</li>
											<li className="flex items-start gap-1.5 sm:gap-2">
												<span>
													• Offrez à vos clients un
													accompagnement plus complet
													et réactif
												</span>
											</li>
											<li className="flex items-start gap-1.5 sm:gap-2">
												<span>
													• Gagnez du temps grâce à un
													espace unique pour partager
													mandats et recherches
												</span>
											</li>
											<li className="flex items-start gap-1.5 sm:gap-2">
												<span>
													• Donnez plus de visibilité
													à vos annonces et répondez
													rapidement aux besoins des
													acheteurs et vendeurs
												</span>
											</li>
										</ul>
										<p className="mb-4 sm:mb-6 font-semibold text-xs sm:text-sm">
											Avec MonHubimmo, les agents
											travaillent ensemble pour simplifier
											les projets immobiliers des
											particuliers.
										</p>
										<Link
											href="/accueil"
											className="bg-white text-brand hover:bg-gray-100 px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-medium text-sm sm:text-base transition-colors w-full sm:w-auto inline-block text-center"
										>
											EN SAVOIR PLUS
										</Link>
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Footer */}
				<Footer />
				{/* Close page wrapper */}
			</div>

			{/* Booking Modal */}
			{selectedAgent && (
				<BookAppointmentModal
					isOpen={showBooking}
					onClose={() => setShowBooking(false)}
					agent={selectedAgent!}
				/>
			)}
		</>
	);
}
