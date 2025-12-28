import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Features } from '@/lib/constants';
import { getImageUrl, toCdnUrl } from '@/lib/utils/imageUtils';

interface PropertyHeroProps {
	allImages: (string | { url: string; key: string })[];
	title: string;
	badges?: string[];
	onImageClick: (index: number) => void;
}

export const PropertyHero = ({
	allImages,
	title,
	badges = [],
	onImageClick,
}: PropertyHeroProps) => {
	const [currentImageIndex, setCurrentImageIndex] = useState(0);

	// Helper function to get image URL with CDN
	const getImageSrc = (image: string | { url: string; key: string }) => {
		const url = typeof image === 'string' ? image : image.url;
		return toCdnUrl(url);
	};

	// current image src state for main image (allows fallback on error)
	const [mainImageSrc, setMainImageSrc] = useState<string>(() =>
		getImageSrc(allImages[currentImageIndex]),
	);

	useEffect(() => {
		setMainImageSrc(getImageSrc(allImages[currentImageIndex]));
	}, [allImages, currentImageIndex]);

	return (
		<div className="bg-white rounded-lg shadow-lg overflow-hidden">
			{/* Main Image */}
			<div className="relative h-96 bg-gray-200">
				<Image
					src={mainImageSrc}
					alt={title}
					fill
					className="object-cover cursor-pointer"
					unoptimized
					onClick={() => onImageClick(currentImageIndex)}
					onError={() => {
						setMainImageSrc(getImageUrl(undefined, 'medium'));
					}}
				/>

				{/* Badges */}
				<div className="absolute top-4 left-4 flex flex-wrap gap-2 max-w-[70%]">
					{badges &&
						badges.length > 0 &&
						badges.map((badgeValue) => {
							const config =
								Features.Properties.getBadgeConfig(badgeValue);
							if (!config) return null;

							return (
								<span
									key={badgeValue}
									className={`${config.bgColor} ${config.color} text-sm px-3 py-1 rounded-full`}
								>
									{config.label}
								</span>
							);
						})}
				</div>

				{/* Navigation arrows */}
				{allImages.length > 1 && (
					<>
						<button
							onClick={() =>
								setCurrentImageIndex((prev) =>
									prev === 0
										? allImages.length - 1
										: prev - 1,
								)
							}
							className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
						>
							<svg
								className="w-6 h-6"
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
							onClick={() =>
								setCurrentImageIndex((prev) =>
									prev === allImages.length - 1
										? 0
										: prev + 1,
								)
							}
							className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
						>
							<svg
								className="w-6 h-6"
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
			</div>

			{/* Thumbnail Images */}
			{allImages.length > 1 && (
				<div className="p-4">
					<div className="flex space-x-2 overflow-x-auto">
						{allImages.map((image, index) => (
							<button
								key={index}
								onClick={() => {
									setCurrentImageIndex(index);
								}}
								onDoubleClick={() => onImageClick(index)}
								className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
									currentImageIndex === index
										? 'border-brand-600'
										: 'border-gray-200'
								} hover:border-brand-400 transition-colors`}
							>
								<div className="relative w-full h-full">
									<Image
										src={getImageSrc(image)}
										alt={`Image ${index + 1}`}
										fill
										className="object-cover"
										unoptimized
									/>
								</div>
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
