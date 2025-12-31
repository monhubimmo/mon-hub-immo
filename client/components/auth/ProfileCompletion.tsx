'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, PageLoader } from '@/components/ui';
import { FormProvider } from '@/context/FormContext';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks';
import { authService } from '@/lib/api/authApi';
import { useForm } from '@/hooks/useForm';
import { Features } from '@/lib/constants';
import { getRoleBasedRedirect } from '@/lib/config/routes.config';
import {
	showProfileCompletionSuccess,
	authToastError,
	authToastSuccess,
} from '@/lib/utils/authToast';
import {
	PersonalInfoSection,
	GeographicSection,
	ProfessionalInfoSection,
	PreferencesAndTermsSection,
	ProfileCompletionFormData,
} from './profile-completion';

interface ProfileCompletionProps {
	editMode?: boolean;
}

// Helper to build professional info payload
const buildProfessionalInfoPayload = (data: ProfileCompletionFormData) => ({
	postalCode: data.postalCode,
	city: data.city,
	interventionRadius:
		typeof data.interventionRadius === 'string'
			? parseInt(data.interventionRadius, 10)
			: data.interventionRadius,
	coveredCities: data.coveredCities
		? data.coveredCities
				.split(',')
				.map((c: string) => c.trim())
				.filter(Boolean)
		: [],
	network: data.network,
	siretNumber: data.siretNumber,
	sirenNumber: data.sirenNumber,
	agentType: data.agentType as
		| 'independent'
		| 'commercial'
		| 'employee'
		| undefined,
	tCard: data.tCard,
	rsacNumber: data.rsacNumber,
	collaboratorCertificate: data.collaboratorCertificate,
	mandateTypes: data.mandateTypes as Array<
		'simple' | 'exclusif' | 'co-mandat'
	>,
	yearsExperience:
		typeof data.yearsExperience === 'string'
			? parseInt(data.yearsExperience, 10)
			: data.yearsExperience,
	personalPitch: data.personalPitch,
	collaborateWithAgents: data.collaborateWithAgents,
	shareCommission: data.shareCommission,
	independentAgent: data.independentAgent,
	alertsEnabled: data.alertsEnabled,
	alertFrequency: data.alertFrequency,
});

