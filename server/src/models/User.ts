import mongoose, { Document, Schema } from 'mongoose';
import { htmlTextLength } from '../utils/sanitize';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
	firstName: string;
	lastName: string;
	email: string;
	password: string;
	phone?: string;
	userType: 'agent' | 'apporteur' | 'guest' | 'admin';
	isEmailVerified: boolean;
	isGuest: boolean; // True for guest users created from anonymous bookings
	profileImage?: string;
	lastSeen?: Date;

	// Profile completion status
	profileCompleted: boolean;

	// Professional information for agents
	professionalInfo?: {
		agentType?: 'independent' | 'commercial' | 'employee';
		tCard?: string;
		sirenNumber?: string;
		rsacNumber?: string;
		collaboratorCertificate?: string;
		postalCode?: string;
		city?: string;
		interventionRadius?: number;
		coveredCities?: string[];
		network?: string;
		siretNumber?: string;
		mandateTypes?: ('simple' | 'exclusif' | 'co-mandat')[];
		yearsExperience?: number;
		personalPitch?: string;
		collaborateWithAgents?: boolean;
		shareCommission?: boolean;
		independentAgent?: boolean;
		alertsEnabled?: boolean;
		alertFrequency?: 'quotidien' | 'hebdomadaire';
		identityCard?: {
			url: string;
			key: string;
			uploadedAt: Date;
		};
	};

	// Search preferences
	searchPreferences?: {
		preferredRadius?: number; // Preferred search radius in km
		lastSearchLocations?: Array<{
			city: string;
			postcode: string;
			coordinates?: {
				lat: number;
				lon: number;
			};
		}>;
	};

	// Email verification
	emailVerificationCode?: string;
	emailVerificationExpires?: Date;

	// Password reset
	passwordResetCode?: string;
	passwordResetExpires?: Date;

	mustChangePassword?: boolean;

	// Account security
	failedLoginAttempts?: number;
	accountLockedUntil?: Date;

	// Password history (store last 5 password hashes)
	passwordHistory?: Array<{
		hash: string;
		changedAt: Date;
	}>;
	// Billing / subscription
	isPaid: boolean;
	stripeCustomerId?: string;
	stripeSubscriptionId?: string;
	subscriptionStatus?: string;
	subscriptionPlan?: 'monthly' | 'annual';
	subscriptionStartDate?: Date;
	subscriptionEndDate?: Date;
	// Payment tracking
	lastPaymentDate?: Date;
	lastPaymentAmount?: number;
	lastInvoiceId?: string;
	failedPaymentCount?: number;
	lastFailedPaymentDate?: Date;
	// Expiry reminder tracking
	lastExpiryReminderDays?: number;
	lastExpiryReminderSentAt?: Date;
	canceledAt?: Date;
	cancellationReason?: string;
	isValidated: boolean; // Ajout admin
	validatedAt?: Date;
	validatedBy?: mongoose.Types.ObjectId;
	isBlocked?: boolean; // Admin can block user from logging in
	blockedAt?: Date;
	blockedBy?: mongoose.Types.ObjectId;
	accessGrantedByAdmin?: boolean; // Admin can override payment status

	// Soft delete fields
	isDeleted?: boolean;
	deletedAt?: Date;
	deletedBy?: mongoose.Types.ObjectId;

	createdAt: Date;
	updatedAt: Date;
	comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
	{
		firstName: {
			type: String,
			trim: true,
		},
		lastName: {
			type: String,
			trim: true,
		},
		email: {
			type: String,
			unique: true,
			lowercase: true,
			trim: true,
		},
		password: {
			type: String,
			select: false,
		},
		phone: {
			type: String,
			trim: true,
		},
		userType: {
			type: String,
			enum: ['agent', 'apporteur', 'guest', 'admin'],
		},
		isEmailVerified: {
			type: Boolean,
			default: false,
		},
		isGuest: {
			type: Boolean,
			default: false,
			index: true,
		},
		profileImage: {
			type: String,
			default: null,
			maxlength: [500, "URL de l'image trop longue"],
			validate: {
				validator: function (url: string) {
					if (!url) return true;
					try {
						new URL(url);
						return (
							url.startsWith('http://') ||
							url.startsWith('https://')
						);
					} catch {
						return false;
					}
				},
				message: "URL de l'image invalide",
			},
		},
		profileCompleted: {
			type: Boolean,
			default: false,
		},
		lastSeen: {
			type: Date,
			default: null,
		},
		professionalInfo: {
			agentType: {
				type: String,
				enum: ['independent', 'commercial', 'employee'],
				trim: true,
			},
			tCard: {
				type: String,
				trim: true,
			},
			sirenNumber: {
				type: String,
				trim: true,
			},
			rsacNumber: {
				type: String,
				trim: true,
			},
			collaboratorCertificate: {
				type: String,
				trim: true,
			},
			postalCode: {
				type: String,
				trim: true,
				match: [/^[0-9]{5}$/, 'Code postal doit contenir 5 chiffres'],
			},
			city: {
				type: String,
				trim: true,
				maxlength: [100, 'Nom de ville trop long'],
				match: [
					// Includes accented letters (U+00C0-U+00D6, U+00D8-U+00F6, U+00F8-U+00FF), Latin Extended-A, apostrophes, hyphens
					/^[a-zA-Z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\u0100-\u017F\s'''`-]+$/,
					'Nom de ville invalide',
				],
			},
			interventionRadius: {
				type: Number,
				min: [1, "Rayon d'intervention minimum 1 km"],
				max: [200, "Rayon d'intervention maximum 200 km"],
				default: 20,
			},
			coveredCities: [
				{
					type: String,
					trim: true,
					maxlength: [100, 'Nom de ville trop long'],
					match: [
						// Includes accented letters (À-Ö, Ø-ö, ø-ÿ), Latin Extended-A, apostrophes, hyphens
						/^[a-zA-Z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\u0100-\u017F\s'''`-]+$/,
						'Nom de ville invalide',
					],
				},
			],
			network: {
				type: String,
				trim: true,
			},
			siretNumber: {
				type: String,
				trim: true,
				match: [
					/^[0-9]{14}$/,
					'Numéro SIRET doit contenir 14 chiffres',
				],
			},
			mandateTypes: [
				{
					type: String,
					enum: {
						values: ['simple', 'exclusif', 'co-mandat'],
						message: 'Type de mandat invalide',
					},
				},
			],
			yearsExperience: {
				type: Number,
				min: [0, "Années d'expérience ne peut pas être négative"],
				max: [50, "Années d'expérience maximum 50 ans"],
			},
			personalPitch: {
				type: String,
				// Not required at schema level - admin can create users without it
				// Validation enforced at profile completion
				validate: {
					validator: function (v: string) {
						if (!v) return true; // Allow empty for admin-created users
						const length = htmlTextLength(v);
						return length >= 250 && length <= 650;
					},
					message: 'La bio doit contenir entre 250 et 650 caractères',
				},
			},
			collaborateWithAgents: {
				type: Boolean,
				default: true,
			},
			shareCommission: {
				type: Boolean,
				default: false,
			},
			independentAgent: {
				type: Boolean,
				default: false,
			},
			alertsEnabled: {
				type: Boolean,
				default: false,
			},
			alertFrequency: {
				type: String,
				enum: {
					values: ['quotidien', 'hebdomadaire'],
					message: "Fréquence d'alerte invalide",
				},
				default: 'quotidien',
			},
			identityCard: {
				url: {
					type: String,
					trim: true,
					validate: {
						validator: function (url: string) {
							if (!url) return true;
							try {
								new URL(url);
								return (
									url.startsWith('http://') ||
									url.startsWith('https://')
								);
							} catch {
								return false;
							}
						},
						message: "URL de carte d'identité invalide",
					},
				},
				key: {
					type: String,
					trim: true,
				},
				uploadedAt: {
					type: Date,
				},
			},
		},
		searchPreferences: {
			preferredRadius: {
				type: Number,
				min: [1, 'Rayon de recherche minimum 1 km'],
				max: [100, 'Rayon de recherche maximum 100 km'],
				default: 10,
			},
			lastSearchLocations: [
				{
					city: {
						type: String,
						trim: true,
					},
					postcode: {
						type: String,
						match: [/^[0-9]{5}$/, 'Code postal invalide'],
					},
					coordinates: {
						lat: {
							type: Number,
							min: [-90, 'Latitude invalide'],
							max: [90, 'Latitude invalide'],
						},
						lon: {
							type: Number,
							min: [-180, 'Longitude invalide'],
							max: [180, 'Longitude invalide'],
						},
					},
				},
			],
		},
		emailVerificationCode: {
			type: String,
			select: false,
			match: [/^[0-9]{6}$/, 'Code de vérification invalide'],
		},
		emailVerificationExpires: {
			type: Date,
			select: false,
		},
		passwordResetCode: {
			type: String,
			select: false,
			/*
			 Allow either a 6-digit numeric code (legacy/verification style) OR
			 a longer hex/alphanumeric token used for secure invite/reset links.
			*/
			match: [
				/^([0-9]{6}|[0-9A-Za-z]{24,128})$/,
				'Code de réinitialisation invalide',
			],
		},
		passwordResetExpires: {
			type: Date,
			select: false,
		},
		failedLoginAttempts: {
			type: Number,
			default: 0,
			select: false,
		},
		accountLockedUntil: {
			type: Date,
			select: false,
		},
		passwordHistory: {
			type: [
				{
					hash: {
						type: String,
						required: true,
					},
					changedAt: {
						type: Date,
						required: true,
						default: Date.now,
					},
				},
			],
			select: false,
			default: [],
		},
		// Billing / subscription
		isPaid: {
			type: Boolean,
			default: false,
		},
		stripeCustomerId: {
			type: String,
			default: null,
		},
		stripeSubscriptionId: {
			type: String,
			default: null,
		},
		subscriptionStatus: {
			type: String,
			enum: [
				'active',
				'past_due',
				'canceled',
				'expired',
				'pending_activation',
				'pending_cancellation',
				null,
			],
			default: null,
		},
		subscriptionPlan: {
			type: String,
			enum: ['monthly', 'annual', null],
			default: null,
		},
		subscriptionStartDate: {
			type: Date,
			default: null,
		},
		subscriptionEndDate: {
			type: Date,
			default: null,
		},
		// Payment tracking
		lastPaymentDate: {
			type: Date,
			default: null,
		},
		lastPaymentAmount: {
			type: Number,
			default: null,
		},
		lastInvoiceId: {
			type: String,
			default: null,
		},
		failedPaymentCount: {
			type: Number,
			default: 0,
		},
		lastFailedPaymentDate: {
			type: Date,
			default: null,
		},
		// Expiry reminder tracking (to avoid duplicate emails)
		lastExpiryReminderDays: {
			type: Number,
			default: null,
		},
		lastExpiryReminderSentAt: {
			type: Date,
			default: null,
		},
		canceledAt: {
			type: Date,
			default: null,
		},
		cancellationReason: {
			type: String,
			default: null,
		},
		isValidated: {
			type: Boolean,
			default: false,
			index: true,
		},
		validatedAt: {
			type: Date,
			default: null,
		},
		validatedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			default: null,
		},
		isBlocked: {
			type: Boolean,
			default: false,
			index: true,
		},
		blockedAt: {
			type: Date,
			default: null,
		},
		blockedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			default: null,
		},
		accessGrantedByAdmin: {
			type: Boolean,
			default: false,
			index: true,
		},
		// Force user to change password at next login (used when admin issues a temp password)
		mustChangePassword: {
			type: Boolean,
			default: false,
			index: true,
		},
		// Soft delete fields
		isDeleted: {
			type: Boolean,
			default: false,
			index: true,
		},
		deletedAt: {
			type: Date,
			default: null,
		},
		deletedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			default: null,
		},
	},
	{
		timestamps: true,
	},
);

// Indexes for performance
// 'email' already has `unique: true` on the schema path, so we don't redeclare it here to avoid duplicate index warnings
userSchema.index({ emailVerificationCode: 1 });
userSchema.index({ emailVerificationExpires: 1 });
userSchema.index({ passwordResetCode: 1 });
userSchema.index({ passwordResetExpires: 1 });
userSchema.index({ userType: 1 });
userSchema.index({ profileCompleted: 1 });
userSchema.index({ 'professionalInfo.postalCode': 1 });
userSchema.index({ 'professionalInfo.city': 1 });
userSchema.index({ accountLockedUntil: 1 });
// Indexes for billing lookups
userSchema.index({ stripeCustomerId: 1 });
userSchema.index({ isPaid: 1 });

// Compound indexes
userSchema.index({
	email: 1,
	emailVerificationCode: 1,
	emailVerificationExpires: 1,
});

userSchema.index({
	userType: 1,
	'professionalInfo.postalCode': 1,
	'professionalInfo.interventionRadius': 1,
});

// Pre-save middleware for password hashing
userSchema.pre('save', async function (next) {
	// Skip if password not modified or if it's a guest user with no password
	if (!this.isModified('password') || !this.password || this.isGuest) {
		return next();
	}

	try {
		// Avoid double-hashing if password is already a bcrypt hash (e.g., migrated from PendingVerification)
		const isBcryptHash = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
		if (isBcryptHash.test(this.password)) {
			return next();
		}

		const salt = await bcrypt.genSalt(12);
		this.password = await bcrypt.hash(this.password, salt);
		next();
	} catch (error) {
		next(error as Error);
	}
});

// Pre-save middleware for phone number normalization
userSchema.pre('save', function (next) {
	if (this.phone) {
		this.phone = this.phone.replace(/\s+/g, '').replace(/^(\+33)/, '0');
	}
	next();
});

// Compare password method
userSchema.methods.comparePassword = async function (
	candidatePassword: string,
): Promise<boolean> {
	return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema);
