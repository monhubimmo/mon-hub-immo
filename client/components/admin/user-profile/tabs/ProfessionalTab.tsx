'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/CustomSelect';
import { Textarea } from '@/components/ui/Textarea';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { CityAutocomplete } from '@/components/ui/CityAutocomplete';
import {
	Briefcase,
	Building2,
	CreditCard,
	FileText,
	FileCheck,
	Calendar,
	MapPin,
	FileSignature,
	Settings,
	Users,
	Percent,
	BadgeCheck,
	User,
} from 'lucide-react';
import { AGENT_TYPE_OPTIONS } from '@/lib/constants/admin';
import { UserProfile, ProfessionalInfo } from '../types';
import {
	INTERVENTION_RADIUS_OPTIONS,
	MANDATE_TYPE_OPTIONS,
} from '../constants';
import {
	FormField,
	TabSectionHeader,
	SubSectionHeader,
	CheckboxField,
} from '../FormComponents';

interface ProfessionalTabProps {
	form: UserProfile;
	handleProfessionalChange: (
		field: keyof ProfessionalInfo,
		value: string,
	) => void;
}

export function ProfessionalTab({
	form,
	handleProfessionalChange,
}: ProfessionalTabProps) {
	return (
		<Card className="shadow-lg border-0 ring-1 ring-gray-200/50 rounded-2xl">
			<div className="p-6 sm:p-8">
				<TabSectionHeader
					icon={Briefcase}
					title="Informations professionnelles"
					iconBgColor="bg-primary-50"
					iconColor="text-primary-600"
				/>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
					<FormField label="Réseau" icon={<Building2 size={16} />}>
						<Input
							value={form.professionalInfo?.network || ''}
							onChange={(e) =>
								handleProfessionalChange(
									'network',
									e.target.value,
								)
							}
							placeholder="Réseau immobilier"
							className="bg-gray-50/50 focus:bg-white transition-colors"
						/>
					</FormField>

					<FormField label="Type d'agent" icon={<User size={16} />}>
						<Select
							value={form.professionalInfo?.agentType || ''}
							onChange={(val) =>
								handleProfessionalChange('agentType', val)
							}
							options={AGENT_TYPE_OPTIONS}
						/>
					</FormField>

					<FormField label="Carte T" icon={<CreditCard size={16} />}>
						<Input
							value={form.professionalInfo?.tCard || ''}
							onChange={(e) =>
								handleProfessionalChange(
									'tCard',
									e.target.value,
								)
							}
							placeholder="Numéro de carte T"
							className="bg-gray-50/50 focus:bg-white transition-colors"
						/>
					</FormField>

					<FormField
						label="Numéro SIREN"
						icon={<FileText size={16} />}
					>
						<Input
							value={form.professionalInfo?.sirenNumber || ''}
							onChange={(e) =>
								handleProfessionalChange(
									'sirenNumber',
									e.target.value,
								)
							}
							placeholder="Numéro SIREN"
							className="bg-gray-50/50 focus:bg-white transition-colors"
						/>
					</FormField>

					<FormField
						label="Numéro RSAC"
						icon={<FileText size={16} />}
					>
						<Input
							value={form.professionalInfo?.rsacNumber || ''}
							onChange={(e) =>
								handleProfessionalChange(
									'rsacNumber',
									e.target.value,
								)
							}
							placeholder="Numéro RSAC"
							className="bg-gray-50/50 focus:bg-white transition-colors"
						/>
					</FormField>

					<FormField
						label="Certificat collaborateur"
						icon={<FileCheck size={16} />}
					>
						<Input
							value={
								form.professionalInfo
									?.collaboratorCertificate || ''
							}
							onChange={(e) =>
								handleProfessionalChange(
									'collaboratorCertificate',
									e.target.value,
								)
							}
							placeholder="Référence certificat"
							className="bg-gray-50/50 focus:bg-white transition-colors"
						/>
					</FormField>

					<FormField
						label="Numéro SIRET"
						icon={<FileText size={16} />}
					>
						<Input
							value={form.professionalInfo?.siretNumber || ''}
							onChange={(e) =>
								handleProfessionalChange(
									'siretNumber',
									e.target.value,
								)
							}
							placeholder="14 chiffres"
							maxLength={14}
							className="bg-gray-50/50 focus:bg-white transition-colors"
						/>
					</FormField>

					<FormField
						label="Années d'expérience"
						icon={<Calendar size={16} />}
					>
						<Input
							type="number"
							min={0}
							max={50}
							value={form.professionalInfo?.yearsExperience ?? ''}
							onChange={(e) =>
								handleProfessionalChange(
									'yearsExperience',
									e.target.value,
								)
							}
							placeholder="Années d'expérience"
							className="bg-gray-50/50 focus:bg-white transition-colors"
						/>
					</FormField>
				</div>

				{/* Location Section */}
				<div className="mt-8 pt-6 border-t border-gray-100">
					<SubSectionHeader
						icon={MapPin}
						title="Secteur géographique d'activité"
					/>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
						<div>
							<CityAutocomplete
								label="Ville principale"
								value={form.professionalInfo?.city || ''}
								onCitySelect={(cityName, postalCode) => {
									handleProfessionalChange('city', cityName);
									handleProfessionalChange(
										'postalCode',
										postalCode,
									);
								}}
								placeholder="Rechercher une ville"
							/>
						</div>

						<FormField
							label="Code postal"
							icon={<MapPin size={16} />}
						>
							<Input
								value={form.professionalInfo?.postalCode || ''}
								onChange={(e) =>
									handleProfessionalChange(
										'postalCode',
										e.target.value,
									)
								}
								placeholder="Code postal"
								maxLength={5}
								disabled
								className="bg-gray-100 cursor-not-allowed"
							/>
						</FormField>

						<FormField
							label="Rayon d'intervention"
							icon={<MapPin size={16} />}
						>
							<Select
								value={String(
									form.professionalInfo?.interventionRadius ||
										'20',
								)}
								onChange={(val) =>
									handleProfessionalChange(
										'interventionRadius',
										val,
									)
								}
								options={INTERVENTION_RADIUS_OPTIONS}
							/>
						</FormField>

						<div className="md:col-span-2">
							<Textarea
								label="Communes couvertes"
								value={
									(form.professionalInfo
										?.coveredCities as unknown as string) ||
									''
								}
								onChange={(e) =>
									handleProfessionalChange(
										'coveredCities',
										e.target.value,
									)
								}
								placeholder="Ex: Paris, Lyon, Marseille (séparées par des virgules)"
								rows={2}
							/>
						</div>
					</div>
				</div>

				{/* Mandate Types */}
				<div className="mt-8 pt-6 border-t border-gray-100">
					<SubSectionHeader
						icon={FileSignature}
						title="Type de mandats travaillés"
					/>
					<div className="flex flex-wrap gap-3">
						{MANDATE_TYPE_OPTIONS.map((option) => (
							<label
								key={option.value}
								className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary-300 cursor-pointer transition-colors"
							>
								<input
									type="checkbox"
									checked={
										form.professionalInfo?.mandateTypes?.includes(
											option.value as
												| 'simple'
												| 'exclusif'
												| 'co-mandat',
										) || false
									}
									onChange={(e) => {
										const current =
											form.professionalInfo
												?.mandateTypes || [];
										const newTypes = e.target.checked
											? [...current, option.value]
											: current.filter(
													(t) => t !== option.value,
												);
										handleProfessionalChange(
											'mandateTypes',
											newTypes.join(','),
										);
									}}
									className="w-4 h-4 rounded border-gray-300 text-[#26bab6] focus:ring-[#26bab6] accent-[#26bab6]"
								/>
								<span className="text-sm text-gray-700">
									{option.label}
								</span>
							</label>
						))}
					</div>
				</div>

				{/* Personal Pitch */}
				<div className="mt-8 pt-6 border-t border-gray-100">
					<RichTextEditor
						label="Petite bio (pitch personnel)"
						value={form.professionalInfo?.personalPitch || ''}
						onChange={(value) => {
							const textContent = value
								.replace(/<[^>]*>/g, '')
								.trim();
							if (textContent.length <= 650) {
								handleProfessionalChange(
									'personalPitch',
									value,
								);
							}
						}}
						placeholder="Décrivez votre parcours et vos spécialités..."
						minHeight="120px"
						showCharCount
						maxLength={650}
					/>
					<span className="text-sm text-gray-500 mt-2 block">
						Minimum 250 caractères requis
					</span>
				</div>

				{/* Preferences */}
				<div className="mt-8 pt-6 border-t border-gray-100">
					<SubSectionHeader icon={Settings} title="Préférences" />
					<div className="space-y-3">
						<CheckboxField
							checked={
								form.professionalInfo?.collaborateWithAgents ||
								false
							}
							onChange={(checked) =>
								handleProfessionalChange(
									'collaborateWithAgents',
									String(checked),
								)
							}
							icon={Users}
							label="Je souhaite collaborer avec d'autres agents"
						/>

						<CheckboxField
							checked={
								form.professionalInfo?.shareCommission || false
							}
							onChange={(checked) =>
								handleProfessionalChange(
									'shareCommission',
									String(checked),
								)
							}
							icon={Percent}
							label="Je suis ouvert à partager ma commission"
						/>

						<CheckboxField
							checked={
								form.professionalInfo?.independentAgent || false
							}
							onChange={(checked) =>
								handleProfessionalChange(
									'independentAgent',
									String(checked),
								)
							}
							icon={BadgeCheck}
							label="Je certifie être un agent immobilier indépendant"
						/>
					</div>
				</div>
			</div>
		</Card>
	);
}
