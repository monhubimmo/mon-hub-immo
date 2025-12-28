'use client';

import React from 'react';
import Link from 'next/link';
import { Home, Calendar, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import {
	getStatusBadgeVariant,
	getStatusLabel,
	getParticipantName,
	formatDate,
} from '@/lib/utils/adminUtils';
import type { AdminCollaboration } from '@/types/admin';
import { toCdnUrl } from '@/lib/utils/imageUtils';

export const getCollaborationTableColumns = () => [
	{
		header: 'Agent & Apporteur',
		accessor: 'agent',
		width: '25%',
		render: (_value: unknown, row: AdminCollaboration) => {
			const agentName =
				row.agentName || getParticipantName(row.agent) || 'Unknown';
			const agentId =
				typeof row.agent === 'object' && row.agent
					? row.agent._id
					: row.agentId;
			const agentImage =
				typeof row.agent === 'object' && row.agent
					? row.agent.profileImage
					: undefined;
			const apporteurName =
				row.apporteurName ||
				getParticipantName(row.apporteur) ||
				'Unknown';
			const apporteurId =
				typeof row.apporteur === 'object' && row.apporteur
					? row.apporteur._id
					: row.apporteurId;
			const apporteurImage =
				typeof row.apporteur === 'object' && row.apporteur
					? row.apporteur.profileImage
					: undefined;

			return (
				<div className="space-y-2 text-xs sm:text-sm">
					<div className="flex items-center gap-2 min-w-0">
						{agentImage ? (
							<img
								src={toCdnUrl(agentImage)}
								alt={agentName}
								className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0 border border-gray-100"
							/>
						) : (
							<div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex-shrink-0 flex items-center justify-center text-white font-bold text-xs">
								{agentName.charAt(0).toUpperCase()}
							</div>
						)}
						{agentId ? (
							<Link
								href={`/admin/users/${agentId}`}
								target="_blank"
								rel="noopener noreferrer"
								className="text-xs sm:text-sm font-medium text-gray-900 hover:underline truncate"
							>
								{agentName}
							</Link>
						) : (
							<span className="text-xs sm:text-sm font-medium text-gray-900 truncate">
								{agentName}
							</span>
						)}
					</div>
					<div className="flex items-center gap-2 ml-0 sm:ml-1 min-w-0">
						{apporteurImage ? (
							<img
								src={toCdnUrl(apporteurImage)}
								alt={apporteurName}
								className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover flex-shrink-0 border border-gray-100"
							/>
						) : (
							<div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0 flex items-center justify-center text-white font-bold text-[10px]">
								{apporteurName.charAt(0).toUpperCase()}
							</div>
						)}
						{apporteurId ? (
							<Link
								href={`/admin/users/${apporteurId}`}
								target="_blank"
								rel="noopener noreferrer"
								className="text-xs text-gray-500 hover:underline truncate"
							>
								{apporteurName}
							</Link>
						) : (
							<span className="text-xs text-gray-500 truncate">
								{apporteurName}
							</span>
						)}
					</div>
				</div>
			);
		},
	},
	{
		header: 'Annonce',
		accessor: 'property',
		width: '22%',
		render: (value: unknown, row: AdminCollaboration) => {
			const propertyTitle =
				(typeof value === 'string' ? value : null) ||
				row.postId?.title ||
				row.postId?.address ||
				'Unknown';
			const propertyImage = row.postId?.mainImage?.url;
			const isProperty = row.postType === 'Property';

			return (
				<div className="flex items-center gap-2 min-w-0 text-xs sm:text-sm">
					{propertyImage ? (
						<img
							src={toCdnUrl(propertyImage)}
							alt={propertyTitle}
							className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover flex-shrink-0 shadow-sm border border-gray-100"
						/>
					) : (
						<div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0 flex items-center justify-center shadow-sm border border-gray-100">
							<Home className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
						</div>
					)}
					<div className="min-w-0">
						{isProperty && row.postId?._id ? (
							<Link
								href={`/property/${row.postId._id}`}
								className="font-medium text-gray-900 hover:underline truncate block text-xs sm:text-sm"
							>
								{propertyTitle}
							</Link>
						) : (
							<span className="font-medium text-gray-900 truncate block text-xs sm:text-sm">
								{propertyTitle}
							</span>
						)}
					</div>
				</div>
			);
		},
	},
	{
		header: 'Commission',
		accessor: 'commission',
		width: '13%',
		render: (value: unknown, row: AdminCollaboration) => {
			const commission =
				(typeof value === 'number' ? value : null) ??
				row.proposedCommission ??
				0;
			return (
				<div className="flex justify-center">
					<div className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200/50 shadow-sm">
						<span className="font-bold text-sm bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
							{commission}%
						</span>
					</div>
				</div>
			);
		},
	},
	{
		header: 'Statut',
		accessor: 'status',
		width: '15%',
		render: (value: unknown) => {
			const status =
				typeof value === 'string' ? value : String(value ?? '');
			return (
				<div className="flex justify-center">
					<Badge
						variant={getStatusBadgeVariant(status)}
						size="sm"
						className="shadow-sm"
					>
						{getStatusLabel(status)}
					</Badge>
				</div>
			);
		},
	},
	{
		header: 'Dates',
		accessor: 'createdAt',
		width: '15%',
		render: (value: unknown, row: AdminCollaboration) => {
			const created =
				formatDate(value as string) || formatDate(row.createdAt);
			const updated = formatDate(row.updatedAt);

			return (
				<div className="text-xs text-gray-600 space-y-1 hidden sm:block">
					<p className="flex items-center gap-1 sm:gap-2">
						<Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
						<span className="truncate">{created}</span>
					</p>
					<p className="text-gray-500 flex items-center gap-1 sm:gap-2">
						<RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
						<span className="truncate">{updated}</span>
					</p>
				</div>
			);
		},
	},
];
