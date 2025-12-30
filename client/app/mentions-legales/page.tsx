'use client';
import Head from 'next/head';

const MentionsLegales = () => {
	return (
		<>
			<Head>
				<title>Mentions légales - MonHubimmo</title>
				<meta
					name="description"
					content="Mentions légales de MonHubimmo"
				/>
			</Head>

			<div className="min-h-screen bg-gray-50">
				{/* Main Content */}
				<main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
					{/* Title Section */}
					<div className="bg-white rounded-lg shadow-sm p-6 md:p-8 mb-8">
						<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
							Mentions légales
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
						{/* Section 1 - Site Editor */}
						<section className="bg-white rounded-lg shadow-sm p-6 md:p-8">
							<h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 flex items-center">
								<span className="bg-[#00b4d8] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">
									1
								</span>
								Éditeur du site
							</h2>
							<div className="ml-11 space-y-4 text-gray-700 text-sm md:text-base leading-relaxed">
								<p>
									Monhubimmo est une Société par actions
									simplifiée (SAS) au capital social de 2 000
									euros, immatriculée au Registre du Commerce
									et des Sociétés de Saint-Malo sous le numéro
									995 292 547, dont le siège social est situé
									44 Le Domaine du Golf, 35540 Le Tronchet.
								</p>
								<p>
									La société est représentée par son
									Président, Monsieur Cyril Fortin Miserel, et
									dirigée par son Directeur général, Monsieur
									Nicolas Fortin Miserel.
								</p>
								<p>
									Monhubimmo a pour activité principale la
									conception, la programmation de logiciels,
									sites web et outils informatiques, ainsi que
									la création et l&apos;hébergement de sites
									internet, et exerce son activité en
									exploitation directe.
								</p>
								<ul className="list-disc list-inside space-y-2 ml-4 mt-4">
									<li>
										<span className="font-medium">
											Dénomination sociale :
										</span>{' '}
										Monhubimmo
									</li>
									<li>
										<span className="font-medium">
											Forme juridique :
										</span>{' '}
										Société par actions simplifiée (SAS)
									</li>
									<li>
										<span className="font-medium">
											Capital social :
										</span>{' '}
										2 000 euros
									</li>
									<li>
										<span className="font-medium">
											Siège social :
										</span>{' '}
										44 Le Domaine du Golf, 35540 Le
										Tronchet, France
									</li>
									<li>
										<span className="font-medium">
											RCS :
										</span>{' '}
										Saint-Malo 995 292 547
									</li>
									<li>
										<span className="font-medium">
											SIRET :
										</span>{' '}
										995 292 547 00016
									</li>
									<li>
										<span className="font-medium">
											Numéro de TVA intracommunautaire :
										</span>{' '}
										FR82995292547
									</li>
									<li>
										<span className="font-medium">
											Président :
										</span>{' '}
										Monsieur Cyril Fortin Miserel
									</li>
									<li>
										<span className="font-medium">
											Directeur général :
										</span>{' '}
										Monsieur Nicolas Fortin Miserel
									</li>
									<li>
										<span className="font-medium">
											Directeur de la publication :
										</span>{' '}
										Monsieur Cyril Fortin Miserel
									</li>
									<li>
										<span className="font-medium">
											Nom de domaine :
										</span>{' '}
										<a
											href="https://www.monhubimmo.fr"
											className="text-[#00b4d8] hover:underline"
										>
											www.monhubimmo.fr
										</a>
									</li>
									<li>
										<span className="font-medium">
											Contact :
										</span>{' '}
										<a
											href="mailto:contact@monhubimmo.fr"
											className="text-[#00b4d8] hover:underline"
										>
											contact@monhubimmo.fr
										</a>
									</li>
								</ul>
							</div>
						</section>

						{/* Section 2 - Hosting */}
						<section className="bg-white rounded-lg shadow-sm p-6 md:p-8">
							<h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 flex items-center">
								<span className="bg-[#00b4d8] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">
									2
								</span>
								Hébergement
							</h2>
							<div className="ml-11 space-y-4 text-gray-700 text-sm md:text-base leading-relaxed">
								<p className="font-medium">
									Hébergement du site web (frontend) :
								</p>
								<ul className="list-disc list-inside space-y-2 ml-4">
									<li>
										<span className="font-medium">
											Hébergeur :
										</span>{' '}
										Vercel Inc.
									</li>
									<li>
										<span className="font-medium">
											Adresse :
										</span>{' '}
										340 S Lemon Ave #4133, Walnut, CA 91789,
										États-Unis
									</li>
									<li>
										<span className="font-medium">
											Site web :
										</span>{' '}
										<a
											href="https://vercel.com"
											target="_blank"
											rel="noopener noreferrer"
											className="text-[#00b4d8] hover:underline"
										>
											vercel.com
										</a>
									</li>
								</ul>
								<p className="font-medium mt-4">
									Hébergement des services (backend) :
								</p>
								<ul className="list-disc list-inside space-y-2 ml-4">
									<li>
										<span className="font-medium">
											Hébergeur :
										</span>{' '}
										Railway Corporation
									</li>
									<li>
										<span className="font-medium">
											Site web :
										</span>{' '}
										<a
											href="https://railway.app"
											target="_blank"
											rel="noopener noreferrer"
											className="text-[#00b4d8] hover:underline"
										>
											railway.app
										</a>
									</li>
								</ul>
								<p className="font-medium mt-4">
									Stockage des fichiers :
								</p>
								<ul className="list-disc list-inside space-y-2 ml-4">
									<li>
										<span className="font-medium">
											Hébergeur :
										</span>{' '}
										Amazon Web Services (AWS S3)
									</li>
									<li>
										<span className="font-medium">
											Région :
										</span>{' '}
										Paris (eu-west-3), Union Européenne
									</li>
								</ul>
								<p className="font-medium mt-4">
									Base de données :
								</p>
								<ul className="list-disc list-inside space-y-2 ml-4">
									<li>
										<span className="font-medium">
											Hébergeur :
										</span>{' '}
										MongoDB Atlas
									</li>
									<li>
										<span className="font-medium">
											Région :
										</span>{' '}
										Union Européenne
									</li>
								</ul>
							</div>
						</section>

						{/* Section 3 - Intellectual Property */}
						<section className="bg-white rounded-lg shadow-sm p-6 md:p-8">
							<h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 flex items-center">
								<span className="bg-[#00b4d8] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">
									3
								</span>
								Propriété intellectuelle
							</h2>
							<div className="ml-11 text-gray-700 text-sm md:text-base leading-relaxed">
								<p>
									L&apos;ensemble des contenus du site
									(textes, images, logo, charte graphique) est
									protégé par le droit de la propriété
									intellectuelle.
								</p>
								<p className="mt-4 font-medium">
									Toute reproduction, diffusion ou utilisation
									sans autorisation est interdite.
								</p>
							</div>
						</section>

						{/* Section 4 - Data Protection */}
						<section className="bg-white rounded-lg shadow-sm p-6 md:p-8">
							<h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 flex items-center">
								<span className="bg-[#00b4d8] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">
									4
								</span>
								Protection des données
							</h2>
							<div className="ml-11 text-gray-700 text-sm md:text-base leading-relaxed">
								<p>
									Pour plus d&apos;informations sur la
									collecte et le traitement de vos données
									personnelles, consultez notre{' '}
									<a
										href="/politique-de-confidentialite"
										className="text-[#00b4d8] underline hover:text-blue-600 font-medium"
									>
										Politique de confidentialité
									</a>
									.
								</p>
							</div>
						</section>

						{/* Section 5 - Contact */}
						<section className="bg-white rounded-lg shadow-sm p-6 md:p-8">
							<h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 flex items-center">
								<span className="bg-[#00b4d8] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">
									5
								</span>
								Contact
							</h2>
							<div className="ml-11 text-gray-700 text-sm md:text-base leading-relaxed">
								<p>
									Pour toute question concernant les présentes
									mentions légales, vous pouvez nous contacter
									:
								</p>
								<div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded mt-4">
									<p className="text-blue-700">
										📧 Par email :{' '}
										<a
											href="mailto:contact@monhubimmo.fr"
											className="underline font-medium"
										>
											contact@monhubimmo.fr
										</a>
									</p>
									<p className="text-blue-700 mt-2">
										📍 Par courrier : Monhubimmo, 44 Le
										Domaine du Golf, 35540 Le Tronchet,
										France
									</p>
								</div>
							</div>
						</section>

						{/* Final Notice */}
						<section className="bg-[#00b4d8] text-white rounded-lg p-6 md:p-8">
							<p className="text-center text-sm md:text-base font-medium">
								Ces mentions légales peuvent être modifiées à
								tout moment. Il appartient à l&apos;utilisateur
								de s&apos;y référer régulièrement.
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

export default MentionsLegales;
