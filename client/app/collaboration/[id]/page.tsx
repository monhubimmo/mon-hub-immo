'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { useSocket } from '@/context/SocketContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { canAccessProtectedResources } from '@/lib/utils/authUtils';
// SWR hooks
import { useCollaborationData } from '@/hooks/useCollaborationData';
import { useCollaborationMutations } from '@/hooks/useCollaborations';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { Features } from '@/lib/constants';

// New detail components
import {
	CollaborationHeader,
	CollaborationParticipants,
	CollaborationContract,
	CollaborationTimeline,
	CollaborationPostInfo,
	CollaborationClientInfo,
	CollaborationChat,
	CollaborationChatButton,
} from '@/components/collaboration/detail';

// Separated workflows
import { OverallStatusManager } from '@/components/collaboration/overall-status';
import { ProgressTracker } from '@/components/collaboration/progress-tracking';
import { ActivityManager } from '@/components/collaboration/shared';

// Raw activity shape as returned by collaboration API
type RawCollabActivity = {
	createdBy?: string;
	type?: string;
	message?: string;
	createdAt?: string;
	metadata?: Record<string, unknown> | null;
};
import { ContractModal } from '@/components/collaboration/ContractModal';
import { ContractViewModal } from '@/components/contract';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CompletionReasonModal } from '@/components/collaboration/CompletionReasonModal';
import { toast } from 'react-toastify';

// APIs
import { PropertyService, type Property } from '@/lib/api/propertyApi';
import searchAdApi from '@/lib/api/searchAdApi';

// Types
// import { Collaboration } from '@/types/collaboration';
import { OverallCollaborationStatus } from '@/components/collaboration/overall-status/types';
import {
	// ProgressStepData,
	ProgressUpdate,
} from '@/components/collaboration/progress-tracking/types';
import type { SearchAd } from '@/types/searchAd';

// Property type for when propertyId is populated
type PropertyDetails = Partial<Property> & { id?: string };

