'use client';
import Head from 'next/head';

const Cookies = () => {
	return (
		<>
			<Head>
				<title>Cookies - MonHubimmo</title>
				<meta name="description" content="Cookies de MonHubimmo" />
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
						{/* Main Content */}
						<section className="bg-white rounded-lg shadow-sm p-6 md:p-8">
							<div className="space-y-6 text-gray-700 text-sm md:text-base leading-relaxed">
								<p>
									En poursuivant votre navigation sur
									MonHubimmo, vous acceptez l&apos;utilisation
									de cookies nécessaires au bon fonctionnement
									du site.
								</p>

								<p>
									Vous pouvez toutefois paramétrer vos
									préférences à tout moment via notre bandeau
									de gestion des cookies.
								</p>

								<div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
									<p className="text-blue-700">
										Pour en savoir plus sur
										l&apos;utilisation de vos données et vos
										droits, consultez notre{' '}
										<a
											href="/politique-de-confidentialite"
											className="text-[#00b4d8] underline hover:text-blue-600 font-medium"
										>
											Politique de confidentialité
										</a>
										.
									</p>
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

export default Cookies;
