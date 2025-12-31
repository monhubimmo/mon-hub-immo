import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { PendingVerification } from '../models/PendingVerification';
import {
	generateToken,
	generateRefreshToken,
	verifyRefreshToken,
} from '../utils/jwt';
import {
	sendEmail,
	generateVerificationCode,
	getVerificationCodeTemplate,
	getSignupAcknowledgementTemplate,
	getPasswordResetTemplate,
	getPasswordResetConfirmationTemplate,
	getAccountLockedTemplate,
} from '../utils/emailService';
import { AuthRequest } from '../types/auth';
import { signupSchema } from '../validation/schemas';
import { S3Service } from '../services/s3Service';
import { logger } from '../utils/logger';
import {
	sanitizeString,
	sanitizeEmail,
	sanitizePhone,
	sanitizeHtmlContent,
	sanitizeCityName,
} from '../utils/sanitize';
import { compareVerificationCode } from '../utils/timingSafe';
import {
	setAuthCookies,
	clearAuthCookies,
	setAccessTokenCookie,
	getRefreshTokenFromCookies,
	getAccessTokenFromCookies,
} from '../utils/cookieHelper';
import { blacklistToken } from '../utils/redisClient';
import {
	isPasswordInHistory,
	updatePasswordHistory,
} from '../utils/passwordHistory';
import { logSecurityEvent } from '../utils/securityLogger';
import {
	trackFailedLogin,
	clearFailedAttempts,
	clearFailedAttemptsForEmail,
} from '../middleware/loginRateLimiter';
import { getClientIp } from '../utils/ipHelper';

// Helper function to upload identity card to S3
const uploadIdentityCardToTemp = async (
	file: Express.Multer.File,
	email: string,
): Promise<string | undefined> => {
	try {
		const s3Service = new S3Service();
		const result = await s3Service.uploadObject({
			buffer: file.buffer,
			originalName: file.originalname,
			userId: email,
			folder: 'temp',
			contentType: file.mimetype,
		});
		logger.debug(
			'[AuthController] Identity card uploaded to temp',
			result.key,
		);
		return result.key;
	} catch (uploadError) {
		logger.error(
			'[AuthController] Identity card upload failed',
			uploadError,
		);
		return undefined;
	}
};

