import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { Components } from '@/lib/constants';
import { toCdnUrl } from '@/lib/utils/imageUtils';

interface FileUploadProps {
	label: string;
	accept?: string;
	onChange: (file: File | null) => void;
	value?: File | null;
	existingFileUrl?: string;
	onRemoveExisting?: () => void;
	error?: string;
	helperText?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
	label,
	accept = 'image/*,application/pdf',
	onChange,
	value,
	existingFileUrl,
	onRemoveExisting,
	error,
	helperText,
}) => {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [preview, setPreview] = useState<string | null>(null);
	const [isDragging, setIsDragging] = useState(false);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] || null;

		if (file) {
			// Create preview for images
			if (file.type.startsWith('image/')) {
				const reader = new FileReader();
				reader.onloadend = () => {
					setPreview(reader.result as string);
				};
				reader.readAsDataURL(file);
			} else {
				setPreview(null);
			}
			onChange(file);
		} else {
			setPreview(null);
			onChange(null);
		}
	};

	const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	};

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);

		const files = e.dataTransfer.files;
		if (files && files.length > 0) {
			const file = files[0];

			// Validate file type
			const acceptedTypes = accept.split(',').map((type) => type.trim());
			const isValidType = acceptedTypes.some((type) => {
				if (type === 'image/*') return file.type.startsWith('image/');
				if (type === 'application/pdf')
					return file.type === 'application/pdf';
				return file.type === type;
			});

			if (isValidType) {
				// Create preview for images
				if (file.type.startsWith('image/')) {
					const reader = new FileReader();
					reader.onloadend = () => {
						setPreview(reader.result as string);
					};
					reader.readAsDataURL(file);
				} else {
					setPreview(null);
				}
				onChange(file);
			}
		}
	};

	const handleRemove = () => {
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
		setPreview(null);
		onChange(null);
	};

	const getFileIcon = () => {
		if (!value) return null;

		if (value.type === 'application/pdf') {
			return (
				<svg
					className="w-8 h-8 text-red-500"
					fill="currentColor"
					viewBox="0 0 20 20"
				>
					<path
						fillRule="evenodd"
						d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
						clipRule="evenodd"
					/>
				</svg>
			);
		}
		return null;
	};

	return (
		<div>
			<label className="block text-sm font-medium text-gray-700 mb-2">
				{label}
			</label>

			{/* Show existing file from URL */}
			{!value && existingFileUrl ? (
				<div className="border-2 border-green-300 bg-green-50 rounded-lg p-4 flex items-center gap-3">
					<div className="relative w-16 h-16 rounded overflow-hidden">
						{existingFileUrl.toLowerCase().endsWith('.pdf') ? (
							<div className="w-full h-full flex items-center justify-center bg-gray-100">
								<svg
									className="w-8 h-8 text-red-500"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path
										fillRule="evenodd"
										d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
										clipRule="evenodd"
									/>
								</svg>
							</div>
						) : (
							<Image
								src={toCdnUrl(existingFileUrl)}
								alt="Fichier téléchargé"
								fill
								className="object-cover"
							/>
						)}
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-sm font-medium text-green-700">
							✓ Fichier déjà téléchargé
						</p>
						<p className="text-xs text-gray-500">
							Lors de l&apos;inscription
						</p>
					</div>
					{onRemoveExisting && (
						<button
							type="button"
							onClick={onRemoveExisting}
							className="flex-shrink-0 text-gray-400 hover:text-red-500"
							title="Remplacer le fichier"
						>
							<svg
								className="w-5 h-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
								/>
							</svg>
						</button>
					)}
				</div>
			) : !value ? (
				<div
					onClick={() => fileInputRef.current?.click()}
					onDragEnter={handleDragEnter}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
						isDragging
							? 'border-brand bg-brand/5'
							: 'border-gray-300 hover:border-brand'
					}`}
				>
					<svg
						className="mx-auto h-8 w-8 text-gray-400"
						stroke="currentColor"
						fill="none"
						viewBox="0 0 48 48"
					>
						<path
							d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
							strokeWidth={2}
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
					<p className="mt-2 text-sm text-gray-600">
						{isDragging
							? 'Déposez le fichier ici'
							: 'Cliquez pour télécharger ou glissez-déposez un fichier'}
					</p>
					<p className="text-xs text-gray-500 mt-1">
						Images ou PDF (max 5MB)
					</p>
				</div>
			) : (
				<div className="border-2 border-gray-300 rounded-lg p-4 flex items-center gap-3">
					{preview ? (
						<div className="relative w-16 h-16 rounded overflow-hidden">
							<Image
								src={preview}
								alt={Components.UI.IMAGE_ALT_TEXT.preview}
								fill
								className="object-cover"
							/>
						</div>
					) : (
						<div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded">
							{getFileIcon()}
						</div>
					)}
					<div className="flex-1 min-w-0">
						<p className="text-sm font-medium text-gray-900 truncate">
							{value.name}
						</p>
						<p className="text-xs text-gray-500">
							{(value.size / 1024).toFixed(1)} KB
						</p>
					</div>
					<button
						type="button"
						onClick={handleRemove}
						className="flex-shrink-0 text-red-500 hover:text-red-700"
					>
						<svg
							className="w-5 h-5"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							<path
								fillRule="evenodd"
								d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
								clipRule="evenodd"
							/>
						</svg>
					</button>
				</div>
			)}

			<input
				ref={fileInputRef}
				type="file"
				accept={accept}
				onChange={handleFileChange}
				className="hidden"
			/>

			{helperText && (
				<p className="text-xs text-gray-600 mt-1">{helperText}</p>
			)}

			{error && <p className="mt-1 text-sm text-red-600">{error}</p>}
		</div>
	);
};
