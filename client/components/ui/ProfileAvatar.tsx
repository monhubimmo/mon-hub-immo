'use client';
import React from 'react';
import Image from 'next/image';
import type { User } from '@/types/auth';
import { logger } from '@/lib/utils/logger';
import { toCdnUrl } from '@/lib/utils/imageUtils';

// ============================================================================
// PROFILE AVATAR COMPONENT
// ============================================================================

interface ProfileAvatarProps {
	/** User object with profile information */
	user:
		| User
		| {
				_id: string;
				firstName?: string;
				lastName?: string;
				profileImage?: string;
				name?: string;
				email?: string;
		  }
		| string; // Allow string ID defensively
	/** Size of avatar */
	size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
	/** Whether to show online indicator */
	showOnlineStatus?: boolean;
	/** Whether user is online */
	isOnline?: boolean;
	/** Custom className */
	className?: string;
	/** Whether avatar is clickable */
	clickable?: boolean;
	/** Click handler */
	onClick?: () => void;
	/** Custom background color override */
	bgColor?: string;
}

/**
 * Get avatar size classes with both container and image dimensions
 */
const getAvatarSizes = (size: ProfileAvatarProps['size']) => {
	switch (size) {
		case 'xs':
			return {
				container: 'w-6 h-6',
				image: { width: 24, height: 24 },
				text: 'text-xs',
				onlineIndicator: 'w-2 h-2 -top-0.5 -right-0.5',
			};
		case 'sm':
			return {
				container: 'w-8 h-8',
				image: { width: 32, height: 32 },
				text: 'text-sm',
				onlineIndicator: 'w-2.5 h-2.5 -top-0.5 -right-0.5',
			};
		case 'md':
			return {
				container: 'w-10 h-10',
				image: { width: 40, height: 40 },
				text: 'text-base',
				onlineIndicator: 'w-3 h-3 -top-0.5 -right-0.5',
			};
		case 'lg':
			return {
				container: 'w-12 h-12',
				image: { width: 48, height: 48 },
				text: 'text-lg',
				onlineIndicator: 'w-3.5 h-3.5 -top-0.5 -right-0.5',
			};
		case 'xl':
			return {
				container: 'w-16 h-16',
				image: { width: 64, height: 64 },
				text: 'text-xl',
				onlineIndicator: 'w-4 h-4 -top-1 -right-1',
			};
		case '2xl':
			return {
				container: 'w-20 h-20',
				image: { width: 80, height: 80 },
				text: 'text-2xl',
				onlineIndicator: 'w-5 h-5 -top-1 -right-1',
			};
		default:
			return {
				container: 'w-10 h-10',
				image: { width: 40, height: 40 },
				text: 'text-base',
				onlineIndicator: 'w-3 h-3 -top-0.5 -right-0.5',
			};
	}
};

/**
 * Generate user initials from name
 */
const getUserInitials = (user: ProfileAvatarProps['user']): string => {
	if (!user || typeof user !== 'object') return '?';
	const u = user as Partial<User> & {
		name?: string;
		firstName?: string;
		lastName?: string;
	};
	if (u.name && typeof u.name === 'string') {
		const names = u.name.trim().split(' ');
		if (names.length >= 2) {
			return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
		}
		return names[0][0]?.toUpperCase() || '?';
	}
	const firstName = u.firstName?.trim() || '';
	const lastName = u.lastName?.trim() || '';
	if (firstName && lastName) {
		return `${firstName[0]}${lastName[0]}`.toUpperCase();
	}
	return firstName[0]?.toUpperCase() || lastName[0]?.toUpperCase() || '?';
};

/**
 * Generate consistent background color based on user ID
 */
const getAvatarBgColor = (userId?: string): string => {
	const colors = [
		'bg-red-500',
		'bg-brand',
		'bg-green-500',
		'bg-yellow-500',
		'bg-purple-500',
		'bg-pink-500',
		'bg-indigo-500',
		'bg-teal-500',
		'bg-orange-500',
		'bg-brand',
	];

	// Defensive: if no userId, return neutral color
	if (!userId || typeof userId !== 'string' || userId.length === 0) {
		return 'bg-gray-400';
	}

	// Generate a hash from userId to get consistent color
	let hash = 0;
	for (let i = 0; i < userId.length; i++) {
		hash = userId.charCodeAt(i) + ((hash << 5) - hash);
	}

	return colors[Math.abs(hash) % colors.length];
};

