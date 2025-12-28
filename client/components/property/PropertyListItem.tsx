import React from 'react';
import Image from 'next/image';
import { Button, StatusBadge, RichTextDisplay } from '@/components/ui';
import { Property } from '@/lib/api/propertyApi';
import { getImageUrl } from '@/lib/utils/imageUtils';
import { Features, Components } from '@/lib/constants';
import { Select } from '@/components/ui/CustomSelect';

interface PropertyListItemProps {
	property: Property;
	onEdit: (property: Property) => void;
	onDelete: (propertyId: string) => void;
	onStatusChange: (propertyId: string, newStatus: Property['status']) => void;
}

export const PropertyListItem: React.FC<PropertyListItemProps> = ({
	property,
	onEdit,
	onDelete,
	onStatusChange,
}) => {
	return (
		<div className="bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow">
			<div className="flex flex-col sm:flex-row">
				<div className="w-full sm:w-48 h-48 sm:h-32 bg-gray-200 flex-shrink-0 relative rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none overflow-hidden">
					<Image
						src={getImageUrl(property.mainImage, 'medium')}
						alt={property.title}
						fill
						className="object-cover"
						unoptimized
					/>
				</div>
				<div className="flex-1 p-4">
					<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
						<div className="flex-1 min-w-0">
							<div className="flex items-start flex-col sm:flex-row sm:items-center gap-2 mb-2">
								<h3 className="text-lg font-semibold text-gray-900 truncate">
									{property.title}
								</h3>
								{property.badges &&
									property.badges.length > 0 && (
										<div className="flex flex-wrap gap-1.5">
											{property.badges.map(
												(badgeValue) => {
													const config =
														Features.Properties.getBadgeConfig(
															badgeValue,
														);
													if (!config) return null;

													// Modern badge colors
													let badgeClass = '';
													if (
														badgeValue === 'nouveau'
													) {
														badgeClass =
															'bg-emerald-500 text-white';
													} else if (
														badgeValue === 'urgent'
													) {
														badgeClass =
															'bg-red-500 text-white';
													} else if (
														badgeValue ===
														'negociable'
													) {
														badgeClass =
															'bg-blue-600 text-white';
													} else {
														badgeClass = `${config.bgColor} ${config.color}`;
													}

													return (
														<span
															key={badgeValue}
															className={`${badgeClass} text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm`}
														>
															{config.label}
														</span>
													);
												},
											)}
										</div>
									)}
							</div>
							<div className="text-gray-600 text-sm mb-2 line-clamp-2">
								<RichTextDisplay
									content={property.description}
								/>
							</div>
							<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
								<span>{property.propertyType}</span>
								<span className="hidden sm:inline">•</span>
								<span>{property.surface} m²</span>
								<span className="hidden sm:inline">•</span>
								<span className="truncate">
									{property.city}
								</span>
								<span className="hidden sm:inline">•</span>
								<span>{property.viewCount} vues</span>
							</div>
						</div>
						<div className="text-left sm:text-right flex-shrink-0">
							<div className="text-xl font-bold text-gray-900 mb-2">
								{property.price.toLocaleString()} €
							</div>
							<StatusBadge
								entityType="property"
								status={property.status}
							/>
						</div>
					</div>
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-4 border-t">
						<div className="flex items-center">
							<Select
								value={property.status}
								onChange={(value) =>
									onStatusChange(
										property._id,
										value as Property['status'],
									)
								}
								options={[
									{ value: 'draft', label: 'Brouillon' },
									{ value: 'active', label: 'Actif' },
									{ value: 'sold', label: 'Vendu' },
									{ value: 'rented', label: 'Loué' },
									{ value: 'archived', label: 'Archivé' },
								]}
							/>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => onEdit(property)}
								className="flex-1 sm:flex-initial"
							>
								{Components.UI.BUTTON_TEXT.edit}
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => onDelete(property._id)}
								className="text-red-600 border-red-300 hover:bg-red-50 flex-1 sm:flex-initial"
							>
								{Components.UI.BUTTON_TEXT.delete}
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
