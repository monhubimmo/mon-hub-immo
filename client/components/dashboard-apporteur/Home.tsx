'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../ui/Button';
import { PropertyManager } from '../property/PropertyManager';
import { CollaborationList } from '../collaboration/CollaborationList';
import { Features } from '@/lib/constants';
// Migrated: Features.Dashboard.DASHBOARD_UI_TEXT;
import { MySearches } from '../search-ads/MySearches';
import { ProfileUpdateModal } from '../dashboard-agent/ProfileUpdateModal';
import { User } from '@/types/auth';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { formatNumber } from '@/lib/utils/format';

const Home = () => {
	const router = useRouter();
	const { user } = useAuth();
	const [activeTab, setActiveTab] = useState<
		'overview' | 'properties' | 'collaborations' | 'searches'
	>('overview');
	const [showUpdateModal, setShowUpdateModal] = useState(false);

	const { kpis, loading: statsLoading } = useDashboardStats(user?._id);

	const renderOverview = () => (
		<div className="space-y-8">
			{/* Welcome Banner */}
			<div className="bg-gradient-to-br from-brand via-brand to-[#43cfe8] rounded-2xl shadow-lg p-8 text-brand relative overflow-hidden">
				<div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
				<div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
				<div className="relative z-10">
					<h2 className="text-3xl font-bold mb-3">
						Bienvenue, {user?.firstName} !
					</h2>
					<p className="text-brand-light text-lg mb-6 max-w-2xl">
						Gérez vos annonces immobilières et développez votre
						activité d&apos;apporteur d&apos;affaires.
					</p>
					{user && (
						<Button
							variant="outline"
							size="md"
							onClick={() => setShowUpdateModal(true)}
							className="bg-white text-brand hover:bg-white/90 border-white font-semibold"
						>
							<svg
								className="w-5 h-5 mr-2"
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
							Modifier mon profil
						</Button>
					)}
				</div>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{/* Mes biens */}
				<div className="bg-white rounded-2xl shadow-card p-6 hover:shadow-card-hover hover:scale-102 transition-all duration-300 border border-gray-200">
					<div className="flex items-center">
						<div className="p-3 rounded-xl bg-brand-100 text-brand flex-shrink-0">
							<svg
								className="w-7 h-7"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
								/>
							</svg>
						</div>
						<div className="ml-4">
							<h3 className="text-sm font-semibold text-gray-600">
								Mes biens
							</h3>
							<p className="text-3xl font-bold text-gray-900 mt-1">
								{statsLoading
									? '—'
									: formatNumber(kpis.propertiesTotal)}
							</p>
						</div>
					</div>
				</div>

				{/* Collaborations totales */}
				<div className="bg-white rounded-2xl shadow-card p-6 hover:shadow-card-hover hover:scale-102 transition-all duration-300 border border-gray-200">
					<div className="flex items-center">
						<div className="p-3 rounded-xl bg-success-light text-success flex-shrink-0">
							<svg
								className="w-7 h-7"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"
								/>
							</svg>
						</div>
						<div className="ml-4">
							<h3 className="text-sm font-semibold text-gray-600">
								Collaborations totales
							</h3>
							<p className="text-3xl font-bold text-gray-900 mt-1">
								{statsLoading
									? '—'
									: formatNumber(kpis.collaborationsTotal)}
							</p>
						</div>
					</div>
				</div>

				{/* Collaborations actives */}
				<div className="bg-white rounded-2xl shadow-card p-6 hover:shadow-card-hover hover:scale-102 transition-all duration-300 border border-gray-200">
					<div className="flex items-center">
						<div className="p-3 rounded-xl bg-warning-light text-warning flex-shrink-0">
							<svg
								className="w-7 h-7"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857"
								/>
							</svg>
						</div>
						<div className="ml-4">
							<h3 className="text-sm font-semibold text-gray-600">
								Collaborations actives
							</h3>
							<p className="text-3xl font-bold text-gray-900 mt-1">
								{statsLoading
									? '—'
									: formatNumber(kpis.collaborationsActive)}
							</p>
						</div>
					</div>
				</div>

				{/* Mes recherches */}
				<div className="bg-white rounded-2xl shadow-card p-6 hover:shadow-card-hover hover:scale-102 transition-all duration-300 border border-gray-200">
					<div className="flex items-center">
						<div className="p-3 rounded-xl bg-purple-100 text-purple-600 flex-shrink-0">
							<svg
								className="w-7 h-7"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
						</div>
						<div className="ml-4">
							<h3 className="text-sm font-semibold text-gray-600">
								Mes recherches
							</h3>
							<p className="text-3xl font-bold text-gray-900 mt-1">
								{statsLoading
									? '—'
									: formatNumber(kpis.mySearches)}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Action Cards Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Actions rapides */}
				<div className="bg-white rounded-2xl shadow-card p-8 border border-gray-200">
					<div className="flex items-center mb-6">
						<div className="p-2 bg-brand-100 rounded-lg">
							<svg
								className="w-6 h-6 text-brand"
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
						</div>
						<h3 className="text-xl font-bold text-gray-900 ml-3">
							Actions rapides
						</h3>
					</div>
					<div className="space-y-3">
						<Button
							onClick={() => setActiveTab('properties')}
							className="w-full justify-start bg-brand hover:bg-[#59c4d8] shadow-sm hover:shadow-md transition-all duration-200"
							size="lg"
						>
							<svg
								className="w-5 h-5 mr-3"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M12 4v16m8-8H4"
								/>
							</svg>
							Créer une nouvelle annonce
						</Button>
						<Button
							variant="outline"
							onClick={() => setActiveTab('properties')}
							className="w-full justify-start border-2 border-gray-200 hover:border-brand hover:bg-brand-50 transition-all duration-200"
							size="lg"
						>
							<svg
								className="w-5 h-5 mr-3"
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
							Gérer mes annonces
						</Button>
						<Button
							variant="outline"
							onClick={() => setActiveTab('searches')}
							className="w-full justify-start border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all duration-200"
							size="lg"
						>
							<svg
								className="w-5 h-5 mr-3"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
							Voir mes recherches
						</Button>
						<Button
							variant="outline"
							onClick={() => router.push('/chat')}
							className="w-full justify-start border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
							size="lg"
						>
							<svg
								className="w-5 h-5 mr-3"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
								/>
							</svg>
							Messages
						</Button>
						<div className="flex flex-col items-center w-full">
							<a
								href="mailto:contact@monhubimmo.fr"
								className="w-full block"
							>
								<Button
									variant="outline"
									className="w-full justify-start border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all duration-200"
									size="lg"
								>
									<svg
										className="w-5 h-5 mr-3"
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
									Contacter le support
								</Button>
							</a>
							<span className="text-xs text-gray-500 mt-1">
								contact@monhubimmo.fr
							</span>
						</div>
					</div>
				</div>

				{/* Conseils pour réussir */}
				<div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-card p-8 border border-gray-200">
					<div className="flex items-center mb-6">
						<div className="p-2 bg-warning-light rounded-lg">
							<svg
								className="w-6 h-6 text-warning"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
								/>
							</svg>
						</div>
						<h3 className="text-xl font-bold text-gray-900 ml-3">
							Conseils pour réussir
						</h3>
					</div>
					<div className="space-y-4">
						<div className="flex items-start space-x-3 group">
							<div className="w-2 h-2 bg-brand rounded-full mt-2 flex-shrink-0 group-hover:scale-150 transition-transform duration-200"></div>
							<p className="text-gray-700 leading-relaxed">
								Ajoutez des photos de qualité pour attirer plus
								de clients
							</p>
						</div>
						<div className="flex items-start space-x-3 group">
							<div className="w-2 h-2 bg-brand rounded-full mt-2 flex-shrink-0 group-hover:scale-150 transition-transform duration-200"></div>
							<p className="text-gray-700 leading-relaxed">
								Rédigez des descriptions détaillées et
								attractives
							</p>
						</div>
						<div className="flex items-start space-x-3 group">
							<div className="w-2 h-2 bg-brand rounded-full mt-2 flex-shrink-0 group-hover:scale-150 transition-transform duration-200"></div>
							<p className="text-gray-700 leading-relaxed">
								Répondez rapidement aux messages des clients
								intéressés
							</p>
						</div>
						<div className="flex items-start space-x-3 group">
							<div className="w-2 h-2 bg-brand rounded-full mt-2 flex-shrink-0 group-hover:scale-150 transition-transform duration-200"></div>
							<p className="text-gray-700 leading-relaxed">
								Mettez à jour vos annonces régulièrement
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);

	return (
		<>
			<div className="min-h-screen bg-gray-50">
				{/* Modern Header with Tabs */}
				<div className="bg-white shadow-sm border-b border-gray-200">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<div className="py-4 sm:py-6">
							<h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">
								{
									Features.Dashboard.DASHBOARD_UI_TEXT
										.apporteurDashboard
								}
							</h1>
							{/* Tab Navigation */}
							<nav className="grid grid-cols-2 gap-2 sm:flex sm:space-x-2 sm:overflow-x-auto pb-2 -mb-2 sm:scrollbar-hide">
								<button
									onClick={() => setActiveTab('overview')}
									className={`flex items-center justify-center sm:justify-start px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 whitespace-nowrap ${
										activeTab === 'overview'
											? 'bg-brand text-white shadow-md'
											: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
									}`}
								>
									<svg
										className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2"
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
									{
										Features.Dashboard.DASHBOARD_UI_TEXT
											.overview
									}
								</button>
								<button
									onClick={() => setActiveTab('properties')}
									className={`flex items-center justify-center sm:justify-start px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 whitespace-nowrap ${
										activeTab === 'properties'
											? 'bg-brand text-white shadow-md'
											: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
									}`}
								>
									<svg
										className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2"
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
									{
										Features.Dashboard.DASHBOARD_UI_TEXT
											.myProperties
									}
								</button>
								<button
									onClick={() =>
										setActiveTab('collaborations')
									}
									className={`flex items-center justify-center sm:justify-start px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 whitespace-nowrap ${
										activeTab === 'collaborations'
											? 'bg-brand text-white shadow-md'
											: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
									}`}
								>
									<svg
										className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"
										/>
									</svg>
									{
										Features.Dashboard.DASHBOARD_UI_TEXT
											.myCollaborations
									}
								</button>
								<button
									onClick={() => setActiveTab('searches')}
									className={`flex items-center justify-center sm:justify-start px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 whitespace-nowrap ${
										activeTab === 'searches'
											? 'bg-brand text-white shadow-md'
											: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
									}`}
								>
									<svg
										className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
										/>
									</svg>
									Mes Recherches
								</button>
							</nav>
						</div>
					</div>
				</div>

				{/* Content Area */}
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					{activeTab === 'overview' && renderOverview()}
					{activeTab === 'properties' && <PropertyManager />}
					{activeTab === 'collaborations' && user && (
						<div className="space-y-6">
							<div className="flex items-center justify-between bg-white rounded-2xl shadow-card p-6 border border-gray-200">
								<div className="flex items-center">
									<div className="p-3 bg-brand-100 rounded-xl">
										<svg
											className="w-6 h-6 text-brand"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"
											/>
										</svg>
									</div>
									<h2 className="text-2xl font-bold text-gray-900 ml-4">
										Mes Collaborations
									</h2>
								</div>
							</div>
							<CollaborationList
								currentUserId={user._id}
								onClose={() => {}}
							/>
						</div>
					)}
					{activeTab === 'searches' && <MySearches />}
				</div>
			</div>
			{user && (
				<ProfileUpdateModal
					isOpen={showUpdateModal}
					onClose={() => setShowUpdateModal(false)}
					user={user as User}
				/>
			)}
		</>
	);
};

export default Home;
