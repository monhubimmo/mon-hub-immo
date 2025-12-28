import React from 'react';
import { Input, ReadOnlyField, FileUpload, Checkbox } from '@/components/ui';
import { Select } from '@/components/ui/CustomSelect';
import { Features } from '@/lib/constants';
import { User } from '@/types/auth';
import { toCdnUrl } from '@/lib/utils/imageUtils';
import {
	ProfileCompletionFormData,
	AGENT_TYPE_LABELS,
	AGENT_TYPE_OPTIONS,
	MANDATE_TYPE_OPTIONS,
} from './types';

interface ProfessionalInfoSectionProps {
	values: ProfileCompletionFormData;
	errors: Record<string, string>;
	user: User | null;
	identityCardFile: File | null;
	showExistingIdentityCard: boolean;
	handleChange: (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
	) => void;
	setIdentityCardFile: (file: File | null) => void;
	setShowExistingIdentityCard: (show: boolean) => void;
}

export const ProfessionalInfoSection: React.FC<
	ProfessionalInfoSectionProps
> = ({
	values,
	errors,
	user,
	identityCardFile,
	showExistingIdentityCard,
	handleChange,
	setIdentityCardFile,
	setShowExistingIdentityCard,
}) => {
	const hasExistingProfessionalInfo =
		user?.professionalInfo?.agentType ||
		user?.professionalInfo?.siretNumber ||
		user?.professionalInfo?.tCard ||
		user?.professionalInfo?.collaboratorCertificate;

	return (
		<div>
			<h3 className="text-lg font-semibold text-gray-900 mb-4">
				Informations professionnelles
			</h3>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Input
					label="Réseau ou statut *"
					name="network"
					value={values.network}
					onChange={handleChange}
					error={errors.network}
					placeholder="Ex: IAD, Century 21, Orpi, Indépendant..."
				/>

				<AgentTypeField
					values={values}
					errors={errors}
					user={user}
					handleChange={handleChange}
				/>
			</div>

			{/* Professional credentials based on agent type */}
			{hasExistingProfessionalInfo ? (
				<ReadOnlyProfessionalInfo user={user} />
			) : (
				<EditableProfessionalFields
					values={values}
					errors={errors}
					handleChange={handleChange}
				/>
			)}

			{/* Agent type badge */}
			{user?.professionalInfo?.agentType && (
				<AgentTypeBadge agentType={user.professionalInfo.agentType} />
			)}

			{/* Identity card */}
			<IdentityCardField
				user={user}
				identityCardFile={identityCardFile}
				showExistingIdentityCard={showExistingIdentityCard}
				setIdentityCardFile={setIdentityCardFile}
				setShowExistingIdentityCard={setShowExistingIdentityCard}
			/>

			{/* Mandate types and experience */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Type de mandats travaillés
					</label>
					<div className="space-y-2">
						{MANDATE_TYPE_OPTIONS.map((mandate) => (
							<Checkbox
								key={mandate.id}
								label={mandate.label}
								name="mandateTypes"
								value={mandate.id}
								checked={values.mandateTypes.includes(
									mandate.id,
								)}
								onChange={handleChange}
							/>
						))}
					</div>
				</div>

				<Input
					label="Années d'expérience *"
					name="yearsExperience"
					type="number"
					value={values.yearsExperience}
					onChange={handleChange}
					error={errors.yearsExperience}
					placeholder={
						Features.Auth.AUTH_PLACEHOLDERS.YEARS_EXPERIENCE
					}
				/>
			</div>
		</div>
	);
};

// Sub-components
const AgentTypeField: React.FC<{
	values: ProfileCompletionFormData;
	errors: Record<string, string>;
	user: User | null;
	handleChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}> = ({ values, errors, user, handleChange }) => {
	if (user?.professionalInfo?.agentType) {
		return (
			<ReadOnlyField
				label="Type d'agent"
				value={AGENT_TYPE_LABELS[user.professionalInfo.agentType]}
				helperText="Fourni lors de l'inscription"
			/>
		);
	}

	if (user?.professionalInfo?.siretNumber) {
		return (
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Type d&apos;agent
				</label>
				<div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 italic">
					Non spécifié
				</div>
				<p className="text-xs text-gray-500 mt-1">
					SIRET fourni lors de la complétion du profil
				</p>
			</div>
		);
	}

	return (
		<div>
			<label
				htmlFor="agentType"
				className="block text-sm font-medium text-gray-700 mb-1"
			>
				Type d&apos;agent immobilier *
			</label>
			<Select
				label=""
				value={values.agentType}
				onChange={(value: string) => {
					handleChange({
						target: { name: 'agentType', value },
					} as React.ChangeEvent<HTMLSelectElement>);
				}}
				name="agentType"
				options={AGENT_TYPE_OPTIONS}
				disabled={false}
				required={true}
			/>
			{errors.agentType && (
				<p className="mt-1 text-sm text-red-600">{errors.agentType}</p>
			)}
		</div>
	);
};

const ReadOnlyProfessionalInfo: React.FC<{ user: User | null }> = ({
	user,
}) => {
	const agentType = user?.professionalInfo?.agentType;

	return (
		<>
			{agentType === 'independent' && user?.professionalInfo?.tCard && (
				<div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
					<ReadOnlyField
						label="Carte professionnelle (T card)"
						value={user.professionalInfo.tCard}
						helperText="Fourni lors de l'inscription"
					/>
				</div>
			)}

			{agentType === 'commercial' && (
				<div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
					{user?.professionalInfo?.sirenNumber && (
						<ReadOnlyField
							label="Numéro SIREN"
							value={user.professionalInfo.sirenNumber}
							helperText="Fourni lors de l'inscription"
						/>
					)}
					{user?.professionalInfo?.rsacNumber && (
						<ReadOnlyField
							label="Numéro RSAC"
							value={user.professionalInfo.rsacNumber}
							helperText="Fourni lors de l'inscription"
						/>
					)}
				</div>
			)}

			{agentType === 'employee' &&
				user?.professionalInfo?.collaboratorCertificate && (
					<div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
						<ReadOnlyField
							label="Certificat d'autorisation"
							value={
								user.professionalInfo.collaboratorCertificate
							}
							helperText="Fourni lors de l'inscription"
						/>
					</div>
				)}

			{!agentType && user?.professionalInfo?.siretNumber && (
				<div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
					<ReadOnlyField
						label="Numéro SIRET"
						value={user.professionalInfo.siretNumber}
						helperText="Fourni lors de la complétion du profil"
					/>
				</div>
			)}
		</>
	);
};

const EditableProfessionalFields: React.FC<{
	values: ProfileCompletionFormData;
	errors: Record<string, string>;
	handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ values, errors, handleChange }) => {
	if (values.agentType === 'independent') {
		return (
			<div className="mt-4 space-y-3 p-4 bg-brand-50 rounded-lg border border-brand-200">
				<Input
					label="Carte professionnelle (T card) *"
					type="text"
					name="tCard"
					value={values.tCard}
					onChange={handleChange}
					error={errors.tCard}
					placeholder={Features.Auth.AUTH_PLACEHOLDERS.CARTE_T}
					required
				/>
				<p className="text-xs text-gray-600">
					* Carte T requise pour agent indépendant
				</p>
			</div>
		);
	}

	if (values.agentType === 'commercial') {
		return (
			<div className="mt-4 space-y-3 p-4 bg-brand-50 rounded-lg border border-brand-200">
				<Input
					label="Numéro SIREN *"
					type="text"
					name="sirenNumber"
					value={values.sirenNumber}
					onChange={handleChange}
					error={errors.sirenNumber}
					placeholder={Features.Auth.AUTH_PLACEHOLDERS.SIREN}
					required
				/>
				<Input
					label="Numéro RSAC"
					type="text"
					name="rsacNumber"
					value={values.rsacNumber}
					onChange={handleChange}
					error={errors.rsacNumber}
					placeholder={Features.Auth.AUTH_PLACEHOLDERS.RSAC}
				/>
				<p className="text-xs text-gray-600">
					* Numéro SIREN requis pour agent commercial
				</p>
			</div>
		);
	}

	if (values.agentType === 'employee') {
		return (
			<div className="mt-4 space-y-3 p-4 bg-brand-50 rounded-lg border border-brand-200">
				<Input
					label="Certificat d'autorisation *"
					type="text"
					name="collaboratorCertificate"
					value={values.collaboratorCertificate}
					onChange={handleChange}
					error={errors.collaboratorCertificate}
					placeholder={
						Features.Auth.AUTH_PLACEHOLDERS.CERTIFICATE_REF
					}
					required
				/>
				<p className="text-xs text-gray-600">
					* Certificat d&apos;autorisation de votre employeur requis
				</p>
			</div>
		);
	}

	return (
		<div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
			<p className="text-sm text-amber-700">
				👆 Veuillez sélectionner votre type d&apos;agent pour afficher
				les champs requis
			</p>
		</div>
	);
};

