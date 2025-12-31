import { body } from 'express-validator';

// Base validation rules
const baseRules = {
	firstName: body('firstName')
		.exists({ checkFalsy: true })
		.withMessage('Prénom requis')
		.bail()
		.isLength({ min: 2, max: 50 })
		.withMessage('Le prénom doit contenir entre 2 et 50 caractères')
		.matches(/^[a-zA-ZÀ-ÿ\u0100-\u017F\s'-]+$/) // Support French accents
		.withMessage(
			'Le prénom ne peut contenir que des lettres, espaces, apostrophes et tirets',
		),

	lastName: body('lastName')
		.exists({ checkFalsy: true })
		.withMessage('Nom requis')
		.bail()
		.isLength({ min: 2, max: 50 })
		.withMessage('Le nom doit contenir entre 2 et 50 caractères')
		.matches(/^[a-zA-ZÀ-ÿ\u0100-\u017F\s'-]+$/)
		.withMessage(
			'Le nom ne peut contenir que des lettres, espaces, apostrophes et tirets',
		),

	email: body('email')
		.exists({ checkFalsy: true })
		.withMessage('Email requis')
		.bail()
		.isEmail()
		.withMessage('Veuillez fournir une adresse email valide')
		.normalizeEmail({
			gmail_remove_dots: false,
			gmail_remove_subaddress: false,
			outlookdotcom_remove_subaddress: false,
			yahoo_remove_subaddress: false,
		})
		.isLength({ max: 254 }) // RFC 5321 limit
		.withMessage("L'email ne peut pas dépasser 254 caractères"),

	password: body('password')
		.exists({ checkFalsy: true })
		.withMessage('Le mot de passe est requis')
		.bail()
		.isLength({ min: 8, max: 128 }) // Increased minimum to match frontend
		.withMessage('Le mot de passe doit contenir entre 8 et 128 caractères')
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])?.*$/)
		.withMessage(
			'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre',
		),

	// French phone number validation
	phone: body('phone')
		.optional({ checkFalsy: true })
		.matches(/^(?:(?:\+33|0)[1-9])(?:[0-9]{8})$/)
		.withMessage('Veuillez fournir un numéro de téléphone français valide')
		.customSanitizer((value) => {
			if (!value) return value;
			// Normalize phone format
			return value.replace(/\s+/g, '').replace(/^(\+33)/, '0');
		}),

	userType: body('userType')
		.exists({ checkFalsy: true })
		.withMessage('Veuillez choisir votre rôle')
		.bail()
		.isIn(['agent', 'apporteur'])
		.withMessage('Le type d\'utilisateur doit être "agent" ou "apporteur"'),
};

// Professional info validation rules
const professionalInfoRules = {
	postalCode: body('professionalInfo.postalCode')
		.exists({ checkFalsy: true })
		.withMessage('Le code postal est requis')
		.trim()
		.matches(/^[0-9]{5}$/)
		.withMessage('Le code postal doit contenir exactement 5 chiffres'),

	city: body('professionalInfo.city')
		.exists({ checkFalsy: true })
		.withMessage('La ville est requise')
		.trim()
		.escape()
		.isLength({ min: 2, max: 100 })
		.withMessage(
			'Le nom de la ville doit contenir entre 2 et 100 caractères',
		)
		.matches(/^[a-zA-ZÀ-ÿ\u0100-\u017F\s'-]+$/)
		.withMessage(
			'Le nom de la ville ne peut contenir que des lettres, espaces, apostrophes et tirets',
		),

	interventionRadius: body('professionalInfo.interventionRadius')
		.exists({ checkFalsy: true })
		.withMessage("Le rayon d'intervention est requis")
		.isInt({ min: 1, max: 200 })
		.withMessage("Le rayon d'intervention doit être entre 1 et 200 km")
		.toInt(),

	network: body('professionalInfo.network')
		.optional()
		.trim()
		.isString()
		.withMessage('Le réseau doit être une chaîne de caractères'),

	siretNumber: body('professionalInfo.siretNumber')
		.optional({ checkFalsy: true })
		.trim()
		.matches(/^[0-9]{14}$/)
		.withMessage('Le numéro SIRET doit contenir exactement 14 chiffres'),

	yearsExperience: body('professionalInfo.yearsExperience')
		.exists({ checkFalsy: true })
		.withMessage("Les années d'expérience sont requises")
		.isInt({ min: 0, max: 50 })
		.withMessage("Les années d'expérience doivent être entre 0 et 50")
		.toInt(),

	personalPitch: body('professionalInfo.personalPitch')
		.exists({ checkFalsy: true })
		.withMessage('La bio personnelle est requise')
		.trim()
		.escape()
		.isLength({ min: 250, max: 1000 })
		.withMessage('La bio doit contenir entre 250 et 650 caractères'),

	mandateTypes: body('professionalInfo.mandateTypes')
		.optional()
		.isArray()
		.withMessage('Les types de mandat doivent être un tableau')
		.custom((value) => {
			if (!Array.isArray(value)) return false;
			const validTypes = ['simple', 'exclusif', 'co-mandat'];
			return value.every((type) => validTypes.includes(type));
		})
		.withMessage('Types de mandat invalides'),

	coveredCities: body('professionalInfo.coveredCities')
		.exists({ checkFalsy: true })
		.withMessage('Au moins une commune couverte est requise')
		.isArray()
		.withMessage('Les villes couvertes doivent être un tableau')
		.custom((value) => {
			if (!Array.isArray(value)) return false;
			if (value.length === 0) return false;
			// Regex includes accented letters (U+00C0-U+00D6, U+00D8-U+00F6, U+00F8-U+00FF), Latin Extended-A, apostrophes, hyphens
			return value.every(
				(city) =>
					typeof city === 'string' &&
					city.length >= 2 &&
					city.length <= 100 &&
					/^[a-zA-Z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\u0100-\u017F\s'''`-]+$/.test(
						city,
					),
			);
		})
		.withMessage('Noms de villes invalides'),

	collaborateWithAgents: body('professionalInfo.collaborateWithAgents')
		.optional()
		.isBoolean()
		.withMessage('La collaboration avec les agents doit être un booléen')
		.toBoolean(),

	shareCommission: body('professionalInfo.shareCommission')
		.optional()
		.isBoolean()
		.withMessage('Le partage de commission doit être un booléen')
		.toBoolean(),

	independentAgent: body('professionalInfo.independentAgent')
		.optional()
		.isBoolean()
		.withMessage('Agent indépendant doit être un booléen')
		.toBoolean(),

	alertsEnabled: body('professionalInfo.alertsEnabled')
		.optional()
		.isBoolean()
		.withMessage('Les alertes activées doivent être un booléen')
		.toBoolean(),

	alertFrequency: body('professionalInfo.alertFrequency')
		.optional()
		.isIn(['quotidien', 'hebdomadaire'])
		.withMessage(
			'La fréquence d\'alerte doit être "quotidien" ou "hebdomadaire"',
		),
};

// Combined validation schemas
export const signupValidation = [
	baseRules.firstName,
	baseRules.lastName,
	baseRules.email,
	baseRules.password,
	baseRules.phone,
	baseRules.userType,
];

export const loginValidation = [
	baseRules.email,
	body('password')
		.notEmpty()
		.withMessage('Le mot de passe est requis')
		.isLength({ min: 1 })
		.withMessage('Le mot de passe ne peut pas être vide'),
];

export const updateProfileValidation = [
	body('firstName')
		.optional()
		.trim()
		.escape()
		.isLength({ min: 2, max: 50 })
		.withMessage('Le prénom doit contenir entre 2 et 50 caractères')
		.matches(/^[a-zA-ZÀ-ÿ\u0100-\u017F\s'-]+$/)
		.withMessage(
			'Le prénom ne peut contenir que des lettres, espaces, apostrophes et tirets',
		),

	body('lastName')
		.optional()
		.trim()
		.escape()
		.isLength({ min: 2, max: 50 })
		.withMessage('Le nom doit contenir entre 2 et 50 caractères')
		.matches(/^[a-zA-ZÀ-ÿ\u0100-\u017F\s'-]+$/)
		.withMessage(
			'Le nom ne peut contenir que des lettres, espaces, apostrophes et tirets',
		),

	body('phone')
		.optional({ checkFalsy: true })
		.trim()
		.matches(/^(?:(?:\+33|0)[1-9])(?:[0-9]{8})$/)
		.withMessage('Veuillez fournir un numéro de téléphone français valide'),

	body('profileImage')
		.optional({ checkFalsy: true })
		.isURL({ protocols: ['http', 'https'], require_protocol: true })
		.withMessage("L'image de profil doit être une URL valide")
		.isLength({ max: 500 })
		.withMessage("L'URL de l'image ne peut pas dépasser 500 caractères"),
];

export const verifyEmailValidation = [
	baseRules.email,
	body('code')
		.trim()
		.isLength({ min: 6, max: 6 })
		.withMessage(
			'Le code de vérification doit contenir exactement 6 chiffres',
		)
		.isNumeric()
		.withMessage(
			'Le code de vérification ne peut contenir que des chiffres',
		),
];

export const forgotPasswordValidation = [baseRules.email];

export const resetPasswordValidation = [
	baseRules.email,
	body('code')
		.trim()
		.isLength({ min: 6, max: 6 })
		.withMessage(
			'Le code de réinitialisation doit contenir exactement 6 chiffres',
		)
		.isNumeric()
		.withMessage(
			'Le code de réinitialisation ne peut contenir que des chiffres',
		),
	body('newPassword')
		.isLength({ min: 8, max: 128 })
		.withMessage('Le mot de passe doit contenir entre 8 et 128 caractères')
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])?.*$/)
		.withMessage(
			'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre',
		),
];

export const completeProfileValidation = [
	professionalInfoRules.postalCode,
	professionalInfoRules.city,
	professionalInfoRules.interventionRadius,
	professionalInfoRules.network,
	professionalInfoRules.siretNumber,
	professionalInfoRules.yearsExperience,
	professionalInfoRules.personalPitch,
	professionalInfoRules.mandateTypes,
	professionalInfoRules.coveredCities,
	professionalInfoRules.collaborateWithAgents,
	professionalInfoRules.shareCommission,
	professionalInfoRules.independentAgent,
	professionalInfoRules.alertsEnabled,
	professionalInfoRules.alertFrequency,
];

export const resendVerificationValidation = [baseRules.email];

// Property validation rules
const propertyBaseRules = {
	mandateNumber: body('mandateNumber')
		.optional()
		.trim()
		.escape()
		.isLength({ max: 50 })
		.withMessage(
			'Le numéro de mandat doit contenir moins de 50 caractères',
		),

	title: body('title')
		.trim()
		.escape()
		.isLength({ min: 10, max: 200 })
		.withMessage('Le titre doit contenir entre 10 et 200 caractères'),

	description: body('description')
		.trim()
		.escape()
		.isLength({ min: 50, max: 2000 })
		.withMessage(
			'La description doit contenir entre 50 et 2000 caractères',
		),

	price: body('price')
		.isFloat({ min: 1000, max: 50000000 })
		.withMessage('Le prix doit être entre 1,000€ et 50,000,000€')
		.toFloat(),

	surface: body('surface')
		.isFloat({ min: 1, max: 10000 })
		.withMessage('La surface doit être entre 1 m² et 10,000 m²')
		.toFloat(),

	propertyType: body('propertyType')
		.isIn([
			'Appartement',
			'Maison',
			'Terrain',
			'Local commercial',
			'Bureaux',
		])
		.withMessage('Type de bien invalide'),

	transactionType: body('transactionType')
		.optional()
		.isIn(['Vente', 'Location'])
		.withMessage('Type de transaction invalide'),

	address: body('address')
		.trim()
		.escape()
		.isLength({ min: 5, max: 200 })
		.withMessage("L'adresse doit contenir entre 5 et 200 caractères"),

	city: body('city')
		.trim()
		.escape()
		.isLength({ min: 2, max: 100 })
		.withMessage('La ville doit contenir entre 2 et 100 caractères')
		.matches(/^[a-zA-ZÀ-ÿ\u0100-\u017F\s'-]+$/)
		.withMessage('Nom de ville invalide'),

	postalCode: body('postalCode')
		.trim()
		.matches(/^[0-9]{5}$/)
		.withMessage('Le code postal doit contenir exactement 5 chiffres'),

	sector: body('sector')
		.trim()
		.escape()
		.isLength({ min: 2, max: 100 })
		.withMessage('Le secteur doit contenir entre 2 et 100 caractères'),

	mainImage: body('mainImage')
		.isURL({ protocols: ['http', 'https'], require_protocol: true })
		.withMessage("L'image principale doit être une URL valide"),

	images: body('images')
		.optional()
		.isArray()
		.withMessage('Les images doivent être un tableau')
		.custom((value) => {
			if (!Array.isArray(value)) return false;
			return value.every((url) => {
				try {
					new URL(url);
					return (
						url.startsWith('http://') || url.startsWith('https://')
					);
				} catch {
					return false;
				}
			});
		})
		.withMessage("URLs d'images invalides"),

	rooms: body('rooms')
		.optional()
		.isInt({ min: 1, max: 50 })
		.withMessage('Le nombre de pièces doit être entre 1 et 50')
		.toInt(),

	bedrooms: body('bedrooms')
		.optional()
		.isInt({ min: 0, max: 20 })
		.withMessage('Le nombre de chambres doit être entre 0 et 20')
		.toInt(),

	bathrooms: body('bathrooms')
		.optional()
		.isInt({ min: 0, max: 10 })
		.withMessage('Le nombre de salles de bain doit être entre 0 et 10')
		.toInt(),

	showerRooms: body('showerRooms')
		.optional()
		.isInt({ min: 0, max: 10 })
		.withMessage("Le nombre de salles d'eau doit être entre 0 et 10")
		.toInt(),

	floor: body('floor')
		.optional()
		.isInt({ min: -5, max: 100 })
		.withMessage("L'étage doit être entre -5 et 100")
		.toInt(),

	totalFloors: body('totalFloors')
		.optional()
		.isInt({ min: 1, max: 200 })
		.withMessage("Le nombre total d'étages doit être entre 1 et 200")
		.toInt(),

	energyRating: body('energyRating')
		.optional()
		.isIn(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
		.withMessage('Classe énergétique invalide'),

	yearBuilt: body('yearBuilt')
		.optional()
		.isInt({ min: 1800, max: new Date().getFullYear() + 5 })
		.withMessage('Année de construction invalide')
		.toInt(),

	heatingType: body('heatingType')
		.optional()
		.trim()
		.escape()
		.isLength({ max: 100 })
		.withMessage('Type de chauffage trop long'),

	orientation: body('orientation')
		.optional()
		.isIn([
			'Nord',
			'Sud',
			'Est',
			'Ouest',
			'Nord-Est',
			'Nord-Ouest',
			'Sud-Est',
			'Sud-Ouest',
		])
		.withMessage('Orientation invalide'),

	// Boolean fields
	hasParking: body('hasParking')
		.optional()
		.isBoolean()
		.withMessage('Parking doit être un booléen')
		.toBoolean(),

	hasGarden: body('hasGarden')
		.optional()
		.isBoolean()
		.withMessage('Jardin doit être un booléen')
		.toBoolean(),

	hasElevator: body('hasElevator')
		.optional()
		.isBoolean()
		.withMessage('Ascenseur doit être un booléen')
		.toBoolean(),

	hasBalcony: body('hasBalcony')
		.optional()
		.isBoolean()
		.withMessage('Balcon doit être un booléen')
		.toBoolean(),

	hasTerrace: body('hasTerrace')
		.optional()
		.isBoolean()
		.withMessage('Terrasse doit être un booléen')
		.toBoolean(),

	hasGarage: body('hasGarage')
		.optional()
		.isBoolean()
		.withMessage('Garage doit être un booléen')
		.toBoolean(),

	badges: body('badges')
		.optional()
		.isArray()
		.withMessage('Les badges doivent être un tableau'),

	isFeatured: body('isFeatured')
		.optional()
		.isBoolean()
		.withMessage('Mis en avant doit être un booléen')
		.toBoolean(),

	status: body('status')
		.optional()
		.isIn(['active', 'sold', 'rented', 'draft', 'archived'])
		.withMessage('Statut invalide'),
};

export const createPropertyValidation = [
	propertyBaseRules.title,
	propertyBaseRules.description,
	propertyBaseRules.price,
	propertyBaseRules.surface,
	propertyBaseRules.propertyType,
	propertyBaseRules.transactionType,
	propertyBaseRules.address,
	propertyBaseRules.city,
	propertyBaseRules.postalCode,
	propertyBaseRules.sector,
	propertyBaseRules.mainImage,
	propertyBaseRules.images,
	propertyBaseRules.rooms,
	propertyBaseRules.bedrooms,
	propertyBaseRules.bathrooms,
	propertyBaseRules.floor,
	propertyBaseRules.totalFloors,
	propertyBaseRules.energyRating,
	propertyBaseRules.yearBuilt,
	propertyBaseRules.heatingType,
	propertyBaseRules.orientation,
	propertyBaseRules.hasParking,
	propertyBaseRules.hasGarden,
	propertyBaseRules.hasElevator,
	propertyBaseRules.hasBalcony,
	propertyBaseRules.hasTerrace,
	propertyBaseRules.hasGarage,
	propertyBaseRules.badges,
	propertyBaseRules.isFeatured,
	propertyBaseRules.status,
];

export const updatePropertyValidation = [
	body('title')
		.optional()
		.trim()
		.escape()
		.isLength({ min: 10, max: 200 })
		.withMessage('Le titre doit contenir entre 10 et 200 caractères'),

	body('description')
		.optional()
		.trim()
		.escape()
		.isLength({ min: 50, max: 2000 })
		.withMessage(
			'La description doit contenir entre 50 et 2000 caractères',
		),

	body('price')
		.optional()
		.isFloat({ min: 1000, max: 50000000 })
		.withMessage('Le prix doit être entre 1,000€ et 50,000,000€')
		.toFloat(),

	body('surface')
		.optional()
		.isFloat({ min: 1, max: 10000 })
		.withMessage('La surface doit être entre 1 m² et 10,000 m²')
		.toFloat(),

	body('propertyType')
		.optional()
		.isIn([
			'Appartement',
			'Maison',
			'Terrain',
			'Local commercial',
			'Bureaux',
		])
		.withMessage('Type de bien invalide'),

	body('city')
		.optional()
		.trim()
		.escape()
		.isLength({ min: 2, max: 100 })
		.withMessage('La ville doit contenir entre 2 et 100 caractères'),

	body('postalCode')
		.optional()
		.trim()
		.matches(/^[0-9]{5}$/)
		.withMessage('Le code postal doit contenir exactement 5 chiffres'),
];

export const updatePropertyStatusValidation = [
	body('status')
		.isIn(['active', 'sold', 'rented', 'draft', 'archived'])
		.withMessage('Statut invalide'),
];

// Collaboration validation rules
export const proposeCollaborationValidation = [
	body('propertyId').isMongoId().withMessage('ID de propriété invalide'),
	body('collaboratorId')
		.optional()
		.isMongoId()
		.withMessage('ID de collaborateur invalide'),
	body('commissionPercentage')
		.isFloat({ min: 0, max: 100 })
		.withMessage('Le pourcentage de commission doit être entre 0 et 100'),
	body('message')
		.optional()
		.trim()
		.isLength({ max: 500 })
		.withMessage('Le message ne peut pas dépasser 500 caractères'),
];

export const collaborationIdValidation = [
	body('collaborationId')
		.isMongoId()
		.withMessage('ID de collaboration invalide'),
];

export const respondToCollaborationValidation = [
	body('response')
		.isIn(['accepted', 'rejected'])
		.withMessage('Réponse invalide'),
];

export const addCollaborationNoteValidation = [
	body('content')
		.trim()
		.isLength({ min: 1, max: 1000 })
		.withMessage('La note doit contenir entre 1 et 1000 caractères'),
];

export const updateProgressStatusValidation = [
	body('targetStep')
		.isIn([
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
		])
		.withMessage('Étape de progression invalide'),
	body('validatedBy')
		.isIn(['owner', 'collaborator'])
		.withMessage('validatedBy doit être "owner" ou "collaborator"'),
	body('notes')
		.optional()
		.trim()
		.isLength({ max: 500 })
		.withMessage('Les notes ne peuvent pas dépasser 500 caractères'),
];

export const updateContractValidation = [
	body('contractText')
		.optional()
		.trim()
		.isLength({ max: 10000 })
		.withMessage(
			'Le texte du contrat ne peut pas dépasser 10000 caractères',
		),
	body('additionalTerms')
		.optional()
		.trim()
		.isLength({ max: 2000 })
		.withMessage(
			'Les termes additionnels ne peuvent pas dépasser 2000 caractères',
		),
];
