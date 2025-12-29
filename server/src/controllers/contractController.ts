import { Response } from 'express';
import { Collaboration } from '../models/Collaboration';
import { notificationService } from '../services/notificationService';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { AuthRequest } from '../types/auth';

interface PopulatedUser {
	_id: Types.ObjectId;
	firstName: string;
	lastName: string;
	email: string;
	profileImage?: string | null;
}

export const signContract = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const { id } = req.params;
		const userId = req.user?.id;

		if (!userId) {
			res.status(401).json({
				success: false,
				message: 'Authentication required',
			});
			return;
		}

		// Middleware has already verified authentication and collaboration access
		const collaboration =
			req.resource ||
			(await Collaboration.findById(id)
				.populate(
					'postOwnerId',
					'firstName lastName email profileImage',
				)
				.populate(
					'collaboratorId',
					'firstName lastName email profileImage',
				));

		if (!collaboration) {
			res.status(404).json({
				success: false,
				message: 'Collaboration introuvable',
			});
			return;
		}

		if (collaboration.status !== 'accepted') {
			res.status(400).json({
				success: false,
				message: 'La collaboration doit être acceptée avant de signer',
			});
			return;
		}

		// Determine if user is owner or collaborator
		const postOwnerId =
			typeof collaboration.postOwnerId === 'object' &&
			'_id' in collaboration.postOwnerId
				? collaboration.postOwnerId._id.toString()
				: collaboration.postOwnerId?.toString();
		const collaboratorId =
			typeof collaboration.collaboratorId === 'object' &&
			'_id' in collaboration.collaboratorId
				? collaboration.collaboratorId._id.toString()
				: collaboration.collaboratorId?.toString();

		const isOwner = postOwnerId === userId;
		const isCollaborator = collaboratorId === userId;

		// Sign the contract
		const signedAt = new Date();
		if (isOwner) {
			collaboration.ownerSigned = true;
			collaboration.ownerSignedAt = signedAt;
		}
		if (isCollaborator) {
			collaboration.collaboratorSigned = true;
			collaboration.collaboratorSignedAt = signedAt;
		}

		// Add activity log
		collaboration.activities.push({
			type: 'signing',
			message: `Contrat signé par ${isOwner ? 'le propriétaire' : 'le collaborateur'}`,
			createdBy: new Types.ObjectId(userId),
			createdAt: signedAt,
		});

		// If both parties have signed, activate the collaboration
		if (collaboration.ownerSigned && collaboration.collaboratorSigned) {
			collaboration.status = 'active';
			collaboration.currentStep = 'active';

			collaboration.activities.push({
				type: 'status_update',
				message:
					'Collaboration activée - les deux parties ont signé le contrat',
				createdBy: new Types.ObjectId(userId),
				createdAt: signedAt,
			});
		}

		await collaboration.save();

		// Return the contract data structure
		const contractData = {
			id: collaboration._id,
			contractText: collaboration.contractText,
			additionalTerms: collaboration.additionalTerms,
			contractModified: collaboration.contractModified,
			ownerSigned: collaboration.ownerSigned,
			ownerSignedAt: collaboration.ownerSignedAt,
			collaboratorSigned: collaboration.collaboratorSigned,
			collaboratorSignedAt: collaboration.collaboratorSignedAt,
			status: collaboration.status,
			currentStep: collaboration.currentStep,
			propertyOwner: {
				id: collaboration.postOwnerId._id,
				name: `${(collaboration.postOwnerId as unknown as PopulatedUser).firstName} ${(collaboration.postOwnerId as unknown as PopulatedUser).lastName}`,
				email: (collaboration.postOwnerId as unknown as PopulatedUser)
					.email,
				profileImage:
					(collaboration.postOwnerId as unknown as PopulatedUser)
						.profileImage || null,
			},
			collaborator: {
				id: collaboration.collaboratorId._id,
				name: `${(collaboration.collaboratorId as unknown as PopulatedUser).firstName} ${(collaboration.collaboratorId as unknown as PopulatedUser).lastName}`,
				email: (
					collaboration.collaboratorId as unknown as PopulatedUser
				).email,
				profileImage:
					(collaboration.collaboratorId as unknown as PopulatedUser)
						.profileImage || null,
			},
			canEdit: isOwner || isCollaborator,
			canSign:
				(isOwner && !collaboration.ownerSigned) ||
				(isCollaborator && !collaboration.collaboratorSigned),
			requiresBothSignatures:
				collaboration.ownerSigned !== collaboration.collaboratorSigned,
		};

		res.status(200).json({
			success: true,
			message: 'Contrat signé avec succès',
			contract: contractData,
		});

		// Notify the other party about signing
		const signRecipientId = isOwner
			? collaboration.collaboratorId._id
			: collaboration.postOwnerId._id;
		const signer = await User.findById(userId).select(
			'firstName lastName email profileImage',
		);
		const signerName = signer
			? signer.firstName
				? `${signer.firstName} ${signer.lastName}`
				: signer.firstName || signer.email
			: 'Someone';
		await notificationService.create({
			recipientId: signRecipientId,
			actorId: userId,
			type: 'contract:signed',
			entity: { type: 'collaboration', id: collaboration._id },
			title: 'Contrat signé',
			message: `${signerName} a signé le contrat.`,
			data: {
				actorName: signerName,
				actorAvatar: signer?.profileImage || undefined,
			},
		});

		// If both have signed and it became active, notify activation
		if (collaboration.ownerSigned && collaboration.collaboratorSigned) {
			const otherPartyId = isOwner
				? collaboration.postOwnerId._id
				: collaboration.collaboratorId._id;
			await notificationService.create({
				recipientId: otherPartyId,
				actorId: userId,
				type: 'collab:activated',
				entity: { type: 'collaboration', id: collaboration._id },
				title: 'Collaboration activée',
				message: `La collaboration est maintenant active. Activée par ${signerName}.`,
				data: {
					actorName: signerName,
					actorAvatar: signer?.profileImage || undefined,
				},
			});
		}
	} catch (error) {
		logger.error('[ContractController] Error signing contract', error);
		res.status(500).json({
			success: false,
			message: 'Une erreur est survenue lors de la signature du contrat',
		});
	}
};

