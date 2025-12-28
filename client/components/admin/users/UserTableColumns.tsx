'use client';

import React from 'react';
import Link from 'next/link';
import { Globe } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import {
	getUserStatus,
	getStatusBadgeVariant,
	getUserTypeBadgeVariant,
	getUserTypeLabel,
	formatDate,
	isRecentDate,
} from '@/lib/utils/adminUtils';
import type { AdminUser } from '@/types/admin';
import { toCdnUrl } from '@/lib/utils/imageUtils';

export const getUserTableColumns = () => [
	{
		header: 'Utilisateur',
		accessor: 'firstName',
		width: '25%',
		render: (_: unknown, row: AdminUser) => (
			<Link
				href={`/admin/users/${row._id}`}
				target="_blank"
				rel="noopener noreferrer"
				className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity cursor-pointer"
			>
				{row.profileImage ? (
					<img
						src={toCdnUrl(row.profileImage)}
						alt={`${row.firstName || ''} ${row.lastName || ''}`}
						className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 object-cover shadow-md"
					/>
				) : (
					<div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex-shrink-0 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md">
						{row.firstName?.charAt(0) ||
							row.email?.charAt(0) ||
							'U'}
					</div>
				)}
				<div className="min-w-0">
					<p className="font-semibold text-gray-900 text-xs sm:text-sm truncate hover:text-cyan-600 transition-colors">
						{row.firstName} {row.lastName}
					</p>
					<p className="text-xs text-gray-500 truncate hidden sm:block">
						{row.email}
					</p>
				</div>
			</Link>
		),
	},
	{
		header: 'Type',
		accessor: 'type',
		width: '12%',
		render: (value: unknown) => {
			const type = String(value || '').toLowerCase();
			return (
				<Badge variant={getUserTypeBadgeVariant(type)} size="sm">
					{getUserTypeLabel(type)}
				</Badge>
			);
		},
	},
	{
		header: 'Réseau',
		accessor: 'network',
		width: '10%',
		render: (_value: unknown, row: AdminUser) => (
			<div className="flex items-center gap-1.5">
				<Globe className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
				<span className="text-xs sm:text-sm font-medium text-gray-700 truncate max-w-[120px]">
					{row.professionalInfo?.network || '-'}
				</span>
			</div>
		),
	},
	{
		header: 'Activité',
		accessor: 'activity',
		width: '18%',
		render: (_v: unknown, row: AdminUser) => (
			<div className="flex flex-wrap gap-2 justify-center">
				<div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200/50 shadow-sm">
					<span className="text-[10px] text-gray-600">📋</span>
					<span className="text-xs font-semibold text-blue-700">
						{row.propertiesCount ?? 0}
					</span>
				</div>
				<div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200/50 shadow-sm">
					<span className="text-[10px] text-gray-600">🤝</span>
					<span className="text-xs font-semibold text-purple-700">
						{(row.collaborationsActive ?? 0) +
							(row.collaborationsClosed ?? 0)}
					</span>
				</div>
				<div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/50 shadow-sm">
					<span className="text-[10px] text-gray-600">📱</span>
					<span className="text-xs font-semibold text-emerald-700">
						{row.connectionsCount ?? 0}
					</span>
				</div>
			</div>
		),
	},
	{
		header: 'Statut',
		accessor: 'status',
		width: '12%',
		render: (_value: unknown, row: AdminUser) => {
			const status = getUserStatus(row);
			return (
				<div className="flex justify-center">
					<Badge
						variant={getStatusBadgeVariant(status)}
						size="sm"
						className="shadow-sm"
					>
						{status.charAt(0).toUpperCase() + status.slice(1)}
					</Badge>
				</div>
			);
		},
	},
	{
		header: 'Inscription',
		accessor: 'registeredAt',
		width: '13%',
		render: (value: unknown) => {
			const dateStr = formatDate(value as string);
			if (!dateStr)
				return (
					<span className="text-xs text-gray-500 sm:inline hidden">
						-
					</span>
				);

			const isRecent = isRecentDate(value as string);
			return (
				<div className="items-center gap-1.5 sm:flex hidden">
					<span
						className={`text-xs ${isRecent ? 'text-emerald-600 font-medium' : 'text-gray-600'}`}
					>
						{dateStr}
					</span>
					{isRecent && (
						<span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-700 font-medium">
							Nouveau
						</span>
					)}
				</div>
			);
		},
	},
	{
		header: 'Paiement',
		accessor: 'isPaid',
		width: '15%',
		render: (_value: unknown, row: AdminUser) => {
			if (row.type !== 'agent') {
				return (
					<span className="text-xs text-gray-400 hidden md:inline">
						N/A
					</span>
				);
			}

			// Format renewal date if available
			const renewalDate = row.subscriptionEndDate
				? new Date(row.subscriptionEndDate).toLocaleDateString(
						'fr-FR',
						{
							day: '2-digit',
							month: '2-digit',
							year: '2-digit',
						},
					)
				: null;

			if (row.accessGrantedByAdmin) {
				return (
					<div className="hidden md:flex flex-col items-center gap-0.5">
						<Badge variant="info" size="sm" className="shadow-sm">
							Accès manuel
						</Badge>
					</div>
				);
			}

			if (row.subscriptionStatus === 'canceled') {
				return (
					<div className="hidden md:flex flex-col items-center gap-0.5">
						<Badge variant="error" size="sm" className="shadow-sm">
							Annulé
						</Badge>
						{row.canceledAt && (
							<span className="text-[10px] text-gray-500">
								{new Date(row.canceledAt).toLocaleDateString(
									'fr-FR',
								)}
							</span>
						)}
					</div>
				);
			}

			if (row.subscriptionStatus === 'pending_cancellation') {
				return (
					<div className="hidden md:flex flex-col items-center gap-0.5">
						<Badge
							variant="warning"
							size="sm"
							className="shadow-sm"
						>
							Annulation
						</Badge>
						{row.subscriptionEndDate && (
							<span className="text-[10px] text-orange-600">
								fin{' '}
								{new Date(
									row.subscriptionEndDate,
								).toLocaleDateString('fr-FR', {
									day: '2-digit',
									month: '2-digit',
								})}
							</span>
						)}
					</div>
				);
			}

			if (row.subscriptionStatus === 'past_due') {
				return (
					<div className="hidden md:flex flex-col items-center gap-0.5">
						<Badge
							variant="warning"
							size="sm"
							className="shadow-sm"
						>
							Retard
						</Badge>
						{row.failedPaymentCount &&
							row.failedPaymentCount > 0 && (
								<span className="text-[10px] text-amber-600">
									{row.failedPaymentCount} échec(s)
								</span>
							)}
					</div>
				);
			}

			if (row.isPaid) {
				return (
					<div className="hidden md:flex flex-col items-center gap-0.5">
						<Badge
							variant="success"
							size="sm"
							className="shadow-sm"
						>
							Payé
						</Badge>
						{renewalDate && (
							<span
								className="text-[10px] text-gray-500"
								title="Date de renouvellement"
							>
								↻ {renewalDate}
							</span>
						)}
					</div>
				);
			}

			if (row.profileCompleted) {
				return (
					<Badge
						variant="warning"
						size="sm"
						className="shadow-sm hidden md:inline-flex"
					>
						En attente
					</Badge>
				);
			}
			return (
				<span className="text-xs text-gray-400 hidden md:inline">
					Profil incomplet
				</span>
			);
		},
	},
];
