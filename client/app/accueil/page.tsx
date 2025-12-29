'use client';

import {
	HeroSection,
	BenefitsSection,
	AppointmentSection,
} from '@/components/landing';
import Link from 'next/link';
import Image from 'next/image';
import { FaUserCog, FaUser } from 'react-icons/fa';
import { Footer } from '@/components/footer/footer';

export default function LandingPage() {
	return (
		<main className="bg-[#00b4d8] min-h-screen text-white font-sans">
			<HeroSection />

			<section className="bg-white py-16 px-6">
				<div className="max-w-4xl mx-auto">
					<p className="text-center text-lg font-medium bg-[#00b4d8] text-white p-4 rounded-lg">
						La plateforme qui fait tomber les frontières entre
						agents
					</p>
				</div>
			</section>

			<BenefitsSection />

			<AppointmentSection />

			<section className="bg-white pb-16 px-6 text-[#034752]">
				<div className="max-w-4xl mx-auto text-center">
					<h2 className="text-xl md:text-2xl font-bold mb-6">
						<span className="inline-flex items-center gap-2">
							<span>
								Vous êtes mandataire immobiliers, agent
								immobilier ou négociateurs vrp chez IAD, MAISON
								ROUGE, SAFTI, GUY HOQUET, BSK, NAOS, LAFORET,
								EFFICITY ou un autre réseau ?
							</span>
						</span>
					</h2>

					<p className="mb-4 text-md md:text-lg">
						Vous travaillez dur pour vos clients, mais vous êtes
						souvent seul face à vos annonces, vos recherches
						acquéreurs ou vos exclusivités à diffuser…
					</p>

					<p className="text-md md:text-lg font-semibold">
						<strong>MonHubimmo</strong>
						<strong>
							, la 1ère plateforme collaborative 100% dédiée aux
							professionnels de l&apos;immobilier
						</strong>
						, toutes enseignes confondues.
					</p>
				</div>
			</section>

			<section className="bg-white pt-16 px-6 text-[#034752]">
				<div className="max-w-6xl mx-auto">
					<h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
						Témoignages
					</h2>
					<p className="text-xl text-center text-gray-600 mb-12">
						Ce que pensent les agents immobiliers
					</p>

					<div className="grid md:grid-cols-2 gap-8">
						<TestimonialCard
							name="Wilhelm M."
							role="Mandataire SAFTI"
							profileUrl="https://www.safti.fr/votre-conseiller-safti/wilhelm-mongis"
							image="/wilhelm-m.jpeg"
							testimonial="J'ai hâte que Monhubimmo sorte ! Enfin un
								outil où l'on pourra partager facilement
								nos mandats et nos prospects, sans se limiter à
								son propre réseau."
						/>

						<TestimonialCard
							name="Fanny D."
							role="Mandataire IAD"
							profileUrl="https://www.iadfrance.fr/conseiller-immobilier/fanny.dubois-tillon"
							image="/fanny-d.webp"
							testimonial="Chez iad, le partage fait partie de notre ADN
								: nous travaillons déjà dans un esprit
								collaboratif, avec un respect mutuel et beaucoup
								d'humain au cœur de chaque échange.
								Forcément, je suis la première fervente de ce
								type de processus, car je suis convaincue que
								c'est grâce à l'ouverture et à la mise
								en commun que l'on crée de vraies
								opportunités.."
						/>

						<TestimonialCard
							name="Floriane B."
							role="Mandataire IAD"
							profileUrl="https://www.iadfrance.fr/conseiller-immobilier/floriane.bougeard?utm_source=google_ads&utm_medium=cpc&utm_campaign=performancemaxestimation&gad_source=1&gad_campaignid=22411348977&gbraid=0AAAAADHgQbWDwTTIIgktPGGAYdN-KkpId&gclid=Cj0KCQjwn8XFBhCxARIsAMyH8Btr0z3d63EeOoJNIvMy-b8EoEbuTJn5hftAyFZsv1t8ZCU9bnif__0aAnDsEALw_wcB"
							image="/Floriane.jpeg"
							testimonial="Je suis ravie de découvrir Monhubimmo qui va
								rapidement devenir un outil indispensable à nous
								tous professionnels de l'immobilier. Le partage
								est une valeur clé dans notre réseau et
								Monhubimmo aidera forcément à faciliter les
								collaborations et donc les futures réussites
								d'acquisition et de vente de nos clients
								respectifs. Bravo pour ce beau projet et longue vie à
								Monhubimmo"
						/>

						<TestimonialVideoCard
							name="Emilie C."
							role="Mandataire NAOS Immobilier et Ambassadrice de monhubimmo"
							profileUrl="https://emilie-miniacmorvan.naosimmobilier.com/"
							image="/Emilie.jpg"
							videoSrc="/Emilie.mp4"
						/>
					</div>
				</div>
			</section>

			<section className="bg-white py-16 px-6 text-[#034752]">
				<div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center">
					<div className="flex flex-col items-center text-center">
						<h2 className="text-3xl md:text-4xl font-bold mb-4">
							La plateforme qui connecte
							<br /> les professionnels de l&apos;immobilier
						</h2>
						<p className="mb-6">
							Centralisez vos annonces, collaborez entre agents,
							trouvez plus vite les bons biens pour vos clients.
						</p>
						<ul className="flex flex-col text-left">
							<li className="flex items-center gap-3">
								<svg
									className="w-5 h-5 text-[#00b4d8] flex-shrink-0"
									fill="none"
									stroke="currentColor"
									strokeWidth={2}
									viewBox="0 0 24 24"
								>
									<path d="M16 12a4 4 0 01-8 0V8a4 4 0 018 0v4z" />
									<path d="M12 16v2m0 0h-4m4 0h4" />
								</svg>
								<span>Réseau privé entre agents</span>
							</li>
							<li className="flex items-center gap-3">
								<svg
									className="w-5 h-5 text-[#00b4d8] flex-shrink-0"
									fill="none"
									stroke="currentColor"
									strokeWidth={2}
									viewBox="0 0 24 24"
								>
									<path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
								</svg>
								<span>Annonces internes et exclusives</span>
							</li>
							<li className="flex items-center gap-3">
								<svg
									className="w-5 h-5 text-[#00b4d8] flex-shrink-0"
									fill="none"
									stroke="currentColor"
									strokeWidth={2}
									viewBox="0 0 24 24"
								>
									<path d="M12 8v8m0 0l-4-4m4 4l4-4" />
									<circle cx="12" cy="12" r="10" />
								</svg>
								<span>Apporteurs d&apos;affaires intégrés</span>
							</li>
						</ul>
						<Link
							href="/auth/login"
							className="mt-6 bg-[#00b4d8] text-white px-6 py-2 rounded-full font-semibold hover:bg-[#0094b3] transition"
						>
							Je réserve ma place
						</Link>
					</div>

					<VideoPlayer src="/partie.mp4" />
				</div>

				<section className="bg-[#f8f9fa] w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] mt-16 px-6 text-[#034752]">
					<div className="max-w-6xl mx-auto">
						<h2 className="text-3xl md:text-4xl pt-13 font-bold text-center">
							Comment ça marche ?
						</h2>

						<div className="p-8 md:p-12">
							<HowItWorksSteps />

							<div className="mt-12 pt-8 border-t border-gray-200">
								<div className="text-center">
									<div className="w-15 h-15 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
										<svg
											className="w-10 h-10 text-white"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
									</div>
									<h3 className="text-xl font-bold text-green-600 mb-4">
										Résultat
									</h3>
									<p className="text-gray-700 max-w-3xl mx-auto">
										Un client satisfait, un vendeur comblé
										et deux professionnels gagnants.
									</p>
								</div>
							</div>
						</div>
					</div>
				</section>

				<KeyFeaturesSection />

				<VideoPlayer src="/second.mp4" className="mt-12" />

				<hr className="my-10 border-gray-300 max-w-6xl mx-auto" />

				<ForWhoSection />
			</section>

			<FAQSection />
			<Footer />
		</main>
	);
}