export const updateContract = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const { id } = req.params;
		const { contractText, additionalTerms } = req.body;
		const userId = req.user?.id;

		if (!userId) {
			res.status(401).json({ success: false, message: 'Non autorisé' });
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

		if (collaboration.status !== 'accepted') {
			res.status(400).json({
				success: false,
				message:
					'Le contrat ne peut être modifié que pour les collaborations acceptées',
			});
			return;
		}

		// Check if user is part of this collaboration
		const isOwner = collaboration.postOwnerId._id.toString() === userId;
		const isCollaborator =
			collaboration.collaboratorId._id.toString() === userId;

		if (!isOwner && !isCollaborator) {
			res.status(403).json({
				success: false,
				message: "Vous n'êtes pas autorisé à modifier ce contrat",
			});
			return;
		}

		// Check if content actually changed
		const contractChanged =
			collaboration.contractText !== contractText ||
			collaboration.additionalTerms !== additionalTerms;

		if (contractChanged) {
			// Reset ALL signatures when contract is modified by ANYONE
			const wasOwnerSigned = collaboration.ownerSigned;
			const wasCollaboratorSigned = collaboration.collaboratorSigned;

			collaboration.ownerSigned = false;
			collaboration.collaboratorSigned = false;
			collaboration.ownerSignedAt = undefined;
			collaboration.collaboratorSignedAt = undefined;
			collaboration.contractModified = true;
			collaboration.contractLastModifiedBy = new Types.ObjectId(userId);
			collaboration.contractLastModifiedAt = new Date();

			// Add activity log for contract modification
			collaboration.activities.push({
				type: 'note',
				message: `Contrat modifié par ${isOwner ? 'le propriétaire' : 'le collaborateur'}${wasOwnerSigned || wasCollaboratorSigned ? ' - signatures réinitialisées, les deux parties doivent signer à nouveau' : ''}`,
				createdBy: new Types.ObjectId(userId),
				createdAt: new Date(),
			});
		}

		collaboration.contractText = contractText;
		collaboration.additionalTerms = additionalTerms;

		await collaboration.save();

		// Return the contract data structure
		const contractData = {
			id: collaboration._id,
			contractText: collaboration.contractText,
			additionalTerms: collaboration.additionalTerms,
			contractModified: collaboration.contractModified,
			ownerSigned: collaboration.ownerSigned,
			ownerSignedAt: collaboration.ownerSignedAt,
			collaboratorSigned: collaboration.collaboratorSigned,
			collaboratorSignedAt: collaboration.collaboratorSignedAt,
			status: collaboration.status,
			currentStep: collaboration.currentStep,
			propertyOwner: {
				id: collaboration.postOwnerId._id,
				name: `${(collaboration.postOwnerId as unknown as PopulatedUser).firstName} ${(collaboration.postOwnerId as unknown as PopulatedUser).lastName}`,
				email: (collaboration.postOwnerId as unknown as PopulatedUser)
					.email,
				profileImage:
					(collaboration.postOwnerId as unknown as PopulatedUser)
						.profileImage || null,
			},
			collaborator: {
				id: collaboration.collaboratorId._id,
				name: `${(collaboration.collaboratorId as unknown as PopulatedUser).firstName} ${(collaboration.collaboratorId as unknown as PopulatedUser).lastName}`,
				email: (
					collaboration.collaboratorId as unknown as PopulatedUser
				).email,
				profileImage:
					(collaboration.collaboratorId as unknown as PopulatedUser)
						.profileImage || null,
			},
			canEdit: isOwner || isCollaborator,
			canSign:
				(isOwner && !collaboration.ownerSigned) ||
				(isCollaborator && !collaboration.collaboratorSigned),
			requiresBothSignatures:
				collaboration.ownerSigned !== collaboration.collaboratorSigned,
		};

		res.status(200).json({
			success: true,
			message: contractChanged
				? 'Contrat mis à jour - les deux parties doivent signer à nouveau'
				: 'Contrat mis à jour avec succès',
			contract: contractData,
			requiresResigning: contractChanged,
		});

		// Notify the other party on contract update when changed
		if (contractChanged) {
			const updateRecipientId = isOwner
				? collaboration.collaboratorId._id
				: collaboration.postOwnerId._id;
			const actor = await User.findById(userId).select(
				'firstName lastName email profileImage',
			);
			const actorName = actor
				? actor.firstName
					? `${actor.firstName} ${actor.lastName || ''}`.trim()
					: actor.firstName || actor.email
				: 'Someone';
			await notificationService.create({
				recipientId: updateRecipientId,
				actorId: userId,
				type: 'contract:updated',
				entity: { type: 'collaboration', id: collaboration._id },
				title: 'Contrat mis à jour',
				message:
					'Le contenu du contrat a été modifié. Signatures réinitialisées ; les deux parties doivent signer à nouveau.',
				data: {
					actorName,
					actorAvatar: actor?.profileImage || undefined,
				},
			});
		}
	} catch (error) {
		logger.error('[ContractController] Error updating contract', error);
		res.status(500).json({
			success: false,
			message:
				'Une erreur est survenue lors de la mise à jour du contrat',
		});
	}
};

