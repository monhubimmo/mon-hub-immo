'use client';

import React from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import { Collaboration } from '@/types/collaboration';
import { Property } from '@/lib/api/propertyApi';
import type { SearchAd } from '@/types/searchAd';
import { Features } from '@/lib/constants';
import { logger } from '@/lib/utils/logger';
import { getDisplayAddress } from '@/lib/utils/addressPrivacy';
import { toCdnUrl } from '@/lib/utils/imageUtils';

type PropertyDetails = Partial<Property> & { id?: string };

interface CollaborationPostInfoProps {
	collaboration: Collaboration;
	property: Property | null;
	searchAd: SearchAd | null;
}

export const CollaborationPostInfo: React.FC<CollaborationPostInfoProps> = ({
	collaboration,
	property,
	searchAd,
}) => {
	// Determine if full address should be visible based on collaboration status
	// Address is only visible if collaboration is accepted, active, or completed
	const canViewFullAddress =
		collaboration.status === 'accepted' ||
		collaboration.status === 'active' ||
		collaboration.status === 'completed';

	const postLink = `/${collaboration.postType === 'Property' ? 'property' : 'search-ads'}/${
		typeof collaboration.postId === 'object'
			? (collaboration.postId as PropertyDetails)?._id ||
				(collaboration.postId as PropertyDetails)?.id
			: collaboration.postId
	}`;

	// Get image source from property or collaboration.postId
	const getPropertyImage = () => {
		// Debug logging
		logger.debug('[CollaborationPostInfo] Debug Image Data:', {
			hasProperty: !!property,
			propertyMainImage: property?.mainImage,
			collaborationPostId: collaboration.postId,
			postType: collaboration.postType,
		});

		// First try from property prop
		if (property?.mainImage) {
			const image =
				typeof property.mainImage === 'object'
					? property.mainImage.url
					: property.mainImage;
			logger.debug(
				'[CollaborationPostInfo] Using property image:',
				image,
			);
			return toCdnUrl(image);
		}

		// Fallback to collaboration.postId if it's populated
		if (typeof collaboration.postId === 'object') {
			const postData = collaboration.postId as PropertyDetails;
			if (postData.mainImage) {
				const image =
					typeof postData.mainImage === 'object'
						? postData.mainImage.url
						: postData.mainImage;
				logger.debug(
					'[CollaborationPostInfo] Using collaboration.postId image:',
					image,
				);
				return toCdnUrl(image);
			}
		}

		logger.debug('[CollaborationPostInfo] No image found');
		return null;
	};

	const propertyImageSrc = getPropertyImage();

	return (
		<Card className="p-6 bg-gradient-to-br from-white to-gray-50">
			<h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
				{collaboration.postType === 'Property'
					? '🏠 Bien immobilier'
					: '🔍 Recherche de bien'}
			</h3>

			{/* Property or SearchAd Image */}
			{collaboration.postType === 'Property' && propertyImageSrc && (
				<div className="mb-4 w-full">
					<div className="relative w-full h-48 sm:h-56 md:h-64 rounded-lg overflow-hidden bg-gray-100 shadow-md">
						<Image
							src={propertyImageSrc}
							alt={property?.title || 'Property image'}
							fill
							className="object-cover hover:scale-105 transition-transform duration-300"
							sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
							unoptimized
							priority
						/>
					</div>
				</div>
			)}

			{collaboration.postType === 'SearchAd' && (
				<div className="mb-4 w-full">
					<div className="relative w-full h-48 sm:h-56 md:h-64 rounded-lg overflow-hidden bg-gradient-to-br from-brand-50 to-brand-100 shadow-md flex items-center justify-center">
						<Image
							src="/recherches-des-biens.png"
							alt="Recherche de bien"
							width={200}
							height={200}
							className="opacity-80"
							priority
						/>
					</div>
				</div>
			)}

			<div className="space-y-3">
				<div className="bg-gradient-to-r from-brand-50 to-blue-50 p-3 rounded-lg border border-brand-100">
					<span className="text-sm text-gray-600 flex items-center gap-2">
						<svg
							className="w-4 h-4 text-brand"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						{collaboration.postType === 'Property'
							? 'Détails du bien:'
							: 'Détails de la recherche:'}
					</span>
					<a
						href={postLink}
						target="_blank"
						rel="noopener noreferrer"
						className="font-medium text-brand hover:text-brand-800 hover:underline mt-1 ml-6 flex items-center gap-1"
					>
						<svg
							className="w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
							/>
						</svg>
						Voir l&apos;annonce
					</a>
				</div>

				{/* Property-specific fields */}
				{collaboration.postType === 'Property' && property && (
					<>
						{property.title && (
							<div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg border border-purple-100">
								<span className="text-sm text-gray-600 flex items-center gap-2">
									<svg
										className="w-4 h-4 text-purple-600"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
										/>
									</svg>
									Titre:
								</span>
								<p className="font-medium mt-1 ml-6">
									{property.title}
								</p>
							</div>
						)}
						{/* Property Type and Transaction Type */}
						<div className="flex gap-4">
							{property.propertyType && (
								<div className="flex-1 bg-gradient-to-r from-blue-50 to-cyan-50 p-3 rounded-lg border border-blue-100">
									<span className="text-sm text-gray-600 flex items-center gap-2">
										<svg
											className="w-4 h-4 text-blue-600"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
											/>
										</svg>
										Type:
									</span>
									<p className="font-medium mt-1 ml-6">
										{property.propertyType}
									</p>
								</div>
							)}
							{property.transactionType && (
								<div className="flex-1 bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-100">
									<span className="text-sm text-gray-600 flex items-center gap-2">
										<svg
											className="w-4 h-4 text-green-600"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
										Transaction:
									</span>
									<p className="font-medium mt-1 ml-6">
										{property.transactionType}
									</p>
								</div>
							)}
						</div>
						{property.mandateNumber && (
							<div className="bg-gradient-to-r from-indigo-50 to-violet-50 p-3 rounded-lg border border-indigo-100 mt-3">
								<span className="text-sm text-gray-600 flex items-center gap-2">
									<svg
										className="w-4 h-4 text-indigo-600"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
										/>
									</svg>
									Numéro de mandat:
								</span>
								<p className="font-medium mt-1 ml-6">
									{property.mandateNumber}
								</p>
							</div>
						)}
						{property.formattedPrice && (
							<div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 p-4 rounded-lg border-2 border-amber-200 shadow-sm">
								<span className="text-sm text-gray-600 flex items-center gap-2">
									<svg
										className="w-5 h-5 text-amber-600"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									Prix:
								</span>
								<p className="font-bold text-brand text-2xl mt-1 ml-7">
									{property.formattedPrice}
								</p>
							</div>
						)}
						{/* Surface and Rooms */}
						<div className="grid grid-cols-2 gap-4">
							<div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-3 rounded-lg border border-indigo-100">
								<span className="text-sm text-gray-600 flex items-center gap-2">
									<svg
										className="w-4 h-4 text-indigo-600"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
										/>
									</svg>
									Surface:
								</span>
								<p className="font-medium mt-1 ml-6">
									{property.surface
										? `${property.surface} m²`
										: 'Non spécifié'}
								</p>
							</div>
							{property.rooms && (
								<div className="bg-gradient-to-r from-pink-50 to-rose-50 p-3 rounded-lg border border-pink-100">
									<span className="text-sm text-gray-600 flex items-center gap-2">
										<svg
											className="w-4 h-4 text-pink-600"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"
											/>
										</svg>
										Pièces:
									</span>
									<p className="font-medium mt-1 ml-6">
										{property.rooms}
									</p>
								</div>
							)}
						</div>
						{/* Bedrooms and Bathrooms */}
						{(property.bedrooms || property.bathrooms) && (
							<div className="grid grid-cols-2 gap-4">
								{property.bedrooms && (
									<div className="bg-gradient-to-r from-violet-50 to-purple-50 p-3 rounded-lg border border-violet-100">
										<span className="text-sm text-gray-600 flex items-center gap-2">
											<svg
												className="w-4 h-4 text-violet-600"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="2"
													d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
												/>
											</svg>
											Chambres:
										</span>
										<p className="font-medium mt-1 ml-6">
											{property.bedrooms}
										</p>
									</div>
								)}
								{property.bathrooms && (
									<div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-3 rounded-lg border border-teal-100">
										<span className="text-sm text-gray-600 flex items-center gap-2">
											<svg
												className="w-4 h-4 text-teal-600"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="2"
													d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
												/>
											</svg>
											Salles de bain:
										</span>
										<p className="font-medium mt-1 ml-6">
											{property.bathrooms}
										</p>
									</div>
								)}
								{property.showerRooms && (
									<div className="bg-gradient-to-r from-cyan-50 to-sky-50 p-3 rounded-lg border border-cyan-100">
										<span className="text-sm text-gray-600 flex items-center gap-2">
											<svg
												className="w-4 h-4 text-cyan-600"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="2"
													d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
												/>
											</svg>
											Salles d&apos;eau:
										</span>
										<p className="font-medium mt-1 ml-6">
											{property.showerRooms}
										</p>
									</div>
								)}
							</div>
						)}
						{/* Location */}
						<div className="bg-gradient-to-r from-red-50 to-orange-50 p-3 rounded-lg border border-red-100">
							<span className="text-sm text-gray-600 flex items-center gap-2">
								<svg
									className="w-4 h-4 text-red-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
									/>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
									/>
								</svg>
								Localisation:
							</span>
							<p className="font-medium mt-1 ml-6">
								{getDisplayAddress(
									canViewFullAddress,
									property.address,
									property.city,
									property.postalCode,
								)}
							</p>
							{!canViewFullAddress && (
								<p className="text-xs text-amber-600 mt-1 ml-6">
									🔒 Adresse complète visible après
									collaboration acceptée
								</p>
							)}
						</div>
						{/* Energy Rating */}
						{property.energyRating &&
							property.energyRating !== 'Non soumis au DPE' && (
								<div className="bg-gradient-to-r from-lime-50 to-green-50 p-3 rounded-lg border border-lime-100">
									<span className="text-sm text-gray-600 flex items-center gap-2">
										<svg
											className="w-4 h-4 text-lime-600"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M13 10V3L4 14h7v7l9-11h-7z"
											/>
										</svg>
										DPE:
									</span>
									<span className="ml-6 inline-flex px-3 py-1 text-sm font-bold rounded-full bg-green-100 text-green-800">
										{property.energyRating}
									</span>
								</div>
							)}{' '}
						{/* Amenities */}
						{(property.hasParking ||
							property.hasGarden ||
							property.hasBalcony ||
							property.hasTerrace ||
							property.hasElevator ||
							property.hasGarage) && (
							<div>
								<span className="text-sm text-gray-600 block mb-2">
									Équipements:
								</span>
								<div className="flex flex-wrap gap-2">
									{property.hasParking && (
										<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
											🅿️ Parking
										</span>
									)}
									{property.hasGarden && (
										<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
											🌳 Jardin
										</span>
									)}
									{property.hasBalcony && (
										<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
											🏢 Balcon
										</span>
									)}
									{property.hasTerrace && (
										<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
											☀️ Terrasse
										</span>
									)}
									{property.hasElevator && (
										<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
											🛗 Ascenseur
										</span>
									)}
									{property.hasGarage && (
										<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
											🚗 Garage
										</span>
									)}
								</div>
							</div>
						)}
					</>
				)}

				{/* SearchAd-specific fields */}
				{collaboration.postType === 'SearchAd' && searchAd && (
					<>
						{searchAd.title && (
							<div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg border border-purple-100">
								<span className="text-sm text-gray-600 flex items-center gap-2">
									<svg
										className="w-4 h-4 text-purple-600"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
										/>
									</svg>
									Titre:
								</span>
								<p className="font-medium mt-1 ml-6">
									{searchAd.title}
								</p>
							</div>
						)}
						{searchAd.budget && (
							<div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 p-4 rounded-lg border-2 border-amber-200 shadow-sm">
								<span className="text-sm text-gray-600 flex items-center gap-2">
									<svg
										className="w-5 h-5 text-amber-600"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									Budget:
								</span>
								<p className="font-bold text-brand text-2xl mt-1 ml-7">
									{searchAd.budget?.ideal
										? `Idéal: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(searchAd.budget.ideal)}`
										: searchAd.budget?.max
											? `Max: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(searchAd.budget.max)}`
											: 'Non spécifié'}
								</p>
							</div>
						)}
						{searchAd.propertyTypes &&
							searchAd.propertyTypes.length > 0 && (
								<div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-100">
									<span className="text-sm text-gray-600 flex items-center gap-2 mb-2">
										<svg
											className="w-4 h-4 text-blue-600"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
											/>
										</svg>
										Types de bien recherchés:
									</span>
									<div className="flex flex-wrap gap-2 ml-6">
										{searchAd.propertyTypes.map((type) => (
											<span
												key={type}
												className="inline-flex px-3 py-1.5 rounded-full text-xs font-medium bg-white shadow-sm border border-brand-200 text-brand-800"
											>
												{type === 'apartment'
													? '🏢 Appartement'
													: type === 'house'
														? '🏠 Maison'
														: type === 'land'
															? '🌳 Terrain'
															: type ===
																  'building'
																? '🏗️ Immeuble'
																: type ===
																	  'commercial'
																	? '🏪 Commercial'
																	: type}
											</span>
										))}
									</div>
								</div>
							)}

						{/* Surface and Rooms Requirements */}
						{(searchAd.minSurface ||
							searchAd.minRooms ||
							searchAd.minBedrooms) && (
							<div className="grid grid-cols-2 gap-4">
								{searchAd.minSurface && (
									<div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-3 rounded-lg border border-indigo-100">
										<span className="text-sm text-gray-600 flex items-center gap-2">
											<svg
												className="w-4 h-4 text-indigo-600"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="2"
													d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
												/>
											</svg>
											Surface min:
										</span>
										<p className="font-medium mt-1 ml-6">
											{searchAd.minSurface} m²
										</p>
									</div>
								)}
								{searchAd.minRooms && (
									<div className="bg-gradient-to-r from-pink-50 to-rose-50 p-3 rounded-lg border border-pink-100">
										<span className="text-sm text-gray-600 flex items-center gap-2">
											<svg
												className="w-4 h-4 text-pink-600"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="2"
													d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"
												/>
											</svg>
											Pièces min:
										</span>
										<p className="font-medium mt-1 ml-6">
											{searchAd.minRooms}
										</p>
									</div>
								)}
							</div>
						)}

						{searchAd.location && (
							<div className="bg-gradient-to-r from-red-50 to-orange-50 p-3 rounded-lg border border-red-100">
								<span className="text-sm text-gray-600 flex items-center gap-2">
									<svg
										className="w-4 h-4 text-red-600"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
										/>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
										/>
									</svg>
									Localisation recherchée:
								</span>
								<p className="font-medium mt-1 ml-6">
									{canViewFullAddress
										? searchAd.location?.cities &&
											Array.isArray(
												searchAd.location.cities,
											)
											? searchAd.location.cities.join(
													', ',
												)
											: 'Non spécifiée'
										: searchAd.location?.cities &&
											  Array.isArray(
													searchAd.location.cities,
											  )
											? searchAd.location.cities
													.slice(0, 1)
													.join(', ') +
												(searchAd.location.cities
													.length > 1
													? '...'
													: '')
											: 'Non spécifiée'}
								</p>
								{!canViewFullAddress && (
									<p className="text-xs text-amber-600 mt-1 ml-6">
										🔒 Localisation complète visible après
										collaboration acceptée
									</p>
								)}
								{canViewFullAddress &&
									searchAd.location?.maxDistance && (
										<p className="text-xs text-gray-500 mt-1 ml-6 flex items-center gap-1">
											<svg
												className="w-3 h-3"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="2"
													d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
												/>
											</svg>
											Rayon:{' '}
											{searchAd.location.maxDistance} km
										</p>
									)}
							</div>
						)}

						{/* Amenities Requirements */}
						{(searchAd.hasParking || searchAd.hasExterior) && (
							<div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-3 rounded-lg border border-teal-100">
								<span className="text-sm text-gray-600 flex items-center gap-2 mb-2">
									<svg
										className="w-4 h-4 text-teal-600"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
										/>
									</svg>
									Équipements souhaités:
								</span>
								<div className="flex flex-wrap gap-2 ml-6">
									{searchAd.hasParking && (
										<span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-white shadow-sm border border-blue-200 text-blue-800">
											🅿️ Parking
										</span>
									)}
									{searchAd.hasExterior && (
										<span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-white shadow-sm border border-green-200 text-green-800">
											🌳 Extérieur
										</span>
									)}
								</div>
							</div>
						)}
					</>
				)}

				<div>
					<span className="text-sm text-gray-600">Statut:</span>
					<span
						className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ml-2 ${
							collaboration.status ===
							Features.Collaboration.COLLABORATION_STATUS_VALUES
								.ACTIVE
								? 'bg-green-100 text-green-800'
								: collaboration.status ===
									  Features.Collaboration
											.COLLABORATION_STATUS_VALUES.PENDING
									? 'bg-yellow-100 text-yellow-800'
									: 'bg-gray-100 text-gray-800'
						}`}
					>
						{collaboration.status ===
						Features.Collaboration.COLLABORATION_STATUS_VALUES
							.ACTIVE
							? 'Active'
							: collaboration.status ===
								  Features.Collaboration
										.COLLABORATION_STATUS_VALUES.PENDING
								? 'En attente'
								: collaboration.status}
					</span>
				</div>
			</div>
		</Card>
	);
};