interface TestimonialCardProps {
	name: string;
	role: string;
	profileUrl: string;
	image: string;
	testimonial: string;
}

const TestimonialCard = ({
	name,
	role,
	profileUrl,
	image,
	testimonial,
}: TestimonialCardProps) => (
	<div className="bg-gray-50 rounded-lg p-8 shadow-sm">
		<div className="flex items-start gap-4 mb-4">
			<div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 relative">
				<Image
					src={image}
					alt={name}
					fill
					className="object-cover"
					onError={(e) => {
						e.currentTarget.style.display = 'none';
						const fallback = e.currentTarget
							.nextElementSibling as HTMLElement;
						if (fallback) fallback.style.display = 'flex';
					}}
				/>
				<div
					className="w-16 h-16 bg-[#00b4d8] rounded-full flex items-center justify-center absolute inset-0"
					style={{ display: 'none' }}
				>
					<span className="text-white font-bold text-xl">
						{name
							.split(' ')
							.map((n) => n[0])
							.join('')}
					</span>
				</div>
			</div>
			<div>
				<h3 className="font-bold text-lg">{name}</h3>
				<p className="text-gray-600">{role}</p>
				<a
					href={profileUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="text-[#00b4d8] text-sm hover:underline"
				>
					Voir le profil →
				</a>
			</div>
		</div>
		<StarRating />
		<blockquote className="text-gray-700 italic leading-relaxed">
			« {testimonial} »
		</blockquote>
	</div>
);

interface TestimonialVideoCardProps {
	name: string;
	role: string;
	profileUrl: string;
	image: string;
	videoSrc: string;
}

const TestimonialVideoCard = ({
	name,
	role,
	profileUrl,
	image,
	videoSrc,
}: TestimonialVideoCardProps) => (
	<div className="bg-gray-50 rounded-lg p-8 shadow-sm">
		<div className="flex items-start gap-4 mb-4">
			<div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 relative">
				<Image
					src={image}
					alt={name}
					fill
					className="object-cover"
					onError={(e) => {
						e.currentTarget.style.display = 'none';
						const fallback = e.currentTarget
							.nextElementSibling as HTMLElement;
						if (fallback) fallback.style.display = 'flex';
					}}
				/>
				<div
					className="w-16 h-16 bg-[#00b4d8] rounded-full flex items-center justify-center absolute inset-0"
					style={{ display: 'none' }}
				>
					<span className="text-white font-bold text-xl">
						{name
							.split(' ')
							.map((n) => n[0])
							.join('')}
					</span>
				</div>
			</div>
			<div>
				<h3 className="font-bold text-lg">{name}</h3>
				<p className="text-gray-600">{role}</p>
				<a
					href={profileUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="text-[#00b4d8] text-sm hover:underline"
				>
					Voir le profil →
				</a>
			</div>
		</div>
		<StarRating />
		<VideoPlayer src={videoSrc} className="max-w-md mx-auto h-96" />
	</div>
);

const StarRating = () => (
	<div className="flex items-center gap-1 mb-4">
		{[...Array(5)].map((_, i) => (
			<svg
				key={i}
				className="w-5 h-5 text-yellow-400 fill-current"
				viewBox="0 0 20 20"
			>
				<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
			</svg>
		))}
		<span className="text-sm text-gray-600 ml-2">(5/5)</span>
	</div>
);

interface VideoPlayerProps {
	src: string;
	className?: string;
}

const VideoPlayer = ({ src, className = '' }: VideoPlayerProps) => (
	<div className={`relative w-full h-96 max-w-md mx-auto ${className}`}>
		<video
			className="w-full h-full object-cover rounded-lg shadow-xl"
			controls
		>
			<source src={src} type="video/mp4" />
			Votre navigateur ne supporte pas la lecture de vidéos.
		</video>
		<button
			className="absolute inset-0 flex items-center justify-center"
			onClick={(e) => {
				const video = e.currentTarget
					.previousElementSibling as HTMLVideoElement;
				if (video.paused) {
					video.play();
					e.currentTarget.style.display = 'none';
				}
			}}
		>
			<div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
				<svg
					className="w-12 h-12 text-[#00b4d8]"
					fill="currentColor"
					viewBox="0 0 20 20"
				>
					<path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
				</svg>
			</div>
		</button>
	</div>
);

const HowItWorksSteps = () => (
	<div className="grid md:grid-cols-5 gap-8 items-center">
		<HowItWorksStep
			icon={
				<svg
					className="w-8 h-8 text-white"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
					/>
				</svg>
			}
			step="1. Client sans solution"
			description="Un agent accueille un client, mais aucun
bien de son portefeuille ne correspond."
		/>

		<Arrow />

		<HowItWorksStep
			icon={
				<svg
					className="w-8 h-8 text-white"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
			}
			step="2. Recherche rapide"
			description="Grâce à MonHubimmo, il identifie en
quelques clics le bien idéal publié par
un confrère."
		/>

		<Arrow />

		<HowItWorksStep
			icon={
				<svg
					className="w-8 h-8 text-white"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
					/>
				</svg>
			}
			step="3. Collaboration"
			description="Ils décident de collaborer : la visite
se fait ensemble, le confrère conclut la
vente, selon leur accord, la commission
est partagée."
		/>
	</div>
);

interface HowItWorksStepProps {
	icon: React.ReactNode;
	step: string;
	description: string;
}

const HowItWorksStep = ({ icon, step, description }: HowItWorksStepProps) => (
	<div className="text-center">
		<div className="w-16 h-16 bg-[#00b4d8] rounded-full flex items-center justify-center mx-auto mb-4">
			{icon}
		</div>
		<h3 className="font-semibold text-lg mb-2">{step}</h3>
		<p className="text-sm text-gray-600">{description}</p>
	</div>
);

const Arrow = () => (
	<div className="hidden md:flex justify-center">
		<svg
			className="w-8 h-8 text-[#00b4d8]"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M13 7l5 5m0 0l-5 5m5-5H6"
			/>
		</svg>
	</div>
);

const KeyFeaturesSection = () => (
	<section className="bg-white py-16 px-6 text-[#034752]">
		<div className="max-w-6xl mx-auto">
			<h3 className="text-2xl font-bold text-center mb-12">
				Fonctionnalités clés
			</h3>

			<div className="grid md:grid-cols-2 gap-10">
				<FeatureItem
					icon={
						<svg
							className="w-6 h-6 text-[#00b4d8]"
							fill="none"
							stroke="currentColor"
							strokeWidth={2}
							viewBox="0 0 24 24"
						>
							<path d="M12 2l7 4v6c0 5.25-3.5 9.74-7 10-3.5-.26-7-4.75-7-10V6l7-4z" />
						</svg>
					}
					title="Partage d'annonces privé"
					description="Déposez et consultez des biens, entre
pros, en toute confidentialité."
				/>

				<FeatureItem
					icon={
						<svg
							className="w-6 h-6 text-[#00b4d8]"
							fill="none"
							stroke="currentColor"
							strokeWidth={2}
							viewBox="0 0 24 24"
						>
							<path d="M21 12.79A9 9 0 1111.21 3H12a9 9 0 019 9z" />
						</svg>
					}
					title="Apporteurs d'affaires intégrés"
					description="Offrez une interface simple à vos
apporteurs pour qu'ils vous transmettent
des opportunités."
				/>

				<FeatureItem
					icon={
						<svg
							className="w-6 h-6 text-[#00b4d8]"
							fill="none"
							stroke="currentColor"
							strokeWidth={2}
							viewBox="0 0 24 24"
						>
							<path d="M8 17l4-4 4 4m0-5V3" />
						</svg>
					}
					title="Collaboration simplifiée"
					description="Mettez en relation les bons biens avec
les bons clients grâce à un système
connecté."
				/>

				<FeatureItem
					icon={
						<svg
							className="w-6 h-6 text-[#00b4d8]"
							fill="none"
							stroke="currentColor"
							strokeWidth={2}
							viewBox="0 0 24 24"
						>
							<path d="M17 9V7a4 4 0 00-8 0v2M5 10h14l-1 10H6L5 10z" />
						</svg>
					}
					title="Application mobile intuitive"
					description="Une interface claire, rapide, pensée
pour le terrain."
				/>
			</div>
		</div>
	</section>
);

interface FeatureItemProps {
	icon: React.ReactNode;
	title: string;
	description: string;
}

const FeatureItem = ({ icon, title, description }: FeatureItemProps) => (
	<div className="flex items-start gap-4">
		<div className="flex-shrink-0">{icon}</div>
		<div>
			<h4 className="font-semibold text-lg mb-1">{title}</h4>
			<p className="text-sm text-gray-700">{description}</p>
		</div>
	</div>
);

const ForWhoSection = () => (
	<section className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-10 text-[#034752]">
		<div>
			<h4 className="text-lg font-bold mb-6">Pour qui ?</h4>

			<div className="flex items-start gap-3 mb-6">
				<FaUser className="w-9 h-9 text-[#00b4d8] flex-shrink-0" />
				<div>
					<p className="font-semibold">Agents immobiliers</p>
					<p className="text-sm text-gray-700">
						Trouvez plus de mandats grâce à la puissance du réseau.
					</p>
				</div>
			</div>

			<div className="flex items-start gap-3">
				<FaUserCog className="w-10 h-10 text-[#00b4d8] flex-shrink-0" />
				<div>
					<p className="font-semibold">Apporteurs d&apos;affaires</p>
					<p className="text-sm text-gray-700">
						MonHubimmo vous ouvre aussi les portes du réseau caché
						des particuliers et prescripteurs locaux. Ils peuvent
						désormais publier leurs propres annonces, consultables
						par les mandataires sur la plateforme.
					</p>
					<p className="text-sm text-gray-700 mt-4">
						Des particuliers, amis, voisins ou commerçants qui
						connaissent un bien à vendre ou un acheteur potentiel ?
						C&apos;est un véritable levier de prospection et de
						mandats avant même leur diffusion sur les portails.
					</p>
				</div>
			</div>
		</div>

		<div className="flex flex-col">
			<h4 className="text-lg font-bold mb-6">Testez dès maintenant</h4>
			<ul className="space-y-2 text-sm text-gray-700 mb-6">
				<li className="flex items-center gap-2">
					<span className="text-[#00b4d8]">✓</span> Créez un compte
					gratuit
				</li>
				<li className="flex items-center gap-2">
					<span className="text-[#00b4d8]">✓</span> Sans engagement
				</li>
				<li className="flex items-center gap-2">
					<span className="text-[#00b4d8]">✓</span> Version MVP +
					évolutive
				</li>
			</ul>
			<Link
				href="/auth/login"
				className="bg-[#00b4d8] text-white px-6 py-2 rounded-full font-semibold hover:bg-[#0094b3] transition self-start"
			>
				M&apos;inscrire en avant première
			</Link>
		</div>
	</section>
);

const FAQSection = () => {
	const faqs = [
		{
			question: "Qu'est-ce que MonHubimmo ?",
			answer: "MonHubimmo est une plateforme collaborative 100 % dédiée aux professionnels de l'immobilier. Elle permet de partager des annonces privées, collaborer entre agents et faciliter la mise en relation des biens avec les clients.",
		},
		{
			question: "Comment puis-je m'inscrire ?",
			answer: 'L\'inscription est simple et rapide. Cliquez sur "Tester gratuitement" et créez votre compte en quelques minutes.',
		},
		{
			question: 'Combien coûte MonHubimmo ?',
			answer: 'Profitez de 3 mois gratuits dès le lancement. Ensuite, un abonnement mensuel abordable vous donne accès à toutes les fonctionnalités.',
		},
		{
			question: 'Puis-je partager mes mandats exclusifs ?',
			answer: 'Oui ! Vous contrôlez entièrement ce que vous partagez : mandats simples, exclusifs ou off-market.',
		},
		{
			question:
				"Les apporteurs d'affaires peuvent-ils aussi utiliser la plateforme ?",
			answer: "Absolument. MonHubimmo offre une interface simple et intuitive pour les apporteurs d'affaires qui souhaitent transmettre des opportunités aux agents.",
		},
		{
			question: 'Mes données sont-elles sécurisées ?',
			answer: 'Oui. Nous prenons la sécurité très au sérieux : toutes les données sont chiffrées et conformes aux normes RGPD.',
		},
		{
			question: 'Quels sont les bénéfices de MonHubimmo ?',
			answer: (
				<ul className="space-y-2">
					<li className="flex items-center gap-2">
						<span className="text-[#00b4d8]">•</span> Plus de
						mandats partagés, plus de ventes
					</li>
					<li className="flex items-center gap-2">
						<span className="text-[#00b4d8]">•</span> Plus
						d&apos;acheteurs potentiels grâce aux échanges entre
						pros
					</li>
					<li className="flex items-center gap-2">
						<span className="text-[#00b4d8]">•</span> Gain de temps
						avec une messagerie intégrée et un historique clair
					</li>
					<li className="flex items-center gap-2">
						<span className="text-[#00b4d8]">•</span> Opportunités
						supplémentaires grâce aux apporteurs d&apos;affaires
					</li>
				</ul>
			),
		},
		{
			question: 'Et si je suis déjà dans un réseau collaboratif ?',
			answer: 'Peu importe votre réseau ou enseigne (iad, Safti, Orpi, Century 21, Laforêt…), MonHubimmo permet de collaborer au-delà des frontières de votre réseau.',
		},
		{
			question:
				'Est-ce que MonHubimmo prend une commission sur les ventes ?',
			answer: "Non. MonHubimmo ne prend aucune commission. C'est uniquement un abonnement mensuel qui donne accès à toutes les fonctionnalités.",
		},
	];

	return (
		<section className="bg-white pb-16 px-6 text-[#034752]">
			<div className="max-w-4xl mx-auto">
				<h2 className="text-3xl md:text-4xl font-bold text-center mb-10">
					Questions les plus fréquentes
				</h2>

				<div className="space-y-4">
					{faqs.map((faq, index) => (
						<FAQItem
							key={index}
							question={faq.question}
							answer={faq.answer}
						/>
					))}
				</div>
			</div>
		</section>
	);
};

interface FAQItemProps {
	question: string;
	answer: React.ReactNode;
}

const FAQItem = ({ question, answer }: FAQItemProps) => (
	<details className="group border border-gray-200 rounded-lg overflow-hidden">
		<summary className="flex justify-between items-center p-6 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
			<h3 className="font-semibold text-lg">{question}</h3>
			<svg
				className="w-5 h-5 text-[#00b4d8] group-open:rotate-180 transition-transform"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M19 9l-7 7-7-7"
				/>
			</svg>
		</summary>
		<div className="p-6 bg-white">
			{typeof answer === 'string' ? <p>{answer}</p> : answer}
		</div>
	</details>
);
