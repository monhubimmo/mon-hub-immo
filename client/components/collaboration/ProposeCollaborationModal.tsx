/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { FormProvider } from '@/context/FormContext';
import { RichTextDisplay } from '../ui';
import { useCollaborationMutations } from '@/hooks/useCollaborations';
import type { Property } from '@/lib/api/propertyApi';
import type { SearchAd } from '@/types/searchAd';
import { useForm } from '@/hooks/useForm';
import { toCdnUrl } from '@/lib/utils/imageUtils';

type PostData =
	| {
			type: 'property';
			id: string;
			ownerUserType: 'agent' | 'apporteur';
			data: Pick<
				Property,
				| '_id'
				| 'title'
				| 'price'
				| 'city'
				| 'postalCode'
				| 'propertyType'
				| 'surface'
				| 'rooms'
				| 'mainImage'
			>;
	  }
	| {
			type: 'searchAd';
			id: string;
			ownerUserType: 'agent' | 'apporteur';
			data: Pick<
				SearchAd,
				| '_id'
				| 'title'
				| 'description'
				| 'location'
				| 'budget'
				| 'propertyTypes'
				| 'authorType'
			>;
	  };

interface ProposeCollaborationModalProps {
	isOpen: boolean;
	onClose: () => void;
	post: PostData;
	onSuccess?: () => void;
}

interface CollaborationFormData extends Record<string, unknown> {
	commissionPercentage: string;
	compensationType: 'percentage' | 'fixed_amount' | 'gift_vouchers';
	compensationAmount: string;
	message: string;
	agreeToTerms: boolean;
}

export const ProposeCollaborationModal: React.FC<
	ProposeCollaborationModalProps
