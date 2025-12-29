'use client';

import { useNotifications } from '@/store/notifications';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import { logger } from '@/lib/utils/logger';

export const NotificationBell = () => {
	const router = useRouter();
	const { state, markAllRead, markRead, remove, refresh } =
		useNotifications();
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener('click', handler);
		return () => document.removeEventListener('click', handler);
	}, []);

	const markAllAsReadRef = useRef(false);

	useEffect(() => {
		if (open && state.unreadCount > 0 && !markAllAsReadRef.current) {
			markAllAsReadRef.current = true;
			markAllRead().catch(() => {
				// Reset flag on error so it can retry
				markAllAsReadRef.current = false;
			});
		}
		if (!open) {
			markAllAsReadRef.current = false;
		}
	}, [open, state.unreadCount, markAllRead]);

	// Refresh notifications when bell is opened to get latest actor data
	useEffect(() => {
		if (open) {
			refresh().catch(() => {
				// Silently fail - user still sees cached data
			});
		}
	}, [open, refresh]);

	const handleItemClick = async (
		id: string,
		entity: {
			type: 'chat' | 'collaboration' | 'appointment';
			id: string;
		},
		actorId: string,
	) => {
		try {
			await markRead(id);
			setOpen(false);
			if (entity.type === 'chat') {
				router.push(`/chat?userId=${encodeURIComponent(actorId)}`);
			} else if (entity.type === 'collaboration') {
				router.push(`/collaboration/${encodeURIComponent(entity.id)}`);
			} else if (entity.type === 'appointment') {
				router.push('/dashboard');
			}
		} catch {
			// ignore navigation errors
		}
	};

	logger.debug('Notifications state:', state);
	return (
		<div ref={ref} className="relative">
			<button
				onClick={() => setOpen((o) => !o)}
				className="relative inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
				aria-label="Notifications"
			>
				<svg
					className="w-6 h-6 text-gray-700"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
					/>
				</svg>
				{state?.unreadCount > 0 && (
					<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1 min-w-[18px] h-[18px] flex items-center justify-center">
						{state?.unreadCount}
					</span>
				)}
			</button>
			{open && (
				<div className="fixed left-1/2 -translate-x-1/2 top-16 w-[95vw] max-w-[420px] bg-white shadow-lg rounded-lg border border-gray-200 max-h-[70vh] overflow-auto z-50 md:absolute md:top-full md:left-1/2 md:-translate-x-1/2 md:right-auto md:mt-2 md:w-96 md:max-h-[400px]">
					<div className="py-2">
						{state?.items?.length === 0 ? (
							<div className="p-4 text-sm text-gray-500 text-center">
								Aucune notification
							</div>
						) : (
							state?.items?.map((n) => (
								<div
									key={n.id}
									className="group px-4 py-3 hover:bg-gray-50 cursor-pointer relative"
									onClick={() =>
										handleItemClick(
											n.id,
											n.entity,
											n.actorId,
										)
									}
								>
									<div className="flex items-start gap-3 pr-10">
										{(() => {
											const meta = n.data as
												| {
														actorName?: string;
														actorAvatar?: string;
												  }
												| undefined;
											const actorName = meta?.actorName;
											const actorAvatar =
												meta?.actorAvatar;

											// Debug logging
											logger.debug(
												'Notification avatar data:',
												{
													notificationId: n.id,
													actorId: n.actorId,
													actorName,
													actorAvatar,
													hasAvatar: !!actorAvatar,
													fullData: meta,
												},
											);

											return (
												<ProfileAvatar
													user={{
														_id: n.actorId,
														name: actorName,
														profileImage:
															actorAvatar,
													}}
													size="sm"
												/>
											);
										})()}
										<div className="min-w-0">
											<div className="text-sm font-medium truncate">
												{n.title}
											</div>
											<div className="text-xs text-gray-600 mt-0.5 pr-2 break-words">
												{(() => {
													const meta = n.data as
														| {
																actorName?: string;
																actorAvatar?: string;
														  }
														| undefined;
													const actorName =
														meta?.actorName;
													return actorName ? (
														<span>
															<span className="font-medium text-gray-700">
																{actorName}
															</span>
															{' • '}
															{n.message}
														</span>
													) : (
														<span>{n.message}</span>
													);
												})()}
											</div>
											<div className="text-[10px] text-gray-400 mt-1">
												{new Date(
													n.createdAt,
												).toLocaleString()}
											</div>
										</div>
									</div>
									<div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
										<button
											className="flex items-center justify-center w-6 h-6 rounded-full  "
											onClick={async (e) => {
												e.stopPropagation();
												try {
													await remove(n.id);
												} catch {
													/* noop */
												}
											}}
											aria-label="Supprimer la notification"
											title="Supprimer"
										>
											<svg
												className="w-5 h-5 text-red-500"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M6 18L18 6M6 6l12 12"
												/>
											</svg>
										</button>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default NotificationBell;
