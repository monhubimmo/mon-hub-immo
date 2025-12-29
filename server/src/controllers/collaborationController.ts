import { Request, Response } from 'express';
import { Collaboration, ICollaboration } from '../models/Collaboration';
import { Property } from '../models/Property';
import { SearchAd } from '../models/SearchAd';
import { Types } from 'mongoose';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { notificationService } from '../services/notificationService';
import { collabTexts } from '../utils/notificationTexts';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
	user?: {
		id: string;
		userType: string;
	};
}

export const getAllCollaborationsAdmin = async (
	req: AuthenticatedRequest,
	res: Response,
) => {
	try {
		logger.info(
			'[CollaborationController] getAllCollaborationsAdmin called',
			{
				actorId: req.user?.id || null,
			},
		);
		// Only show collaborations where the post still exists (not deleted)
		const collaborations = await Collaboration.find({
			postId: { $ne: null },
		})
			.populate('postId', 'title address mainImage status')
			.populate('postOwnerId', 'firstName lastName email profileImage')
			.populate('collaboratorId', 'firstName lastName email profileImage')
			.sort({ createdAt: -1 })
			.lean();

		// Filter out collaborations where post is archived
		const activeCollaborations = collaborations.filter((c) => {
			const post = c.postId as { status?: string } | null;
			return post && post.status !== 'archived';
		});

		const mappedCollaborations = activeCollaborations.map((c) => ({
			...c,
			agent: c.postOwnerId,
			agentId:
				(c.postOwnerId as { _id?: Types.ObjectId })?._id?.toString() ||
				c.postOwnerId?.toString(),
			apporteur: c.collaboratorId,
			apporteurId:
				(
					c.collaboratorId as { _id?: Types.ObjectId }
				)?._id?.toString() || c.collaboratorId?.toString(),
		}));

		logger.info(
			'[CollaborationController] getAllCollaborationsAdmin success',
			{
				count: mappedCollaborations.length,
			},
		);
		res.status(200).json({
			success: true,
			collaborations: mappedCollaborations,
		});
	} catch (error) {
		logger.error(
			'[CollaborationController] getAllCollaborationsAdmin failed',
			{
				error: error instanceof Error ? error.message : String(error),
			},
		);
		res.status(500).json({ success: false, message: 'Erreur serveur' });
	}
};
export const proposeCollaboration = async (
	req: AuthenticatedRequest,
	res: Response,
): Promise<void> => {
	try {
		const {
			propertyId,
			searchAdId,
			commissionPercentage,
			message,
			compensationType,
			compensationAmount,
		} = req.body;
		const userId = req.user?.id;
		const userType = req.user?.userType;

		if (!userId) {
			res.status(401).json({ success: false, message: 'Non autorisé' });
			return;
		}

		// Only agents can propose collaborations
		if (userType === 'apporteur') {
			res.status(403).json({
				success: false,
				message:
					'Les apporteurs ne peuvent pas proposer de collaborations. Seuls les agents peuvent proposer des collaborations.',
			});
			return;
		}

		// Determine post type and ID
		const postType = propertyId ? 'Property' : 'SearchAd';
		const postId = propertyId || searchAdId;

		if (!postId) {
			res.status(400).json({
				success: false,
				message:
					"Un identifiant de propriété ou d'annonce de recherche est requis",
			});
			return;
		}

		let postOwnerId: Types.ObjectId;

		// Fetch the post (property or searchAd)
		if (postType === 'Property') {
			const property = await Property.findById(postId);
			if (!property) {
				res.status(404).json({
					success: false,
					message: 'Propriété introuvable',
				});
				return;
			}

			// Check that the user is not proposing collaboration on their own property
			if (property.owner.toString() === userId) {
				res.status(400).json({
					success: false,
					message:
						'Vous ne pouvez pas collaborer sur votre propre propriété',
				});
				return;
			}

			postOwnerId = property.owner as Types.ObjectId;
		} else {
			// searchAd
			const searchAd = await SearchAd.findById(postId);
			if (!searchAd) {
				res.status(404).json({
					success: false,
					message: 'Annonce de recherche introuvable',
				});
				return;
			}

			// Check that the user is not proposing collaboration on their own search ad
			if (!searchAd.authorId) {
				res.status(400).json({
					success: false,
					message: 'Annonce sans auteur, action impossible',
				});
				return;
			}

			if (searchAd.authorId.toString() === userId) {
				res.status(400).json({
					success: false,
					message:
						'Vous ne pouvez pas collaborer sur votre propre annonce',
				});
				return;
			}

			postOwnerId = searchAd.authorId as Types.ObjectId;
		}

		// Check for existing active collaboration
		const existingCollaboration = await Collaboration.findOne({
			postId,
			collaboratorId: userId, // Current user is the collaborator
			status: { $in: ['pending', 'accepted', 'active'] },
		});

		if (existingCollaboration) {
			res.status(400).json({
				success: false,
				message: 'Une collaboration existe déjà pour cette annonce',
			});
			return;
		}

		// Delete any old cancelled/rejected collaboration to allow re-collaboration
		await Collaboration.deleteOne({
			postId,
			collaboratorId: userId,
			status: { $in: ['cancelled', 'rejected'] },
		});

		// Block if the post already has an active/pending/accepted collaboration with someone else
		const collabWithAnother = await Collaboration.findOne({
			postId,
			collaboratorId: { $ne: userId },
			status: { $in: ['pending', 'accepted', 'active'] },
		});

		if (collabWithAnother) {
			res.status(409).json({
				success: false,
				message: `${postType === 'Property' ? 'Cette propriété' : 'Cette annonce de recherche'} est déjà en collaboration`,
			});
			return;
		}

		// Check if post owner is apporteur and apply special validation
		const postOwner = await User.findById(postOwnerId).select('userType');
		const isApporteurPost = postOwner?.userType === 'apporteur';

		// Validate compensation for apporteur posts
		if (isApporteurPost) {
			if (compensationType === 'percentage' || !compensationType) {
				if (commissionPercentage && commissionPercentage >= 50) {
					res.status(400).json({
						success: false,
						message:
							"Le pourcentage de commission doit être inférieur à 50% pour les annonces d'apporteur",
					});
					return;
				}
			} else if (
				compensationType === 'fixed_amount' ||
				compensationType === 'gift_vouchers'
			) {
				if (!compensationAmount || compensationAmount <= 0) {
					res.status(400).json({
						success: false,
						message:
							'Le montant de compensation doit être supérieur à 0',
					});
					return;
				}
			}
		}

		// Determine activity message based on compensation type
		let activityMessage = '';
		if (isApporteurPost && compensationType !== 'percentage') {
			if (compensationType === 'fixed_amount') {
				activityMessage = `Collaboration proposée avec ${compensationAmount}€ de compensation`;
			} else if (compensationType === 'gift_vouchers') {
				activityMessage = `Collaboration proposée avec ${compensationAmount} chèques cadeaux`;
			}
		} else {
			activityMessage = `Collaboration proposée avec ${commissionPercentage || 0}% de commission`;
		}

		// Use MongoDB transaction for atomic collaboration creation
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			const collaboration = new Collaboration({
				postId,
				postType,
				postOwnerId, // Post owner receives the collaboration request
				collaboratorId: userId, // Current authenticated user becomes the collaborator
				proposedCommission: commissionPercentage || 0,
				proposalMessage: message,
				...(isApporteurPost && {
					compensationType,
					compensationAmount,
				}),
				status: 'pending',
				currentStep: 'proposal',
				activities: [
					{
						type: 'proposal',
						message: activityMessage,
						createdBy: new Types.ObjectId(userId),
						createdAt: new Date(),
					},
				],
				ownerSigned: false,
				collaboratorSigned: false,
			});

			await collaboration.save({ session });

			// Notify post owner about new proposal
			const actor = await User.findById(userId)
				.select('firstName lastName email profileImage')
				.session(session);
			const actorName = actor
				? actor.firstName
					? `${actor.firstName} ${actor.lastName}`
					: actor.firstName || actor.email
				: 'Someone';

			await notificationService.create({
				recipientId: postOwnerId,
				actorId: userId,
				type: 'collab:proposal_received',
				entity: { type: 'collaboration', id: collaboration._id },
				title: collabTexts.proposalReceivedTitle,
				message: collabTexts.proposalReceivedBody({
					actorName,
					commission: commissionPercentage,
				}),
				data: {
					postId: postId.toString(),
					postType,
					commissionPercentage,
					actorName,
					actorAvatar: actor?.profileImage || undefined,
				},
			});

			// Commit the transaction
			await session.commitTransaction();

			res.status(201).json({
				success: true,
				message: 'Proposition de collaboration envoyée avec succès',
				collaboration,
			});
		} catch (txError) {
			// Rollback on error
			await session.abortTransaction();
			throw txError;
		} finally {
			session.endSession();
		}
	} catch (error) {
		logger.error(
			'[CollaborationController] Error proposing collaboration',
			error,
		);
		res.status(500).json({
			success: false,
			message:
				'Une erreur est survenue lors de la proposition de collaboration',
		});
	}
};
export const getUserCollaborations = async (
	req: AuthenticatedRequest,
	res: Response,
): Promise<void> => {
	try {
		const userId = req.user?.id;

		if (!userId) {
			res.status(401).json({ success: false, message: 'Unauthorized' });
			return;
		}

		const collaborations = await Collaboration.find({
			$or: [{ postOwnerId: userId }, { collaboratorId: userId }],
		})
			.populate('postId')
			.populate('postOwnerId', 'firstName lastName profileImage')
			.populate('collaboratorId', 'firstName lastName profileImage')
			.populate(
				'progressSteps.notes.createdBy',
				'firstName lastName profileImage',
			)
			.sort({ createdAt: -1 });

		res.status(200).json({
			success: true,
			collaborations,
		});
	} catch (error) {
		logger.error(
			'[CollaborationController] Error getting collaborations',
			error,
		);
		res.status(500).json({
			success: false,
			message:
				'Une erreur est survenue lors du chargement des collaborations',
		});
	}
};
// Get single collaboration details (owner/collaborator or admin can access)
export const getCollaborationById = async (
	req: AuthenticatedRequest,
	res: Response,
): Promise<void> => {
	try {
		const { id } = req.params;
		const userId = req.user?.id;
		const userType = req.user?.userType;

		if (!userId) {
			res.status(401).json({ success: false, message: 'Unauthorized' });
			return;
		}

		const collaboration = await Collaboration.findById(id)
			.populate('postOwnerId', 'firstName lastName email profileImage')
			.populate('collaboratorId', 'firstName lastName email profileImage')
			.populate('activities.createdBy', 'firstName lastName profileImage')
			.populate(
				'progressSteps.notes.createdBy',
				'firstName lastName profileImage',
			);

		if (!collaboration) {
			res.status(404).json({
				success: false,
				message: "Cette collaboration n'existe plus",
				deleted: true,
			});
			return;
		}

		// Check if the post has been deleted (postId is null)
		if (!collaboration.postId) {
			res.status(410).json({
				success: false,
				message:
					"Le bien ou l'annonce associé à cette collaboration a été supprimé",
				deleted: true,
			});
			return;
		}

		// Try to populate the post to check if it's archived
		await collaboration.populate('postId');
		const post = collaboration.postId as { status?: string } | null;

		// If post doesn't exist or is archived
		if (!post || post.status === 'archived') {
			res.status(410).json({
				success: false,
				message:
					"Le bien ou l'annonce associé à cette collaboration n'existe plus",
				deleted: true,
			});
			return;
		}

		// Allow admin OR participants
		const isAdmin = userType === 'admin';
		const isOwner = collaboration.postOwnerId
			? collaboration.postOwnerId._id
				? collaboration.postOwnerId._id.toString() === userId
				: collaboration.postOwnerId.toString() === userId
			: false;
		const isCollaborator = collaboration.collaboratorId
			? collaboration.collaboratorId._id
				? collaboration.collaboratorId._id.toString() === userId
				: collaboration.collaboratorId.toString() === userId
			: false;

		if (!isAdmin && !isOwner && !isCollaborator) {
			res.status(403).json({
				success: false,
				message: 'Non autorisé à voir cette collaboration',
			});
			return;
		}

		res.status(200).json({ success: true, collaboration });
	} catch (error) {
		logger.error(
			'[CollaborationController] Error getting collaboration by id',
			error,
		);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

// Admin: force-close or cancel a collaboration regardless of current state
export const adminCloseCollaboration = async (
	req: AuthenticatedRequest,
	res: Response,
): Promise<void> => {
	try {
		const { id } = req.params;
		const { action, completionReason } = req.body; // action: 'cancel' | 'complete'
		const userId = req.user?.id;
		const userType = req.user?.userType;

		logger.info(
			'[CollaborationController] adminCloseCollaboration called',
			{
				actorId: userId || null,
				id,
				action,
			},
		);

		if (!userId || userType !== 'admin') {
			res.status(403).json({
				success: false,
				message: 'Accès administrateur requis',
			});
			return;
		}

		const collaboration = await Collaboration.findById(id)
			.populate('postOwnerId', 'firstName lastName email profileImage')
			.populate(
				'collaboratorId',
				'firstName lastName email profileImage',
			);

		if (!collaboration) {
			res.status(404).json({
				success: false,
				message: 'Collaboration introuvable',
			});
			return;
		}

		if (action === 'cancel') {
			collaboration.status = 'cancelled';
			collaboration.updatedAt = new Date();
			collaboration.activities.push({
				type: 'status_update',
				message: "Collaboration annulée par l'administrateur",
				createdBy: new Types.ObjectId(userId),
				createdAt: new Date(),
			});
		} else {
			// complete
			collaboration.status = 'completed';
			collaboration.currentStep = 'completed';
			collaboration.completedAt = new Date();
			// Admin force completion - set reason as sans_suite since admin_forced_completion is not in the enum
			collaboration.completionReason =
				(completionReason as ICollaboration['completionReason']) ||
				'sans_suite';
			collaboration.completedBy = new Types.ObjectId(userId);
			collaboration.completedByRole = 'owner'; // Use owner as proxy for admin
			// mark steps completed
			if (Array.isArray(collaboration.progressSteps)) {
				collaboration.progressSteps.forEach((step) => {
					step.completed = true;
					step.ownerValidated = true;
					step.collaboratorValidated = true;
				});
			}
			collaboration.activities.push({
				type: 'status_update',
				message: 'Collaboration force-completed by admin',
				createdBy: new Types.ObjectId(userId),
				createdAt: new Date(),
			});
		}

		await collaboration.save();

		// Notify both parties
		const actor = await User.findById(userId).select(
			'firstName lastName email profileImage',
		);
		const actorName = actor
			? actor.firstName
				? `${actor.firstName} ${actor.lastName || ''}`.trim()
				: actor.firstName || actor.email
			: 'Admin';

		const recipients = [
			collaboration.postOwnerId,
			collaboration.collaboratorId,
		];
		for (const r of recipients) {
			if (!r) continue;
			await notificationService.create({
				recipientId: r,
				actorId: userId,
				type:
					action === 'cancel'
						? 'collab:cancelled'
						: 'collab:completed',
				entity: { type: 'collaboration', id: collaboration._id },
				title:
					action === 'cancel'
						? collabTexts.cancelledTitle
						: collabTexts.completedTitle,
				message:
					action === 'cancel'
						? collabTexts.cancelledBody
						: collabTexts.completedBody,
				data: {
					actorName,
					actorAvatar: actor?.profileImage || undefined,
				},
			});
		}

		logger.info(
			'[CollaborationController] adminCloseCollaboration success',
			{ id, action },
		);
		res.status(200).json({
			success: true,
			message: 'Action performed',
			collaboration,
		});
	} catch (error) {
		logger.error(
			'[CollaborationController] Error admin closing collaboration',
			error,
		);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

// Admin: force-validate a specific progress step or mark affaire_conclue validated for both
export const adminForceComplete = async (
	req: AuthenticatedRequest,
	res: Response,
): Promise<void> => {
	try {
		const { id } = req.params;
		const userId = req.user?.id;
		const userType = req.user?.userType;

		logger.info('[CollaborationController] adminForceComplete called', {
			actorId: userId || null,
			id,
		});

		if (!userId || userType !== 'admin') {
			res.status(403).json({
				success: false,
				message: 'Accès administrateur requis',
			});
			return;
		}

		const collaboration = await Collaboration.findById(id);
		if (!collaboration) {
			res.status(404).json({
				success: false,
				message: 'Collaboration introuvable',
			});
			return;
		}

		// Mark affaire_conclue step validated by both
		const affaireStep = collaboration.progressSteps.find(
			(s) => s.id === 'affaire_conclue',
		);
		if (affaireStep) {
			affaireStep.ownerValidated = true;
			affaireStep.collaboratorValidated = true;
			affaireStep.completed = true;
		}

		collaboration.status = 'completed';
		collaboration.currentStep = 'completed';
		collaboration.completedAt = new Date();
		collaboration.completionReason = 'sans_suite'; // Use sans_suite for admin force completion
		collaboration.completedBy = new Types.ObjectId(userId);
		collaboration.completedByRole = 'owner'; // Use owner as proxy for admin
		collaboration.activities.push({
			type: 'status_update',
			message: 'Collaboration force-completed by admin (validated steps)',
			createdBy: new Types.ObjectId(userId),
			createdAt: new Date(),
		});

		await collaboration.save();

		// Notify both parties
		const actor = await User.findById(userId).select(
			'firstName lastName email profileImage',
		);
		const actorName = actor
			? actor.firstName
				? `${actor.firstName} ${actor.lastName || ''}`.trim()
				: actor.firstName || actor.email
			: 'Admin';

		const recipients = [
			collaboration.postOwnerId,
			collaboration.collaboratorId,
		];
		for (const r of recipients) {
			if (!r) continue;
			await notificationService.create({
				recipientId: r,
				actorId: userId,
				type: 'collab:completed',
				entity: { type: 'collaboration', id: collaboration._id },
				title: collabTexts.completedTitle,
				message: collabTexts.completedBody,
				data: {
					actorName,
					actorAvatar: actor?.profileImage || undefined,
				},
			});
		}

		logger.info('[CollaborationController] adminForceComplete success', {
			id,
		});
		res.status(200).json({
			success: true,
			message: 'Collaboration force-completed',
			collaboration,
		});
	} catch (error) {
		logger.error(
			'[CollaborationController] Error admin force completing collaboration',
			error,
		);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};
export const respondToCollaboration = async (
	req: AuthenticatedRequest,
	res: Response,
): Promise<void> => {
	try {
		const { id } = req.params;
		const { response } = req.body;
		const userId = req.user?.id;

		if (!userId) {
			res.status(401).json({ success: false, message: 'Non autorisé' });
			return;
		}

		const collaboration = await Collaboration.findById(id);
		if (!collaboration) {
			res.status(404).json({
				success: false,
				message: 'Collaboration introuvable',
			});
			return;
		}

		if (collaboration.postOwnerId.toString() !== userId) {
			res.status(403).json({
				success: false,
				message: 'Seul le propriétaire peut répondre',
			});
			return;
		}

		if (collaboration.status !== 'pending') {
			res.status(400).json({
				success: false,
				message:
					"Vous ne pouvez répondre qu'aux propositions en attente",
			});
			return;
		}

		// Use MongoDB transaction for atomic collaboration response
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			collaboration.status =
				response === 'accepted' ? 'accepted' : 'rejected';
			await collaboration.save({ session });

			// Notify collaborator about decision
			const actor = await User.findById(userId)
				.select('firstName lastName email profileImage')
				.session(session);
			const actorName = actor
				? actor.firstName
					? `${actor.firstName} ${actor.lastName}`
					: actor.firstName || actor.email
				: 'Someone';

			await notificationService.create({
				recipientId: collaboration.collaboratorId,
				actorId: userId,
				type:
					response === 'accepted'
						? 'collab:proposal_accepted'
						: 'collab:proposal_rejected',
				entity: { type: 'collaboration', id: collaboration._id },
				title:
					response === 'accepted'
						? collabTexts.proposalAcceptedTitle({ actorName })
						: collabTexts.proposalRejectedTitle({ actorName }),
				message:
					response === 'accepted'
						? collabTexts.proposalAcceptedBody({ actorName })
						: collabTexts.proposalRejectedBody({ actorName }),
				data: {
					actorName,
					actorAvatar: actor?.profileImage || undefined,
				},
			});

			// Commit the transaction
			await session.commitTransaction();

			res.status(200).json({
				success: true,
				message: `Collaboration ${response}`,
				collaboration,
			});
		} catch (txError) {
			// Rollback on error
			await session.abortTransaction();
			throw txError;
		} finally {
			session.endSession();
		}
	} catch (error) {
		logger.error(
			'[CollaborationController] Error responding to collaboration',
			error,
		);
		res.status(500).json({
			success: false,
			message:
				'Une erreur est survenue lors de la réponse à la collaboration',
		});
	}
};
export const addCollaborationNote = async (
	req: AuthenticatedRequest,
	res: Response,
): Promise<void> => {
	try {
		const { id } = req.params;
		const { content } = req.body;
		const userId = req.user?.id;

		if (!userId) {
			res.status(401).json({ success: false, message: 'Non autorisé' });
			return;
		}

		const collaboration = await Collaboration.findById(id);
		if (!collaboration) {
			res.status(404).json({
				success: false,
				message: 'Collaboration introuvable',
			});
			return;
		}

		const isOwner = collaboration.postOwnerId.toString() === userId;
		const isCollaborator =
			collaboration.collaboratorId.toString() === userId;

		if (!isOwner && !isCollaborator) {
			res.status(403).json({ success: false, message: 'Non autorisé' });
			return;
		}

		// Enforce that free-form activities (notes) are only allowed when active
		if (collaboration.status !== 'active') {
			res.status(400).json({
				success: false,
				message:
					'Les notes ne peuvent être ajoutées que lorsque la collaboration est active',
			});
			return;
		}

		collaboration.activities.push({
			type: 'note',
			message: content,
			createdBy: new Types.ObjectId(userId),
			createdAt: new Date(),
		});

		await collaboration.save();

		res.status(200).json({
			success: true,
			message: 'Note ajoutée avec succès',
			collaboration,
		});

		// Notify the other party about the note
		const noteRecipientId = isOwner
			? collaboration.collaboratorId
			: collaboration.postOwnerId;
		// Enrich with actor details for better UX in notifications
		const actor = await User.findById(userId).select(
			'firstName lastName email profileImage',
		);
		const actorName = actor
			? actor.firstName
				? `${actor.firstName} ${actor.lastName || ''}`.trim()
				: actor.firstName || actor.email
			: 'Someone';
		if (process.env.NODE_ENV !== 'test') {
			await notificationService.create({
				recipientId: noteRecipientId,
				actorId: userId,
				type: 'collab:note_added',
				entity: { type: 'collaboration', id: collaboration._id },
				title: `New note from ${actorName}`,
				message: content,
				data: {
					content,
					actorName,
					actorAvatar: actor?.profileImage || undefined,
				},
			});
		}
	} catch (error) {
		logger.error('[CollaborationController] Error adding note', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};
export const getCollaborationsByProperty = async (
	req: AuthenticatedRequest,
	res: Response,
): Promise<void> => {
	try {
		const { propertyId } = req.params;
		const userId = req.user?.id;

		if (!userId) {
			res.status(401).json({ success: false, message: 'Unauthorized' });
			return;
		}

		const collaborations = await Collaboration.find({
			postId: propertyId,
			postType: 'Property',
		})
			.populate('postOwnerId', 'firstName lastName profileImage')
			.populate('collaboratorId', 'firstName lastName profileImage')
			.sort({ createdAt: -1 });

		res.status(200).json({
			success: true,
			collaborations,
		});
	} catch (error) {
		logger.error(
			'[CollaborationController] Error getting property collaborations',
			error,
		);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};
export const cancelCollaboration = async (
	req: AuthenticatedRequest,
	res: Response,
): Promise<void> => {
	try {
		const { id } = req.params;
		const userId = req.user?.id;

		if (!userId) {
			res.status(401).json({ success: false, message: 'Unauthorized' });
			return;
		}

		// Find the collaboration
		const collaboration = await Collaboration.findById(id)
			.populate('postOwnerId', 'firstName lastName email profileImage')
			.populate(
				'collaboratorId',
				'firstName lastName email profileImage',
			);

		if (!collaboration) {
			res.status(404).json({
				success: false,
				message: 'Collaboration introuvable',
			});
			return;
		}

		// Check if user is involved in this collaboration
		const isOwner = collaboration.postOwnerId._id.toString() === userId;
		const isCollaborator =
			collaboration.collaboratorId._id.toString() === userId;

		if (!isOwner && !isCollaborator) {
			res.status(403).json({
				success: false,
				message: 'Non autorisé à annuler cette collaboration',
			});
			return;
		}

		// Check if collaboration can be cancelled (not already completed)
		if (collaboration.status === 'completed') {
			res.status(400).json({
				success: false,
				message: "Impossible d'annuler une collaboration terminée",
			});
			return;
		}

		// Update collaboration status to cancelled
		collaboration.status = 'cancelled';
		collaboration.updatedAt = new Date();

		await collaboration.save();

		res.status(200).json({
			success: true,
			message: 'Collaboration annulée avec succès',
			collaboration,
		});

		// Notify the other party about cancellation
		const cancelRecipientId = isOwner
			? collaboration.collaboratorId
			: collaboration.postOwnerId;
		const actor = await User.findById(userId).select(
			'firstName lastName email profileImage',
		);
		const actorName = actor
			? actor.firstName
				? `${actor.firstName} ${actor.lastName || ''}`.trim()
				: actor.firstName || actor.email
			: 'Someone';
		await notificationService.create({
			recipientId: cancelRecipientId,
			actorId: userId,
			type: 'collab:cancelled',
			entity: { type: 'collaboration', id: collaboration._id },
			title: collabTexts.cancelledTitle,
			message: collabTexts.cancelledBody,
			data: {
				actorName,
				actorAvatar: actor?.profileImage || undefined,
			},
		});
	} catch (error) {
		logger.error(
			'[CollaborationController] Error cancelling collaboration',
			error,
		);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};
export const updateProgressStatus = async (
	req: AuthenticatedRequest,
	res: Response,
): Promise<void> => {
	try {
		const { id } = req.params;
		const { targetStep, notes, validatedBy } = req.body;
		const userId = req.user?.id;

		if (!userId) {
			res.status(401).json({ success: false, message: 'Unauthorized' });
			return;
		}

		// Validate targetStep
		const validSteps = [
			'accord_collaboration',
			'premier_contact',
			'visite_programmee',
			'visite_realisee',
			'retour_client',
			'offre_en_cours',
			'negociation_en_cours',
			'compromis_signe',
			'signature_notaire',
			'affaire_conclue',
		];
		if (!validSteps.includes(targetStep)) {
			res.status(400).json({
				success: false,
				message: 'Invalid target step',
			});
			return;
		}

		// Validate validatedBy
		if (
			!validatedBy ||
			(validatedBy !== 'owner' && validatedBy !== 'collaborator')
		) {
			res.status(400).json({
				success: false,
				message:
					'Le champ validatedBy doit être "owner" ou "collaborator"',
			});
			return;
		}

		// Find the collaboration
		const collaboration = await Collaboration.findById(id)
			.populate('postOwnerId', 'firstName lastName email profileImage')
			.populate('collaboratorId', 'firstName lastName email profileImage')
			.populate({
				path: 'progressSteps.notes.createdBy',
				select: 'firstName lastName profileImage',
			});

		if (!collaboration) {
			res.status(404).json({
				success: false,
				message: 'Collaboration introuvable',
			});
			return;
		}

		// Check authorization
		const isOwner = collaboration.postOwnerId._id.toString() === userId;
		const isCollaborator =
			collaboration.collaboratorId._id.toString() === userId;

		if (!isOwner && !isCollaborator) {
			res.status(403).json({
				success: false,
				message: 'Non autorisé à mettre à jour cette collaboration',
			});
			return;
		}

		// Only allow progress updates when collaboration is active or accepted
		if (
			collaboration.status !== 'active' &&
			collaboration.status !== 'accepted'
		) {
			res.status(400).json({
				success: false,
				message:
					'Mise à jour possible uniquement pour les collaborations actives ou acceptées',
			});
			return;
		}

		// Update progress status using the model method
		await collaboration.updateProgressStatus(
			targetStep,
			notes || undefined,
			new Types.ObjectId(userId),
			validatedBy,
		);

		res.status(200).json({
			success: true,
			message: 'Statut de progression mis à jour avec succès',
			collaboration,
		});

		// Notify the other party about progress update
		const progressRecipientId = isOwner
			? collaboration.collaboratorId
			: collaboration.postOwnerId;
		const actor = await User.findById(userId).select(
			'firstName lastName email profileImage',
		);
		const actorName = actor
			? actor.firstName
				? `${actor.firstName} ${actor.lastName || ''}`.trim()
				: actor.firstName || actor.email
			: 'Someone';

		const stepTitles: Record<string, string> = {
			accord_collaboration: 'Accord de collaboration',
			premier_contact: 'Premier contact client',
			visite_programmee: 'Visite programmée',
			visite_realisee: 'Visite réalisée',
			retour_client: 'Retour client',
			offre_en_cours: 'Offre en cours',
			negociation_en_cours: 'Négociation en cours',
			compromis_signe: 'Compromis signé',
			signature_notaire: 'Signature notaire',
			affaire_conclue: 'Affaire conclue',
		};

		await notificationService.create({
			recipientId: progressRecipientId,
			actorId: userId,
			type: 'collab:progress_updated',
			entity: { type: 'collaboration', id: collaboration._id },
			title: collabTexts.progressUpdatedTitle,
			message: collabTexts.progressUpdatedBody({
				step: stepTitles[targetStep] || targetStep,
			}),
			data: {
				targetStep,
				notes: notes || '',
				actorName,
				actorAvatar: actor?.profileImage || undefined,
				validatedBy,
			},
		});
	} catch (error) {
		logger.error(
			'[CollaborationController] Error updating progress status',
			error,
		);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};
export const signCollaboration = async (
	req: AuthenticatedRequest,
	res: Response,
): Promise<void> => {
	try {
		const { id } = req.params;
		const userId = req.user?.id;

		if (!userId) {
			res.status(401).json({ success: false, message: 'Unauthorized' });
			return;
		}

		// Find the collaboration
		const collaboration = await Collaboration.findById(id)
			.populate('postOwnerId', 'firstName lastName email profileImage')
			.populate(
				'collaboratorId',
				'firstName lastName email profileImage',
			);

		if (!collaboration) {
			res.status(404).json({
				success: false,
				message: 'Collaboration introuvable',
			});
			return;
		}

		// Check authorization and sign using the model method
		await collaboration.signContract(new Types.ObjectId(userId));

		res.status(200).json({
			success: true,
			message: 'Contrat signé avec succès',
			collaboration,
		});

		// Notify the other party about signing
		const isOwner = collaboration.postOwnerId._id
			? collaboration.postOwnerId._id.toString() === userId
			: collaboration.postOwnerId.toString() === userId;
		const signRecipientId = isOwner
			? collaboration.collaboratorId
			: collaboration.postOwnerId;
		const actor = await User.findById(userId).select(
			'firstName lastName email profileImage',
		);
		const actorName = actor
			? actor.firstName
				? `${actor.firstName} ${actor.lastName || ''}`.trim()
				: actor.firstName || actor.email
			: 'Someone';
		await notificationService.create({
			recipientId: signRecipientId,
			actorId: userId,
			type: 'contract:signed',
			entity: { type: 'collaboration', id: collaboration._id },
			title: 'Contrat signé',
			message: 'Le contrat a été signé.',
			data: {
				actorName,
				actorAvatar: actor?.profileImage || undefined,
			},
		});

		// If both have signed and it became active, notify activation
		if (collaboration.ownerSigned && collaboration.collaboratorSigned) {
			await notificationService.create({
				recipientId: signRecipientId, // both sides will be notified separately on their own action
				actorId: userId,
				type: 'collab:activated',
				entity: { type: 'collaboration', id: collaboration._id },
				title: 'Collaboration activée',
				message: 'La collaboration est maintenant active.',
				data: {
					actorName,
					actorAvatar: actor?.profileImage || undefined,
				},
			});
		}
	} catch (error) {
		logger.error(
			'[CollaborationController] Error signing collaboration',
			error,
		);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur',
		});
	}
};
export const completeCollaboration = async (
	req: AuthenticatedRequest,
	res: Response,
): Promise<void> => {
	try {
		const { id } = req.params;
		const { completionReason } = req.body;
		const userId = req.user?.id;

		if (!userId) {
			res.status(401).json({ success: false, message: 'Unauthorized' });
			return;
		}

		// Validate completion reason
		const validReasons = [
			'vente_conclue_collaboration',
			'vente_conclue_seul',
			'bien_retire',
			'mandat_expire',
			'client_desiste',
			'vendu_tiers',
			'sans_suite',
		];

		if (!completionReason || !validReasons.includes(completionReason)) {
			res.status(400).json({
				success: false,
				message: 'Raison de complétion invalide ou manquante',
			});
			return;
		}

		const collaboration = await Collaboration.findById(id)
			.populate('postOwnerId', 'firstName lastName email profileImage')
			.populate(
				'collaboratorId',
				'firstName lastName email profileImage',
			);

		if (!collaboration) {
			res.status(404).json({
				success: false,
				message: 'Collaboration introuvable',
			});
			return;
		}

		// Check authorization
		const isOwner = collaboration.postOwnerId._id.toString() === userId;
		const isCollaborator =
			collaboration.collaboratorId._id.toString() === userId;

		if (!isOwner && !isCollaborator) {
			res.status(403).json({
				success: false,
				message: 'Non autorisé à terminer cette collaboration',
			});
			return;
		}

		// Can only complete if collaboration is active
		if (collaboration.status !== 'active') {
			res.status(400).json({
				success: false,
				message:
					'Seules les collaborations actives peuvent être terminées',
			});
			return;
		}

		// Check if "Affaire conclue" is validated by BOTH users
		const affaireConclueStep = collaboration.progressSteps.find(
			(step) => step.id === 'affaire_conclue',
		);

		if (
			!affaireConclueStep ||
			!affaireConclueStep.ownerValidated ||
			!affaireConclueStep.collaboratorValidated
		) {
			res.status(400).json({
				success: false,
				message:
					'Impossible de terminer : "Affaire conclue" doit être validée par les deux parties',
			});
			return;
		}

		// Update status to completed
		collaboration.status = 'completed';
		collaboration.currentStep = 'completed';
		collaboration.completedAt = new Date();
		collaboration.completionReason = completionReason;
		collaboration.completedBy = new Types.ObjectId(userId);
		collaboration.completedByRole = isOwner ? 'owner' : 'collaborator';

		// Mark all progress steps as completed
		collaboration.progressSteps.forEach((step) => {
			if (!step.completed) {
				step.completed = true;
				step.ownerValidated = true;
				step.collaboratorValidated = true;
			}
		});

		// Add activity log
		collaboration.activities.push({
			type: 'status_update',
			message: `Collaboration terminée par ${isOwner ? 'le propriétaire' : 'le collaborateur'}`,
			createdBy: new Types.ObjectId(userId),
			createdAt: new Date(),
		});

		// Save the collaboration to persist changes
		await collaboration.save();

		// Auto-update post status if sale was concluded through collaboration
		if (completionReason === 'vente_conclue_collaboration') {
			logger.info(
				'[CollaborationController] Updating post status after successful collaboration',
				{
					postType: collaboration.postType,
					postId: collaboration.postId,
				},
			);
			if (collaboration.postType === 'Property') {
				const property = await Property.findById(collaboration.postId);
				if (property) {
					property.status =
						property.transactionType === 'Location'
							? 'rented'
							: 'sold';
					await property.save();
					logger.info(
						'[CollaborationController] Property status updated',
						{
							propertyId: property._id,
							newStatus: property.status,
						},
					);
				}
			} else if (collaboration.postType === 'SearchAd') {
				await SearchAd.findByIdAndUpdate(collaboration.postId, {
					status: 'fulfilled',
				});
				logger.info(
					'[CollaborationController] SearchAd status updated to fulfilled',
					{ searchAdId: collaboration.postId },
				);
			}
		}

		res.status(200).json({
			success: true,
			message: 'Collaboration terminée avec succès',
			collaboration,
		}); // Notify the other party about completion
		const completeRecipientId = isOwner
			? collaboration.collaboratorId
			: collaboration.postOwnerId;
		const actor = await User.findById(userId).select(
			'firstName lastName email profileImage',
		);
		const actorName = actor
			? actor.firstName
				? `${actor.firstName} ${actor.lastName || ''}`.trim()
				: actor.firstName || actor.email
			: 'Someone';
		await notificationService.create({
			recipientId: completeRecipientId,
			actorId: userId,
			type: 'collab:completed',
			entity: { type: 'collaboration', id: collaboration._id },
			title: collabTexts.completedTitle,
			message: collabTexts.completedBody,
			data: {
				actorName,
				actorAvatar: actor?.profileImage || undefined,
			},
		});
	} catch (error) {
		logger.error(
			'[CollaborationController] Error completing collaboration',
			error,
		);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};
export const getCollaborationsBySearchAd = async (
	req: AuthenticatedRequest,
	res: Response,
): Promise<void> => {
	try {
		const { searchAdId } = req.params;
		const userId = req.user?.id;

		if (!userId) {
			res.status(401).json({ success: false, message: 'Unauthorized' });
			return;
		}

		const collaborations = await Collaboration.find({
			postId: searchAdId,
			postType: 'SearchAd',
		})
			.populate('postOwnerId', 'firstName lastName profileImage')
			.populate('collaboratorId', 'firstName lastName profileImage')
			.sort({ createdAt: -1 });

		res.status(200).json({
			success: true,
			collaborations,
		});
	} catch (error) {
		logger.error(
			'[CollaborationController] Error getting search ad collaborations',
			error,
		);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

/**
 * Admin: Update any collaboration (admin can update commission, notes, status)
 */
export const adminUpdateCollaboration = async (
	req: AuthenticatedRequest,
	res: Response,
): Promise<void> => {
	try {
		const { id } = req.params;
		const updates = req.body;
		const userId = req.user?.id;
		const userType = req.user?.userType;

		logger.info(
			'[CollaborationController] adminUpdateCollaboration called',
			{ actorId: userId || null, id, updates },
		);

		if (!userId || userType !== 'admin') {
			res.status(403).json({
				success: false,
				message: 'Accès administrateur requis',
			});
			return;
		}

		const collaboration = await Collaboration.findById(id);
		if (!collaboration) {
			res.status(404).json({
				success: false,
				message: 'Collaboration introuvable',
			});
			return;
		}

		// Admin can update these fields
		const allowedFields = [
			'proposedCommission',
			'commission',
			'status',
			'currentStep',
		];

		const updateData: Record<string, unknown> = {};
		for (const field of allowedFields) {
			if (updates[field] !== undefined) {
				updateData[field] = updates[field];
			}
		}

		// Handle adding admin note
		if (updates.adminNote) {
			collaboration.activities.push({
				type: 'note',
				message: `[Admin] ${updates.adminNote}`,
				createdBy: new Types.ObjectId(userId),
				createdAt: new Date(),
			});
		}

		// Apply updates
		Object.assign(collaboration, updateData);
		collaboration.updatedAt = new Date();

		await collaboration.save();

		logger.info(
			'[CollaborationController] adminUpdateCollaboration success',
			{ id },
		);
		res.status(200).json({
			success: true,
			message: 'Collaboration mise à jour avec succès',
			collaboration,
		});
	} catch (error) {
		logger.error(
			'[CollaborationController] Error admin updating collaboration',
			error,
		);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

/**
 * Admin: Delete a collaboration permanently
 */
export const adminDeleteCollaboration = async (
	req: AuthenticatedRequest,
	res: Response,
): Promise<void> => {
	try {
		const { id } = req.params;
		const userId = req.user?.id;
		const userType = req.user?.userType;

		logger.info(
			'[CollaborationController] adminDeleteCollaboration called',
			{ actorId: userId || null, id },
		);

		if (!userId || userType !== 'admin') {
			res.status(403).json({
				success: false,
				message: 'Accès administrateur requis',
			});
			return;
		}

		const collaboration = await Collaboration.findById(id);
		if (!collaboration) {
			res.status(404).json({
				success: false,
				message: 'Collaboration introuvable',
			});
			return;
		}

		// Delete associated messages/chat if needed (optional - depends on business logic)
		// For now, just delete the collaboration
		await Collaboration.findByIdAndDelete(id);

		logger.info(
			'[CollaborationController] adminDeleteCollaboration success',
			{ id },
		);
		res.status(200).json({
			success: true,
			message: 'Collaboration supprimée avec succès',
		});
	} catch (error) {
		logger.error(
			'[CollaborationController] Error admin deleting collaboration',
			error,
		);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};