> = ({ isOpen, onClose, post, onSuccess }) => {
	const isApporteurPost = post.ownerUserType === 'apporteur';
	const { proposeCollaboration } = useCollaborationMutations();

	const { values, isSubmitting, setFieldValue, handleSubmit, resetForm } =
		useForm<CollaborationFormData>({
			initialValues: {
				commissionPercentage: '',
				compensationType: 'percentage',
				compensationAmount: '',
				message: '',
				agreeToTerms: false,
			},
			onSubmit: async (data) => {
				// Validate for apporteur posts
				if (isApporteurPost) {
					if (data.compensationType === 'percentage') {
						const percentage = parseFloat(
							data.commissionPercentage,
						);
						if (percentage >= 50) {
							throw new Error(
								"Le pourcentage de commission doit être inférieur à 50% pour les posts d'apporteur",
							);
						}
					} else if (!data.compensationAmount) {
						throw new Error(
							'Veuillez saisir un montant de compensation',
						);
					}
				}

				// Build request payload
				const payload: {
					propertyId?: string;
					searchAdId?: string;
					commissionPercentage?: number;
					message: string;
					compensationType?:
						| 'percentage'
						| 'fixed_amount'
						| 'gift_vouchers';
					compensationAmount?: number;
				} = {
					...(post.type === 'property'
						? { propertyId: post.id }
						: { searchAdId: post.id }),
					message: data.message,
				};

				// Add commission percentage
				if (
					!isApporteurPost ||
					data.compensationType === 'percentage'
				) {
					payload.commissionPercentage = parseFloat(
						data.commissionPercentage,
					);
				} else {
					payload.commissionPercentage = 0;
				}

				// Add compensation fields for apporteur posts
				if (isApporteurPost) {
					payload.compensationType = data.compensationType;
					if (data.compensationType !== 'percentage') {
						payload.compensationAmount = parseFloat(
							data.compensationAmount,
						);
					}
				}

				const res = await proposeCollaboration(payload);
				if (!res.success) return;
				// Toast already shown by mutation hook
				onSuccess?.();
				onClose();
				resetForm();
			},
		});
	const renderPostDetails = () => {
		if (post.type === 'property') {
			const property = post.data;
			return (
				<div className="flex space-x-4">
					{property.mainImage && (
						<div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
							<img
								src={toCdnUrl(
									typeof property.mainImage === 'string'
										? property.mainImage
										: property.mainImage.url,
								)}
								alt={property.title}
								width={80}
								height={80}
								className="w-full h-full object-cover"
							/>
						</div>
					)}
					<div className="flex-1">
						<h4 className="font-medium text-gray-900 mb-1">
							{property.title}
						</h4>
						<p className="text-sm text-gray-600 mb-1">
							{property.city}
							{property.postalCode
								? `, ${property.postalCode}`
								: ''}
						</p>
						<div className="flex items-center space-x-4 text-sm text-gray-500">
							<span>{property.propertyType}</span>
							<span>{property.surface}m²</span>
							<span>{property.rooms} pièces</span>
						</div>
						<p className="text-lg font-bold text-brand-600 mt-2">
							{property.price.toLocaleString()}€
						</p>
					</div>
				</div>
			);
		} else {
			const searchAd = post.data;
			return (
				<div className="space-y-2">
					<h4 className="font-medium text-gray-900">
						{searchAd.title}
					</h4>
					{searchAd.description && (
						<div className="text-sm text-gray-600 line-clamp-2">
							<RichTextDisplay content={searchAd.description} />
						</div>
					)}
					<div className="flex flex-wrap gap-2 text-sm text-gray-500">
						{searchAd.location?.cities && (
							<span>
								📍 {searchAd.location.cities.join(', ')}
							</span>
						)}
						{searchAd.budget?.max && (
							<span>
								💰 Budget max:{' '}
								{searchAd.budget.max.toLocaleString()}€
							</span>
						)}
					</div>
					<div className="flex items-center gap-2 text-xs">
						{searchAd.propertyTypes.map((type) => (
							<span
								key={type}
								className="px-2 py-1 bg-gray-100 rounded-full"
							>
								{type}
							</span>
						))}
					</div>
				</div>
			);
		}
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title="Proposer une collaboration"
		>
			<div className="p-6 space-y-6">
				{/* Post Details Section */}
				<div className="bg-gray-50 rounded-lg p-4">
					<h3 className="text-lg font-medium text-gray-900 mb-3">
						{post.type === 'property'
							? 'Propriété à collaborer'
							: 'Annonce de recherche à collaborer'}
					</h3>
					{renderPostDetails()}
				</div>

				<div className="text-sm text-gray-600">
					Proposez votre collaboration sur{' '}
					{post.type === 'property'
						? 'cette propriété'
						: 'cette annonce de recherche'}
					.{' '}
					{isApporteurPost
						? "Choisissez votre mode de compensation pour l'apporteur d'affaire."
						: 'Définissez le pourcentage de commission que vous souhaitez recevoir.'}
				</div>

				<FormProvider
					isSubmitting={isSubmitting}
					onSubmit={handleSubmit}
					className="space-y-4"
				>
					{/* Compensation Type Selection for Apporteur Posts */}
					{isApporteurPost && (
						<div className="space-y-3">
							<label className="block text-sm font-medium text-gray-700">
								Type de compensation pour l&apos;apporteur
								d&apos;affaire
							</label>
							<div className="space-y-2">
								<label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
									<input
										type="radio"
										name="compensationType"
										value="percentage"
										checked={
											values.compensationType ===
											'percentage'
										}
										onChange={(e) =>
											setFieldValue(
												'compensationType',
												e.target.value,
											)
										}
										className="text-brand focus:ring-brand/20"
									/>
									<span className="flex-1 text-sm text-gray-700">
										Pourcentage de commission (&lt; 50%)
									</span>
								</label>
								<label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
									<input
										type="radio"
										name="compensationType"
										value="fixed_amount"
										checked={
											values.compensationType ===
											'fixed_amount'
										}
										onChange={(e) =>
											setFieldValue(
												'compensationType',
												e.target.value,
											)
										}
										className="text-brand focus:ring-brand/20"
									/>
									<span className="flex-1 text-sm text-gray-700">
										Montant fixe en euros (€)
									</span>
								</label>
								<label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
									<input
										type="radio"
										name="compensationType"
										value="gift_vouchers"
										checked={
											values.compensationType ===
											'gift_vouchers'
										}
										onChange={(e) =>
											setFieldValue(
												'compensationType',
												e.target.value,
											)
										}
										className="text-brand focus:ring-brand/20"
									/>
									<span className="flex-1 text-sm text-gray-700">
										Chèques cadeaux
									</span>
								</label>
							</div>
						</div>
					)}

					{/* Percentage Commission Field */}
					{(!isApporteurPost ||
						values.compensationType === 'percentage') && (
						<div>
							<label
								htmlFor="commissionPercentage"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Pourcentage de commission (%)
							</label>
							<Input
								id="commissionPercentage"
								type="number"
								min="1"
								max={isApporteurPost ? '49' : '50'}
								step="0.1"
								value={values.commissionPercentage}
								onChange={(e) =>
									setFieldValue(
										'commissionPercentage',
										e.target.value,
									)
								}
								placeholder="25"
								required
							/>
							<div className="text-xs text-gray-500 mt-1">
								{isApporteurPost
									? "Maximum 49% pour les posts d'apporteur"
									: 'Entre 1% et 50% de la commission totale'}
							</div>
						</div>
					)}

					{/* Compensation Amount Field for Apporteur Posts */}
					{isApporteurPost &&
						values.compensationType !== 'percentage' && (
							<div>
								<label
									htmlFor="compensationAmount"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									{values.compensationType === 'fixed_amount'
										? 'Montant en euros (€)'
										: 'Nombre de chèques cadeaux'}
								</label>
								<Input
									id="compensationAmount"
									type="number"
									min="1"
									step={
										values.compensationType ===
										'fixed_amount'
											? '0.01'
											: '1'
									}
									value={values.compensationAmount}
									onChange={(e) =>
										setFieldValue(
											'compensationAmount',
											e.target.value,
										)
									}
									placeholder={
										values.compensationType ===
										'fixed_amount'
											? '500'
											: '2'
									}
									required
								/>
								<div className="text-xs text-gray-500 mt-1">
									{values.compensationType === 'fixed_amount'
										? 'Montant fixe en euros'
										: 'Nombre de chèques cadeaux à offrir'}
								</div>
							</div>
						)}

					<div>
						<label
							htmlFor="message"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Message (optionnel)
						</label>
						<Textarea
							id="message"
							rows={4}
							value={values.message}
							onChange={(e) =>
								setFieldValue('message', e.target.value)
							}
							placeholder="Expliquez pourquoi cette collaboration serait bénéfique..."
							maxLength={500}
							showCharCount={true}
							maxCharCount={500}
						/>
					</div>

					<div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
						<label className="flex items-start space-x-3 cursor-pointer">
							<input
								type="checkbox"
								checked={values.agreeToTerms}
								onChange={(e) =>
									setFieldValue(
										'agreeToTerms',
										e.target.checked,
									)
								}
								className="mt-1 rounded border-gray-300 text-brand shadow-sm focus:border-brand focus:ring focus:ring-offset-0 focus:ring-brand/20 focus:ring-opacity-50"
							/>
							<span className="text-sm text-gray-700 leading-relaxed">
								Je contribue à une collaboration saine et
								équitable entre membres de MonHubimmo. En cas de
								non-respect, mon accès pourra être suspendu sans
								remboursement.
							</span>
						</label>
					</div>

					<div className="flex justify-end space-x-3 pt-4">
						<Button
							type="button"
							variant="secondary"
							onClick={onClose}
							disabled={isSubmitting}
						>
							Annuler
						</Button>
						<Button
							type="submit"
							loading={isSubmitting}
							disabled={
								!values.agreeToTerms ||
								(isApporteurPost &&
								values.compensationType !== 'percentage'
									? !values.compensationAmount
									: !values.commissionPercentage)
							}
						>
							Proposer la collaboration
						</Button>
					</div>
				</FormProvider>
			</div>
		</Modal>
	);
};
