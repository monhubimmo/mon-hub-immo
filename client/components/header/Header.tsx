'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import NotificationBell from '../notifications/NotificationBell';
import { Features } from '@/lib/constants';

export default function Header() {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const { user, logout } = useAuth();
	const pathname = usePathname();

	return (
		<header className="bg-white/80 backdrop-blur-lg shadow-md sticky top-0 z-50 border-b border-gray-200 transition-all duration-300">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center py-4">
					<div className="flex-shrink-0">
						<Link
							href={
								user
									? Features.Landing.LANDING_ROUTES.HOME_PAGE
									: '/'
							}
							className="inline-flex items-baseline text-2xl font-bold hover:opacity-90 transition-opacity duration-200"
						>
							<span className="text-gray-900">mon</span>
							<span className="text-brand">hubimmo</span>
						</Link>
					</div>

					<div className="flex items-center space-x-2">
						{/* Desktop actions */}
						<div className="hidden md:flex items-center space-x-4">
							{user ? (
								<>
									<NotificationBell />
									<Link
										href="/dashboard"
										className="inline-flex items-center space-x-2 hover:opacity-80 transition-opacity duration-200"
									>
										<ProfileAvatar
											user={user}
											size="sm"
											className="w-8 h-8"
										/>
										<span className="text-gray-700 text-sm font-medium">
											{user.firstName} {user.lastName}
										</span>
									</Link>
									<button
										className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-600 shadow-md hover:shadow-brand transition-all duration-200 active:scale-98"
										onClick={() => logout()}
									>
										Déconnexion
									</button>
								</>
							) : (
								<>
									{pathname === '/' ? (
										<Link
											href="/accueil"
											className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-all duration-200"
										>
											Vous êtes agent immobilier ou
											apporteur d’affaires ?
										</Link>
									) : (
										<Link
											href={
												Features.Auth.AUTH_ROUTES.LOGIN
											}
											className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-600 shadow-md hover:shadow-brand transition-all duration-200 active:scale-98"
										>
											Se connecter
										</Link>
									)}
									<Link
										href={Features.Auth.AUTH_ROUTES.SIGNUP}
										className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-600 shadow-md hover:shadow-brand transition-all duration-200 active:scale-98"
									>
										Nous rejoindre
									</Link>
								</>
							)}
						</div>

						{/* Mobile inline actions + toggle */}
						<div className="flex items-center md:hidden space-x-2">
							<button
								className="text-gray-500 hover:text-brand transition-colors duration-200"
								onClick={() =>
									setIsMobileMenuOpen(!isMobileMenuOpen)
								}
								aria-label="Ouvrir/fermer le menu"
								aria-expanded={isMobileMenuOpen}
							>
								<svg
									className="h-6 w-6"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M4 6h16M4 12h16m-7 6h7"
									/>
								</svg>
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Mobile menu content */}
			{isMobileMenuOpen && (
				<div className="md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-md animate-slide-up">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-3">
						{user ? (
							<>
								<div className="flex items-center justify-between">
									<Link
										href="/dashboard"
										className="flex items-center space-x-2"
										onClick={() =>
											setIsMobileMenuOpen(false)
										}
									>
										<ProfileAvatar
											user={user}
											size="sm"
											className="w-8 h-8"
										/>
										<span className="text-gray-700 text-sm font-medium">
											{user.firstName} {user.lastName}
										</span>
									</Link>
									<NotificationBell />
								</div>
								<button
									className="w-full px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-600 shadow-md transition-all duration-200"
									onClick={() => {
										setIsMobileMenuOpen(false);
										logout();
									}}
								>
									Déconnexion
								</button>
							</>
						) : (
							<div className="grid grid-cols-2 gap-2">
								{pathname === '/' ? (
									<Link
										href="/accueil"
										className="col-span-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm text-center font-semibold hover:bg-gray-200 transition-all duration-200"
										onClick={() =>
											setIsMobileMenuOpen(false)
										}
									>
										Vous êtes agent immobilier ou apporteur
										d’affaires ?
									</Link>
								) : (
									<Link
										href={Features.Auth.AUTH_ROUTES.LOGIN}
										className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-600 shadow-md hover:shadow-brand transition-all duration-200 active:scale-98"
									>
										Se connecter
									</Link>
								)}
								<Link
									href={Features.Auth.AUTH_ROUTES.SIGNUP}
									className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-600 shadow-md hover:shadow-brand transition-all duration-200 active:scale-98"
								>
									Nous rejoindre
								</Link>
							</div>
						)}
					</div>
				</div>
			)}
		</header>
	);
}
