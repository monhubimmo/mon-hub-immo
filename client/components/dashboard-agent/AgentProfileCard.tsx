'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '../ui/Button';
import { ProfileUpdateModal } from './ProfileUpdateModal';
import { ProfileAvatar, RichTextDisplay } from '../ui';
import { User } from '@/types/auth';
import { storage, STORAGE_KEYS } from '@/lib/utils/storageManager';
import { SubscriptionManager } from './SubscriptionManager';
import { toCdnUrl } from '@/lib/utils/imageUtils';

interface AgentProfileCardProps {
	user: User;
}

// Helper component for professional info items with icons
const InfoItem = ({
	icon,
	color,
	label,
	value,
}: {
	icon: React.ReactNode;
	color: 'brand' | 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'teal';
	label: string;
	value: string | number;
}) => {
	const colorMap = {
		brand: {
			bg: 'bg-brand-50',
			icon: 'text-brand',
			border: 'border-brand-100',
		},
		blue: {
			bg: 'bg-blue-50',
			icon: 'text-blue-600',
			border: 'border-blue-100',
		},
		green: {
			bg: 'bg-green-50',
			icon: 'text-green-600',
			border: 'border-green-100',
		},
		purple: {
			bg: 'bg-purple-50',
			icon: 'text-purple-600',
			border: 'border-purple-100',
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
		teal: {
			bg: 'bg-teal-50',
			icon: 'text-teal-600',
			border: 'border-teal-100',
		},
	};
	const colors = colorMap[color];

	return (
		<div
			className={`flex items-center space-x-2 sm:space-x-3 p-3 sm:p-4 rounded-xl border ${colors.border} ${colors.bg} hover:shadow-md transition-all duration-200`}
		>
			<div
				className={`${colors.bg} p-2 sm:p-2.5 rounded-full border ${colors.border} flex-shrink-0`}
			>
				<div className={`w-4 h-4 sm:w-5 sm:h-5 ${colors.icon}`}>
					{icon}
				</div>
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-[10px] sm:text-xs text-gray-500">{label}</p>
				<p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
					{value}
				</p>
			</div>
		</div>
	);
};

// Stat card component
const StatCard = ({
	value,
	label,
	color,
}: {
	value: string | number;
	label: string;
	color: 'brand' | 'blue' | 'green' | 'purple';
}) => {
	const colorMap = {
		brand: 'text-brand',
		blue: 'text-blue-600',
		green: 'text-green-600',
		purple: 'text-purple-600',
	};

	return (
		<div className="text-center p-3 sm:p-5 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 hover:shadow-md transition-all duration-200">
			<p className={`text-lg sm:text-2xl font-bold ${colorMap[color]}`}>
				{value}
			</p>
			<p className="text-[10px] sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
				{label}
			</p>
		</div>
	);
};

export const AgentProfileCard: React.FC<AgentProfileCardProps> = ({ user }) => {
	const [showUpdateModal, setShowUpdateModal] = useState(false);
	const [isInfoOpen, setIsInfoOpen] = useState<boolean>(true);
	const router = useRouter();

	// Restore persisted collapse state
	useEffect(() => {
		const value = storage.get<string>(
			STORAGE_KEYS.DASHBOARD_PROF_INFO_OPEN,
		);
		if (value !== null) setIsInfoOpen(value === '1');
	}, []);

	const toggleInfo = () => {
		setIsInfoOpen((prev) => {
			const next = !prev;
			storage.set(
				STORAGE_KEYS.DASHBOARD_PROF_INFO_OPEN,
				next ? '1' : '0',
			);
			return next;
		});
	};

	return (
		<>
			<div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
				{/* Header - Responsive */}
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
					<h3 className="text-base sm:text-lg font-semibold text-gray-900">
						Profil Agent
					</h3>
					<div className="flex gap-2 sm:gap-3">
						{!user.profileCompleted && (
							<Button
								onClick={() =>
									router.push('/auth/complete-profile')
								}
								className="bg-brand hover:bg-brand-600 text-white flex-1 sm:flex-none"
								size="sm"
							>
								<svg
									className="w-4 h-4 mr-1 sm:mr-2"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M12 6v6m0 0v6m0-6h6m-6 0H6"
									/>
								</svg>
								<span className="hidden xs:inline">
									Compléter
								</span>
								<span className="xs:hidden">+</span>
							</Button>
						)}
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowUpdateModal(true)}
							className="flex items-center justify-center space-x-1 sm:space-x-2 flex-1 sm:flex-none"
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
									d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
								/>
							</svg>
							<span>Modifier</span>
						</Button>
					</div>
				</div>

				{/* Basic Profile Info - Responsive */}
				<div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:space-x-6 mb-4 sm:mb-6">
					<ProfileAvatar user={user} size="2xl" clickable={false} />
					<div className="min-w-0 flex-1">
						<h4 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
							{user.firstName} {user.lastName}
						</h4>
						<p className="text-sm sm:text-base text-gray-600">
							Agent Immobilier
						</p>
						<div className="flex items-center justify-center sm:justify-start mt-2">
							<span
								className={`inline-flex px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-full ${
									user.profileCompleted
										? 'bg-green-100 text-green-800'
										: 'bg-yellow-100 text-yellow-800'
								}`}
							>
								{user.profileCompleted
									? 'Profil complété'
									: 'Profil incomplet'}
							</span>
						</div>
					</div>
				</div>

				{/* Basic Information - Modern Cards */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
					<InfoItem
						icon={
							<svg
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
								/>
							</svg>
						}
						color="blue"
						label="Email"
						value={user.email}
					/>
					<InfoItem
						icon={
							<svg
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
								/>
							</svg>
						}
						color="green"
						label="Téléphone"
						value={user.phone || 'Non renseigné'}
					/>
				</div>

				{/* Subscription Section */}
				<div className="border-t border-gray-100 my-4 sm:my-6" />
				<SubscriptionManager />

				{/* Professional Information - Collapsible when profile is completed */}
				{user.profileCompleted && user.professionalInfo && (
					<>
						<div className="border-t border-gray-100 my-4 sm:my-6" />
						<button
							onClick={toggleInfo}
							className="w-full flex items-center justify-between text-left group"
							aria-expanded={isInfoOpen}
						>
							<div className="flex items-center gap-2">
								<div className="p-1.5 sm:p-2 bg-brand-50 rounded-lg">
									<svg
										className="w-4 h-4 sm:w-5 sm:h-5 text-brand"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
										/>
									</svg>
								</div>
								<h4 className="text-sm sm:text-md font-semibold text-gray-900">
									Informations professionnelles
								</h4>
							</div>
							<div className="p-1.5 sm:p-2 rounded-full bg-gray-100 group-hover:bg-gray-200 transition-colors">
								<svg
									className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 transition-transform duration-300 ${isInfoOpen ? 'rotate-180' : ''}`}
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M19 9l-7 7-7-7"
									/>
								</svg>
							</div>
						</button>

						<div
							className={`overflow-hidden transition-all duration-500 ${
								isInfoOpen
									? 'max-h-[2000px] mt-4 sm:mt-6'
									: 'max-h-0'
							}`}
						>
							{/* Stats Cards */}
							<div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
								<StatCard
									value={`${user.professionalInfo?.interventionRadius || 20}km`}
									label="Rayon d'intervention"
									color="brand"
								/>
								<StatCard
									value={
										user.professionalInfo
											?.yearsExperience || 0
									}
									label="Années d'expérience"
									color="blue"
								/>
								<StatCard
									value={
										user.professionalInfo?.network || 'N/A'
									}
									label="Réseau"
									color="purple"
								/>
							</div>

							{/* Professional Details Grid */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
								<InfoItem
									icon={
										<svg
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
									}
									color="orange"
									label="Secteur d'activité"
									value={`${user.professionalInfo?.city || ''} (${user.professionalInfo?.postalCode || ''})`}
								/>

								{/* Show agent type and relevant credentials */}
								{user.professionalInfo?.agentType ? (
									<>
										<InfoItem
											icon={
												<svg
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth="2"
														d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
													/>
												</svg>
											}
											color="purple"
											label="Type d'agent"
											value={
												user.professionalInfo
													.agentType === 'independent'
													? 'Agent immobilier indépendant'
													: user.professionalInfo
																.agentType ===
														  'commercial'
														? 'Agent commercial immobilier'
														: "Négociateur VRP employé d'agence"
											}
										/>

										{user.professionalInfo.agentType ===
											'independent' &&
											user.professionalInfo.tCard && (
												<InfoItem
													icon={
														<svg
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth="2"
																d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
															/>
														</svg>
													}
													color="brand"
													label="Carte T"
													value={
														user.professionalInfo
															.tCard
													}
												/>
											)}

										{user.professionalInfo.agentType ===
											'commercial' && (
											<>
												{user.professionalInfo
													.sirenNumber && (
													<InfoItem
														icon={
															<svg
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth="2"
																	d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
																/>
															</svg>
														}
														color="brand"
														label="Numéro SIREN"
														value={
															user
																.professionalInfo
																.sirenNumber
														}
													/>
												)}
												{user.professionalInfo
													.rsacNumber && (
													<InfoItem
														icon={
															<svg
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth="2"
																	d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
																/>
															</svg>
														}
														color="teal"
														label="Numéro RSAC"
														value={
															user
																.professionalInfo
																.rsacNumber
														}
													/>
												)}
											</>
										)}

										{user.professionalInfo.agentType ===
											'employee' &&
											user.professionalInfo
												.collaboratorCertificate && (
												<InfoItem
													icon={
														<svg
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth="2"
																d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
															/>
														</svg>
													}
													color="brand"
													label="Certificat d'autorisation"
													value={
														user.professionalInfo
															.collaboratorCertificate
													}
												/>
											)}
									</>
								) : user.professionalInfo?.siretNumber ? (
									<InfoItem
										icon={
											<svg
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="2"
													d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
												/>
											</svg>
										}
										color="brand"
										label="SIRET"
										value={
											user.professionalInfo.siretNumber
										}
									/>
								) : null}
							</div>

							{/* Identity Card Section */}
							{user.professionalInfo?.identityCard?.url && (
								<div className="mb-6">
									<div className="flex items-center gap-2 mb-3">
										<div className="p-1.5 sm:p-2 bg-green-50 rounded-lg">
											<svg
												className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="2"
													d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
												/>
											</svg>
										</div>
										<p className="text-xs sm:text-sm font-semibold text-gray-700">
											Carte d&apos;identité
										</p>
										<span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-green-100 text-green-800">
											<svg
												className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1"
												fill="currentColor"
												viewBox="0 0 20 20"
											>
												<path
													fillRule="evenodd"
													d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
													clipRule="evenodd"
												/>
											</svg>
											Vérifié
										</span>
									</div>
									<a
										href={toCdnUrl(
											user.professionalInfo.identityCard
												.url,
										)}
										target="_blank"
										rel="noopener noreferrer"
										className="group block w-full max-w-xs sm:max-w-sm mx-auto sm:mx-0"
									>
										<div className="relative aspect-[3/2] rounded-xl border-2 border-gray-100 hover:border-brand bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg">
											<Image
												src={toCdnUrl(
													user.professionalInfo
														.identityCard.url,
												)}
												alt="Carte d'identité"
												fill
												className="object-contain p-3 sm:p-4"
												sizes="(max-width: 640px) 280px, 320px"
											/>
											<div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
												<span className="bg-white/95 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium text-gray-700 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
													<svg
														className="w-3.5 h-3.5 sm:w-4 sm:h-4"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth="2"
															d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
														/>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth="2"
															d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
														/>
													</svg>
													Voir
												</span>
											</div>
										</div>
									</a>
								</div>
							)}

							{/* Covered Cities */}
							{user.professionalInfo?.coveredCities &&
								user.professionalInfo.coveredCities.length >
									0 && (
									<div className="mb-4 sm:mb-6">
										<div className="flex items-center gap-2 mb-2 sm:mb-3">
											<div className="p-1.5 sm:p-2 bg-brand-50 rounded-lg">
												<svg
													className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth="2"
														d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
													/>
												</svg>
											</div>
											<p className="text-xs sm:text-sm font-semibold text-gray-700">
												Communes couvertes
											</p>
										</div>
										<div className="flex flex-wrap gap-1.5 sm:gap-2">
											{user.professionalInfo.coveredCities.map(
												(city, index) => (
													<span
														key={index}
														className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-gradient-to-r from-brand-50 to-blue-50 text-brand-700 rounded-full border border-brand-100 hover:shadow-sm transition-shadow"
													>
														<svg
															className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 sm:mr-1.5 text-brand"
															fill="currentColor"
															viewBox="0 0 20 20"
														>
															<path
																fillRule="evenodd"
																d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
																clipRule="evenodd"
															/>
														</svg>
														{city}
													</span>
												),
											)}
										</div>
									</div>
								)}

							{/* Personal Bio */}
							{user.professionalInfo?.personalPitch && (
								<div>
									<div className="flex items-center gap-2 mb-2 sm:mb-3">
										<div className="p-1.5 sm:p-2 bg-purple-50 rounded-lg">
											<svg
												className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="2"
													d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
												/>
											</svg>
										</div>
										<p className="text-xs sm:text-sm font-semibold text-gray-700">
											Bio personnelle
										</p>
									</div>
									<div className="p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100">
										<RichTextDisplay
											content={
												user.professionalInfo
													.personalPitch
											}
											className="text-xs sm:text-sm text-gray-700 leading-relaxed"
										/>
									</div>
								</div>
							)}
						</div>
					</>
				)}
			</div>

			{/* Update Modal */}
			<ProfileUpdateModal
				isOpen={showUpdateModal}
				onClose={() => setShowUpdateModal(false)}
				user={user}
			/>
		</>
	);
};
