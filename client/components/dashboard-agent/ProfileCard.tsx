'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '../ui/Button';
import { ProfileUpdateModal } from './ProfileUpdateModal';
import { User } from '@/types/auth';
import { toCdnUrl } from '@/lib/utils/imageUtils';

interface ProfileCardProps {
	user: User;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ user }) => {
	const [showUpdateModal, setShowUpdateModal] = useState(false);

	return (
		<>
			<div className="bg-white rounded-xl shadow-sm p-6 mb-8">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-semibold text-gray-900">
						Profile Information
					</h3>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setShowUpdateModal(true)}
						className="flex items-center space-x-2"
					>
						<svg
							className="w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
							/>
						</svg>
						<span>Modifier le profil</span>
					</Button>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* Profile Image and Basic Info */}
					<div className="md:col-span-2 flex items-center space-x-4 mb-4">
						<div className="w-20 h-20 bg-brand rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 relative">
							{user.profileImage ? (
								<Image
									src={toCdnUrl(user.profileImage)}
									alt={`${user.firstName} ${user.lastName}`}
									fill
									className="object-cover"
									unoptimized
									onError={(e) => {
										const target =
											e.target as HTMLImageElement;
										target.style.display = 'none';
										target.nextElementSibling!.classList.remove(
											'hidden',
										);
									}}
								/>
							) : null}
							<span
								className={`text-white font-semibold text-xl ${user.profileImage ? 'hidden' : ''}`}
							>
								{user.firstName.charAt(0)}
								{user.lastName.charAt(0)}
							</span>
						</div>
						<div>
							<h4 className="text-xl font-semibold text-gray-900">
								{user.firstName} {user.lastName}
							</h4>
							<p className="text-gray-600 capitalize">
								{user.userType}
							</p>
						</div>
					</div>

					<div>
						<p className="text-sm font-medium text-gray-600">
							Full Name
						</p>
						<p className="text-base text-gray-900">
							{user.firstName} {user.lastName}
						</p>
					</div>

					<div>
						<p className="text-sm font-medium text-gray-600">
							Email
						</p>
						<p className="text-base text-gray-900">{user.email}</p>
					</div>

					<div>
						<p className="text-sm font-medium text-gray-600">
							Phone
						</p>
						<p className="text-base text-gray-900">
							{user.phone || 'Not provided'}
						</p>
					</div>

					<div>
						<p className="text-sm font-medium text-gray-600">
							Account Type
						</p>
						<span className="inline-flex px-2 py-1 text-xs font-semibold bg-brand-100 text-brand-800 rounded-full capitalize">
							{user.userType}
						</span>
					</div>

					<div>
						<p className="text-sm font-medium text-gray-600">
							Email Status
						</p>
						<span
							className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
								user.isEmailVerified
									? 'bg-green-100 text-green-800'
									: 'bg-red-100 text-red-800'
							}`}
						>
							{user.isEmailVerified ? 'Verified' : 'Not Verified'}
						</span>
					</div>

					<div>
						<p className="text-sm font-medium text-gray-600">
							Member Since
						</p>
						<p className="text-base text-gray-900">
							{user.createdAt
								? new Date(user.createdAt).toLocaleDateString()
								: 'Unknown'}
						</p>
					</div>
				</div>
			</div>

			{/* Update Modal */}
			<ProfileUpdateModal
				isOpen={showUpdateModal}
				onClose={() => setShowUpdateModal(false)}
				user={user}
			/>
		</>
	);
};