const AgentTypeBadge: React.FC<{ agentType: string }> = ({ agentType }) => {
	const badges: Record<string, string> = {
		independent: '🏢 Agent immobilier indépendant',
		commercial: '💼 Agent commercial immobilier',
		employee: "👔 Négociateur VRP employé d'agence",
	};

	return (
		<div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-brand-50 text-brand-700 border border-brand-200">
			{badges[agentType] || agentType}
		</div>
	);
};

const IdentityCardField: React.FC<{
	user: User | null;
	identityCardFile: File | null;
	showExistingIdentityCard: boolean;
	setIdentityCardFile: (file: File | null) => void;
	setShowExistingIdentityCard: (show: boolean) => void;
}> = ({
	user,
	identityCardFile,
	showExistingIdentityCard,
	setIdentityCardFile,
	setShowExistingIdentityCard,
}) => {
	if (user?.professionalInfo?.identityCard?.url) {
		return (
			<div className="mt-4">
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Carte d&apos;identité
				</label>
				<div className="flex items-center gap-3 px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg">
					<svg
						className="w-5 h-5 text-green-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span className="text-sm text-gray-700">
						Document fourni
					</span>
					<a
						href={toCdnUrl(user.professionalInfo.identityCard.url)}
						target="_blank"
						rel="noopener noreferrer"
						className="ml-auto text-sm text-brand hover:underline"
					>
						Voir
					</a>
				</div>
				<p className="text-xs text-gray-500 mt-1">
					Fourni lors de l&apos;inscription
				</p>
			</div>
		);
	}

	return (
		<div className="mt-4">
			<FileUpload
				label="Carte d'identité (optionnel)"
				onChange={(file) => setIdentityCardFile(file)}
				value={identityCardFile}
				existingFileUrl={
					showExistingIdentityCard &&
					user?.professionalInfo?.identityCard?.url
						? toCdnUrl(user.professionalInfo.identityCard.url)
						: undefined
				}
				onRemoveExisting={() => setShowExistingIdentityCard(false)}
				helperText="Photo ou PDF de votre carte d'identité pour vérification"
			/>
		</div>
	);
};
