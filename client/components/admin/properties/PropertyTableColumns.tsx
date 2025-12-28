import React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Home } from 'lucide-react';
import type { AdminProperty } from '@/types/admin';
import {
	getPropertyTypeLabel,
	getStatusBadgeVariant,
} from '@/lib/utils/adminUtils';
import { toCdnUrl } from '@/lib/utils/imageUtils';

type ColumnDef = {
	header: string;
	accessor: string;
	width?: string;
	render?: (value: unknown, row: AdminProperty) => React.ReactNode;
};

export const getPropertyTableColumns = (): ColumnDef[] => [
	{
		header: 'Annonce',
		accessor: 'title',
		width: '35%',
		render: (_: unknown, row: AdminProperty) => {
			const basePath =
				row.propertyType === 'Recherche' ? '/search-ads' : '/property';
			return (
				<Link
					href={`${basePath}/${row._id}`}
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity cursor-pointer"
				>
					{row.mainImage?.url ? (
						<img
							src={toCdnUrl(row.mainImage.url)}
							alt={row.title}
							className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0 shadow-sm border border-gray-100"
						/>
					) : (
						<div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0 flex items-center justify-center shadow-sm border border-gray-100">
							<Home className="w-5 h-5 text-gray-400" />
						</div>
					)}
					<div className="min-w-0">
						<p className="font-semibold text-gray-900 text-sm truncate hover:text-cyan-600 transition-colors">
							{row.title}
						</p>
						<p className="text-xs text-gray-500 truncate mt-0.5">
							{row.location || row.city}
						</p>
					</div>
				</Link>
			);
		},
	},
	{
		header: 'Type',
		accessor: 'type',
		width: '12%',
		render: (value: unknown, row: AdminProperty) => (
			<Badge variant="info" size="sm" className="shadow-sm">
				{getPropertyTypeLabel(
					((value as string) || row.propertyType) ?? '',
				)}
			</Badge>
		),
	},
	{
		header: 'Prix',
		accessor: 'price',
		width: '15%',
		render: (value: unknown) => (
			<div className="flex items-center gap-1.5">
				<div className="px-2 py-1 rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200/50">
					<span className="font-bold text-sm bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
						€{(Number(value || 0) / 1000).toFixed(0)}k
					</span>
				</div>
			</div>
		),
	},
	{
		header: 'Statut',
		accessor: 'status',
		width: '15%',
		render: (value: unknown) => {
			const status = String(value || '');
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
		header: 'Créée',
		accessor: 'createdAt',
		width: '15%',
		render: (value: unknown) => (
			<span className="text-xs text-gray-600 hidden sm:inline">
				{new Date(String(value)).toLocaleDateString('fr-FR')}
			</span>
		),
	},
];