// Sign up controller with code-based email verification
export const signup = async (req: Request, res: Response): Promise<void> => {
	try {
		// Validate request body using Zod
		const parsed = signupSchema.safeParse(req.body);

		if (!parsed.success) {
			logger.error(
				'[AuthController] Zod validation errors',
				parsed.error.errors,
			);
			res.status(400).json({
				success: false,
				message: 'Validation failed',
				errors: parsed.error.errors.map((err) => ({
					field: err.path.join('.'),
					message: err.message,
				})),
			});
			return;
		}

		const {
			firstName,
			lastName,
			email,
			password,
			phone,
			userType,
			agentType,
			tCard,
			sirenNumber,
			rsacNumber,
			collaboratorCertificate,
		} = parsed.data;

		// Sanitize inputs to prevent XSS attacks
		const sanitizedFirstName = sanitizeString(firstName);
		const sanitizedLastName = sanitizeString(lastName);
		const sanitizedEmail = sanitizeEmail(email);
		const sanitizedPhone = phone ? sanitizePhone(phone) : undefined;

		// Check if email already exists in User collection (verified users)
		const existingUser = await User.findOne({ email: sanitizedEmail });
		if (existingUser) {
			res.status(400).json({
				success: false,
				message:
					'Un compte existe déjà avec cet email. Veuillez vous connecter.',
			});
			return;
		}

		// Check if email already exists in PendingVerification (unverified signups)
		const existingPending = await PendingVerification.findOne({
			email: sanitizedEmail,
		});
		if (existingPending) {
			// Pending verification exists, update it and resend code
			const verificationCode = generateVerificationCode();
			const verificationExpires = new Date(
				Date.now() + 24 * 60 * 60 * 1000,
			);

			existingPending.emailVerificationCode = verificationCode;
			existingPending.emailVerificationExpires = verificationExpires;
			// Update password in case user changed it
			existingPending.password = password;
			// Update other fields in case they changed
			existingPending.firstName = sanitizedFirstName;
			existingPending.lastName = sanitizedLastName;
			existingPending.phone = sanitizedPhone;
			// Update agent professional info
			if (userType === 'agent') {
				existingPending.agentType = agentType;
				existingPending.tCard =
					agentType === 'independent' ? tCard : undefined;
				existingPending.sirenNumber =
					agentType === 'commercial' ? sirenNumber : undefined;
				existingPending.rsacNumber =
					agentType === 'commercial' ? rsacNumber : undefined;
				existingPending.collaboratorCertificate =
					agentType === 'employee'
						? collaboratorCertificate
						: undefined;
			}

			// Handle new identity card upload if provided
			if (userType === 'agent' && req.file) {
				const s3Service = new S3Service();

				// Delete old temp file if it exists
				if (existingPending.identityCardTempKey) {
					try {
						await s3Service.deleteImage(
							existingPending.identityCardTempKey,
						);
					} catch (deleteError) {
						logger.error(
							'[AuthController] Failed to delete old temp file',
							deleteError,
						);
					}
				}

				// Upload new file
				const newKey = await uploadIdentityCardToTemp(req.file, email);
				if (newKey) {
					existingPending.identityCardTempKey = newKey;
				}
			}

			await existingPending.save();

			// Send verification email
			try {
				const baseUrl =
					process.env.FRONTEND_URL || 'http://localhost:3000';
				const verifyUrl = `${baseUrl}/auth/verify-email?email=${encodeURIComponent(email)}`;
				const emailTemplate = getVerificationCodeTemplate(
					`${existingPending.firstName} ${existingPending.lastName}`,
					verificationCode,
					verifyUrl,
				);

				await sendEmail({
					to: email,
					subject: `${verificationCode} est votre code de vérification`,
					html: emailTemplate,
				});
			} catch (emailError) {
				logger.error(
					'[AuthController] Email sending error',
					emailError,
				);
			}

			res.status(200).json({
				success: true,
				message:
					'Un nouveau code de vérification a été envoyé à votre email.',
			});
			return;
		}

		// Generate verification code (6-digit)
		const verificationCode = generateVerificationCode();
		const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

		// Handle identity card upload for agents (optional during signup)
		let identityCardTempKey: string | undefined;
		if (userType === 'agent' && req.file) {
			identityCardTempKey = await uploadIdentityCardToTemp(
				req.file,
				email,
			);
		}

		// Create new pending verification (NOT User yet)
		const pendingPayload = {
			firstName: sanitizedFirstName,
			lastName: sanitizedLastName,
			email: sanitizedEmail,
			password,
			phone: sanitizedPhone,
			userType,
			emailVerificationCode: verificationCode,
			emailVerificationExpires: verificationExpires,
			identityCardTempKey, // Store temp S3 key
			// Agent professional info
			agentType: userType === 'agent' ? agentType : undefined,
			tCard:
				userType === 'agent' && agentType === 'independent'
					? tCard
					: undefined,
			sirenNumber:
				userType === 'agent' && agentType === 'commercial'
					? sirenNumber
					: undefined,
			rsacNumber:
				userType === 'agent' && agentType === 'commercial'
					? rsacNumber
					: undefined,
			collaboratorCertificate:
				userType === 'agent' && agentType === 'employee'
					? collaboratorCertificate
					: undefined,
		};

		logger.debug('[AuthController] Creating pending verification', {
			email: pendingPayload.email,
			userType: pendingPayload.userType,
		});

		const pendingVerification = new PendingVerification(pendingPayload);
		await pendingVerification.save();

		// Send verification email with code
		try {
			const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
			const verifyUrl = `${baseUrl}/auth/verify-email?email=${encodeURIComponent(sanitizedEmail)}`;
			const emailTemplate = getVerificationCodeTemplate(
				`${sanitizedFirstName} ${sanitizedLastName}`,
				verificationCode,
				verifyUrl,
			);

			await sendEmail({
				to: sanitizedEmail,
				subject: `${verificationCode} est votre code de vérification - MonHubImmo`,
				html: emailTemplate,
			});
		} catch (emailError) {
			logger.error('[AuthController] Email sending error', emailError);
			// Continue with registration even if email fails
		}

		res.status(201).json({
			success: true,
			message:
				'Inscription en attente. Veuillez vérifier votre email pour le code de vérification.',
		});
	} catch (error) {
		// Surface Mongoose validation errors as 400 to aid diagnosis
		if (error instanceof mongoose.Error.ValidationError) {
			logger.error(
				'[AuthController] Signup validation error (Mongoose)',
				error,
			);
			res.status(400).json({
				success: false,
				message: 'Validation failed',
				errors: Object.values(error.errors).map((e) => ({
					field: e.path,
					message: e.message,
				})),
			});
			return;
		}

		logger.error('[AuthController] Signup error', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

// controllers/authController.ts - Update the login function
export const login = async (req: Request, res: Response): Promise<void> => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({
				success: false,
				message: 'Validation failed',
				errors: errors.array(),
			});
			return;
		}

		const { email, password } = req.body;

		// Find user by email and include password + security fields
		const user = await User.findOne({ email }).select(
			'+password +failedLoginAttempts +accountLockedUntil',
		);
		if (!user) {
			// Check if user is in PendingVerification (signed up but not verified email)
			const pendingUser = await PendingVerification.findOne({ email });
			if (pendingUser) {
				// Verify password before sending verification code
				const bcrypt = await import('bcryptjs');
				const isPasswordValid = await bcrypt.compare(
					password,
					pendingUser.password,
				);

				if (isPasswordValid) {
					// Password matches - generate and send new verification code
					const verificationCode = generateVerificationCode();
					const verificationExpires = new Date(
						Date.now() + 24 * 60 * 60 * 1000,
					);

					pendingUser.emailVerificationCode = verificationCode;
					pendingUser.emailVerificationExpires = verificationExpires;
					await pendingUser.save();

					// Send verification email
					try {
						const baseUrl =
							process.env.FRONTEND_URL || 'http://localhost:3000';
						const verifyUrl = `${baseUrl}/auth/verify-email?email=${encodeURIComponent(email)}`;
						const emailTemplate = getVerificationCodeTemplate(
							`${pendingUser.firstName} ${pendingUser.lastName}`,
							verificationCode,
							verifyUrl,
						);

						await sendEmail({
							to: email,
							subject: `${verificationCode} est votre code de vérification - MonHubImmo`,
							html: emailTemplate,
						});

						logger.info(
							'[AuthController] Sent verification code to pending user',
							{ email },
						);
					} catch (emailError) {
						logger.error(
							'[AuthController] Failed to send verification email to pending user',
							emailError,
						);
					}

					res.status(401).json({
						success: false,
						message:
							'Veuillez vérifier votre email avant de vous connecter. Un code de vérification a été envoyé à votre adresse email.',
						requiresVerification: true,
						email: email,
						codeSent: true,
					});
					return;
				}
				// Password doesn't match - return generic error (don't reveal email exists)
			}

			// Log failed login attempt (user not found or wrong password for pending user)
			logger.warn('[AuthController] Failed login - user not found', {
				email,
			});

			res.status(400).json({
				success: false,
				message: 'Identifiants invalides',
			});
			return;
		}

		// Check if account is locked
		if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
			const minutesLeft = Math.ceil(
				(user.accountLockedUntil.getTime() - Date.now()) / 60000,
			);
			res.status(403).json({
				success: false,
				message: `Account temporarily locked due to multiple failed login attempts. Please try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`,
				lockedUntil: user.accountLockedUntil,
			});
			return;
		}

		// Check if user is administratively blocked
		if (user.isBlocked) {
			await logSecurityEvent({
				userId: (user._id as unknown as string).toString(),
				eventType: 'account_blocked',
				req,
				metadata: {
					reason: 'Attempt to login while account is blocked by admin',
				},
			});
			res.status(403).json({
				success: false,
				message: 'Account blocked by admin',
			});
			return;
		}

		// If lock has expired, clear it and reset failed attempts
		if (user.accountLockedUntil && user.accountLockedUntil <= new Date()) {
			await User.updateOne(
				{ _id: user._id },
				{
					$set: { failedLoginAttempts: 0 },
					$unset: { accountLockedUntil: '' },
				},
				{ runValidators: false },
			);
			// Refresh user object with cleared lock
			user.failedLoginAttempts = 0;
			user.accountLockedUntil = undefined;

			logger.info(
				'[AuthController] Expired account lock automatically cleared',
				{
					email: user.email,
				},
			);
		} // Check password
		const isPasswordValid = await user.comparePassword(password);
		if (!isPasswordValid) {
			// Increment failed login attempts
			const failedAttempts = (user.failedLoginAttempts || 0) + 1;
			const updateData: {
				failedLoginAttempts: number;
				accountLockedUntil?: Date;
			} = {
				failedLoginAttempts: failedAttempts,
			};

			// Lock account after 5 failed attempts
			if (failedAttempts >= 5) {
				const lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
				updateData.accountLockedUntil = lockUntil;

				// Log account locked event
				await logSecurityEvent({
					userId: (user._id as unknown as string).toString(),
					eventType: 'account_locked',
					req,
					metadata: {
						email,
						reason: 'Too many failed login attempts',
						lockedUntil: lockUntil,
					},
				});

				// Send account locked email notification
				try {
					const unlockTimeFormatted = lockUntil.toLocaleString(
						'fr-FR',
						{
							dateStyle: 'short',
							timeStyle: 'short',
						},
					);
					const emailTemplate = getAccountLockedTemplate(
						`${user.firstName} ${user.lastName}`,
						30, // lock duration in minutes
						unlockTimeFormatted,
					);

					await sendEmail({
						to: email,
						subject:
							'🔐 Alerte de sécurité : Compte temporairement verrouillé - MonHubImmo',
						html: emailTemplate,
					});
					logger.info('[AuthController] Account locked email sent', {
						email,
					});
				} catch (emailError) {
					logger.error(
						'[AuthController] Failed to send account locked email',
						emailError,
					);
					// Continue even if email fails - account is still locked
				}
			}

			await User.updateOne(
				{ _id: user._id },
				{ $set: updateData },
				{ runValidators: false },
			);

			// Log failed login attempt
			await logSecurityEvent({
				userId: (user._id as unknown as string).toString(),
				eventType: 'login_failure',
				req,
				metadata: {
					email,
					attemptsRemaining: Math.max(0, 5 - failedAttempts),
					reason: 'Invalid password',
				},
			});

			// Log security event
			logger.warn('[AuthController] Failed login attempt', {
				email,
				failedAttempts,
				locked: failedAttempts >= 5,
			});

			// Track failed login for IP-based rate limiting (IP + Email)
			const ip = getClientIp(req);
			await trackFailedLogin(ip, email);

			res.status(400).json({
				success: false,
				message:
					failedAttempts >= 5
						? 'Trop de tentatives échouées. Compte verrouillé pour 30 minutes.'
						: 'Identifiants invalides',
			});
			return;
		}

		// Check if email is verified
		if (!user.isEmailVerified) {
			// Generate new verification code for unverified user
			const verificationCode = generateVerificationCode();
			const verificationExpires = new Date(
				Date.now() + 24 * 60 * 60 * 1000,
			);

			await User.updateOne(
				{ _id: user._id },
				{
					$set: {
						emailVerificationCode: verificationCode,
						emailVerificationExpires: verificationExpires,
					},
				},
				{ runValidators: false },
			);

			try {
				const baseUrl =
					process.env.FRONTEND_URL || 'http://localhost:3000';
				const verifyUrl = `${baseUrl}/auth/verify-email?email=${encodeURIComponent(email)}`;
				const emailTemplate = getVerificationCodeTemplate(
					`${user.firstName} ${user.lastName}`,
					verificationCode,
					verifyUrl,
				);

				await sendEmail({
					to: email,
					subject: `${verificationCode} est votre code de vérification - MonHubImmo`,
					html: emailTemplate,
				});

				res.status(401).json({
					success: false,
					message:
						'Please verify your email address before logging in. A new verification code has been sent to your email.',
					requiresVerification: true,
					email: user.email,
					codeSent: true,
				});
				return;
			} catch (emailError) {
				logger.error(
					'[AuthController] Email sending error',
					emailError,
				);
				res.status(401).json({
					success: false,
					message:
						'Please verify your email address before logging in. Failed to send verification code - please try the resend option.',
					requiresVerification: true,
					email: user.email,
					codeSent: false,
				});
				return;
			}
		}

		// Check if user is administratively validated (admin has approved the user)
		// Admins are allowed to login regardless
		if (!user.isValidated && user.userType !== 'admin') {
			await logSecurityEvent({
				userId: (user._id as unknown as string).toString(),
				eventType: 'login_failure',
				req,
				metadata: {
					email,
					reason: 'Attempt to login before admin validation',
				},
			});
			res.status(403).json({
				success: false,
				message:
					"Compte non validé par l'administrateur. Veuillez attendre la validation.",
				requiresAdminValidation: true,
			});
			return;
		}

		// Successful login - reset failed attempts and lock
		await User.updateOne(
			{ _id: user._id },
			{
				$set: {
					failedLoginAttempts: 0,
				},
				$unset: {
					accountLockedUntil: '',
				},
			},
			{ runValidators: false },
		);

		// Clear IP-based rate limit tracking for successful login (IP + Email)
		const ip = getClientIp(req);
		await clearFailedAttempts(ip, email);

		// Log successful login
		await logSecurityEvent({
			userId: (user._id as unknown as string).toString(),
			eventType: 'login_success',
			req,
			metadata: {
				email,
			},
		});

		// Generate token for verified user
		const token = generateToken((user._id as unknown as string).toString());
		const refreshToken = generateRefreshToken(
			(user._id as unknown as string).toString(),
		);

		// Set tokens in httpOnly cookies
		setAuthCookies(res, token, refreshToken);

		res.status(200).json({
			success: true,
			message: 'Connexion réussie',
			user: {
				_id: user._id,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				phone: user.phone,
				userType: user.userType,
				isEmailVerified: user.isEmailVerified,
				profileImage: user.profileImage,
				profileCompleted: user.profileCompleted || false,
				professionalInfo: user.professionalInfo,
				// Billing / activation info - must match getProfile to prevent payment redirect
				isPaid: Boolean(user.isPaid || user.accessGrantedByAdmin),
				accessGrantedByAdmin: Boolean(user.accessGrantedByAdmin),
				subscriptionStatus: user.subscriptionStatus || null,
				subscriptionEndDate: user.subscriptionEndDate || null,
			},
			token,
			refreshToken, // Send refresh token
			// Add these flags to help frontend routing
			requiresProfileCompletion:
				user.userType === 'agent' && !user.profileCompleted,
			requiresPasswordChange: !!user.mustChangePassword,
		});
	} catch (error) {
		logger.error('[AuthController] Login error', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

// Verify email with code
export const verifyEmail = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({
				success: false,
				message: 'Validation échouée',
				errors: errors.array(),
			});
			return;
		}

		const { email, code } = req.body;

		// Find pending verification - first by email and expiration
		const pendingVerification = await PendingVerification.findOne({
			email,
			emailVerificationExpires: { $gt: new Date() },
		});

		// Use timing-safe comparison for the code
		if (
			!pendingVerification ||
			!compareVerificationCode(
				code,
				pendingVerification.emailVerificationCode,
			)
		) {
			// Log failed verification attempt
			if (pendingVerification) {
				await logSecurityEvent({
					eventType: 'failed_verification_attempt',
					req,
					metadata: { email },
				});
			}

			res.status(400).json({
				success: false,
				message:
					'Code de vérification invalide ou expiré. Veuillez réessayer.',
			});
			return;
		}

		// Check if user already exists (shouldn't happen, but safety check)
		const existingUser = await User.findOne({ email }).select(
			'+passwordResetCode +passwordResetExpires +password',
		);
		if (existingUser) {
			// If user exists and is NOT yet verified, this is from admin-created flow
			// Just mark their email as verified and clean up pending verification
			if (!existingUser.isEmailVerified) {
				existingUser.isEmailVerified = true;
				await existingUser.save();

				// Clean up pending verification
				await pendingVerification.deleteOne();

				// Log successful verification
				await logSecurityEvent({
					userId: (existingUser._id as unknown as string).toString(),
					eventType: 'email_verified',
					req,
					metadata: { email, flow: 'admin_invite' },
				});

				// Determine next step for admin-created user
				// Check if user has a password set and if they need to set one via invite link
				const hasInviteToken =
					existingUser.passwordResetCode &&
					existingUser.passwordResetExpires &&
					existingUser.passwordResetExpires > new Date();
				const hasPassword = !!existingUser.password;
				const mustChangePassword = !!(
					existingUser as { mustChangePassword?: boolean }
				).mustChangePassword;

				// Flow 1: Invite link flow - user needs to set password
				// Flow 2: Temp password flow - user can login but must change password
				let nextStep: 'set-password' | 'login' = 'login';
				let inviteToken: string | undefined;

				if (hasInviteToken && !hasPassword) {
					// Invite link flow - redirect to set password page
					nextStep = 'set-password';
					inviteToken = existingUser.passwordResetCode;
				}

				res.json({
					success: true,
					message: 'Email vérifié avec succès',
					requiresAdminValidation: !existingUser.isValidated,
					// New fields for admin-created user flow
					adminCreatedFlow: true,
					nextStep,
					inviteToken,
					mustChangePassword,
					email: existingUser.email,
				});
				return;
			}

			// User already verified - shouldn't happen
			await pendingVerification.deleteOne();

			res.status(400).json({
				success: false,
				message: 'Un compte existe déjà avec cet email.',
			});
			return;
		}

		// Create real User from PendingVerification
		// Apporteurs are auto-validated (no admin approval needed)
		// Agents require admin validation before they can login
		const isApporteur = pendingVerification.userType === 'apporteur';
		const newUser = new User({
			firstName: pendingVerification.firstName,
			lastName: pendingVerification.lastName,
			email: pendingVerification.email,
			password: pendingVerification.password,
			phone: pendingVerification.phone,
			userType: pendingVerification.userType,
			isEmailVerified: true,
			isValidated: isApporteur, // Auto-validate apporteurs, agents need admin approval
			profileCompleted: false,
			// Transfer agent professional info from signup
			professionalInfo:
				pendingVerification.userType === 'agent'
					? {
							agentType: pendingVerification.agentType,
							tCard: pendingVerification.tCard,
							sirenNumber: pendingVerification.sirenNumber,
							rsacNumber: pendingVerification.rsacNumber,
							collaboratorCertificate:
								pendingVerification.collaboratorCertificate,
						}
					: undefined,
		});

		// Debug log to verify agentType transfer
		logger.debug(
			'[AuthController] Creating user from pending verification',
			{
				email: newUser.email,
				userType: newUser.userType,
				pendingAgentType: pendingVerification.agentType,
				newUserAgentType: newUser.professionalInfo?.agentType,
			},
		);

		await newUser.save();

		// Handle identity card move from temp to permanent location
		if (pendingVerification.identityCardTempKey) {
			try {
				const s3Service = new S3Service();
				const userId = (newUser._id as unknown as string).toString();

				// Extract file extension from temp key
				const ext =
					pendingVerification.identityCardTempKey.split('.').pop() ||
					'jpg';
				const permanentKey = `users/${userId}/identity-card.${ext}`;

				// Copy from temp to permanent location
				const result = await s3Service.copyObject(
					pendingVerification.identityCardTempKey,
					permanentKey,
				);

				// Update user's professionalInfo with permanent identity card
				// Spread existing professionalInfo to preserve agentType and other fields
				const existingProfInfo = newUser.professionalInfo
					? { ...newUser.professionalInfo }
					: {};

				logger.debug('[AuthController] Before identity card merge', {
					existingProfInfo,
					hasAgentType: !!existingProfInfo.agentType,
				});

				newUser.professionalInfo = {
					...existingProfInfo,
					identityCard: {
						url: result.url,
						key: result.key,
						uploadedAt: new Date(),
					},
				};
				await newUser.save();

				logger.debug('[AuthController] After identity card save', {
					agentType: newUser.professionalInfo?.agentType,
				}); // Delete temp file (cleanup)
				await s3Service.deleteImage(
					pendingVerification.identityCardTempKey,
				);
				logger.debug(
					'[AuthController] Identity card moved from temp to permanent',
					result.key,
				);
			} catch (s3Error) {
				logger.error(
					'[AuthController] Failed to move identity card',
					s3Error,
				);
				// Don't fail the entire verification if S3 operations fail
				// User can re-upload identity card later
			}
		}

		// Delete pending verification (cleanup)
		await pendingVerification.deleteOne();

		// Log successful email verification
		await logSecurityEvent({
			userId: (newUser._id as unknown as string).toString(),
			eventType: 'email_verified',
			req,
			metadata: { email: newUser.email },
		});

		// Only notify agents that they are pending admin validation
		// Apporteurs are auto-validated and can login immediately
		if (!isApporteur) {
			try {
				const ackTemplate = getSignupAcknowledgementTemplate(
					`${newUser.firstName} ${newUser.lastName}`,
				);
				await sendEmail({
					to: newUser.email,
					subject: `Inscription reçue - en attente de validation - MonHubImmo`,
					html: ackTemplate,
				});
			} catch (ackError) {
				logger.error(
					'[AuthController] Failed to send pending validation email',
					ackError,
				);
			}
		}

		// Return success - apporteurs can login, agents need admin validation
		if (isApporteur) {
			res.json({
				success: true,
				message:
					'Email vérifié avec succès. Vous pouvez maintenant vous connecter.',
				requiresAdminValidation: false,
				user: null,
			});
			return;
		}

		// Agents need admin validation - DO NOT LOG IN USER YET
		res.json({
			success: true,
			message:
				'Email vérifié. Votre compte est en attente de validation par un administrateur.',
			requiresAdminValidation: true,
			user: null,
		});
	} catch (error) {
		logger.error('[AuthController] Email verification error', error);
		res.status(500).json({
			success: false,
			message: 'Erreur serveur interne',
		});
	}
};

