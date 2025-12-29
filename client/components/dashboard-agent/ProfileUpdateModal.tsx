'use client';

import React from 'react';
import { toast } from 'react-toastify';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { ProfileImageUploader } from '../ui/ProfileImageUploader';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/lib/api/authApi';
import { User } from '@/types/auth';
import { useForm } from '@/hooks/useForm';
import { handleFormSubmitError } from '@/lib/utils/formErrors';
import { AUTH_TOAST_MESSAGES } from '@/lib/constants/features/auth';

interface ProfileUpdateModalProps {
	isOpen: boolean;
	onClose: () => void;
	user: User;
}

interface ProfileFormData extends Record<string, unknown> {
	firstName: string;
	lastName: string;
	phone: string;
	profileImage: string;
}

export const ProfileUpdateModal: React.FC<ProfileUpdateModalProps> = ({
	isOpen,
	onClose,
	user,
}) => {
	const { updateUser } = useAuth();

	const {
		values: formData,
		errors,
		isSubmitting,
		setFieldValue,
		setErrors,
		resetForm,
		handleSubmit,
	} = useForm<ProfileFormData>({
		initialValues: {
			firstName: user.firstName,
			lastName: user.lastName,
			phone: user.phone || '',
			profileImage: user.profileImage || '',
		},
		onSubmit: async (values) => {
			// Validation
			const newErrors: Record<string, string> = {};

			if (!values.firstName.trim()) {
				newErrors.firstName = 'Le prénom est requis';
			} else if (values.firstName.trim().length < 2) {
				newErrors.firstName =
					'Le prénom doit contenir au moins 2 caractères';
			}

			if (!values.lastName.trim()) {
				newErrors.lastName = 'Le nom est requis';
			} else if (values.lastName.trim().length < 2) {
				newErrors.lastName =
					'Le nom doit contenir au moins 2 caractères';
			}

			if (values.profileImage && !isValidUrl(values.profileImage)) {
				newErrors.profileImage =
					"Veuillez entrer une URL d'image valide";
			}

			if (Object.keys(newErrors).length > 0) {
				setErrors(newErrors);
				return;
			}

			// Only send changed fields
			const changedFields: Partial<ProfileFormData> = {};
			if (values.firstName !== user.firstName)
				changedFields.firstName = values.firstName.trim();
			if (values.lastName !== user.lastName)
				changedFields.lastName = values.lastName.trim();
			if (values.phone !== (user.phone || ''))
				changedFields.phone = values.phone.trim();
			if (values.profileImage !== (user.profileImage || ''))
				changedFields.profileImage = values.profileImage.trim();

			if (Object.keys(changedFields).length === 0) {
				toast.info(AUTH_TOAST_MESSAGES.NO_CHANGES_DETECTED);
				onClose();
				return;
			}

			try {
				const response = await authService.updateProfile(changedFields);

				if (response.success && response.user) {
					updateUser(response.user);
					toast.success(
						response.message || AUTH_TOAST_MESSAGES.PROFILE_UPDATED,
					);
					onClose();
				} else {
					toast.error(
						response.message ||
							AUTH_TOAST_MESSAGES.PROFILE_UPDATE_ERROR,
					);
				}
			} catch (error) {
				handleFormSubmitError(error, setErrors, 'ProfileUpdateModal');
				throw error;
			}
		},
	});

	const handleImageUploaded = (imageUrl: string) => {
		setFieldValue('profileImage', imageUrl);
	};

	const handleImageRemove = () => {
		setFieldValue('profileImage', '');
	};

	const isValidUrl = (string: string) => {
		try {
			new URL(string);
			return true;
		} catch {
			return false;
		}
	};

	const handleClose = () => {
		if (!isSubmitting) {
			resetForm();
			onClose();
		}
	};

	if (!isOpen) return null;

	return (
		<Modal
			isOpen={isOpen}
			onClose={handleClose}
			title="Modifier le profil"
			size="md"
		>
			{/* Form */}
			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Avatar first on mobile, then fields. On desktop: fields left, avatar right */}
				<div className="flex flex-col-reverse md:flex-row md:items-start gap-6">
					{/* Name fields on left */}
					<div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
						<Input
							label="Prénom"
							type="text"
							name="firstName"
							value={formData.firstName}
							onChange={(e) =>
								setFieldValue('firstName', e.target.value)
							}
							error={errors.firstName}
							placeholder="John"
							required
							disabled={isSubmitting}
						/>
						<Input
							label="Nom"
							type="text"
							name="lastName"
							value={formData.lastName}
							onChange={(e) =>
								setFieldValue('lastName', e.target.value)
							}
							error={errors.lastName}
							placeholder="Doe"
							required
							disabled={isSubmitting}
						/>
					</div>

					{/* Avatar on right (desktop) / top (mobile) */}
					<div className="flex justify-center md:justify-end">
						<ProfileImageUploader
							currentImageUrl={formData.profileImage}
							onImageUploaded={handleImageUploaded}
							onRemove={handleImageRemove}
							disabled={isSubmitting}
							size="medium"
							userName={`${formData.firstName} ${formData.lastName}`}
						/>
					</div>
				</div>

				{/* Show error if any */}
				{errors.profileImage && (
					<p className="text-sm text-red-600 mt-1">
						{errors.profileImage}
					</p>
				)}

				<Input
					label="Téléphone"
					type="tel"
					name="phone"
					value={formData.phone}
					onChange={(e) => setFieldValue('phone', e.target.value)}
					error={errors.phone}
					placeholder="+1234567890"
					disabled={isSubmitting}
				/>

				{/* Read-only fields */}
				<div className="bg-gray-50 rounded-lg p-4 space-y-3">
					<h4 className="text-sm font-medium text-gray-700">
						Informations du compte (Lecture seule)
					</h4>
					<div className="grid grid-cols-1 gap-3 text-sm">
						<div>
							<span className="font-medium text-gray-600">
								Email :
							</span>
							<span className="ml-2 text-gray-900">
								{user.email}
							</span>
						</div>
						<div>
							<span className="font-medium text-gray-600">
								Type de compte :
							</span>
							<span className="ml-2 text-gray-900 capitalize">
								{user.userType}
							</span>
						</div>
						<div>
							<span className="font-medium text-gray-600">
								Statut de l&apos;email :
							</span>
							<span
								className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
									user.isEmailVerified
										? 'bg-green-100 text-green-800'
										: 'bg-red-100 text-red-800'
								}`}
							>
								{user.isEmailVerified
									? 'Vérifié'
									: 'Non vérifié'}
							</span>
						</div>
					</div>
				</div>

				{/* Actions */}
				<div className="flex space-x-3 pt-4">
					<Button
						type="button"
						variant="outline"
						onClick={handleClose}
						disabled={isSubmitting}
						className="flex-1"
					>
						Annuler
					</Button>
					<Button
						type="submit"
						loading={isSubmitting}
						className="flex-1"
					>
						Enregistrer
					</Button>
				</div>
			</form>
		</Modal>
	);
};
