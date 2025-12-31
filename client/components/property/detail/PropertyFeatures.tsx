import React from 'react';
import type { Property } from '@/lib/api/propertyApi';
import { formatMonthYear } from '@/lib/utils/date';

interface PropertyFeaturesProps {
	property: Property;
}

export const PropertyFeatures = ({ property }: PropertyFeaturesProps) => {
	return (
		<div className="mt-6 bg-white rounded-lg shadow-lg p-6">
			<h2 className="text-xl font-semibold text-gray-900 mb-6">
				Caractéristiques
			</h2>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{/* Basic Property Info */}
				{!!property.rooms && (
					<FeatureItem
						icon="building"
						color="blue"
						label={`${property.rooms} pièces`}
					/>
				)}

				{!!property.bedrooms && (
					<FeatureItem
						icon="bed"
						color="purple"
						label={`${property.bedrooms} chambres`}
					/>
				)}

				{!!property.bathrooms && (
					<FeatureItem
						icon="bath"
						color="teal"
						label={`${property.bathrooms} salle${property.bathrooms > 1 ? 's' : ''} de bain`}
					/>
				)}

				{!!property.showerRooms && (
					<FeatureItem
						icon="bath"
						color="cyan"
						label={`${property.showerRooms} salle${property.showerRooms > 1 ? 's' : ''} d'eau`}
					/>
				)}

				{/* Surface Information */}
				{!!property.surface && (
					<FeatureItem
						icon="ruler"
						color="green"
						label={`${property.surface} m² habitable`}
					/>
				)}

				{!!property.landArea && (
					<FeatureItem
						icon="land"
						color="yellow"
						label={`${property.landArea} m² terrain`}
					/>
				)}

				{/* Building Information */}
				{property.floor != null && (
					<FeatureItem
						icon="floor"
						color="indigo"
						label={`Étage ${property.floor}${property.totalFloors ? `/${property.totalFloors}` : ''}`}
					/>
				)}

				{!!property.levels && (
					<FeatureItem
						icon="levels"
						color="orange"
						label={`${property.levels} niveaux`}
					/>
				)}

				{!!property.parkingSpaces && (
					<FeatureItem
						icon="parking"
						color="blue"
						label={`${property.parkingSpaces} places parking`}
					/>
				)}

				{/* Property Condition & Type */}
				{property.condition && (
					<FeatureItem
						icon="check"
						color="pink"
						label={`État: ${getConditionLabel(property.condition)}`}
					/>
				)}

				{property.saleType && (
					<FeatureItem
						icon="money"
						color="red"
						label={getSaleTypeLabel(property.saleType)}
					/>
				)}

				{/* Energy Rating */}
				{property.energyRating && (
					<FeatureItem
						icon="energy"
						color="green"
						label={`DPE: ${property.energyRating}`}
					/>
				)}

				{property.gasEmissionClass && (
					<FeatureItem
						icon="gas"
						color="gray"
						label={`GES: ${property.gasEmissionClass}`}
					/>
				)}

				{/* Financial Info */}
				{!!property.annualCondoFees && (
					<FeatureItem
						icon="fees"
						color="yellow"
						label={`${property.annualCondoFees}€/an charges`}
					/>
				)}

				{/* Availability */}
				{property.availableFromDate && (
					<FeatureItem
						icon="calendar"
						color="blue"
						label={`Disponible: ${formatMonthYear(property.availableFromDate)}`}
					/>
				)}

				{/* Amenities */}
				{property.hasParking && (
					<FeatureItem
						icon="checkmark"
						color="green"
						label="Parking"
					/>
				)}

				{property.hasGarden && (
					<FeatureItem
						icon="checkmark"
						color="green"
						label="Jardin"
					/>
				)}

				{property.hasElevator && (
					<FeatureItem
						icon="checkmark"
						color="green"
						label="Ascenseur"
					/>
				)}

				{property.hasBalcony && (
					<FeatureItem
						icon="checkmark"
						color="green"
						label="Balcon"
					/>
				)}

				{property.hasTerrace && (
					<FeatureItem
						icon="checkmark"
						color="green"
						label="Terrasse"
					/>
				)}

				{property.hasAirConditioning && (
					<FeatureItem
						icon="checkmark"
						color="green"
						label="Climatisation"
					/>
				)}
			</div>
		</div>
	);
};

// Helper component for feature items
interface FeatureItemProps {
	icon: string;
	color: string;
	label: string;
}

const FeatureItem = ({ icon, color, label }: FeatureItemProps) => {
	// Color mapping with proper Tailwind classes
	const colorMap: Record<
		string,
		{ bg: string; icon: string; border: string }
	> = {
		blue: {
			bg: 'bg-blue-50',
			icon: 'text-blue-600',
			border: 'border-blue-100',
		},
		purple: {
			bg: 'bg-purple-50',
			icon: 'text-purple-600',
			border: 'border-purple-100',
		},
		teal: {
			bg: 'bg-teal-50',
			icon: 'text-teal-600',
			border: 'border-teal-100',
		},
		green: {
			bg: 'bg-green-50',
			icon: 'text-green-600',
			border: 'border-green-100',
		},
		yellow: {
			bg: 'bg-yellow-50',
			icon: 'text-yellow-600',
			border: 'border-yellow-100',
		},
		indigo: {
			bg: 'bg-indigo-50',
			icon: 'text-indigo-600',
			border: 'border-indigo-100',
		},
		orange: {
			bg: 'bg-orange-50',
			icon: 'text-orange-600',
			border: 'border-orange-100',
		},
		pink: {
			bg: 'bg-pink-50',
			icon: 'text-pink-600',
			border: 'border-pink-100',
		},
		red: {
			bg: 'bg-red-50',
			icon: 'text-red-600',
			border: 'border-red-100',
		},
		gray: {
			bg: 'bg-gray-50',
			icon: 'text-gray-600',
			border: 'border-gray-100',
		},
	};

	const colors = colorMap[color] || colorMap.gray;

	return (
		<div
			className={`flex items-center space-x-3 p-4 rounded-xl border ${colors.border} ${colors.bg} hover:shadow-md transition-all duration-200`}
		>
			<div
				className={`${colors.bg} p-2.5 rounded-full border ${colors.border}`}
			>
				<svg
					className={`w-5 h-5 ${colors.icon}`}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					{getIconPath(icon)}
				</svg>
			</div>
			<span className="text-gray-700 font-medium text-sm">{label}</span>
		</div>
	);
};

