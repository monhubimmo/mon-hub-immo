'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { toCdnUrl } from '@/lib/utils/imageUtils';

interface ImageLightboxProps {
	isOpen: boolean;
	images: Array<{ url: string; alt?: string }>;
	initialIndex?: number;
	onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
	isOpen,
	images,
	initialIndex = 0,
	onClose,
}) => {
	const [currentIndex, setCurrentIndex] = useState(initialIndex);
	const [isZoomed, setIsZoomed] = useState(false);
	const [zoomLevel, setZoomLevel] = useState(1);
	const [position, setPosition] = useState({ x: 0, y: 0 });
	const [isDragging, setIsDragging] = useState(false);
	const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

	// Reset state when lightbox opens/closes
	useEffect(() => {
		if (isOpen) {
			setCurrentIndex(initialIndex);
			setIsZoomed(false);
			setZoomLevel(1);
			setPosition({ x: 0, y: 0 });
		}
	}, [isOpen, initialIndex]);

	// Zoom functions
	const resetZoom = useCallback(() => {
		setZoomLevel(1);
		setIsZoomed(false);
		setPosition({ x: 0, y: 0 });
	}, []);

	const handleZoomIn = useCallback(() => {
		setZoomLevel((prev) => Math.min(prev + 0.5, 3));
		setIsZoomed(true);
	}, []);

	const handleZoomOut = useCallback(() => {
		const newZoom = Math.max(zoomLevel - 0.5, 1);
		setZoomLevel(newZoom);
		if (newZoom === 1) {
			setIsZoomed(false);
			setPosition({ x: 0, y: 0 });
		}
	}, [zoomLevel]);

	// Navigation functions
	const goToNext = useCallback(() => {
		if (images.length <= 1) return;
		setCurrentIndex((prev) => (prev + 1) % images.length);
		resetZoom();
	}, [images.length, resetZoom]);

	const goToPrevious = useCallback(() => {
		if (images.length <= 1) return;
		setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
		resetZoom();
	}, [images.length, resetZoom]);

	// Handle keyboard navigation
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!isOpen) return;

			switch (e.key) {
				case 'Escape':
					onClose();
					break;
				case 'ArrowLeft':
					goToPrevious();
					break;
				case 'ArrowRight':
					goToNext();
					break;
				case '+':
				case '=':
					handleZoomIn();
					break;
				case '-':
					handleZoomOut();
					break;
				case '0':
					resetZoom();
					break;
			}
		};

		if (isOpen) {
			window.addEventListener('keydown', handleKeyDown);
			document.body.style.overflow = 'hidden';
		}

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			document.body.style.overflow = 'unset';
		};
	}, [
		isOpen,
		goToNext,
		goToPrevious,
		handleZoomIn,
		handleZoomOut,
		resetZoom,
		onClose,
	]);

	const handleImageClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!isZoomed) {
			handleZoomIn();
		}
	};

	const handleMouseDown = (e: React.MouseEvent) => {
		if (!isZoomed) return;
		setIsDragging(true);
		setDragStart({
			x: e.clientX - position.x,
			y: e.clientY - position.y,
		});
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (!isDragging || !isZoomed) return;
		setPosition({
			x: e.clientX - dragStart.x,
			y: e.clientY - dragStart.y,
		});
	};

	const handleMouseUp = () => {
		setIsDragging(false);
	};

	if (!isOpen || images.length === 0) return null;

	const currentImage = images[currentIndex];

	return (
		<div
			className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center"
			onClick={onClose}
		>
			{/* Close button */}
			<button
				onClick={onClose}
				className="absolute top-4 right-4 z-60 text-white hover:text-gray-300 transition-colors-smooth"
				aria-label="Fermer"
			>
				<svg
					className="w-8 h-8"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>

			{/* Navigation arrows */}
			{images.length > 1 && (
				<>
					<button
						onClick={(e) => {
							e.stopPropagation();
							goToPrevious();
						}}
						className="absolute left-4 top-1/2 transform -translate-y-1/2 z-60 text-white hover:text-gray-300 transition-colors"
						aria-label="Image précédente"
					>
						<svg
							className="w-12 h-12"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M15 19l-7-7 7-7"
							/>
						</svg>
					</button>

					<button
						onClick={(e) => {
							e.stopPropagation();
							goToNext();
						}}
						className="absolute right-4 top-1/2 transform -translate-y-1/2 z-60 text-white hover:text-gray-300 transition-colors"
						aria-label="Image suivante"
					>
						<svg
							className="w-12 h-12"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M9 5l7 7-7 7"
							/>
						</svg>
					</button>
				</>
			)}

			{/* Zoom controls */}
			<div className="absolute top-4 left-4 z-60 flex flex-col space-y-2">
				<button
					onClick={(e) => {
						e.stopPropagation();
						handleZoomIn();
					}}
					className="bg-black bg-opacity-50 text-white p-2 rounded hover:bg-opacity-75 transition-colors"
					aria-label="Zoom avant"
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
							strokeWidth="2"
							d="M12 6v6m0 0v6m0-6h6m-6 0H6"
						/>
					</svg>
				</button>

				<button
					onClick={(e) => {
						e.stopPropagation();
						handleZoomOut();
					}}
					className="bg-black bg-opacity-50 text-white p-2 rounded hover:bg-opacity-75 transition-colors"
					aria-label="Zoom arrière"
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
							strokeWidth="2"
							d="M18 12H6"
						/>
					</svg>
				</button>

				{isZoomed && (
					<button
						onClick={(e) => {
							e.stopPropagation();
							resetZoom();
						}}
						className="bg-black bg-opacity-50 text-white p-2 rounded hover:bg-opacity-75 transition-colors"
						aria-label="Réinitialiser zoom"
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
								strokeWidth="2"
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
					</button>
				)}
			</div>

			{/* Image counter */}
			{images.length > 1 && (
				<div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-60 bg-black bg-opacity-50 text-white px-3 py-1 rounded">
					{currentIndex + 1} / {images.length}
				</div>
			)}

			{/* Main image */}
			<div
				className="relative max-w-full max-h-full flex items-center justify-center cursor-pointer"
				onClick={handleImageClick}
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				onMouseLeave={handleMouseUp}
				style={{
					cursor: isZoomed
						? isDragging
							? 'grabbing'
							: 'grab'
						: 'zoom-in',
				}}
			>
				<Image
					src={toCdnUrl(currentImage.url)}
					alt={currentImage.alt || `Image ${currentIndex + 1}`}
					width={1200}
					height={800}
					className="max-w-full max-h-screen object-contain transition-transform duration-200"
					style={{
						transform: `scale(${zoomLevel}) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px)`,
					}}
					priority
				/>
			</div>

			{/* Instructions */}
			<div className="absolute bottom-4 right-4 z-60 text-white text-sm bg-black bg-opacity-50 p-2 rounded">
				<div>Cliquez pour zoomer • Échap pour fermer</div>
				{isZoomed && (
					<div>Glissez pour déplacer • 0 pour réinitialiser</div>
				)}
			</div>
		</div>
	);
};
