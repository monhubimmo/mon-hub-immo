'use client';
import Head from 'next/head';

const PolitiqueCookies = () => {
	return (
		<>
			<Head>
				<title>Politique des cookies - MonHubimmo</title>
				<meta
					name="description"
					content="Politique des cookies de MonHubimmo"
				/>
			</Head>

			<div className="min-h-screen bg-gray-50">
				{/* Main Content */}
				<main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
					{/* Title Section */}
					<div className="bg-white rounded-lg shadow-sm p-6 md:p-8 mb-8">
						<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
							Politique des cookies
						</h1>
						<div className="flex items-center space-x-2 text-sm text-gray-600">
							<span className="bg-[#00b4d8] text-white px-3 py-1 rounded-full font-medium">
								MonHubimmo
							</span>
							<span>•</span>
							<span>Dernière mise à jour : 30 décembre 2025</span>
						</div>
					</div>

					{/* Content Sections */}
					<div className="space-y-8">
						{/* Introduction */}
						<section className="bg-white rounded-lg shadow-sm p-6 md:p-8">
							<div className="text-gray-700 text-sm md:text-base leading-relaxed space-y-4">
								<p>
									Le site MonHubimmo utilise des cookies afin
									d&apos;améliorer l&apos;expérience
									utilisateur, analyser la fréquentation et
									proposer des contenus adaptés.
								</p>
								<div className="bg-gray-50 border border-gray-200 p-4 rounded">
									<p className="font-semibold text-gray-800 mb-2">
										Éditeur du site :
									</p>
									<p>
										Monhubimmo SAS - 44 Le Domaine du Golf,
										35540 Le Tronchet, France
									</p>
									<p>SIRET : 995 292 547 00016</p>
								</div>
							</div>
						</section>

						{/* Section 1 - Qu'est-ce qu'un cookie ? */}
						<section className="bg-white rounded-lg shadow-sm p-6 md:p-8">
							<h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 flex items-center">
								<span className="bg-[#00b4d8] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">
									1
								</span>
								Qu&apos;est-ce qu&apos;un cookie ?
							</h2>
							<div className="ml-11 text-gray-700 text-sm md:text-base leading-relaxed">
								<p>
									Un cookie est un petit fichier texte
									enregistré sur votre appareil (ordinateur,
									tablette, smartphone) lors de la
									consultation d&apos;un site internet. Il ne
									permet pas de vous identifier directement,
									mais il enregistre des informations
									relatives à votre navigation.
								</p>
							</div>
						</section>

						{/* Section 2 - Types de cookies */}
						<section className="bg-white rounded-lg shadow-sm p-6 md:p-8">
							<h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 flex items-center">
								<span className="bg-[#00b4d8] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">
									2
								</span>
								Quels types de cookies utilisons-nous ?
							</h2>
							<div className="ml-11 space-y-4 text-gray-700 text-sm md:text-base leading-relaxed">
								<ul className="space-y-3">
									<li className="flex items-start">
										<span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold mr-3 mt-0.5 whitespace-nowrap">
											NÉCESSAIRES
										</span>
										<div>
											<strong>
												Cookies strictement nécessaires
												:
											</strong>{' '}
											indispensables au fonctionnement du
											site (ex. sécurisation, accès au
											compte).
										</div>
									</li>
									<li className="flex items-start">
										<span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold mr-3 mt-0.5 whitespace-nowrap">
											PERFORMANCE
										</span>
										<div>
											<strong>
												Cookies de performance et
												statistiques :
											</strong>{' '}
											permettent de mesurer
											l&apos;audience et d&apos;améliorer
											les services proposés.
										</div>
									</li>
									<li className="flex items-start">
										<span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-semibold mr-3 mt-0.5 whitespace-nowrap">
											CONFORT
										</span>
										<div>
											<strong>
												Cookies de personnalisation (si
												utilisés) :
											</strong>{' '}
											adaptés à vos préférences de
											navigation.
										</div>
									</li>
									<li className="flex items-start">
										<span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-semibold mr-3 mt-0.5 whitespace-nowrap">
											TIERS
										</span>
										<div>
											<strong>Cookies tiers :</strong>{' '}
											peuvent être déposés par des
											partenaires (ex. réseaux sociaux,
											outils d&apos;analyse).
										</div>
									</li>
								</ul>
							</div>
						</section>

						{/* Section 3 - Consentement et durée */}
						<section className="bg-white rounded-lg shadow-sm p-6 md:p-8">
							<h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 flex items-center">
								<span className="bg-[#00b4d8] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">
									3
								</span>
								Consentement et durée
							</h2>
							<div className="ml-11 space-y-4 text-gray-700 text-sm md:text-base leading-relaxed">
								<p>
									Lors de votre première visite, une bannière
									vous informe de l&apos;utilisation de
									cookies. Vous pouvez accepter, refuser ou
									paramétrer vos choix.
								</p>
								<div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
									<p className="font-semibold text-blue-800 mb-2">
										Durée de conservation
									</p>
									<p className="text-blue-700">
										La durée de conservation des cookies est
										limitée à{' '}
										<strong>13 mois maximum</strong>,
										conformément à la réglementation.
									</p>
								</div>
							</div>
						</section>

						{/* Section 4 - Gestion des cookies */}
						<section className="bg-white rounded-lg shadow-sm p-6 md:p-8">
							<h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 flex items-center">
								<span className="bg-[#00b4d8] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">
									4
								</span>
								Gestion des cookies
							</h2>
							<div className="ml-11 space-y-4 text-gray-700 text-sm md:text-base leading-relaxed">
								<p>
									Vous pouvez à tout moment gérer ou
									désactiver les cookies en paramétrant votre
									navigateur.
								</p>
								<div className="bg-gray-50 border border-gray-200 p-4 rounded">
									<p className="font-semibold text-gray-800 mb-2 flex items-center">
										<span className="mr-2">⚙️</span>
										Pour plus d&apos;informations, consultez
										les liens d&apos;aide :
									</p>
									<div className="flex flex-wrap gap-2">
										<span className="bg-white border border-gray-300 px-3 py-1 rounded-full text-sm">
											Chrome
										</span>
										<span className="bg-white border border-gray-300 px-3 py-1 rounded-full text-sm">
											Firefox
										</span>
										<span className="bg-white border border-gray-300 px-3 py-1 rounded-full text-sm">
											Safari
										</span>
										<span className="bg-white border border-gray-300 px-3 py-1 rounded-full text-sm">
											Edge
										</span>
									</div>
								</div>
							</div>
						</section>

						{/* Final Notice */}
						<section className="bg-[#00b4d8] text-white rounded-lg p-6 md:p-8">
							<p className="text-center text-sm md:text-base font-medium">
								En continuant à naviguer sur MonHubimmo, vous
								acceptez l&apos;utilisation des cookies selon
								les modalités décrites ci-dessus.
							</p>
						</section>
					</div>

					{/* Back to Top Button */}
					<div className="text-center mt-12">
						<button
							onClick={() =>
								window.scrollTo({ top: 0, behavior: 'smooth' })
							}
							className="bg-white text-[#00b4d8] border border-[#00b4d8] px-6 py-3 rounded-full font-medium hover:bg-[#00b4d8] hover:text-white transition-colors duration-200"
						>
							↑ Retour en haut
						</button>
					</div>
				</main>
			</div>
		</>
	);
};

export default PolitiqueCookies;
