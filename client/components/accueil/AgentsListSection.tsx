import { Agent } from '@/lib/api/agentApi';
import { AgentCard } from '@/components/appointments/AgentCard';
import { RefObject, forwardRef } from 'react';

interface AgentsListSectionProps {
	carouselRef: RefObject<HTMLDivElement | null>;
	searchPerformed: boolean;
	filteredAgents: Agent[];
	searchCity: string;
	searchPostalCode: string;
	onScrollCarousel: (direction: 'left' | 'right') => void;
	onResetSearch: () => void;
	radiusSearchActive?: boolean;
}

export const AgentsListSection = forwardRef<
	HTMLDivElement,
	AgentsListSectionProps
>(
	(
		{
			carouselRef,
			searchPerformed,
			filteredAgents,
			searchCity,
			searchPostalCode,
			onScrollCarousel,
			onResetSearch,
			radiusSearchActive,
		},
		ref,
	) => {
		return (
			<div ref={ref} className="py-8 sm:py-12 lg:py-16 bg-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					{searchPerformed && filteredAgents.length === 0 ? (
						<div className="text-center py-16 sm:py-20">
							<div className="bg-gray-50 rounded-2xl p-8 sm:p-12 max-w-2xl mx-auto">
								<svg
									className="w-20 h-20 sm:w-24 sm:h-24 text-gray-300 mx-auto mb-6"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.5}
										d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
									/>
								</svg>
								<h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3">
									Aucun agent trouvé
								</h3>
								<p className="text-gray-600 mb-2">
									Nous n&apos;avons pas encore d&apos;agents
									immobiliers disponibles dans
								</p>
								<p className="text-lg font-semibold text-brand mb-8">
									{searchCity || searchPostalCode}
								</p>
								<button
									onClick={onResetSearch}
									className="bg-brand hover:bg-brand-dark text-white px-8 py-3 rounded-full font-medium transition-all shadow-md hover:shadow-lg active:scale-95 inline-flex items-center gap-2"
								>
									<svg
										className="w-5 h-5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M10 19l-7-7m0 0l7-7m-7 7h18"
										/>
									</svg>
									<span>Voir tous les agents</span>
								</button>
							</div>
						</div>
					) : searchPerformed ? (
						<>
							<div className="mb-8 pb-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
								<div>
									<h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
										{radiusSearchActive ? (
											<>
												Agents à proximité de{' '}
												{searchCity || searchPostalCode}
											</>
										) : (
											<>
												Agents immobiliers à{' '}
												{searchCity || searchPostalCode}
											</>
										)}
									</h2>
									<p className="text-gray-600">
										<span className="font-semibold text-brand">
											{filteredAgents.length}
										</span>{' '}
										agent
										{filteredAgents.length > 1
											? 's'
											: ''}{' '}
										trouvé
										{filteredAgents.length > 1 ? 's' : ''}
										{radiusSearchActive &&
											' dans un rayon de 50km'}
									</p>
								</div>
								<button
									onClick={onResetSearch}
									className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-full font-medium transition-colors inline-flex items-center gap-2"
								>
									<svg
										className="w-5 h-5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
										/>
									</svg>
									<span>Réinitialiser la recherche</span>
								</button>
							</div>
							{/* Grid List of Agents */}
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
								{filteredAgents.map((agent) => (
									<div key={agent._id} className="h-full">
										<AgentCard agent={agent} />
									</div>
								))}
							</div>
						</>
					) : (
						<div className="relative">
							{/* Navigation Buttons */}
							<button
								onClick={() => onScrollCarousel('left')}
								className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full p-2 sm:p-3 border border-gray-300 bg-transparent hover:bg-white/60 backdrop-blur-sm transition-colors hidden sm:block"
								aria-label="Précédent"
							>
								<svg
									className="w-6 h-6 text-gray-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M15 19l-7-7 7-7"
									/>
								</svg>
							</button>

							{/* Carousel */}
							<div
								ref={carouselRef}
								className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-8 sm:px-12"
								style={{
									scrollbarWidth: 'none',
									msOverflowStyle: 'none',
								}}
							>
								{filteredAgents.map((agent) => (
									<div
										key={agent._id}
										className="flex-shrink-0 w-64 sm:w-72 snap-center"
									>
										<AgentCard agent={agent} />
									</div>
								))}
							</div>

							<button
								onClick={() => onScrollCarousel('right')}
								className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full p-2 sm:p-3 border border-gray-300 bg-transparent hover:bg-white/60 backdrop-blur-sm transition-colors hidden sm:block"
								aria-label="Suivant"
							>
								<svg
									className="w-6 h-6 text-gray-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 5l7 7-7 7"
									/>
								</svg>
							</button>
						</div>
					)}
				</div>
			</div>
		);
	},
);

AgentsListSection.displayName = 'AgentsListSection';