// Icon path helper with enhanced icons
const getIconPath = (icon: string) => {
	const paths: Record<string, React.ReactElement> = {
		building: (
			<>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
				/>
			</>
		),
		bed: (
			<>
				<rect
					x="2"
					y="10"
					width="20"
					height="8"
					rx="1"
					strokeWidth="2"
					fill="none"
				/>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					d="M2 18v3m20-3v3M6 10V7a2 2 0 012-2h8a2 2 0 012 2v3"
				/>
			</>
		),
		bath: (
			<>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					d="M6 7V4.5A1.5 1.5 0 017.5 3v0A1.5 1.5 0 019 4.5V7M4 10h16M4 10c0-1.5.5-3 2-3h12c1.5 0 2 1.5 2 3M4 10v7a3 3 0 003 3h10a3 3 0 003-3v-7M6 20v1m12-1v1"
				/>
			</>
		),
		ruler: (
			<>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					d="M3 5h18M3 12h18M3 19h18M7 5v3M12 5v3M17 5v3M7 16v3M12 16v3M17 16v3"
				/>
			</>
		),
		land: (
			<>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					d="M4 19l4-7 4 3 4-8 4 4v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-0z"
				/>
				<circle cx="8" cy="8" r="2" strokeWidth="2" fill="none" />
			</>
		),
		floor: (
			<>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					d="M3 12h18M3 6h18M3 18h18"
				/>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					d="M12 3v3m0 6v3m0 6v3"
					opacity="0.5"
				/>
			</>
		),
		levels: (
			<>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					d="M4 20h16M4 14h16M4 8h16"
				/>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					d="M12 4v16"
				/>
			</>
		),
		parking: (
			<>
				<rect
					x="3"
					y="5"
					width="18"
					height="14"
					rx="2"
					strokeWidth="2"
					fill="none"
				/>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					d="M9 15V9h3a3 3 0 010 6H9z"
				/>
				<circle cx="7" cy="17" r="1.5" fill="currentColor" />
				<circle cx="17" cy="17" r="1.5" fill="currentColor" />
			</>
		),
		check: (
			<>
				<circle cx="12" cy="12" r="9" strokeWidth="2" fill="none" />
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					d="M9 12l2 2 4-4"
				/>
			</>
		),
		money: (
			<>
				<circle cx="12" cy="12" r="9" strokeWidth="2" fill="none" />
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					d="M12 6v2m0 8v2m-1-7h2a1.5 1.5 0 010 3h-2a1.5 1.5 0 000 3h2"
				/>
			</>
		),
		energy: (
			<>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"
				/>
			</>
		),
		gas: (
			<>
				<circle cx="12" cy="12" r="9" strokeWidth="2" fill="none" />
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					d="M9 8c0-1.5 1-3 3-3s3 1.5 3 3c0 2-3 3-3 5m0 2v1"
				/>
			</>
		),
		fees: (
			<>
				<rect
					x="2"
					y="5"
					width="20"
					height="14"
					rx="2"
					strokeWidth="2"
					fill="none"
				/>
				<circle cx="12" cy="12" r="3" strokeWidth="2" fill="none" />
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					d="M6 9h.01M18 9h.01M6 15h.01M18 15h.01"
				/>
			</>
		),
		calendar: (
			<>
				<rect
					x="3"
					y="4"
					width="18"
					height="18"
					rx="2"
					strokeWidth="2"
					fill="none"
				/>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					d="M3 9h18M7 3v3M17 3v3"
				/>
				<circle cx="8" cy="14" r="1" fill="currentColor" />
				<circle cx="12" cy="14" r="1" fill="currentColor" />
				<circle cx="16" cy="14" r="1" fill="currentColor" />
			</>
		),
		checkmark: (
			<>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2.5"
					d="M5 13l4 4L19 7"
				/>
			</>
		),
	};

	return paths[icon] || paths.checkmark;
};

// Helper functions
const getConditionLabel = (condition: string): string => {
	const labels: Record<string, string> = {
		new: 'Neuf',
		good: 'Bon état',
		refresh: 'À rafraîchir',
		renovate: 'À rénover',
	};
	return labels[condition] || condition;
};

const getSaleTypeLabel = (saleType: string): string => {
	const labels: Record<string, string> = {
		vente_classique: 'Vente classique',
		vente_viager: 'Vente en viager',
		vente_lot: 'Vente en lot / Ensemble immobilier',
		vente_vefa: 'Vente en VEFA',
		vente_location: 'Vente en cours de location',
		vente_usufruit: 'Vente en usufruit / Nu-propriété',
		vente_indivisions: 'Vente en indivisions',
		constructible: 'Constructible',
		terrain_loisirs: 'Terrain de loisirs',
		jardin: 'Jardin',
		champs_agricole: 'Champs agricole',
		ancien: 'Ancien',
		viager: 'Viager',
	};
	return labels[saleType] || saleType;
};
