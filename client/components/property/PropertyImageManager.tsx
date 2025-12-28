import React, { useState } from 'react';
import { ImageUploader } from '../ui/ImageUploader';
import Image from 'next/image';
import { Components } from '@/lib/constants';
import { GripVertical } from 'lucide-react';
import { toCdnUrl } from '@/lib/utils/imageUtils';

interface ImageFile {
	file: File;
	preview: string;
	id: string;
}

interface PropertyImageManagerProps {
	onMainImageChange?: (images: ImageFile[]) => void;
	onGalleryImagesChange?: (images: ImageFile[]) => void;
	existingMainImage?: { url: string; key: string } | null;
	existingGalleryImages?: Array<{ url: string; key: string }>;
	onExistingMainImageRemove?: () => void;
	onExistingGalleryImageRemove?: (imageKey: string) => void;
	onExistingGalleryImagesReorder?: (
		images: Array<{ url: string; key: string }>,
	) => void;
	className?: string;
	disabled?: boolean;
}

export const PropertyImageManager: React.FC<PropertyImageManagerProps> = ({
	onMainImageChange,
	onGalleryImagesChange,
	existingMainImage,
	existingGalleryImages = [],
	onExistingMainImageRemove,
	onExistingGalleryImageRemove,
	onExistingGalleryImagesReorder,
	className = '',
	disabled = false,
}) => {
	const [mainImage, setMainImage] = useState<ImageFile[]>([]);
	const [galleryImages, setGalleryImages] = useState<ImageFile[]>([]);
	const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

	const handleMainImageChange = (images: ImageFile[]) => {
		setMainImage(images);
		onMainImageChange?.(images);
	};

	const handleGalleryImagesChange = (images: ImageFile[]) => {
		setGalleryImages(images);
		onGalleryImagesChange?.(images);
	};

	// Drag and drop reordering for existing gallery images
	const handleDragStart = (e: React.DragEvent, index: number) => {
		setDraggedIndex(index);
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', index.toString());
	};

	const handleDragOver = (e: React.DragEvent, index: number) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		if (draggedIndex !== index) {
			setDragOverIndex(index);
		}
	};

	const handleDragLeave = () => {
		setDragOverIndex(null);
	};

	const handleDrop = (e: React.DragEvent, dropIndex: number) => {
		e.preventDefault();
		if (draggedIndex === null || draggedIndex === dropIndex) {
			setDraggedIndex(null);
			setDragOverIndex(null);
			return;
		}

		const newImages = [...existingGalleryImages];
		const [draggedImage] = newImages.splice(draggedIndex, 1);
		newImages.splice(dropIndex, 0, draggedImage);

		onExistingGalleryImagesReorder?.(newImages);
		setDraggedIndex(null);
		setDragOverIndex(null);
	};

	const handleDragEnd = () => {
		setDraggedIndex(null);
		setDragOverIndex(null);
	};

	return (
		<div className={`space-y-6 ${className}`}>
			{/* Main Image Section */}
			<div>
				<h3 className="text-lg font-semibold text-gray-900 mb-3">
					Image principale *
				</h3>

				{/* Existing Main Image */}
				{existingMainImage && (
					<div className="mb-4">
						<h4 className="text-sm font-medium text-gray-700 mb-2">
							Image actuelle:
						</h4>
						<div className="relative inline-block w-32 h-32">
							<Image
								src={toCdnUrl(existingMainImage.url)}
								alt={
									Components.UI.IMAGE_ALT_TEXT
										.mainPropertyImage
								}
								width={128}
								height={128}
								className="w-full h-full object-cover rounded-lg border-2 border-gray-200"
								unoptimized
							/>
							<button
								type="button"
								onClick={onExistingMainImageRemove}
								className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 z-10"
								disabled={disabled}
							>
								×
							</button>
						</div>
						<p className="text-xs text-gray-500 mt-1">
							Cliquez sur le × pour supprimer et remplacer par une
							nouvelle image
						</p>
					</div>
				)}

				{/* New Main Image Upload */}
				{(!existingMainImage || mainImage.length > 0) && (
					<div>
						<h4 className="text-sm font-medium text-gray-700 mb-2">
							{existingMainImage
								? 'Remplacer par:'
								: 'Ajouter une image:'}
						</h4>
						<ImageUploader
							onImagesChange={handleMainImageChange}
							maxImages={1}
							className="border-brand-600 border-2"
							disabled={disabled}
						/>
					</div>
				)}

				{mainImage.length === 0 && !existingMainImage && (
					<p className="text-sm text-gray-500 mt-2">
						Cette image sera affichée en premier sur votre annonce
					</p>
				)}
			</div>

			{/* Gallery Images Section */}
			<div>
				<h3 className="text-lg font-semibold text-gray-900 mb-3">
					Images supplémentaires
					<span className="text-sm font-normal text-gray-500 ml-2">
						(optionnel)
					</span>
				</h3>

				{/* Existing Gallery Images */}
				{existingGalleryImages && existingGalleryImages.length > 0 && (
					<div className="mb-4">
						<h4 className="text-sm font-medium text-gray-700 mb-2">
							Images actuelles:
						</h4>
						<p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
							<GripVertical className="w-3 h-3" />
							Glissez pour réorganiser l&apos;ordre des images
						</p>
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
							{existingGalleryImages.map((image, index) => (
								<div
									key={image.key || index}
									draggable={!disabled}
									onDragStart={(e) =>
										handleDragStart(e, index)
									}
									onDragOver={(e) => handleDragOver(e, index)}
									onDragLeave={handleDragLeave}
									onDrop={(e) => handleDrop(e, index)}
									onDragEnd={handleDragEnd}
									className={`relative group cursor-grab active:cursor-grabbing transition-all duration-200 ${
										draggedIndex === index
											? 'opacity-50 scale-95'
											: ''
									} ${
										dragOverIndex === index
											? 'ring-2 ring-brand-500 ring-offset-2'
											: ''
									}`}
								>
									<div className="aspect-square w-full rounded-lg overflow-hidden border-2 border-gray-200 relative">
										<Image
											src={toCdnUrl(image.url)}
											alt={`Image galerie ${index + 1}`}
											fill
											className="object-cover pointer-events-none"
											unoptimized
										/>
										{/* Drag handle */}
										<div className="absolute top-1 left-1 bg-white/80 rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
											<GripVertical className="w-4 h-4 text-gray-600" />
										</div>
									</div>
									<button
										type="button"
										onClick={() =>
											onExistingGalleryImageRemove?.(
												image.key,
											)
										}
										className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 z-10"
										disabled={disabled}
									>
										×
									</button>
								</div>
							))}
						</div>
					</div>
				)}

				{/* New Gallery Images Upload */}
				<div>
					<h4 className="text-sm font-medium text-gray-700 mb-2">
						{existingGalleryImages &&
						existingGalleryImages.length > 0
							? "Ajouter plus d'images:"
							: 'Ajouter des images:'}
					</h4>
					<ImageUploader
						onImagesChange={handleGalleryImagesChange}
						maxImages={20}
						disabled={disabled}
					/>
				</div>

				{galleryImages.length === 0 &&
					(!existingGalleryImages ||
						existingGalleryImages.length === 0) && (
						<p className="text-sm text-gray-500 mt-2">
							Ajoutez jusqu&apos;à 20 images supplémentaires pour
							votre galerie
						</p>
					)}
			</div>

			{/* Progress Info */}
			{(mainImage.length > 0 ||
				galleryImages.length > 0 ||
				existingMainImage ||
				(existingGalleryImages &&
					existingGalleryImages.length > 0)) && (
				<div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
					<p>
						📸{' '}
						{existingMainImage
							? '1 image principale (actuelle)'
							: `${mainImage.length} image principale`}
						{existingGalleryImages &&
							existingGalleryImages.length > 0 &&
							` • ${existingGalleryImages.length} images actuelles`}
						{galleryImages.length > 0 &&
							` • ${galleryImages.length} nouvelles images`}
					</p>
					<p className="text-xs text-gray-500 mt-1">
						{mainImage.length > 0 || galleryImages.length > 0
							? 'Les nouvelles images seront uploadées lors de la sauvegarde'
							: 'Gérez vos images existantes ou ajoutez-en de nouvelles'}
					</p>
				</div>
			)}
		</div>
	);
};
