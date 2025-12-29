import { Router, Response } from 'express';
import multer from 'multer';
import {
	uploadSingle,
	uploadChatSingle,
	uploadIdentityDoc,
} from '../middleware/uploadMiddleware';
import { s3Service } from '../services/s3Service';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types/auth';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

/**
 * Translate multer error codes to French messages
 */
function getMulterErrorMessage(err: unknown): string {
	if (err instanceof multer.MulterError) {
		switch (err.code) {
			case 'LIMIT_FILE_SIZE':
				return 'Le fichier est trop volumineux (max 5MB)';
			case 'LIMIT_FILE_COUNT':
				return 'Trop de fichiers envoyés';
			case 'LIMIT_UNEXPECTED_FILE':
				return 'Fichier inattendu';
			default:
				return 'Erreur lors du téléchargement du fichier';
		}
	}
	return (err as Error).message || 'Erreur inconnue';
}

interface UploadedImageData {
	url: string;
	key: string;
}

const router = Router();

// ============================================================================
// PROTECTED ROUTES (All upload routes require authentication)
// ============================================================================

// Apply authentication to all routes
router.use(authenticateToken);

// @route   POST api/upload/single
// @desc    Upload single image (profile, etc.)
// @access  Private (authenticated users)
router.post('/single', (req: AuthRequest, res: Response) => {
	uploadSingle(req, res, async (err: unknown) => {
		if (err) {
			return res.status(400).json({
				success: false,
				message: getMulterErrorMessage(err),
			});
		}

		try {
			if (!req.user || !req.file) {
				return res.status(400).json({
					success: false,
					message: 'Aucune image fournie',
				});
			}

			const imageVariants = await s3Service.uploadImage({
				buffer: req.file.buffer,
				originalName: req.file.originalname,
				userId: req.user.id,
				folder: 'users',
			});

			const uploadedImage: UploadedImageData = {
				url: imageVariants[0]?.url,
				key: imageVariants[0]?.key,
			};

			res.status(200).json({
				success: true,
				message: 'Image uploadée avec succès',
				data: uploadedImage,
			});
		} catch (error) {
			logger.error('[UploadRoutes] Upload error', error);
			res.status(500).json({
				success: false,
				message: "Erreur lors de l'upload de l'image",
			});
		}
	});
});

// @route   POST api/upload/chat-file
// @desc    Upload chat file (images, pdf, docs)
// @access  Private (authenticated users)
router.post('/chat-file', (req: AuthRequest, res: Response) => {
	uploadChatSingle(req, res, async (err: unknown) => {
		if (err) {
			return res.status(400).json({
				success: false,
				message: getMulterErrorMessage(err),
			});
		}

		try {
			if (!req.user || !req.file) {
				return res.status(400).json({
					success: false,
					message: 'Aucun fichier fourni',
				});
			}

			// Use uploadChatFile for automatic image optimization
			// Images are optimized, documents (PDF, Word) are uploaded as-is
			const uploaded = await s3Service.uploadChatFile({
				buffer: req.file.buffer,
				originalName: req.file.originalname,
				userId: req.user.id,
				contentType: req.file.mimetype,
			});

			return res.status(200).json({
				success: true,
				message: 'Fichier uploadé avec succès',
				data: {
					url: uploaded.url,
					key: uploaded.key,
					name: req.file.originalname,
					mime: req.file.mimetype,
					size: req.file.size,
				},
			});
		} catch (error) {
			logger.error('[UploadRoutes] Upload chat file error', error);
			return res.status(500).json({
				success: false,
				message: "Erreur lors de l'upload du fichier",
			});
		}
	});
});

// @route   DELETE api/upload/delete
// @desc    Delete images
// @access  Private (authenticated users)
router.delete('/delete', async (req: AuthRequest, res: Response) => {
	try {
		if (!req.user) {
			res.status(401).json({
				success: false,
				message: 'Authentification requise',
			});
			return;
		}

		const { keys } = req.body as { keys: string[] };

		if (!keys || !Array.isArray(keys)) {
			res.status(400).json({
				success: false,
				message: "Clés d'images requises",
			});
			return;
		}

		await s3Service.deleteMultipleImages(keys);

		res.status(200).json({
			success: true,
			message: 'Images supprimées avec succès',
		});
	} catch (error) {
		logger.error('[UploadRoutes] Delete error', error);
		res.status(500).json({
			success: false,
			message: 'Erreur lors de la suppression des images',
		});
	}
});

// @route   POST api/upload/identity-card
// @desc    Upload identity card document (image or PDF)
// @access  Private (authenticated users)
router.post('/identity-card', (req: AuthRequest, res: Response) => {
	uploadIdentityDoc(req, res, async (err: unknown) => {
		if (err) {
			return res.status(400).json({
				success: false,
				message: getMulterErrorMessage(err),
			});
		}

		try {
			if (!req.user || !req.file) {
				return res.status(400).json({
					success: false,
					message: 'Aucun document fourni',
				});
			}

			const uploaded = await s3Service.uploadObject({
				buffer: req.file.buffer,
				originalName: req.file.originalname,
				userId: req.user.id,
				folder: 'users',
				contentType: req.file.mimetype,
			});

			return res.status(200).json({
				success: true,
				message: "Carte d'identité uploadée avec succès",
				data: {
					url: uploaded.url,
					key: uploaded.key,
				},
			});
		} catch (error) {
			logger.error('[UploadRoutes] Upload identity card error', error);
			return res.status(500).json({
				success: false,
				message: "Erreur lors de l'upload du document",
			});
		}
	});
});

// @route   POST api/upload/presigned-urls/property
// @desc    Get presigned URLs for direct S3 upload of property images
// @access  Private (authenticated users)
router.post(
	'/presigned-urls/property',
	async (req: AuthRequest, res: Response) => {
		try {
			if (!req.user) {
				return res.status(401).json({
					success: false,
					message: 'Authentification requise',
				});
			}

			const { propertyId, mainImage, galleryCount } = req.body as {
				propertyId?: string;
				mainImage?: boolean;
				galleryCount?: number;
			};

			// Validate propertyId - must be a valid MongoDB ObjectId
			const finalPropertyId =
				propertyId && mongoose.Types.ObjectId.isValid(propertyId)
					? propertyId
					: new mongoose.Types.ObjectId().toString();

			// Validate gallery count (max 20)
			const validGalleryCount = Math.min(
				Math.max(0, galleryCount || 0),
				20,
			);

			if (!mainImage && validGalleryCount === 0) {
				return res.status(400).json({
					success: false,
					message: "Au moins une URL d'image doit être demandée",
				});
			}

			const urls = await s3Service.generatePropertyUploadUrls(
				finalPropertyId,
				mainImage ?? false,
				validGalleryCount,
			);

			return res.status(200).json({
				success: true,
				data: {
					propertyId: finalPropertyId,
					...urls,
				},
			});
		} catch (error) {
			logger.error(
				'[UploadRoutes] Error generating presigned URLs',
				error,
			);
			return res.status(500).json({
				success: false,
				message:
					'Erreur lors de la génération des URLs de téléchargement',
			});
		}
	},
);

export default router;
