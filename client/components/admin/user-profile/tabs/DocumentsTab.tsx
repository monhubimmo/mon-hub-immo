'use client';

import React from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import {
	Files,
	Image as ImageIcon,
	IdCard,
	FileText,
	ExternalLink,
} from 'lucide-react';
import { UserProfile } from '../types';
import { TabSectionHeader } from '../FormComponents';
import { toCdnUrl } from '@/lib/utils/imageUtils';

interface DocumentsTabProps {
	form: UserProfile;
}

export function DocumentsTab({ form }: DocumentsTabProps) {
	return (
		<Card className="shadow-lg border-0 ring-1 ring-gray-100 overflow-hidden">
			<div className="p-6">
				<TabSectionHeader
					icon={Files}
					title="Documents"
					description="Pièces justificatives et fichiers"
					iconBgColor="bg-purple-50"
					iconColor="text-purple-600"
				/>
				<div className="space-y-6">
					{/* Profile Image Section */}
					<div className="bg-gray-50/50 p-5 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
						<h4 className="font-semibold text-gray-900 mb-4 flex items-center">
							<div className="p-1.5 bg-white rounded-md shadow-sm mr-3 text-gray-600">
								<ImageIcon size={16} />
							</div>
							Photo de profil
						</h4>
						{form.profileImage ? (
							<div className="flex items-start gap-5\">
								<a
									href={toCdnUrl(form.profileImage)}
									target=\"_blank\"
									rel=\"noopener noreferrer\"
									className=\"group relative\"
								>
									<div className=\"w-32 h-32 relative rounded-xl overflow-hidden border-2 border-white shadow-md group-hover:shadow-lg transition-all ring-1 ring-gray-100\">
										<Image
											src={toCdnUrl(form.profileImage)}
											alt=\"Profile\"
											fill
											className=\"object-cover group-hover:scale-105 transition-transform duration-500\"
											unoptimized
										/>
										<div className=\"absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors\" />
									</div>
								</a>
								<div className=\"text-sm text-gray-500 mt-2\">
									<p>
										Cliquez sur l&apos;image pour
										l&apos;agrandir.
									</p>
								</div>
							</div>
						) : (
							<div className="flex flex-col items-center justify-center w-32 h-32 bg-white rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
								<ImageIcon
									size={24}
									className="mb-2 opacity-50"
								/>
								<span className="text-xs font-medium">
									Aucune photo
								</span>
							</div>
						)}
					</div>

					{/* Identity Card Section */}
					<div className="bg-gray-50/50 p-5 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
						<h4 className="font-semibold text-gray-900 mb-4 flex items-center">
							<div className="p-1.5 bg-white rounded-md shadow-sm mr-3 text-gray-600">
								<IdCard size={16} />
							</div>
							Carte d&apos;identité
						</h4>
						{form.professionalInfo?.identityCard?.url ? (
							<a
								href={toCdnUrl(
									form.professionalInfo.identityCard.url,
								)}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all group"
							>
								<div className="p-2 bg-blue-50 text-blue-600 rounded-lg mr-4 group-hover:scale-110 transition-transform">
									<FileText size={20} />
								</div>
								<div>
									<p className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
										Voir le document
									</p>
									<p className="text-xs text-gray-500 mt-0.5">
										Format PDF ou Image
									</p>
								</div>
								<ExternalLink
									size={16}
									className="ml-auto text-gray-400 group-hover:text-primary-500"
								/>
							</a>
						) : (
							<div className="flex items-center justify-center p-8 bg-white rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
								<span className="text-sm font-medium">
									Non fourni
								</span>
							</div>
						)}
					</div>
				</div>
			</div>
		</Card>
	);
}
