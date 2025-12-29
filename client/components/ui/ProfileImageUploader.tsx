import React, { useState, useRef } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import Image from 'next/image';
import { api } from '@/lib/api';
import { logger } from '@/lib/utils/logger';
import { useMutation } from '@/hooks/useMutation';
import { UI } from '@/lib/constants/components';
import { Camera } from 'lucide-react';
import { toCdnUrl } from '@/lib/utils/imageUtils';

interface ProfileImageUploaderProps {
	currentImageUrl?: string;
	onImageUploaded: (imageUrl: string) => void;
	className?: string;
	disabled?: boolean;
	size?: 'small' | 'medium' | 'large';
	showRemove?: boolean;
	onRemove?: () => void;
	userName?: string;
}

export const ProfileImageUploader: React.FC<ProfileImageUploaderProps> = ({
	currentImageUrl,
	onImageUploaded,
	className = '',
	disabled = false,
	size = 'medium',
	showRemove = true,
	onRemove,
	userName = '',
}) => {
	const [uploadError, setUploadError] = useState<string>('');
	const [isHovered, setIsHovered] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Size configurations
	const sizeConfig = {
		small: { container: 'w-16 h-16', icon: 'w-4 h-4', text: 'text-xs' },
		medium: { container: 'w-24 h-24', icon: 'w-5 h-5', text: 'text-sm' },
		large: { container: 'w-32 h-32', icon: 'w-6 h-6', text: 'text-base' },
	};

	// Get initials from userName
	const getInitials = (name: string): string => {
		if (!name) return '?';
		const parts = name.trim().split(' ');
		if (parts.length >= 2) {
			return (parts[0][0] + parts[1][0]).toUpperCase();
		}
		return name.substring(0, 2).toUpperCase();
	};
	const { mutate: uploadImage, loading: isUploading } = useMutation<
		string,
		File
	>(
		async (file: File) => {
			// First, delete the old image if it exists
			if (currentImageUrl) {
				logger.debug(
					'[ProfileImageUploader] Deleting old image',
					currentImageUrl,
				);
				const oldImageKey = extractS3KeyFromUrl(currentImageUrl);
				logger.debug(
					'[ProfileImageUploader] Extracted S3 key for deletion',
					oldImageKey,
				);

				if (oldImageKey) {
					try {
						logger.debug(
							'[ProfileImageUploader] Attempting S3 deletion',
							oldImageKey,
						);
						const deleteResponse = await api.delete(
							'/upload/delete',
							{
								data: { keys: [oldImageKey] },
							},
						);
						logger.debug(
							'[ProfileImageUploader] S3 deletion success',
							deleteResponse.data,
						);
					} catch (deleteError) {
						logger.error(
							'[ProfileImageUploader] Failed to delete old image',
							deleteError,
						);
						// Continue with upload even if delete fails
					}
				} else {
					logger.warn(
						'Could not extract S3 key from URL:',
						currentImageUrl,
					);
				}
			}

			// Upload the new image
			const formData = new FormData();
			formData.append('image', file);

			const response = await api.post('/upload/single', formData, {
				headers: {
					'Content-Type': 'multipart/form-data',
				},
			});

			if (response.data.success && response.data.data) {
				return response.data.data.url;
			} else {
				throw new Error(response.data.message || 'Upload failed');
			}
		},
		{
			onSuccess: (imageUrl) => {
				onImageUploaded(imageUrl);
				setUploadError('');
			},
			onError: (error) => {
				setUploadError(error.message);
			},
			successMessage: UI.IMAGE_UPLOADER_MESSAGES.uploadSuccess,
			errorMessage: UI.IMAGE_UPLOADER_MESSAGES.uploadError,
			context: 'ProfileImageUploader',
		},
	);

	// Extract S3 key from URL
	const extractS3KeyFromUrl = (url: string): string | null => {
		try {
			const urlObj = new URL(url);
			let pathname = urlObj.pathname;

			// Remove leading slash
			if (pathname.startsWith('/')) {
				pathname = pathname.substring(1);
			}

			// Handle different S3 URL formats:
			// 1. s3.amazonaws.com/bucket/key
			// 2. bucket.s3.amazonaws.com/key
			// 3. CloudFront URLs with key in path

			logger.debug('[ProfileImageUploader] Extracting S3 key', {
				url,
				pathname,
			});

			return pathname || null;
		} catch (error) {
			logger.error('[ProfileImageUploader] Failed to extract S3 key', {
				url,
				error,
			});
			return null;
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			// Validate file type
			const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
			if (!validTypes.includes(file.type)) {
				setUploadError(
					'Format non supporté. Utilisez JPG, PNG ou WebP.',
				);
				return;
			}
			// Validate file size (5MB)
			if (file.size > 5 * 1024 * 1024) {
				setUploadError('Le fichier est trop volumineux (max 5MB).');
				return;
			}
			setUploadError('');
			uploadImage(file);
		}
		// Reset input so same file can be selected again
		e.target.value = '';
	};

	const handleClick = () => {
		if (!disabled && !isUploading) {
			fileInputRef.current?.click();
		}
	};

	const handleRemoveImage = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (onRemove) {
			onRemove();
		}
	};

	return (
		<div className={`flex flex-col items-center ${className}`}>
			{/* Hidden file input */}
			<input
				ref={fileInputRef}
				type="file"
				accept="image/jpeg,image/png,image/webp"
				onChange={handleFileChange}
				className="hidden"
				disabled={disabled || isUploading}
			/>

			{/* Avatar Container */}
			<div
				className={`${sizeConfig[size].container} relative rounded-full cursor-pointer group`}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				onClick={handleClick}
			>
				{/* Avatar Content */}
				<div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center border-2 border-brand-300 shadow-md">
					{currentImageUrl ? (
						<Image
							src={toCdnUrl(currentImageUrl)}
							alt={UI.IMAGE_ALT_TEXT.profileImage}
							width={
								size === 'small'
									? 64
									: size === 'medium'
										? 96
										: 128
							}
							height={
								size === 'small'
									? 64
									: size === 'medium'
										? 96
										: 128
							}
							className="w-full h-full object-cover"
							unoptimized
							onError={(e) => {
								const target = e.target as HTMLImageElement;
								target.style.display = 'none';
							}}
						/>
					) : (
						<span
							className={`font-semibold text-brand-600 ${size === 'small' ? 'text-lg' : size === 'medium' ? 'text-2xl' : 'text-3xl'}`}
						>
							{getInitials(userName)}
						</span>
					)}
				</div>

				{/* Hover Overlay */}
				{!isUploading && (
					<div
						className={`absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center transition-opacity duration-200 ${
							isHovered ? 'opacity-100' : 'opacity-0'
						}`}
					>
						<Camera
							className={`${sizeConfig[size].icon} text-white mb-1`}
						/>
						<span
							className={`${sizeConfig[size].text} text-white font-medium`}
						>
							{currentImageUrl ? 'Modifier' : 'Ajouter'}
						</span>
					</div>
				)}

				{/* Loading Overlay */}
				{isUploading && (
					<div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
						<LoadingSpinner size="sm" />
					</div>
				)}

				{/* Remove Button */}
				{showRemove && currentImageUrl && !isUploading && (
					<button
						type="button"
						onClick={handleRemoveImage}
						disabled={disabled}
						className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 disabled:opacity-50 shadow-md transition-colors z-10"
					>
						×
					</button>
				)}
			</div>

			{/* Error Message */}
			{uploadError && (
				<p className="text-xs text-red-600 mt-2 text-center">
					{uploadError}
				</p>
			)}

			{/* Help Text */}
			<p className="text-xs text-gray-400 mt-2">
				JPG, PNG, WebP • Max 5MB
			</p>
		</div>
	);
};