export default function CollaborationPage() {
	const params = useParams();
	const router = useRouter();
	const { user, loading } = useAuth();
	const collaborationId = params.id as string;

	// Helper to determine user ID early (needed for hooks)
	const userId = user?.id || user?._id;

	// State management
	// Collaboration data via SWR
	const {
		collaboration,
		progressSteps,
		setProgressSteps,
		isLoading: isCollabLoading,
		error: collabError,
		refetchCollaboration,
	} = useCollaborationData(collaborationId, user);
	const [property, setProperty] = useState<Property | null>(null);
	const [searchAd, setSearchAd] = useState<SearchAd | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [showContractModal, setShowContractModal] = useState(false);
	const [showContractViewModal, setShowContractViewModal] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [pendingAction, setPendingAction] =
		useState<OverallCollaborationStatus | null>(null);
	const [isChatOpen, setIsChatOpen] = useState(false);
	const [showCompletionReasonModal, setShowCompletionReasonModal] =
		useState(false);

	// Mutations via SWR
	const {
		respondToCollaboration,
		cancelCollaboration,
		completeCollaboration,
		addCollaborationNote,
		updateCollaborationProgress,
	} = useCollaborationMutations(userId);
	const [confirmLoading, setConfirmLoading] = useState(false);

	// Helper to determine user permissions
	const isOwner =
		user &&
		collaboration &&
		userId &&
		(userId === collaboration.postOwnerId?._id ||
			userId === (collaboration.postOwnerId as unknown as string));
	const isCollaborator =
		user &&
		collaboration &&
		userId &&
		(userId === collaboration.collaboratorId?._id ||
			userId === (collaboration.collaboratorId as unknown as string));
	const canUpdate = Boolean(isOwner || isCollaborator);
	const isActive =
		collaboration?.status ===
		Features.Collaboration.COLLABORATION_STATUS_VALUES.ACTIVE;

	// Chat integration
	const { selectedUser, setSelectedUser, getUserById, users, getUsers } =
		useChat();
	const { onlineUsers } = useSocket();

	// Check if user can access protected resources
	const canAccess = canAccessProtectedResources(user);

	// Initialize chat users when component mounts - only if user can access
	useEffect(() => {
		if (user && !loading && canAccess) {
			getUsers();
		}
	}, [user, loading, getUsers, canAccess]);

	// Chat peer resolution based on current user and collaboration
	const resolvePeerId = useCallback((): string | null => {
		if (!collaboration || !userId) return null;
		const owner =
			typeof collaboration.postOwnerId === 'string'
				? collaboration.postOwnerId
				: collaboration.postOwnerId?._id;
		const collaborator =
			typeof collaboration.collaboratorId === 'string'
				? collaboration.collaboratorId
				: collaboration.collaboratorId?._id;
		if (!owner || !collaborator) return null;
		return userId === owner ? collaborator : owner;
	}, [collaboration, userId]);

	// Get peer user and their unread count
	const peerId = resolvePeerId();
	const peerUser = users.find((u) => u._id === peerId);
	const unreadCount = peerUser?.unreadCount || 0;

	const openChat = useCallback(async () => {
		const peerId = resolvePeerId();
		if (!peerId) return;
		// If already selected, just open
		if (selectedUser?._id === peerId) {
			setIsChatOpen(true);
			return;
		}
		// Fetch peer details via chat store and select
		const user = await getUserById(peerId);
		if (user) setSelectedUser(user);
		setIsChatOpen(true);
	}, [resolvePeerId, selectedUser?._id, getUserById, setSelectedUser]);

	const closeChat = useCallback(() => {
		setIsChatOpen(false);
		// Do not clear selectedUser to keep context when reopening; server thread tracking is handled in useChat
	}, []);

	// Removed legacy fetchCollaboration in favor of useCollaborationData

	// Initial load handled by useCollaborationData
	useEffect(() => {
		// no-op: hook reacts to user + id
	}, [loading, user, collaborationId]);

	// Load post details (property or search ad) when collaboration changes
	useEffect(() => {
		if (!collaboration || !collaboration.postId) return;
		let cancelled = false;
		(async () => {
			try {
				if (collaboration.postType === 'Property') {
					// If postId is a string, fetch the property
					if (typeof collaboration.postId === 'string') {
						const res = await PropertyService.getPropertyById(
							collaboration.postId,
						);
						if (!cancelled) setProperty(res);
					}
					// If postId is already an object (populated), use it
					else if (typeof collaboration.postId === 'object') {
						if (!cancelled)
							setProperty(collaboration.postId as Property);
					}
				} else if (collaboration.postType === 'SearchAd') {
					// If postId is a string, fetch the search ad
					if (typeof collaboration.postId === 'string') {
						const res = await searchAdApi.getSearchAdById(
							collaboration.postId,
						);
						if (!cancelled) setSearchAd(res);
					}
					// If postId is already an object (populated), use it
					else if (typeof collaboration.postId === 'object') {
						if (!cancelled)
							setSearchAd(collaboration.postId as SearchAd);
					}
				}
			} catch {
				// ignore detail load errors to avoid breaking page
			} finally {
				// ensure setter is used to satisfy linter; no-op state update
				setProgressSteps((s) => s);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [collaboration, setProgressSteps]);

	// Workflow 1: Overall status update handler -> map to real endpoints or open contract modal
	const handleOverallStatusUpdate = useCallback(
		async (newStatus: OverallCollaborationStatus) => {
			if (!collaboration) return;

			try {
				if (newStatus === 'accepted' || newStatus === 'rejected') {
					// Owner response to pending proposal
					const res = await respondToCollaboration(
						collaboration._id,
						{ response: newStatus },
					);
					if (!res.success) return;
				} else if (newStatus === 'completed') {
					// Open completion reason modal instead of confirm dialog
					setShowCompletionReasonModal(true);
					return;
				} else if (newStatus === 'cancelled') {
					// Confirm before cancellation
					setPendingAction(newStatus);
					setConfirmOpen(true);
					return;
				} else if (newStatus === 'active') {
					// Open contract modal for signing flow when collaboration is accepted
					if (
						collaboration.status ===
						Features.Collaboration.COLLABORATION_STATUS_VALUES
							.ACCEPTED
					) {
						setShowContractModal(true);
						return;
					}
					// If already active and user clicked, do nothing extra
				} else {
					// Fallback: add a note
					const res = await addCollaborationNote(collaboration._id, {
						content: `Statut mis à jour: ${newStatus}`,
					});
					if (!res.success) return;
				}
				await refetchCollaboration();
			} catch {
				setError(
					Features.Collaboration.COLLABORATION_ERRORS
						.STATUS_UPDATE_FAILED,
				);
			}
		},
		[
			collaboration,
			respondToCollaboration,
			addCollaborationNote,
			refetchCollaboration,
		],
	);
	const handleConfirmAction = useCallback(async () => {
		if (!collaboration || !pendingAction) return;
		setConfirmLoading(true);
		const id = collaboration._id;
		const res =
			pendingAction === 'cancelled'
				? await cancelCollaboration(id)
				: await completeCollaboration(id);
		setConfirmLoading(false);
		if (res.success) {
			// Toast already shown by mutation hook for cancel
			if (pendingAction === 'completed') {
				toast.success(
					Features.Collaboration.COLLABORATION_TOAST_MESSAGES
						.COMPLETE_SUCCESS,
				);
			}
			await refetchCollaboration();
			setConfirmOpen(false);
			setPendingAction(null);
		} else {
			toast.error(
				Features.Collaboration.COLLABORATION_TOAST_MESSAGES
					.STATUS_UPDATE_ERROR,
			);
		}
	}, [
		collaboration,
		pendingAction,
		cancelCollaboration,
		completeCollaboration,
		refetchCollaboration,
	]);

	const handleCompletionReasonSubmit = useCallback(
		async (reason: string) => {
			if (!collaboration) return;
			setConfirmLoading(true);
			const res = await completeCollaboration(collaboration._id, reason);
			setConfirmLoading(false);
			if (res.success) {
				toast.success(
					Features.Collaboration.COLLABORATION_TOAST_MESSAGES
						.COMPLETE_SUCCESS,
				);
				await refetchCollaboration();
				setShowCompletionReasonModal(false);
			} else {
				toast.error(
					Features.Collaboration.COLLABORATION_TOAST_MESSAGES
						.STATUS_UPDATE_ERROR,
				);
			}
		},
		[collaboration, completeCollaboration, refetchCollaboration],
	);

	// Workflow 2: Progress step update handler
	const handleProgressUpdate = useCallback(
		async (update: ProgressUpdate) => {
			// Block progress updates until collaboration is active
			if (!collaboration || collaboration.status !== 'active') {
				return;
			}
			try {
				// Add a note about the progress update (optional UX)
				await addCollaborationNote(collaboration._id, {
					content: `Étape mise à jour: ${update.step}${
						update.notes ? ` - ${update.notes}` : ''
					}`,
				});
				await refetchCollaboration(); // Refresh data
			} catch {
				setError(
					Features.Collaboration.COLLABORATION_ERRORS
						.PROGRESS_UPDATE_FAILED,
				);
			}
		},
		[collaboration, addCollaborationNote, refetchCollaboration],
	); // Status modification handler (from modal) - NEW API
	const handleProgressStatusUpdate = useCallback(
		async (update: {
			targetStep: string;
			notes?: string;
			validatedBy: 'owner' | 'collaborator';
		}) => {
			// Block status mutation until collaboration is active
			if (!collaboration || collaboration.status !== 'active') {
				return;
			}
			try {
				// Use the new progress status API
				const res = await updateCollaborationProgress(
					collaboration._id,
					{
						targetStep: update.targetStep,
						notes: update.notes,
						validatedBy: update.validatedBy,
					},
				);
				if (!res.success) return;
				await refetchCollaboration(); // Refresh data
			} catch {
				setError(
					Features.Collaboration.COLLABORATION_ERRORS
						.STATUS_UPDATE_FAILED,
				);
			}
		},
		[collaboration, updateCollaborationProgress, refetchCollaboration],
	); // Activity management handler
	const handleAddActivity = useCallback(
		async (content: string) => {
			if (!collaboration || collaboration.status !== 'active') {
				return;
			}

			try {
				const res = await addCollaborationNote(collaboration._id, {
					content,
				});
				if (!res.success) return;
				await refetchCollaboration(); // Refresh data
			} catch (error) {
				throw error; // Re-throw for component error handling
			}
		},
		[collaboration, addCollaborationNote, refetchCollaboration],
	);

	return (
		<ProtectedRoute>
			<div className="min-h-screen bg-gray-50">
				<ConfirmDialog
					isOpen={confirmOpen}
					title={
						pendingAction === 'cancelled'
							? Features.Collaboration
									.COLLABORATION_CONFIRMATION_DIALOGS
									.CANCEL_TITLE
							: Features.Collaboration
									.COLLABORATION_CONFIRMATION_DIALOGS
									.COMPLETE_TITLE
					}
					description={
						pendingAction === 'cancelled'
							? Features.Collaboration
									.COLLABORATION_CONFIRMATION_DIALOGS
									.CANCEL_DESCRIPTION
							: Features.Collaboration
									.COLLABORATION_CONFIRMATION_DIALOGS
									.COMPLETE_DESCRIPTION
					}
					onCancel={() => {
						setConfirmOpen(false);
						setPendingAction(null);
					}}
					onConfirm={handleConfirmAction}
					confirmText={
						pendingAction === 'cancelled'
							? Features.Collaboration
									.COLLABORATION_CONFIRMATION_DIALOGS
									.CANCEL_CONFIRM
							: Features.Collaboration
									.COLLABORATION_CONFIRMATION_DIALOGS
									.COMPLETE_CONFIRM
					}
					cancelText={
						Features.Collaboration
							.COLLABORATION_CONFIRMATION_DIALOGS.CANCEL_CANCEL
					}
					variant={
						pendingAction === 'completed' ? 'danger' : 'warning'
					}
					loading={confirmLoading}
				/>
				{showContractModal && collaboration && (
					<ContractModal
						isOpen={showContractModal}
						onClose={() => setShowContractModal(false)}
						collaboration={collaboration}
						onUpdate={async () => {
							await refetchCollaboration();
						}}
					/>
				)}
				{/* Loading state */}
				{(loading || isCollabLoading) && (
					<PageLoader
						message={
							Features.Collaboration.COLLABORATION_LOADING.PAGE
						}
					/>
				)}{' '}
				{/* Error state */}
				{(error || collabError || !collaboration) &&
					!loading &&
					!isCollabLoading && (
						<div className="min-h-screen flex items-center justify-center">
							<div className="text-center">
								<p className="text-red-600 mb-4">
									{error ||
										collabError ||
										Features.Collaboration
											.COLLABORATION_ERRORS.NOT_FOUND}
								</p>
								<Button
									onClick={() =>
										router.push(
											Features.Dashboard.DASHBOARD_ROUTES
												.BASE,
										)
									}
								>
									Retour au tableau de bord
								</Button>
							</div>
						</div>
					)}
				{/* Main content */}
				{collaboration &&
					!loading &&
					!isCollabLoading &&
					!error &&
					!collabError && (
						<div>
							{/* Header */}
							<CollaborationHeader
								onBack={() => router.back()}
							/>{' '}
							{/* Workflow components */}
							<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
								<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
									<div className="lg:col-span-2 space-y-6">
										<OverallStatusManager
											collaborationId={collaboration._id}
											currentStatus={collaboration.status}
											canUpdate={canUpdate}
											isOwner={Boolean(isOwner)}
											isCollaborator={Boolean(
												isCollaborator,
											)}
											onStatusUpdate={
												handleOverallStatusUpdate
											}
											progressSteps={progressSteps}
											completionReason={
												collaboration.completionReason
											}
										/>

										<ProgressTracker
											collaborationId={collaboration._id}
											currentStep={
												collaboration.currentProgressStep
											}
											steps={progressSteps}
											canUpdate={canUpdate && isActive}
											isOwner={Boolean(isOwner)}
											isCollaborator={Boolean(
												isCollaborator,
											)}
											ownerUser={
												typeof collaboration.postOwnerId ===
												'object'
													? collaboration.postOwnerId
													: undefined
											}
											collaboratorUser={
												typeof collaboration.collaboratorId ===
												'object'
													? collaboration.collaboratorId
													: undefined
											}
											onStepUpdate={handleProgressUpdate}
											onStatusUpdate={
												handleProgressStatusUpdate
											}
										/>

										{/* Activities Section */}
										<ActivityManager
											collaborationId={collaboration._id}
											activities={(Array.isArray(
												collaboration.activities,
											)
												? (
														collaboration.activities as RawCollabActivity[]
													).slice()
												: []
											)
												.sort(
													(
														a: RawCollabActivity,
														b: RawCollabActivity,
													) =>
														new Date(
															b.createdAt || '',
														).getTime() -
														new Date(
															a.createdAt || '',
														).getTime(),
												)
												.map(
													(
														activity: RawCollabActivity,
														index: number,
													) => {
														// Resolve user data from collaboration participants
														const isOwnerAction =
															activity.createdBy ===
															collaboration
																.postOwnerId
																?._id;
														const userInfo =
															isOwnerAction
																? collaboration.postOwnerId
																: collaboration.collaboratorId;
														return {
															id: `activity-${index}`,
															type:
																activity.type ===
																'note'
																	? 'note'
																	: 'status_update',
															title:
																activity.type ===
																'note'
																	? 'Note ajoutée'
																	: activity.message ||
																		'Mise à jour du statut',
															content:
																activity.type ===
																'note'
																	? activity.message ||
																		''
																	: '', // Don't duplicate message for status updates
															author: {
																id:
																	activity.createdBy ||
																	'unknown',
																name: userInfo
																	? `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() ||
																		'Utilisateur'
																	: 'Utilisateur',
																role: isOwnerAction
																	? ('agent' as const)
																	: ('apporteur' as const),
																profileImage:
																	userInfo?.profileImage,
															},
															createdAt:
																activity.createdAt ||
																new Date().toISOString(),
														};
													},
												)}
											canAddActivity={
												canUpdate && isActive
											}
											onAddActivity={handleAddActivity}
											onRefresh={refetchCollaboration}
										/>
									</div>

									<div className="space-y-6">
										{/* Property or SearchAd Information */}
										<CollaborationPostInfo
											collaboration={collaboration}
											property={property}
											searchAd={searchAd}
										/>
										{/* Client Information - Only visible for Property collaborations */}
										<CollaborationClientInfo
											collaboration={collaboration}
											property={property}
										/>
										{/* Agents Information */}
										<CollaborationParticipants
											collaboration={collaboration}
										/>
										{/* Prix et frais - Show if agency fees exist */}
										{typeof collaboration.postId ===
											'object' &&
											(
												collaboration.postId as PropertyDetails
											)?.agencyFeesAmount && (
												<Card className="p-6 bg-gradient-to-br from-brand-50 to-brand-100 border-2 border-brand-200">
													<h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
														<span>💰</span> Prix et
														frais
													</h3>

													<div className="space-y-3 bg-white/70 rounded-lg p-4">
														<div className="flex justify-between items-center py-2">
															<span className="text-gray-700 font-medium">
																Prix net vendeur
															</span>
															<span className="text-xl font-bold text-gray-900">
																{(
																	collaboration.postId as PropertyDetails
																)?.price?.toLocaleString()}{' '}
																€
															</span>
														</div>
														<div className="flex justify-between items-center py-2">
															<span className="text-gray-600">
																→ Frais
																d&apos;agence
															</span>
															<span className="text-lg font-medium text-gray-800">
																{(
																	collaboration.postId as PropertyDetails
																)?.agencyFeesAmount?.toLocaleString()}{' '}
																€
															</span>
														</div>
														<div className="flex justify-between items-center py-2 border-t pt-3">
															<span className="text-gray-600">
																→ Prix FAI
															</span>
															<span className="text-lg font-semibold text-brand">
																{(
																	collaboration.postId as PropertyDetails
																)?.priceIncludingFees?.toLocaleString()}{' '}
																€
															</span>
														</div>
													</div>
												</Card>
											)}
										{/* Commission Details */}
										<Card className="p-6">
											<h3 className="text-lg font-medium text-gray-900 mb-4">
												{collaboration.compensationType ===
												'gift_vouchers'
													? '🎁 Chèques cadeaux'
													: collaboration.compensationType ===
														  'fixed_amount'
														? '💰 Montant fixe'
														: '💰 Répartition commission'}
											</h3>

											<div className="space-y-3">
												{/* Gift Vouchers Display */}
												{collaboration.compensationType ===
													'gift_vouchers' && (
													<div className="text-center py-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
														<p className="text-sm text-gray-600 mb-2">
															Chèques cadeaux pour
															le collaborateur
														</p>
														<p className="text-4xl font-bold text-purple-600">
															{collaboration.compensationAmount ||
																0}
														</p>
														<p className="text-xs text-gray-500 mt-1">
															chèques cadeaux
														</p>
													</div>
												)}

												{/* Fixed Amount Display */}
												{collaboration.compensationType ===
													'fixed_amount' && (
													<div className="text-center py-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
														<p className="text-sm text-gray-600 mb-2">
															Montant fixe pour le
															collaborateur
														</p>
														<p className="text-4xl font-bold text-green-600">
															{(
																collaboration.compensationAmount ||
																0
															).toLocaleString()}{' '}
															€
														</p>
													</div>
												)}

												{/* Percentage Commission Display */}
												{(!collaboration.compensationType ||
													collaboration.compensationType ===
														'percentage') && (
													<>
														<div className="flex justify-between items-center">
															<span className="text-gray-600">
																Part
																collaborateur
															</span>
															<span className="font-medium text-green-600 text-lg">
																{
																	collaboration.proposedCommission
																}{' '}
																%
															</span>
														</div>

														{typeof collaboration.postId ===
															'object' &&
															(
																collaboration.postId as PropertyDetails
															)
																?.agencyFeesAmount && (
																<>
																	<div className="flex justify-between items-center py-2 pl-6 bg-green-50 px-3 rounded">
																		<span className="text-gray-600">
																			→
																			Commission
																			collaborateur
																		</span>
																		<span className="text-lg font-semibold text-green-600">
																			{(
																				((
																					collaboration.postId as PropertyDetails
																				)
																					?.agencyFeesAmount ||
																					0) *
																				(collaboration.proposedCommission /
																					100)
																			).toLocaleString()}{' '}
																			€
																		</span>
																	</div>
																	<div className="flex justify-between items-center py-2 pl-6 bg-info-light px-3 rounded">
																		<span className="text-gray-600">
																			→
																			Commission
																			Propriétaire
																		</span>
																		<span className="text-lg font-semibold text-brand">
																			{(
																				((
																					collaboration.postId as PropertyDetails
																				)
																					?.agencyFeesAmount ||
																					0) *
																				((100 -
																					collaboration.proposedCommission) /
																					100)
																			).toLocaleString()}{' '}
																			€
																		</span>
																	</div>
																</>
															)}

														{/* Show message if no agency fees configured */}
														{typeof collaboration.postId ===
															'object' &&
															!(
																collaboration.postId as PropertyDetails
															)
																?.agencyFeesAmount && (
																<div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
																	<p className="text-sm text-amber-800">
																		ℹ️ Les
																		montants
																		en euros
																		seront
																		affichés
																		une fois
																		que les
																		frais
																		d&apos;agence
																		seront
																		configurés
																		sur le
																		bien.
																	</p>
																</div>
															)}
													</>
												)}
											</div>
										</Card>{' '}
										{/* Contract Status */}
										<CollaborationContract
											collaboration={collaboration}
											onViewContract={() =>
												setShowContractViewModal(true)
											}
										/>
										{/* Collaboration Timeline */}
										<CollaborationTimeline
											collaboration={collaboration}
										/>
									</div>
								</div>
							</div>
						</div>
					)}
				{/* Floating Chat Button */}
				{!isChatOpen && collaboration && (
					<CollaborationChatButton
						unreadCount={unreadCount}
						onClick={openChat}
					/>
				)}
				{/* Right-hand chat panel */}
				<CollaborationChat
					isOpen={isChatOpen}
					selectedUser={selectedUser}
					onlineUsers={onlineUsers}
					onClose={closeChat}
				/>
				{/* Contract View Modal */}
				{collaboration && (
					<ContractViewModal
						isOpen={showContractViewModal}
						onClose={() => setShowContractViewModal(false)}
						contractText={
							collaboration.contractText ||
							'Contenu du contrat non disponible.'
						}
						collaboration={collaboration}
					/>
				)}
				{/* Completion Reason Modal */}
				<CompletionReasonModal
					isOpen={showCompletionReasonModal}
					onClose={() => setShowCompletionReasonModal(false)}
					onConfirm={handleCompletionReasonSubmit}
					isLoading={confirmLoading}
				/>
			</div>
		</ProtectedRoute>
	);
}