export const getContract = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const { id } = req.params;
		const userId = req.user?.id;

		if (!userId) {
			res.status(401).json({
				success: false,
				message: 'Authentication required',
			});
			return;
		}

		const collaboration = await Collaboration.findById(id)
			.populate(
				'postOwnerId',
				'firstName lastName email profileImage userType phone professionalInfo',
			)
			.populate(
				'collaboratorId',
				'firstName lastName email profileImage userType phone professionalInfo',
			);

		if (!collaboration) {
			res.status(404).json({
				success: false,
				message: 'Collaboration introuvable',
			});
			return;
		}

		// Check if user is part of this collaboration
		const isOwner = collaboration.postOwnerId._id.toString() === userId;
		const isCollaborator =
			collaboration.collaboratorId._id.toString() === userId;

		if (!isOwner && !isCollaborator) {
			res.status(403).json({
				success: false,
				message: "Vous n'êtes pas autorisé à consulter ce contrat",
			});
			return;
		}

		// Auto-generate default contract template if empty
		if (
			!collaboration.contractText ||
			collaboration.contractText.trim() === ''
		) {
			const owner =
				collaboration.postOwnerId as unknown as PopulatedUser & {
					userType: string;
					phone?: string;
					professionalInfo?: {
						tCard?: string;
						sirenNumber?: string;
						rsacNumber?: string;
						city?: string;
						postalCode?: string;
					};
				};
			const collaborator =
				collaboration.collaboratorId as unknown as PopulatedUser & {
					userType: string;
					phone?: string;
					professionalInfo?: {
						tCard?: string;
						sirenNumber?: string;
						rsacNumber?: string;
						city?: string;
						postalCode?: string;
					};
				};

			// Helper function to get professional number with label
			const getProfessionalNumber = (professionalInfo?: {
				tCard?: string;
				sirenNumber?: string;
				rsacNumber?: string;
			}): string => {
				if (professionalInfo?.tCard) {
					return `Carte T : ${professionalInfo.tCard}`;
				}
				if (professionalInfo?.sirenNumber) {
					return `SIREN : ${professionalInfo.sirenNumber}`;
				}
				if (professionalInfo?.rsacNumber) {
					return `RSAC : ${professionalInfo.rsacNumber}`;
				}
				return '........................................................................';
			};

			const ownerName = `${owner.firstName} ${owner.lastName}`;
			const collaboratorName = `${collaborator.firstName} ${collaborator.lastName}`;
			const ownerAddress =
				owner.professionalInfo?.city &&
				owner.professionalInfo?.postalCode
					? `${owner.professionalInfo.city} (${owner.professionalInfo.postalCode})`
					: 'Adresse non renseignée';
			const collaboratorAddress =
				collaborator.professionalInfo?.city &&
				collaborator.professionalInfo?.postalCode
					? `${collaborator.professionalInfo.city} (${collaborator.professionalInfo.postalCode})`
					: 'Adresse non renseignée';

			let contractTemplate = '';

			// Case 1: Property Owner is "apporteur" (User Type: apporteur)
			// Note: The prompt says "if the property owner is 'D'APPORTEUR D'AFFAIRES'".
			// Assuming this maps to userType === 'apporteur'.
			if (owner.userType === 'apporteur') {
				contractTemplate = `CONTRAT D'APPORTEUR D'AFFAIRES
(Mise en relation via la plateforme MonHubImmo)

Entre les soussignés :

Le Professionnel de l’immobilier
Nom / Dénomination : ${collaboratorName}
Adresse : ${collaboratorAddress}
Téléphone : ${collaborator.phone || '..............................................................................'}
Email : ${collaborator.email}
Statut : ${collaborator.userType === 'agent' ? 'Agent Immobilier' : 'Professionnel'}
(ci-après désigné « Le Professionnel »)

Et

L’Apporteur d’affaires
Nom : ${owner.lastName}
Prénom : ${owner.firstName}
Adresse : ${ownerAddress}
Téléphone : ${owner.phone || '..................................................................................'}
Email : ${owner.email}
(ci-après désigné « L’Apporteur »)

Les deux parties conviennent ce qui suit :

1. Objet du contrat
L’Apporteur met en relation, via la plateforme MonHubImmo, un prospect (vendeur, acquéreur, bailleur, locataire ou propriétaire d’un bien) avec le Professionnel. La mission de l’Apporteur se limite strictement à la mise en relation. Aucun conseil, négociation, estimation, visite ou action commerciale ne peut être réalisée par l’Apporteur.
La plateforme MonHubImmo ne perçoit ni ne manipule aucun fonds.

2. Fonctionnement de la mise en relation
La mise en relation est effectuée exclusivement via la plateforme MonHubImmo. Le Professionnel reçoit les coordonnées du prospect et reste libre d’accepter ou non la prise en charge du contact. L’Apporteur s’engage à informer le prospect qu’il sera contacté par le Professionnel.
La responsabilité de MonHubImmo se limite au rôle de plateforme technique et ne participe aucunement à l’accord entre les deux parties.

3. Rôle respectif des parties
L’Apporteur :
• Se limite à transmettre un contact.
• Ne perçoit aucun fonds.
• Ne représente pas le Professionnel.
• Ne peut en aucun cas se présenter comme agent immobilier.

Le Professionnel :
• Traite ou non le prospect présenté.
• Informe l’Apporteur de l’issue de la relation si une transaction aboutit.
• Rédige et signe, le cas échéant, le document officiel d’apporteur d’affaires prévu par son réseau ou agence, ce contrat n’étant qu’un accord préalable.

Chaque partie conserve la preuve de la mise en relation (date + capture d’écran de la fiche transmise via MonHubImmo).

4. Rémunération de l’Apporteur
La rémunération est déterminée directement entre l’Apporteur et le Professionnel selon les conditions suivantes :
Montant convenu : ${collaboration.proposedCommission ? collaboration.proposedCommission + '% de la commission agence' : '......................................................................................'}

La rémunération est due uniquement :
- si la mise en relation a été réalisée via MonHubImmo,
- si le prospect aboutit à une transaction signée par acte authentique,
- et si un document officiel du réseau / agence du Professionnel vient confirmer l’accord.

MonHubImmo n’est jamais partie à la rémunération et ne perçoit aucune commission.
Chaque partie reste responsable de son propre régime fiscal (ex. micro‑BNC ou activité commerciale selon les cas).

5. Indépendance des parties
L’Apporteur et le Professionnel agissent de manière totalement indépendante. Le présent contrat ne crée ni contrat de travail, ni mandat, ni partenariat exclusif, ni obligation de résultat.

6. Confidentialité
Les informations échangées entre les deux parties sont confidentielles et destinées uniquement à la mise en relation.
Aucune donnée ne peut être utilisée à d’autres fins.

7. Protection des données
Chaque partie s’engage à respecter la réglementation en vigueur (RGPD) concernant les données personnelles du prospect.

8. Durée et résiliation
Le présent contrat prend effet à la date de signature et reste valable jusqu’à résiliation par l’une ou l’autre des parties, sans préavis particulier.
Une collaboration peut être interrompue librement en cas de désaccord.

9. Litiges
En cas de différend, les parties s’engagent à rechercher une solution amiable avant toute procédure.

Fait à ......................................................, le ${new Date().toLocaleDateString('fr-FR')}

Le Professionnel
Signature précédée de la mention « Lu et approuvé »

L’Apporteur
Signature précédée de la mention « Lu et approuvé »`;
			} else {
				// Case 2: Property Owner is "agent" (User Type: agent)
				// Also covers default case if userType is missing/other
				contractTemplate = `CONTRAT DE COLLABORATION ENTRE PROFESSIONNELS DE L’IMMOBILIER
(Mise en relation via la plateforme MonHubImmo)

Conditions préalables obligatoires
Le contrat est valide à condition que :
• Les cases vierges soient remplies :
  - Identité complète du Délégant / Délégué
  - Numéro d'identification professionnelle (Carte T, SIREN ou RSAC)
  - Modalités de rémunération
  - Pouvoirs confiés (visite / publicité / communication)
• Le partage d’honoraires soit exprimé clairement Exemples :
  - « 50/50 sur les honoraires encaissés HT du Délégant »
  - « Montant fixe de 3 000 € HT »
• Les signatures originales soient apposées
  - Signature électronique certifiée (DocuSign, Yousign…) recommandée
  - Ou signature manuscrite scannée
• Le contrat soit cohérent avec le mandat initial
  - Le Délégant doit avoir le droit de déléguer / collaborer
  - Le mandat ne doit pas interdire la délégation

Entre les soussignés :

Le Professionnel Délégant
Nom / Dénomination : ${ownerName}
Adresse : ${ownerAddress}
Téléphone : ${owner.phone || '.............................................................................................................'}
Email : ${owner.email}
N° d'identification professionnelle : ${getProfessionalNumber(owner.professionalInfo)}
(ci-après « Le Délégant »)

Et

Le Professionnel Délégué
Nom / Dénomination : ${collaboratorName}
Adresse : ${collaboratorAddress}
Téléphone : ${collaborator.phone || '.............................................................................................................'}
Email : ${collaborator.email}
N° d'identification professionnelle : ${getProfessionalNumber(collaborator.professionalInfo)}
(ci-après « Le Délégué »)

Les deux parties conviennent ce qui suit :

1. Objet de la collaboration
La présente collaboration vise à faciliter, via la plateforme MonHubImmo, le partage d’un mandat ou l’échange d’un client (acquéreur, vendeur, investisseur ou locataire) entre deux professionnels de l’immobilier.
La plateforme MonHubImmo est uniquement un outil de mise en relation : elle n’intervient pas dans l’accord entre les parties, ne négocie aucune condition et ne perçoit aucune commission.

2. Nature du partage
La collaboration peut porter sur :
- une délégation de mandat (mandat simple ou exclusif),
- un partage d’acquéreur ou de projet,
- la co‑vente ou vente collaborative entre professionnels.
Chaque partie reste entièrement responsable des documents obligatoires relevant de son réseau, franchise ou agence.

3. Transmission des informations
Le Délégant transmet au Délégué :
- les informations essentielles sur le bien ou le client,
- les éléments nécessaires à la bonne exécution de la mission,
- les pouvoirs autorisés (visites, publicité, communication, etc.), dans les limites prévues au mandat initial.
Le Délégué s’engage à :
- utiliser les informations reçues uniquement dans le cadre de la collaboration,
- respecter les obligations légales et déontologiques liées à son activité,
- représenter le bien ou le client conformément aux consignes du Délégant.

4. Rémunération et partage d’honoraires
La rémunération du Délégué est définie ainsi :
Modalités convenues entre les parties :
${collaboration.proposedCommission ? collaboration.proposedCommission + '% de la commission' : '..............................................................................................................................'}
(exemple : 50/50 – 60/40 – montant fixe – % des honoraires du Délégant)

Les honoraires ne sont dus que si une transaction est réalisée et signée par acte authentique.
Le versement des commissions s’effectue directement entre le Délégant et le Délégué, selon les règles de leurs cartes professionnelles respectives.
MonHubImmo ne manipule ni ne perçoit aucun fonds lié à la transaction.

5. Indépendance et responsabilités
Les deux professionnels agissent en totale indépendance.
Le présent contrat :
- ne constitue pas un mandat commun,
- ne crée aucun lien de subordination,
- ne transforme pas l’un des professionnels en représentant de l’autre.
Chaque partie reste responsable des obligations légales propres à son activité.

6. Durée de la collaboration
La collaboration prend effet à la date de signature. Elle prend automatiquement fin :
- à la fin du mandat initial,
- à la réalisation de la transaction,
- ou sur simple notification écrite d’une des parties.
Préavis recommandé : 7 jours.

7. Confidentialité
Les informations échangées sont strictement confidentielles. Elles ne peuvent être utilisées en dehors de la mission confiée.

8. RGPD – Données personnelles
Chaque partie garantit le respect de la réglementation en vigueur concernant les données personnelles.
Les données reçues via MonHubImmo ne peuvent être détournées à d’autres fins.

9. Litiges
En cas de désaccord, les deux parties s’engagent à privilégier une solution amiable avant toute procédure.

Fait à .............................................., le ${new Date().toLocaleDateString('fr-FR')}

Le Délégant
Signature précédée de la mention « Lu et approuvé »

Le Délégué
Signature précédée de la mention « Lu et approuvé »`;
			}

			collaboration.contractText = contractTemplate;
			collaboration.contractModified = false;
			await collaboration.save();
		}

		// Extract contract-specific data
		const contractData = {
			id: collaboration._id,
			contractText: collaboration.contractText,
			additionalTerms: collaboration.additionalTerms,
			contractModified: collaboration.contractModified,
			ownerSigned: collaboration.ownerSigned,
			ownerSignedAt: collaboration.ownerSignedAt,
			collaboratorSigned: collaboration.collaboratorSigned,
			collaboratorSignedAt: collaboration.collaboratorSignedAt,
			status: collaboration.status,
			currentStep: collaboration.currentStep,
			propertyOwner: {
				id: collaboration.postOwnerId._id,
				name: `${(collaboration.postOwnerId as unknown as PopulatedUser).firstName} ${(collaboration.postOwnerId as unknown as PopulatedUser).lastName}`,
				email: (collaboration.postOwnerId as unknown as PopulatedUser)
					.email,
				profileImage:
					(collaboration.postOwnerId as unknown as PopulatedUser)
						.profileImage || null,
			},
			collaborator: {
				id: collaboration.collaboratorId._id,
				name: `${(collaboration.collaboratorId as unknown as PopulatedUser).firstName} ${(collaboration.collaboratorId as unknown as PopulatedUser).lastName}`,
				email: (
					collaboration.collaboratorId as unknown as PopulatedUser
				).email,
				profileImage:
					(collaboration.collaboratorId as unknown as PopulatedUser)
						.profileImage || null,
			},
			canEdit: isOwner || isCollaborator,
			canSign:
				(isOwner && !collaboration.ownerSigned) ||
				(isCollaborator && !collaboration.collaboratorSigned),
			requiresBothSignatures:
				collaboration.ownerSigned !== collaboration.collaboratorSigned,
		};

		res.status(200).json({
			success: true,
			contract: contractData,
		});
	} catch (error) {
		logger.error('[ContractController] Error fetching contract', error);
		res.status(500).json({
			success: false,
			message: 'Une erreur est survenue lors du chargement du contrat',
		});
	}
};