// Set password from an invite or password-reset token (without automatic login)
export const setPasswordFromInvite = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const { email, token, newPassword } = req.body as {
			email: string;
			token: string;
			newPassword: string;
		};

		if (!email || !token || !newPassword) {
			res.status(400).json({
				success: false,
				message: 'email, token et newPassword sont requis',
			});
			return;
		}

		const user = await User.findOne({
			email,
			passwordResetCode: token,
			passwordResetExpires: { $gt: new Date() },
		}).select(
			'+passwordResetCode +passwordResetExpires +password +firstName +lastName +isEmailVerified',
		);
		if (!user) {
			res.status(400).json({
				success: false,
				message: 'Token invalide ou expiré',
			});
			return;
		}

		// Check if email is verified first (required for admin-created users)
		if (!user.isEmailVerified) {
			res.status(400).json({
				success: false,
				message:
					"Veuillez d'abord vérifier votre email avant de définir votre mot de passe.",
				requiresEmailVerification: true,
				email: user.email,
			});
			return;
		}

		// Check password history
		const inHistory = await isPasswordInHistory(
			newPassword,
			user.passwordHistory || [],
		);
		if (inHistory) {
			res.status(400).json({
				success: false,
				message: 'Ce mot de passe a déjà été utilisé récemment.',
			});
			return;
		}

		// Update password and clear reset fields
		if (user.password) {
			user.passwordHistory = updatePasswordHistory(
				user.password,
				user.passwordHistory || [],
			);
		}
		user.password = newPassword;
		user.passwordResetCode = undefined;
		user.passwordResetExpires = undefined;

		// Remove account lock if any
		user.failedLoginAttempts = 0;
		user.accountLockedUntil = undefined;

		await user.save();

		// Log event
		await logSecurityEvent({
			userId: (user._id as unknown as string).toString(),
			eventType: 'password_reset_success',
			req,
			metadata: { email },
		});

		// Generate and send verification code if user is not yet verified
		logger.info(
			'[AuthController] setPasswordFromInvite - checking email verification',
			{ email, isEmailVerified: user.isEmailVerified },
		);
		if (!user.isEmailVerified) {
			try {
				logger.info(
					'[AuthController] Generating verification code for unverified user',
					{ email },
				);
				const verificationCode = generateVerificationCode();
				const emailVerificationExpires = new Date(
					Date.now() + 10 * 60 * 1000,
				); // 10 minutes

				// Store in PendingVerification
				await PendingVerification.findOneAndUpdate(
					{ email },
					{
						emailVerificationCode: verificationCode,
						emailVerificationExpires,
					},
					{ upsert: true, new: true },
				);

				// Send verification code email
				const baseUrl =
					process.env.FRONTEND_URL || 'http://localhost:3000';
				const verifyUrl = `${baseUrl}/auth/verify-email?email=${encodeURIComponent(user.email)}`;
				await sendEmail({
					to: user.email,
					subject: 'Code de vérification - MonHubImmo',
					html: getVerificationCodeTemplate(
						`${user.firstName} ${user.lastName}`,
						verificationCode,
						verifyUrl,
					),
				});

				logger.info(
					'[AuthController] Verification code sent after password set',
					{ email },
				);
			} catch (emailError) {
				logger.error(
					'[AuthController] Failed to send verification code after password set',
					emailError,
				);
				await logSecurityEvent({
					userId: (user._id as unknown as string).toString(),
					eventType: 'email_send_failed',
					req,
					metadata: { email, error: String(emailError) },
				});
			}
		} else {
			logger.info(
				'[AuthController] User already verified, skipping code generation',
				{ email },
			);
		}
		res.json({ success: true, message: 'Mot de passe mis à jour' });
	} catch (error) {
		logger.error('[AuthController] setPasswordFromInvite error', error);
		res.status(500).json({
			success: false,
			message: 'Erreur serveur interne',
		});
	}
};