// Regex for valid city names (letters, accents, spaces, apostrophes, hyphens)
// Includes: a-z, A-Z, accented letters (À-Ö, Ø-ö, ø-ÿ), Latin Extended-A (Ā-ſ including œŒ)
// Excludes: × (multiplication) and ÷ (division)
// Apostrophes: ' (U+0027), ' (U+2018), ' (U+2019), ` (U+0060)
const CITY_NAME_REGEX =
	/^[a-zA-Z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\u0100-\u017F\s'''`-]+$/;

// Validation helper
const validateFormData = (
	data: ProfileCompletionFormData,
): Record<string, string> => {
	const errors: Record<string, string> = {};

	if (!data.city?.trim()) {
		errors.city = 'La ville principale est requise';
	}
	if (!data.postalCode?.trim()) {
		errors.postalCode = 'Le code postal est requis';
	}
	if (!data.interventionRadius || data.interventionRadius <= 0) {
		errors.interventionRadius = "Le rayon d'intervention est requis";
	}
	if (!data.coveredCities?.trim()) {
		errors.coveredCities = 'Au moins une commune couverte est requise';
	} else {
		// Validate each city name format
		const cities = data.coveredCities
			.split(',')
			.map((c) => c.trim())
			.filter(Boolean);

		if (cities.length === 0) {
			errors.coveredCities = 'Au moins une commune couverte est requise';
		} else {
			const invalidCity = cities.find(
				(city) => !CITY_NAME_REGEX.test(city),
			);
			if (invalidCity) {
				errors.coveredCities = `Nom de ville invalide: "${invalidCity}". Utilisez uniquement des lettres et séparez les villes par des virgules (pas de points, chiffres ou autres caractères)`;
			}
		}
	}
	if (!data.yearsExperience?.trim()) {
		errors.yearsExperience = "Les années d'expérience sont requises";
	}
	if (!data.network?.trim()) {
		errors.network = 'Le réseau ou statut est requis';
	}

	// Validate personalPitch (bio) - required with minimum 250 characters
	if (!data.personalPitch?.trim()) {
		errors.personalPitch = 'La bio personnelle est requise';
	} else {
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = data.personalPitch;
		const bioTextLength = (tempDiv.textContent || tempDiv.innerText || '')
			.length;
		if (bioTextLength < 250) {
			errors.personalPitch = `La bio doit contenir au moins 250 caractères (${bioTextLength}/250)`;
		}
	}

	return errors;
};

// Error handler helper
const handleValidationErrors = (
	errors: Array<{ path?: string; field?: string; message: string }>,
	setFieldError: (field: string, message: string) => void,
) => {
	if (errors.length > 0) {
		authToastError(errors[0].message);
		errors.forEach((err) => {
			const fieldName = (err.path || err.field || '').replace(
				'professionalInfo.',
				'',
			);
			if (fieldName) {
				setFieldError(fieldName, err.message);
			}
		});
		return true;
	}
	return false;
};

export const ProfileCompletion: React.FC<ProfileCompletionProps> = ({
	editMode = false,
}) => {
	const router = useRouter();
	const { user, updateUser } = useAuth();
	const [identityCardFile, setIdentityCardFile] = useState<File | null>(null);
	const [isUploadingFile, setIsUploadingFile] = useState(false);
	const [showExistingIdentityCard, setShowExistingIdentityCard] =
		useState(true);

	useRequireAuth();

	const {
		values,
		errors,
		isSubmitting,
		setFieldValue,
		setFieldError,
		handleSubmit,
		setValues,
	} = useForm<ProfileCompletionFormData>({
		initialValues: {
			firstName: user?.firstName || '',
			lastName: user?.lastName || '',
			email: user?.email || '',
			phone: user?.phone || '',
			profileImage: user?.profileImage || '',
			postalCode: user?.professionalInfo?.postalCode || '',
			city: user?.professionalInfo?.city || '',
			interventionRadius:
				user?.professionalInfo?.interventionRadius || 20,
			coveredCities:
				user?.professionalInfo?.coveredCities?.join(', ') || '',
			network: user?.professionalInfo?.network || '',
			siretNumber: user?.professionalInfo?.siretNumber || '',
			sirenNumber: user?.professionalInfo?.sirenNumber || '',
			agentType: user?.professionalInfo?.agentType || '',
			tCard: user?.professionalInfo?.tCard || '',
			rsacNumber: user?.professionalInfo?.rsacNumber || '',
			collaboratorCertificate:
				user?.professionalInfo?.collaboratorCertificate || '',
			mandateTypes: user?.professionalInfo?.mandateTypes || [],
			yearsExperience:
				user?.professionalInfo?.yearsExperience?.toString() || '',
			personalPitch: user?.professionalInfo?.personalPitch || '',
			collaborateWithAgents:
				user?.professionalInfo?.collaborateWithAgents ?? true,
			shareCommission: user?.professionalInfo?.shareCommission ?? false,
			independentAgent: user?.professionalInfo?.independentAgent ?? false,
			alertsEnabled: user?.professionalInfo?.alertsEnabled ?? false,
			alertFrequency:
				user?.professionalInfo?.alertFrequency || 'quotidien',
			acceptTerms: editMode ? true : false,
		},
		onSubmit: async (data) => {
			try {
				// Validate
				const validationErrors = validateFormData(data);
				if (Object.keys(validationErrors).length > 0) {
					Object.entries(validationErrors).forEach(
						([field, message]) => {
							setFieldError(field, message);
						},
					);
					authToastError(
						'Veuillez remplir tous les champs obligatoires',
					);
					return;
				}

				// Validate bio character count
				const tempDiv = document.createElement('div');
				tempDiv.innerHTML = data.personalPitch;
				const bioTextLength = (
					tempDiv.textContent ||
					tempDiv.innerText ||
					''
				).length;
				if (bioTextLength > 650) {
					authToastError(
						'La bio ne peut pas dépasser 650 caractères',
					);
					return;
				}

				let identityCardData;

				// Upload identity card if provided
				if (identityCardFile) {
					setIsUploadingFile(true);
					const uploadResponse =
						await authService.uploadIdentityCard(identityCardFile);
					if (uploadResponse.success) {
						identityCardData = {
							url: uploadResponse.data.url,
							key: uploadResponse.data.key,
						};
					} else {
						authToastError(
							Features.Auth.AUTH_TOAST_MESSAGES
								.IDENTITY_CARD_UPLOAD_ERROR,
						);
					}
					setIsUploadingFile(false);
				}

				const professionalInfo = buildProfessionalInfoPayload(data);

				const response = editMode
					? await authService.updateProfile({
							firstName: data.firstName,
							lastName: data.lastName,
							phone: data.phone,
							profileImage: data.profileImage,
							professionalInfo: {
								...professionalInfo,
								...(identityCardData && {
									identityCard: identityCardData,
								}),
							},
						})
					: await authService.completeProfile({
							professionalInfo,
							profileImage: data.profileImage,
							identityCard: identityCardData,
						});

				if (response.success && response.user) {
					updateUser(response.user);
					if (editMode) {
						authToastSuccess('✅ Profil mis à jour avec succès');
						router.push(
							getRoleBasedRedirect(response.user.userType),
						);
					} else {
						// After profile completion, always redirect to payment
						// The ProfileGuard will handle access control based on payment status
						showProfileCompletionSuccess();
						router.push('/payment');
					}
				} else {
					interface ErrorResponse {
						errors?: Array<{ path: string; message: string }>;
						message?: string;
					}
					const responseData = response as unknown as ErrorResponse;
					if (responseData.errors?.length) {
						handleValidationErrors(
							responseData.errors,
							setFieldError,
						);
						return;
					}
					authToastError(
						responseData.message || 'Une erreur est survenue',
					);
				}
			} catch (error: unknown) {
				setIsUploadingFile(false);
				interface ApiError {
					errors?: Array<{
						path?: string;
						field?: string;
						message: string;
					}>;
					message?: string;
					response?: {
						data?: {
							message?: string;
							errors?: Array<{
								path?: string;
								field?: string;
								message: string;
							}>;
						};
					};
				}
				const apiError = error as ApiError;

				if (apiError?.errors?.length) {
					handleValidationErrors(apiError.errors, setFieldError);
					return;
				}

				if (apiError?.response?.data?.errors?.length) {
					handleValidationErrors(
						apiError.response.data.errors,
						setFieldError,
					);
					return;
				}

				authToastError(
					apiError?.response?.data?.message ||
						apiError?.message ||
						'Erreur lors de la mise à jour du profil',
				);
			}
		},
	});

	// Sync form values when user data loads
	useEffect(() => {
		if (user) {
			setValues({
				firstName: user.firstName || '',
				lastName: user.lastName || '',
				email: user.email || '',
				phone: user.phone || '',
				profileImage: user.profileImage || '',
				postalCode: user.professionalInfo?.postalCode || '',
				city: user.professionalInfo?.city || '',
				interventionRadius:
					user.professionalInfo?.interventionRadius || 20,
				coveredCities:
					user.professionalInfo?.coveredCities?.join(', ') || '',
				network: user.professionalInfo?.network || '',
				siretNumber: user.professionalInfo?.siretNumber || '',
				sirenNumber: user.professionalInfo?.sirenNumber || '',
				agentType: user.professionalInfo?.agentType || '',
				tCard: user.professionalInfo?.tCard || '',
				rsacNumber: user.professionalInfo?.rsacNumber || '',
				collaboratorCertificate:
					user.professionalInfo?.collaboratorCertificate || '',
				mandateTypes: user.professionalInfo?.mandateTypes || [],
				yearsExperience:
					user.professionalInfo?.yearsExperience?.toString() || '',
				personalPitch: user.professionalInfo?.personalPitch || '',
				collaborateWithAgents:
					user.professionalInfo?.collaborateWithAgents ?? true,
				shareCommission:
					user.professionalInfo?.shareCommission ?? false,
				independentAgent:
					user.professionalInfo?.independentAgent ?? false,
				alertsEnabled: user.professionalInfo?.alertsEnabled ?? false,
				alertFrequency:
					user.professionalInfo?.alertFrequency || 'quotidien',
				acceptTerms: editMode ? true : false,
			});
		}
	}, [user, setValues, editMode]);

	// Role/completion checks
	useEffect(() => {
		if (!user || isSubmitting) return;

		if (user.userType !== 'agent') {
			authToastError(Features.Auth.AUTH_TOAST_MESSAGES.AGENT_ONLY_ACCESS);
			router.push(getRoleBasedRedirect(user.userType));
			return;
		}

		if (!editMode && user.profileCompleted) {
			// Profile is complete - redirect based on payment status
			if (!user.isPaid && !user.accessGrantedByAdmin) {
				router.push('/payment');
			} else {
				router.push(getRoleBasedRedirect(user.userType));
			}
			return;
		}
	}, [user, isSubmitting, router, editMode]);

	const handleChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
		>,
	) => {
		const { name, value, type } = e.target;

		if (type === 'checkbox') {
			const checked = (e.target as HTMLInputElement).checked;
			if (name === 'mandateTypes') {
				const currentMandates = values.mandateTypes || [];
				setFieldValue(
					'mandateTypes',
					checked
						? [...currentMandates, value]
						: currentMandates.filter((t) => t !== value),
				);
			} else {
				setFieldValue(name, checked);
			}
		} else {
			setFieldValue(name, value);
		}
	};

	if (isSubmitting) {
		return (
			<PageLoader
				message={
					editMode
						? 'Mise à jour du profil...'
						: 'Finalisation de votre profil...'
				}
			/>
		);
	}

	if (!user) return null;

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="max-w-2xl mx-auto px-4 py-8">
				{/* Header */}
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center w-16 h-16 bg-brand rounded-2xl mb-6 shadow-brand transition-all duration-200 hover:scale-105">
						<svg
							className="w-8 h-8 text-white"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
							/>
						</svg>
					</div>

					<h1 className="text-2xl font-bold text-gray-900 mb-2">
						{editMode
							? 'Modifier le profil Agent'
							: 'Création du profil Agent'}
					</h1>
					<p className="text-sm text-gray-600">
						{editMode
							? 'Mettez à jour vos informations professionnelles'
							: 'Complétez votre profil pour commencer'}
					</p>
				</div>

				<FormProvider
					isSubmitting={isSubmitting}
					onSubmit={handleSubmit}
					className="bg-white rounded-2xl shadow-card border border-gray-200 p-8 space-y-8"
				>
					<PersonalInfoSection
						values={values}
						errors={errors}
						isSubmitting={isSubmitting}
						handleChange={handleChange}
						onImageUploaded={(url) =>
							setFieldValue('profileImage', url)
						}
						onImageRemove={() => setFieldValue('profileImage', '')}
					/>

					<GeographicSection
						values={values}
						errors={errors}
						handleChange={handleChange}
					/>

					<ProfessionalInfoSection
						values={values}
						errors={errors}
						user={user}
						identityCardFile={identityCardFile}
						showExistingIdentityCard={showExistingIdentityCard}
						handleChange={handleChange}
						setIdentityCardFile={setIdentityCardFile}
						setShowExistingIdentityCard={
							setShowExistingIdentityCard
						}
					/>

					<PreferencesAndTermsSection
						values={values}
						errors={errors}
						handleChange={handleChange}
						setFieldValue={setFieldValue}
					/>

					{/* Submit Button */}
					<div className="pt-6">
						<Button
							type="submit"
							loading={isSubmitting || isUploadingFile}
							className="w-full bg-brand hover:bg-brand-600 text-white"
							size="lg"
						>
							{isUploadingFile
								? "Upload de la carte d'identité..."
								: editMode
									? 'Enregistrer les modifications'
									: 'Valider mon profil et accéder à Hubimmo'}
						</Button>
					</div>
				</FormProvider>
			</div>
		</div>
	);
};
