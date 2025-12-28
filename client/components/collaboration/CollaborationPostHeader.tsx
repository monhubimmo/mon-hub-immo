/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { CollaborationStatusBadge } from './CollaborationStatusBadge';
import type { Property } from '@/lib/api/propertyApi';
import type { Collaboration } from '@/types/collaboration';
import { toCdnUrl } from '@/lib/utils/imageUtils';

interface CollaborationPostHeaderProps {
	postImage: string;
	postTitle: string;
	postLocation: string;
	postPrice?: number;
	property?: Property | null;
	isLoadingPost: boolean;
	status: Collaboration['status'];
}

export const CollaborationPostHeader: React.FC<
	CollaborationPostHeaderProps
> = ({
	postImage,
	postTitle,
	postLocation,
	postPrice,
	property,
	isLoadingPost,
	status,
}) => {
	return (
		<div className="flex items-start space-x-4 p-4">
			<div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
				{isLoadingPost ? (
					<div className="w-full h-full bg-gray-300 animate-pulse" />
				) : (
					<img
						src={toCdnUrl(postImage)}
						alt={postTitle}
						width={80}
						height={100}
						className="object-cover h-full"
					/>
				)}
			</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="text-lg font-semibold text-gray-900 truncate">
							{isLoadingPost ? (
								<div className="h-5 bg-gray-300 animate-pulse rounded w-32" />
							) : (
								postTitle
							)}
						</h3>
						{property && postPrice && (
							<p className="text-sm text-brand font-medium">
								{postPrice.toLocaleString('fr-FR')} €
							</p>
						)}
					</div>
					<CollaborationStatusBadge status={status} />
				</div>
				<div className="flex items-center text-gray-600 mt-1">
					<svg
						className="w-4 h-4 mr-1"
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
					<span className="text-sm">
						{isLoadingPost ? (
							<div className="h-4 bg-gray-300 animate-pulse rounded w-24" />
						) : (
							postLocation
						)}
					</span>
				</div>
				{property && (
					<div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
						{property.surface && (
							<span>📐 {property.surface}m²</span>
						)}
						{property.rooms && (
							<span>🏠 {property.rooms} pièces</span>
						)}
						{property.bedrooms && (
							<span>🛏️ {property.bedrooms} ch.</span>
						)}
					</div>
				)}
			</div>
		</div>
	);
};