// Resend verification code - works with PendingVerification
export const resendVerificationCode = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({
				success: false,
				message: 'Échec de validation',
				errors: errors.array(),
			});
			return;
		}

		const { email } = req.body;

		// Check if user is already verified
		const existingUser = await User.findOne({ email });
		if (existingUser && existingUser.isEmailVerified) {
			res.status(400).json({
				success: false,
				message: "L'email est déjà vérifié",
			});
			return;
		}

		// Find pending verification
		const pendingVerification = await PendingVerification.findOne({
			email,
		});
		if (!pendingVerification) {
			res.status(404).json({
				success: false,
				message:
					'Aucune inscription en attente de vérification trouvée',
			});
			return;
		}

		// Generate new verification code
		const verificationCode = generateVerificationCode();
		const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

		// Update pending verification
		await PendingVerification.updateOne(
			{ _id: pendingVerification._id },
			{
				$set: {
					emailVerificationCode: verificationCode,
					emailVerificationExpires: verificationExpires,
				},
			},
		);

		// Send verification email
		try {
			const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
			const verifyUrl = `${baseUrl}/auth/verify-email?email=${encodeURIComponent(email)}`;
			const emailTemplate = getVerificationCodeTemplate(
				`${pendingVerification.firstName} ${pendingVerification.lastName}`,
				verificationCode,
				verifyUrl,
			);

			await sendEmail({
				to: email,
				subject: `${verificationCode} est votre code de vérification - MonHubImmo`,
				html: emailTemplate,
			});
		} catch (emailError) {
			logger.error('[AuthController] Email sending error', emailError);
			res.status(500).json({
				success: false,
				message: "Échec de l'envoi de l'email de vérification",
			});
			return;
		}

		res.json({
			success: true,
			message: 'Code de vérification renvoyé avec succès',
		});
	} catch (error) {
		logger.error('[AuthController] Resend verification error', error);
		res.status(500).json({
			success: false,
			message: 'Erreur serveur interne',
		});
	}
};