/**
 * ProfileAvatar Component
 *
 * A reusable profile avatar component that displays user profile images
 * with fallback to initials. Supports multiple sizes, online status,
 * and consistent styling across the application.
 *
 * Features:
 * - Profile image display with error fallback
 * - Initials generation from user name
 * - Multiple size options (xs to 2xl)
 * - Online status indicator
 * - Consistent color scheme
 * - Click handling support
 * - Accessibility support
 */
export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
	user,
	size = 'md',
	showOnlineStatus = false,
	isOnline = false,
	className = '',
	clickable = false,
	onClick,
	bgColor,
}) => {
	const sizes = getAvatarSizes(size);
	const isObj = user && typeof user === 'object';

	const typedUser = user as Partial<User> & {
		name?: string;
		avatarUrl?: string;
	};

	const userObj = isObj
		? {
				_id: String(typedUser._id || 'unknown'),
				firstName: typedUser.firstName,
				lastName: typedUser.lastName,
				profileImage: typedUser.profileImage,
				name: typedUser.name,
				avatarUrl: typedUser.avatarUrl,
			}
		: { _id: String((user as string) || 'unknown') };

	const initials = getUserInitials(user);
	// Handle both profileImage and avatarUrl (for ChatUser compatibility)
	const rawImageUrl = isObj
		? userObj.profileImage || userObj.avatarUrl || null
		: null;
	const imageUrl = rawImageUrl ? toCdnUrl(rawImageUrl) : null;
	const hasProfileImage =
		imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '';

	// Debug logging to track why images aren't showing
	if (isObj && !hasProfileImage) {
		logger.debug('ProfileAvatar: No image for user', {
			userId: userObj._id,
			profileImage: userObj.profileImage,
			avatarUrl: userObj.avatarUrl,
			name: userObj.name,
			initials,
		});
	}

	const backgroundColor = bgColor || getAvatarBgColor(userObj._id);

	const containerClasses = [
		'relative inline-block',
		sizes.container,
		'rounded-full',
		'overflow-hidden',
		'flex items-center justify-center',
		'select-none',
		clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : '',
		!hasProfileImage ? backgroundColor : 'bg-gray-200',
		className,
	]
		.filter(Boolean)
		.join(' ');

	const handleClick = () => {
		if (clickable && onClick) {
			onClick();
		}
	};

	const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
		const target = e.target as HTMLImageElement;
		const parent = target.parentElement;
		if (parent) {
			// Hide the image and show initials
			target.style.display = 'none';
			parent.classList.add(backgroundColor);
			parent.innerHTML = `<span class="text-white font-medium ${sizes.text} flex items-center justify-center w-full h-full">${initials}</span>`;
		}
	};

	return (
		<div className="relative inline-block">
			<div
				className={containerClasses}
				onClick={handleClick}
				role={clickable ? 'button' : undefined}
				tabIndex={clickable ? 0 : undefined}
				onKeyDown={
					clickable
						? (e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									handleClick();
								}
							}
						: undefined
				}
				aria-label={`${
					isObj
						? userObj.name ||
							`${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() ||
							'profil utilisateur'
						: 'profil utilisateur'
				} profile`}
			>
				{hasProfileImage ? (
					<Image
						src={imageUrl!}
						alt={`${
							isObj
								? userObj.name ||
									`${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() ||
									'profil utilisateur'
								: 'profil utilisateur'
						} profile`}
						width={sizes.image.width}
						height={sizes.image.height}
						className="w-full h-full object-cover"
						onError={handleImageError}
						unoptimized
						priority={
							size === 'lg' || size === 'xl' || size === '2xl'
						}
					/>
				) : (
					<span
						className={`text-white font-medium ${sizes.text} flex items-center justify-center w-full h-full`}
					>
						{initials}
					</span>
				)}
			</div>

			{/* Online Status Indicator - Only show when online */}
			{showOnlineStatus && isOnline && (
				<div
					className={`absolute ${sizes.onlineIndicator} rounded-full border-2 border-white bg-green-500`}
					aria-label="En ligne"
				/>
			)}
		</div>
	);
};

export default ProfileAvatar;