// Add this function to your authController.ts
export const forgotPassword = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({
				success: false,
				message: 'Validation failed',
				errors: errors.array(),
			});
			return;
		}

		const { email } = req.body;

		// Find user by email
		const user = await User.findOne({ email });
		if (!user) {
			// For security, we don't reveal whether the email exists or not
			res.json({
				success: true,
				message:
					'If an account with that email exists, we have sent you a password reset code.',
			});
			return;
		}

		// Generate password reset code (6-digit)
		const resetCode = generateVerificationCode();
		const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

		// Update user with reset code (atomic without full validation)
		await User.updateOne(
			{ _id: user._id },
			{
				$set: {
					passwordResetCode: resetCode,
					passwordResetExpires: resetExpires,
				},
			},
			{ runValidators: false },
		);

		// Send password reset email
		try {
			const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?email=${encodeURIComponent(email)}`;
			const emailTemplate = getPasswordResetTemplate(
				`${user.firstName} ${user.lastName}`,
				resetCode,
				inviteUrl,
			);

			await sendEmail({
				to: email,
				subject: `${resetCode} est votre code de réinitialisation - MonHubImmo`,
				html: emailTemplate,
			});

			// Log password reset request
			await logSecurityEvent({
				userId: (user._id as unknown as string).toString(),
				eventType: 'password_reset_request',
				req,
				metadata: { email },
			});

			res.json({
				success: true,
				message:
					'Password reset code has been sent to your email address.',
			});
		} catch (emailError) {
			logger.error('[AuthController] Email sending error', emailError);
			// Clear the reset code if email fails (atomic update)
			await User.updateOne(
				{ _id: user._id },
				{ $unset: { passwordResetCode: '', passwordResetExpires: '' } },
				{ runValidators: false },
			);

			res.status(500).json({
				success: false,
				message:
					'Failed to send password reset email. Please try again.',
			});
		}
	} catch (error) {
		if (error instanceof mongoose.Error.ValidationError) {
			logger.error(
				'[AuthController] Forgot password validation error (Mongoose)',
				error,
			);
			res.status(400).json({
				success: false,
				message: 'Validation failed',
				errors: Object.values(error.errors).map((e) => ({
					field: e.path,
					message: e.message,
				})),
			});
			return;
		}

		logger.error('[AuthController] Forgot password error', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

// Add this function to your authController.ts
export const resetPassword = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({
				success: false,
				message: 'Validation failed',
				errors: errors.array(),
			});
			return;
		}

		const { email, code, newPassword } = req.body;

		// Find user by email with unexpired reset code
		const user = await User.findOne({
			email,
			passwordResetExpires: { $gt: new Date() },
		}).select(
			'+passwordResetCode +password +passwordHistory +failedLoginAttempts +accountLockedUntil',
		); // Use timing-safe comparison for the code
		if (!user || !compareVerificationCode(code, user.passwordResetCode)) {
			res.status(400).json({
				success: false,
				message: 'Invalid or expired reset code',
			});
			return;
		}

		// Check if new password was used in the last 5 passwords
		const inHistory = await isPasswordInHistory(
			newPassword,
			user.passwordHistory || [],
		);
		if (inHistory) {
			res.status(400).json({
				success: false,
				message:
					'Ce mot de passe a déjà été utilisé récemment. Veuillez en choisir un nouveau pour votre sécurité.',
			});
			return;
		}

		// Update password history before changing password
		if (user.password) {
			user.passwordHistory = updatePasswordHistory(
				user.password,
				user.passwordHistory || [],
			);
		}

		// Update password and clear reset fields
		user.password = newPassword; // This will be hashed by your User model pre-save hook
		user.passwordResetCode = undefined;
		user.passwordResetExpires = undefined;

		// Clear account lock and failed login attempts after successful password reset
		user.failedLoginAttempts = 0;
		user.accountLockedUntil = undefined;

		await user.save();

		// Clear IP-based rate limit tracking after successful password reset
		// Clear for ALL IPs since password was reset (email-based clear)
		await clearFailedAttemptsForEmail(email);
		logger.info(
			`[AuthController] Cleared rate limits for email ${email} after password reset`,
		);

		// Log successful password reset
		await logSecurityEvent({
			userId: (user._id as unknown as string).toString(),
			eventType: 'password_reset_success',
			req,
			metadata: { email },
		});

		// Generate login token for immediate login after password reset
		const loginToken = generateToken(
			(user._id as unknown as string).toString(),
		);
		const loginRefreshToken = generateRefreshToken(
			(user._id as unknown as string).toString(),
		);

		// Set tokens in httpOnly cookies
		setAuthCookies(res, loginToken, loginRefreshToken);

		// Send confirmation email
		try {
			const emailTemplate = getPasswordResetConfirmationTemplate(
				`${user.firstName} ${user.lastName}`,
			);

			await sendEmail({
				to: email,
				subject: 'Mot de passe réinitialisé avec succès - MonHubImmo',
				html: emailTemplate,
			});
		} catch (emailError) {
			logger.error(
				'[AuthController] Confirmation email error',
				emailError,
			);
			// Continue even if confirmation email fails
		}

		res.json({
			success: true,
			message:
				'Password has been successfully reset. You are now logged in.',
			user: {
				_id: user._id,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				phone: user.phone,
				userType: user.userType,
				isEmailVerified: user.isEmailVerified,
				profileImage: user.profileImage,
				profileCompleted: user.profileCompleted || false,
				professionalInfo: user.professionalInfo,
				// Billing / activation info - must match getProfile to prevent payment redirect
				isPaid: Boolean(user.isPaid || user.accessGrantedByAdmin),
				accessGrantedByAdmin: Boolean(user.accessGrantedByAdmin),
				subscriptionStatus: user.subscriptionStatus || null,
				subscriptionEndDate: user.subscriptionEndDate || null,
			},
			token: loginToken,
			refreshToken: loginRefreshToken,
		});
	} catch (error) {
		logger.error('[AuthController] Reset password error', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

// Get user profile controller
export const getProfile = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const user = await User.findById(req.userId);

		if (!user) {
			res.status(404).json({
				success: false,
				message: 'User not found',
			});
			return;
		}

		res.json({
			success: true,
			user: {
				_id: user._id,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				phone: user.phone,
				userType: user.userType,
				isEmailVerified: user.isEmailVerified,
				profileImage: user.profileImage,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt,
				professionalInfo: user.professionalInfo,
				profileCompleted: user.profileCompleted || false, // Add this field
				// Billing / activation info
				isPaid: Boolean(user.isPaid || user.accessGrantedByAdmin),
				accessGrantedByAdmin: Boolean(user.accessGrantedByAdmin),
				subscriptionStatus: user.subscriptionStatus || null,
				subscriptionEndDate: user.subscriptionEndDate || null,
				// Derived account status for frontend display
				accountStatus:
					user.userType === 'agent' &&
					user.profileCompleted &&
					!user.isPaid &&
					!user.accessGrantedByAdmin
						? "profil en attente d'activation"
						: user.isPaid || user.accessGrantedByAdmin
							? 'active'
							: 'incomplete',
			},
		});
	} catch (error) {
		logger.error('[AuthController] Get profile error', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

// Update profile controller
export const updateProfile = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({
				success: false,
				message: 'Validation failed',
				errors: errors.array(),
			});
			return;
		}

		const { firstName, lastName, phone, profileImage, professionalInfo } =
			req.body;

		const user = await User.findById(req.userId);
		if (!user) {
			res.status(404).json({
				success: false,
				message: 'User not found',
			});
			return;
		}

		// Sanitize and update basic info
		if (firstName !== undefined) user.firstName = sanitizeString(firstName);
		if (lastName !== undefined) user.lastName = sanitizeString(lastName);
		if (phone !== undefined) user.phone = sanitizePhone(phone);
		if (profileImage !== undefined) {
			// Don't sanitize URLs - just trim whitespace
			user.profileImage = profileImage.trim();
		}

		// Update professional info for agents
		if (user.userType === 'agent' && professionalInfo) {
			// Initialize professionalInfo if it doesn't exist
			if (!user.professionalInfo) {
				user.professionalInfo = {};
			}

			// Only update fields that are provided (not undefined)
			if (professionalInfo.city !== undefined) {
				user.professionalInfo.city = sanitizeCityName(
					professionalInfo.city,
				);
			}
			if (professionalInfo.postalCode !== undefined) {
				user.professionalInfo.postalCode = sanitizeString(
					professionalInfo.postalCode,
				);
			}
			if (professionalInfo.network !== undefined) {
				user.professionalInfo.network = sanitizeString(
					professionalInfo.network,
				);
			}
			if (professionalInfo.siretNumber !== undefined) {
				user.professionalInfo.siretNumber = sanitizeString(
					professionalInfo.siretNumber,
				);
			}
			if (professionalInfo.personalPitch !== undefined) {
				user.professionalInfo.personalPitch = sanitizeHtmlContent(
					professionalInfo.personalPitch,
				);
			}
			if (
				professionalInfo.coveredCities &&
				Array.isArray(professionalInfo.coveredCities)
			) {
				user.professionalInfo.coveredCities =
					professionalInfo.coveredCities.map((city: string) =>
						sanitizeCityName(city),
					);
			}
			if (professionalInfo.interventionRadius !== undefined) {
				user.professionalInfo.interventionRadius =
					professionalInfo.interventionRadius;
			}
			if (professionalInfo.yearsExperience !== undefined) {
				user.professionalInfo.yearsExperience =
					professionalInfo.yearsExperience;
			}
			if (professionalInfo.mandateTypes !== undefined) {
				user.professionalInfo.mandateTypes =
					professionalInfo.mandateTypes;
			}
			if (professionalInfo.collaborateWithAgents !== undefined) {
				user.professionalInfo.collaborateWithAgents =
					professionalInfo.collaborateWithAgents;
			}
			if (professionalInfo.shareCommission !== undefined) {
				user.professionalInfo.shareCommission =
					professionalInfo.shareCommission;
			}
			if (professionalInfo.independentAgent !== undefined) {
				user.professionalInfo.independentAgent =
					professionalInfo.independentAgent;
			}
			if (professionalInfo.alertsEnabled !== undefined) {
				user.professionalInfo.alertsEnabled =
					professionalInfo.alertsEnabled;
			}
			if (professionalInfo.alertFrequency !== undefined) {
				user.professionalInfo.alertFrequency =
					professionalInfo.alertFrequency;
			}
			// Update identity card if provided
			if (professionalInfo.identityCard !== undefined) {
				// Delete old identity card from S3 if it exists
				if (user.professionalInfo.identityCard?.key) {
					try {
						const s3Service = new S3Service();
						await s3Service.deleteImage(
							user.professionalInfo.identityCard.key,
						);
						logger.debug(
							'[AuthController] Old identity card deleted from S3',
							user.professionalInfo.identityCard.key,
						);
					} catch (deleteError) {
						logger.error(
							'[AuthController] Failed to delete old identity card from S3',
							deleteError,
						);
						// Continue with update even if delete fails
					}
				}
				user.professionalInfo.identityCard = {
					url: professionalInfo.identityCard.url,
					key: professionalInfo.identityCard.key,
					uploadedAt: new Date(),
				};
			}
		}

		await user.save();

		res.json({
			success: true,
			message: 'Profil mis à jour avec succès',
			user: {
				_id: user._id,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				phone: user.phone,
				userType: user.userType,
				isEmailVerified: user.isEmailVerified,
				profileImage: user.profileImage,
				professionalInfo: user.professionalInfo,
				profileCompleted: user.profileCompleted,
				isPaid: Boolean(user.isPaid || user.accessGrantedByAdmin),
				accessGrantedByAdmin: Boolean(user.accessGrantedByAdmin),
				subscriptionStatus: user.subscriptionStatus || null,
			},
		});
	} catch (error) {
		logger.error('[AuthController] Update profile error', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

// controllers/authController.ts - Add this new function
export const completeProfile = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({
				success: false,
				message: 'Validation failed',
				errors: errors.array(),
			});
			return;
		}

		const { professionalInfo, profileImage, identityCard } = req.body;

		const user = await User.findById(req.userId);
		if (!user) {
			res.status(404).json({
				success: false,
				message: 'User not found',
			});
			return;
		}

		logger.info(
			'[AuthController] Complete profile request:',
			JSON.stringify({ professionalInfo, profileImage }, null, 2),
		);

		// Update professional info for agents with sanitization
		if (user.userType === 'agent' && professionalInfo) {
			const sanitizedProfessionalInfo: Record<string, unknown> = {};

			// Sanitize string fields in professionalInfo
			if (professionalInfo.city) {
				sanitizedProfessionalInfo.city = sanitizeCityName(
					professionalInfo.city,
				);
			}
			if (professionalInfo.postalCode) {
				sanitizedProfessionalInfo.postalCode = sanitizeString(
					professionalInfo.postalCode,
				);
			}
			if (professionalInfo.network) {
				sanitizedProfessionalInfo.network = sanitizeString(
					professionalInfo.network,
				);
			}
			if (professionalInfo.siretNumber) {
				sanitizedProfessionalInfo.siretNumber = sanitizeString(
					professionalInfo.siretNumber,
				);
			}
			if (professionalInfo.personalPitch) {
				sanitizedProfessionalInfo.personalPitch = sanitizeHtmlContent(
					professionalInfo.personalPitch,
				);
			}
			if (professionalInfo.interventionRadius !== undefined) {
				sanitizedProfessionalInfo.interventionRadius =
					professionalInfo.interventionRadius;
			}
			if (professionalInfo.yearsExperience !== undefined) {
				sanitizedProfessionalInfo.yearsExperience =
					professionalInfo.yearsExperience;
			}
			if (professionalInfo.collaborateWithAgents !== undefined) {
				sanitizedProfessionalInfo.collaborateWithAgents =
					professionalInfo.collaborateWithAgents;
			}
			if (professionalInfo.shareCommission !== undefined) {
				sanitizedProfessionalInfo.shareCommission =
					professionalInfo.shareCommission;
			}
			if (professionalInfo.independentAgent !== undefined) {
				sanitizedProfessionalInfo.independentAgent =
					professionalInfo.independentAgent;
			}
			if (professionalInfo.alertsEnabled !== undefined) {
				sanitizedProfessionalInfo.alertsEnabled =
					professionalInfo.alertsEnabled;
			}
			if (professionalInfo.alertFrequency) {
				sanitizedProfessionalInfo.alertFrequency =
					professionalInfo.alertFrequency;
			}

			// Handle arrays - convert object notation to arrays if needed
			if (professionalInfo.coveredCities) {
				const cities = Array.isArray(professionalInfo.coveredCities)
					? professionalInfo.coveredCities
					: Object.values(professionalInfo.coveredCities);
				sanitizedProfessionalInfo.coveredCities = cities.map(
					(city: string) => sanitizeCityName(city),
				);
			}
			if (professionalInfo.mandateTypes) {
				const mandates = Array.isArray(professionalInfo.mandateTypes)
					? professionalInfo.mandateTypes
					: Object.values(professionalInfo.mandateTypes);
				sanitizedProfessionalInfo.mandateTypes = mandates;
			}

			// Merge with existing professionalInfo, but don't spread undefined values
			if (!user.professionalInfo) {
				user.professionalInfo = {};
			}
			Object.assign(user.professionalInfo, sanitizedProfessionalInfo);
		}

		// Add identity card info if provided (already sanitized URLs from S3)
		if (
			user.userType === 'agent' &&
			identityCard?.url &&
			identityCard?.key
		) {
			if (!user.professionalInfo) {
				user.professionalInfo = {};
			}
			user.professionalInfo.identityCard = {
				url: identityCard.url.trim(), // S3 URLs don't need HTML escaping
				key: identityCard.key.trim(),
				uploadedAt: new Date(),
			};
		}

		if (profileImage) {
			user.profileImage = profileImage.trim(); // URLs don't need HTML escaping
		}

		// Only mark profile as completed if required fields are present
		if (
			user.userType === 'agent' &&
			user.professionalInfo?.city &&
			user.professionalInfo?.postalCode &&
			user.professionalInfo?.network &&
			user.professionalInfo?.interventionRadius &&
			user.professionalInfo?.coveredCities &&
			user.professionalInfo.coveredCities.length > 0 &&
			typeof user.professionalInfo?.yearsExperience === 'number'
		) {
			user.profileCompleted = true;
		} else if (user.userType !== 'agent') {
			// Non-agents complete profile by just submitting
			user.profileCompleted = true;
		}

		// When profile is completed but user hasn't paid yet, mark subscriptionStatus
		if (user.profileCompleted) {
			user.subscriptionStatus =
				user.isPaid || user.accessGrantedByAdmin
					? 'active'
					: 'pending_activation';
		}

		await user.save();

		res.json({
			success: true,
			message: 'Profile completed successfully',
			user: {
				_id: user._id,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				phone: user.phone,
				userType: user.userType,
				isEmailVerified: user.isEmailVerified,
				profileImage: user.profileImage,
				professionalInfo: user.professionalInfo,
				profileCompleted: user.profileCompleted,
				// Billing fields - client can use these to decide redirect to payment
				isPaid: Boolean(user.isPaid || user.accessGrantedByAdmin),
				accessGrantedByAdmin: Boolean(user.accessGrantedByAdmin),
				subscriptionStatus: user.subscriptionStatus || null,
			},
		});
	} catch (error) {
		// Log detailed error information
		if (error instanceof mongoose.Error.ValidationError) {
			logger.error(
				'[AuthController] Validation error in completeProfile:',
				JSON.stringify(
					Object.values(error.errors).map((e) => ({
						field: e.path,
						message: e.message,
						value: 'value' in e ? e.value : undefined,
					})),
					null,
					2,
				),
			);
			res.status(400).json({
				success: false,
				message: 'Validation error',
				errors: Object.values(error.errors).map((e) => ({
					field: e.path,
					message: e.message,
				})),
			});
			return;
		}
		logger.error('[AuthController] Complete profile error', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

// Get all agents for public listing
export const getAllAgents = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const agents = await User.find({
			userType: 'agent',
			profileCompleted: true,
			isEmailVerified: true,
			isValidated: true,
			isBlocked: { $ne: true },
			isDeleted: { $ne: true },
			// Only show paid agents or those with admin-granted access
			$or: [{ isPaid: true }, { accessGrantedByAdmin: true }],
		})
			.select(
				'firstName lastName email phone profileImage professionalInfo createdAt',
			)
			.sort({ createdAt: -1 });

		res.status(200).json({
			success: true,
			data: agents,
		});
	} catch (error) {
		logger.error('[AuthController] Error fetching agents', error);
		res.status(500).json({ success: false, message: 'Erreur serveur' });
	}
};

// Update search preferences
export const updateSearchPreferences = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const { preferredRadius, lastSearchLocations } = req.body;

		const user = await User.findById(req.userId);
		if (!user) {
			res.status(404).json({
				success: false,
				message: 'User not found',
			});
			return;
		}

		// Update search preferences
		if (!user.searchPreferences) {
			user.searchPreferences = {};
		}

		if (preferredRadius !== undefined) {
			user.searchPreferences.preferredRadius = preferredRadius;
		}

		if (lastSearchLocations !== undefined) {
			user.searchPreferences.lastSearchLocations = lastSearchLocations;
		}

		await user.save();

		res.json({
			success: true,
			message: 'Search preferences updated successfully',
			searchPreferences: user.searchPreferences,
		});
	} catch (error) {
		logger.error('[AuthController] Update search preferences error', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

// Refresh access token using refresh token
export const refreshAccessToken = async (req: Request, res: Response) => {
	try {
		// Get refresh token from cookies or request body
		let refreshToken = getRefreshTokenFromCookies(req.cookies);

		if (!refreshToken) {
			refreshToken = req.body.refreshToken;
		}

		if (!refreshToken) {
			return res.status(400).json({
				success: false,
				message: 'Refresh token is required',
			});
		}

		// Verify refresh token
		const decoded = verifyRefreshToken(refreshToken);

		// Generate new access token
		const newAccessToken = generateToken(decoded.userId);

		// Set new access token in cookie
		setAccessTokenCookie(res, newAccessToken);

		res.json({
			success: true,
			token: newAccessToken,
		});
	} catch (error) {
		logger.error('[AuthController] Refresh token error', error);
		res.status(401).json({
			success: false,
			message: 'Invalid or expired refresh token',
		});
	}
};

// Logout - clears auth cookies
export const logout = async (req: Request, res: Response) => {
	try {
		// Get tokens from cookies before clearing them
		const accessToken = getAccessTokenFromCookies(req.cookies);
		const refreshToken = getRefreshTokenFromCookies(req.cookies);

		// Extract userId from token if available (before blacklisting)
		let userId: string | undefined;
		if (accessToken) {
			try {
				const decoded = jwt.verify(
					accessToken,
					process.env.JWT_SECRET || '',
				) as { id: string };
				userId = decoded.id;
			} catch {
				// Token might be invalid, continue with logout
			}
		}

		// Blacklist both tokens (if they exist)
		// Access token: 15 minutes = 900 seconds
		// Refresh token: 30 days = 2592000 seconds
		if (accessToken) {
			await blacklistToken(accessToken, 900);
		}
		if (refreshToken) {
			await blacklistToken(refreshToken, 2592000);
		}

		// Log logout event if we have userId
		if (userId) {
			await logSecurityEvent({
				userId,
				eventType: 'logout',
				req,
			});
		}

		// Clear auth cookies
		clearAuthCookies(res);

		res.json({
			success: true,
			message: 'Logged out successfully',
		});
	} catch (error) {
		logger.error('[AuthController] Logout error', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

/**
 * Change password for authenticated users
 * Enforces password history (cannot reuse last 5 passwords)
 */
export const changePassword = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const { currentPassword, newPassword } = req.body;

		// Validate inputs
		if (!currentPassword || !newPassword) {
			res.status(400).json({
				success: false,
				message: 'Current password and new password are required',
			});
			return;
		}

		// Find user with password and password history
		const user = await User.findById(req.userId).select(
			'+password +passwordHistory',
		);
		if (!user) {
			res.status(404).json({
				success: false,
				message: 'User not found',
			});
			return;
		}

		// Verify current password
		const isCurrentPasswordValid =
			await user.comparePassword(currentPassword);
		if (!isCurrentPasswordValid) {
			res.status(400).json({
				success: false,
				message: 'Current password is incorrect',
			});
			return;
		}

		// Check if new password was used in the last 5 passwords
		const inHistory = await isPasswordInHistory(
			newPassword,
			user.passwordHistory || [],
		);
		if (inHistory) {
			res.status(400).json({
				success: false,
				message:
					'Ce mot de passe a déjà été utilisé récemment. Veuillez en choisir un nouveau pour votre sécurité.',
			});
			return;
		}

		// Update password history before changing password
		if (user.password) {
			user.passwordHistory = updatePasswordHistory(
				user.password,
				user.passwordHistory || [],
			);
		}

		// Update password (will be hashed by pre-save hook)
		user.password = newPassword;
		// Clear mustChangePassword flag if present
		user.mustChangePassword = false;
		await user.save();

		// Log password change
		await logSecurityEvent({
			userId: (user._id as unknown as string).toString(),
			eventType: 'password_change',
			req,
			metadata: { email: user.email },
		});

		res.json({
			success: true,
			message: 'Password changed successfully',
		});
	} catch (error) {
		logger.error('[AuthController] Change password error', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};
