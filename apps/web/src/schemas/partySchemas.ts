import { z } from 'zod';
import { LossType, PartyType } from '@/config/enums';
import { addressSchema } from './addressSchemas';

// ============================================================================
// ENUMS FOR TYPE/STATUS FIELDS
// ============================================================================

export const AddressType = {
	HOME: 'home',
	BUSINESS: 'business',
} as const;

export const AddressStatus = {
	VALID: 'valid',
	MAILING: 'mailing',
	UNDELIVERABLE: 'undeliverable',
	UNKNOWN: 'unknown',
} as const;

export const PhoneType = {
	MOBILE: 'mobile',
	HOME: 'home',
	WORK: 'work',
	FAX: 'fax',
} as const;

export const PhoneStatus = {
	VALID: 'valid',
	DISCONNECTED: 'disconnected',
	UNKNOWN: 'unknown',
} as const;

export const EmailType = {
	PERSONAL: 'personal',
	BUSINESS: 'business',
} as const;

// Zod enum schemas
export const addressTypeSchema = z.enum(['home', 'business']);
export const addressStatusSchema = z.enum(['valid', 'mailing', 'undeliverable', 'unknown']);
export const phoneTypeSchema = z.enum(['mobile', 'home', 'work', 'fax']);
export const phoneStatusSchema = z.enum(['valid', 'disconnected', 'unknown']);
export const emailTypeSchema = z.enum(['personal', 'business']);

// ============================================================================
// INLINE CONTACT SCHEMA (for party create/update with optional contact info)
// ============================================================================

/**
 * Optional inline contact data for party creation/update.
 * Creates records in separate tables (party_email, party_phone, party_address)
 * within the same transaction.
 */
export const inlineContactSchema = z
	.object({
		// Optional primary email
		email: z.string().email().optional().or(z.literal('')),
		email_type: emailTypeSchema.optional().default('business'),

		// Optional primary phone (simple string - controller can parse components)
		phone: z.string().max(50).optional(),
		phone_type: phoneTypeSchema.optional().default('work'),

		// Optional primary address
		address: addressSchema.optional(),
		address_type: addressTypeSchema.optional().default('business'),
	})
	.optional();

export type InlineContact = z.infer<typeof inlineContactSchema>;

// ============================================================================
// PARTY SCHEMAS
// ============================================================================

/**
 * Get parties list with pagination and search
 */
export const getPartiesInput = z.object({
	searchTerm: z.string().optional(),
	limit: z.number().int().positive().optional(),
	offset: z.number().int().min(0).optional(),
	showArchived: z.boolean().optional(),
});

/**
 * Get single party by ID
 */
export const getPartyInput = z.object({
	id: z.string().uuid(),
});

/**
 * Search parties for deduplication
 */
export const searchPartiesInput = z.object({
	searchTerm: z.string().min(1),
	partyType: z.nativeEnum(PartyType).optional(),
});

/**
 * Create party input
 * - Business parties use `name` field
 * - Individual parties use first_name, middle_name, last_name, suffix
 * - Optional inline contact info (email, phone, address) creates records in separate tables
 */
export const createPartyInput = z
	.object({
		party_type: z.nativeEnum(PartyType),
		is_business: z.boolean().default(true),
		// Business name (used when is_business=true)
		name: z.string().max(255).optional(),
		// Individual name fields (used when is_business=false)
		first_name: z.string().max(100).optional(),
		middle_name: z.string().max(100).optional(),
		last_name: z.string().max(100).optional(),
		suffix: z.string().max(20).optional(),
		// Other party fields
		organization: z.string().max(255).optional(),
		notes: z.string().max(2000).optional(),
		// Optional inline contact data (creates records in separate tables)
		contact: inlineContactSchema,
	})
	.refine(
		(data) => {
			if (data.is_business) {
				return !!data.name && data.name.length >= 2;
			} else {
				return !!data.first_name && !!data.last_name;
			}
		},
		{
			message: 'Business parties require name (min 2 chars); individuals require first_name and last_name',
		}
	);

export type CreatePartyInput = z.infer<typeof createPartyInput>;

/**
 * Update party input
 */
export const updatePartyInput = z.object({
	id: z.string().uuid(),
	params: z.object({
		party_type: z.nativeEnum(PartyType).optional(),
		is_business: z.boolean().optional(),
		// Business name
		name: z.string().max(255).optional(),
		// Individual name fields
		first_name: z.string().max(100).optional(),
		middle_name: z.string().max(100).optional(),
		last_name: z.string().max(100).optional(),
		suffix: z.string().max(20).optional(),
		// Other party fields
		organization: z.string().max(255).optional(),
		notes: z.string().max(2000).optional(),
		// Optional inline contact data (creates/updates records in separate tables)
		contact: inlineContactSchema,
	}),
});

export type UpdatePartyInput = z.infer<typeof updatePartyInput>;

/**
 * Delete party input
 */
export const deletePartyInput = z.object({
	id: z.string().uuid(),
});

// ============================================================================
// PARTY ADDRESS SCHEMAS (renamed from PARTY OFFICE)
// ============================================================================

/**
 * Get party addresses
 */
export const getPartyAddressesInput = z.object({
	partyId: z.string().uuid(),
	showArchived: z.boolean().optional(),
});

/**
 * Get all party addresses (for standalone admin tab)
 */
export const getAllPartyAddressesInput = z.object({
	searchTerm: z.string().optional(),
	limit: z.number().int().positive().optional(),
	offset: z.number().int().nonnegative().optional(),
	showArchived: z.boolean().optional(),
});

/**
 * Get single party address by ID
 */
export const getPartyAddressInput = z.object({
	id: z.string().uuid(),
});

/**
 * Create party address input
 */
export const createPartyAddressInput = z
	.object({
		party_id: z.string().uuid(),
		name: z.string().max(255).optional(), // Label like "Home", "Work", "Headquarters"
		address_type: addressTypeSchema.default('business'),
		address_status: addressStatusSchema.default('valid'),
	})
	.merge(addressSchema);

export type CreatePartyAddressInput = z.infer<typeof createPartyAddressInput>;

/**
 * Update party address input
 */
export const updatePartyAddressInput = z.object({
	id: z.string().uuid(),
	params: z
		.object({
			name: z.string().max(255).optional(),
			address_type: addressTypeSchema.optional(),
			address_status: addressStatusSchema.optional(),
		})
		.merge(addressSchema),
});

export type UpdatePartyAddressInput = z.infer<typeof updatePartyAddressInput>;

/**
 * Archive party address input (soft delete)
 */
export const archivePartyAddressInput = z.object({
	id: z.string().uuid(),
});

/**
 * Restore party address input
 */
export const restorePartyAddressInput = z.object({
	id: z.string().uuid(),
});

// Legacy aliases for backwards compatibility
export const getPartyOfficesInput = getPartyAddressesInput;
export const getAllPartyOfficesInput = getAllPartyAddressesInput;
export const createPartyOfficeInput = createPartyAddressInput;
export const updatePartyOfficeInput = updatePartyAddressInput;
export const archivePartyOfficeInput = archivePartyAddressInput;
export const deletePartyOfficeInput = archivePartyAddressInput;

// ============================================================================
// PARTY PHONE SCHEMAS
// ============================================================================

/**
 * Get party phones
 */
export const getPartyPhonesInput = z.object({
	partyId: z.string().uuid(),
	showArchived: z.boolean().optional(),
});

/**
 * Create party phone input
 */
export const createPartyPhoneInput = z.object({
	party_id: z.string().uuid(),
	country_code: z.string().max(5).optional(),
	area_code: z.string().max(10).optional(),
	phone_number: z.string().min(1).max(20),
	extension: z.string().max(10).optional(),
	phone_type: phoneTypeSchema,
	phone_status: phoneStatusSchema.default('unknown'),
});

export type CreatePartyPhoneInput = z.infer<typeof createPartyPhoneInput>;

/**
 * Update party phone input
 */
export const updatePartyPhoneInput = z.object({
	id: z.string().uuid(),
	params: z.object({
		country_code: z.string().max(5).optional(),
		area_code: z.string().max(10).optional(),
		phone_number: z.string().min(1).max(20).optional(),
		extension: z.string().max(10).optional(),
		phone_type: phoneTypeSchema.optional(),
		phone_status: phoneStatusSchema.optional(),
	}),
});

export type UpdatePartyPhoneInput = z.infer<typeof updatePartyPhoneInput>;

/**
 * Archive party phone input
 */
export const archivePartyPhoneInput = z.object({
	id: z.string().uuid(),
});

/**
 * Restore party phone input
 */
export const restorePartyPhoneInput = z.object({
	id: z.string().uuid(),
});

// ============================================================================
// PARTY EMAIL SCHEMAS
// ============================================================================

/**
 * Get party emails
 */
export const getPartyEmailsInput = z.object({
	partyId: z.string().uuid(),
	showArchived: z.boolean().optional(),
});

/**
 * Create party email input
 */
export const createPartyEmailInput = z.object({
	party_id: z.string().uuid(),
	email_address: z.string().email(),
	email_type: emailTypeSchema.default('business'),
});

export type CreatePartyEmailInput = z.infer<typeof createPartyEmailInput>;

/**
 * Update party email input
 */
export const updatePartyEmailInput = z.object({
	id: z.string().uuid(),
	params: z.object({
		email_address: z.string().email().optional(),
		email_type: emailTypeSchema.optional(),
	}),
});

export type UpdatePartyEmailInput = z.infer<typeof updatePartyEmailInput>;

/**
 * Archive party email input
 */
export const archivePartyEmailInput = z.object({
	id: z.string().uuid(),
});

/**
 * Restore party email input
 */
export const restorePartyEmailInput = z.object({
	id: z.string().uuid(),
});

// ============================================================================
// PARTY REPRESENTATIVE SCHEMAS
// ============================================================================

/**
 * Get party representatives
 */
export const getPartyRepresentativesInput = z.object({
	partyId: z.string().uuid(),
	addressId: z.string().uuid().optional(), // Renamed from officeId
	showArchived: z.boolean().optional(),
});

/**
 * Get all party representatives (for standalone admin tab)
 */
export const getAllPartyRepresentativesInput = z.object({
	searchTerm: z.string().optional(),
	limit: z.number().int().positive().optional(),
	offset: z.number().int().nonnegative().optional(),
	showArchived: z.boolean().optional(),
});

/**
 * Create party representative input
 */
export const createPartyRepresentativeInput = z.object({
	party_id: z.string().uuid(),
	address_id: z.string().uuid().optional(), // Renamed from office_id
	first_name: z.string().min(1).max(100),
	last_name: z.string().min(1).max(100),
	title: z.string().max(100).optional(),
	email: z.string().email().optional().or(z.literal('')),
	phone: z.string().max(50).optional(),
	mobile_phone: z.string().max(50).optional(),
	fax: z.string().max(50).optional(),
	is_primary: z.boolean().optional(),
});

/**
 * Update party representative input
 */
export const updatePartyRepresentativeInput = z.object({
	id: z.string().uuid(),
	params: z.object({
		address_id: z.string().uuid().optional(), // Renamed from office_id
		first_name: z.string().min(1).max(100).optional(),
		last_name: z.string().min(1).max(100).optional(),
		title: z.string().max(100).optional(),
		email: z.string().email().optional().or(z.literal('')),
		phone: z.string().max(50).optional(),
		mobile_phone: z.string().max(50).optional(),
		fax: z.string().max(50).optional(),
		is_primary: z.boolean().optional(),
	}),
});

/**
 * Archive party representative input (soft delete)
 */
export const archivePartyRepresentativeInput = z.object({
	id: z.string().uuid(),
});

/**
 * Restore party representative input
 */
export const restorePartyRepresentativeInput = z.object({
	id: z.string().uuid(),
});

/**
 * Delete party representative input (for backwards compatibility - now archives)
 */
export const deletePartyRepresentativeInput = archivePartyRepresentativeInput;

// ============================================================================
// CLAIM PARTY LINKING SCHEMAS
// ============================================================================

/**
 * Get claim parties
 */
export const getClaimPartiesInput = z.object({
	claimId: z.string().uuid(),
	partyType: z.nativeEnum(PartyType).optional(),
	roleListEntity: z.enum(['claimant_party_role', 'adverse_party_role']).optional(),
});

/**
 * Link party to claim input
 * Note: liability_percentage is on claim_party for entities
 * Note: loss_type and policy_limit are on claim_party for facilitators
 * Note: Free-form representative fields for entities, structured (representative_id + address_id) for facilitators
 */
export const linkPartyToClaimInput = z.object({
	claim_id: z.string().uuid(),
	party_id: z.string().uuid(),
	role: z.array(z.string()).min(1), // Array of roles for this party on this claim
	// Structured representative (for facilitators)
	representative_id: z.string().uuid().nullable().optional(),
	address_id: z.string().uuid().nullable().optional(),
	// Free-form representative field (for entities)
	representative_name: z.string().max(200).nullable().optional(),
	// Other fields
	is_primary: z.boolean().optional(),
	liability_percentage: z.number().min(0).max(100).optional(),
	notes: z.string().max(2000).optional(),
	external_reference: z.string().max(255).optional(),
	parent_claim_party_id: z.string().uuid().nullable().optional(),
	// Facilitator-specific fields
	loss_type: z.nativeEnum(LossType).nullable().optional(),
	policy_limit: z.number().min(0).nullable().optional(),
});

/**
 * Update claim party relationship input
 * Note: liability_percentage is on claim_party for entities
 * Note: loss_type and policy_limit are on claim_party for facilitators
 * Note: Free-form representative fields for entities, structured (representative_id + address_id) for facilitators
 */
export const updateClaimPartyInput = z.object({
	id: z.string().uuid(),
	params: z.object({
		role: z.array(z.string()).min(1).optional(),
		// Structured representative (for facilitators)
		representative_id: z.string().uuid().nullable().optional(),
		address_id: z.string().uuid().nullable().optional(),
		// Free-form representative field (for entities)
		representative_name: z.string().max(200).nullable().optional(),
		// Other fields
		is_primary: z.boolean().optional(),
		liability_percentage: z.number().min(0).max(100).nullable().optional(),
		notes: z.string().max(2000).optional(),
		external_reference: z.string().max(255).optional(),
		parent_claim_party_id: z.string().uuid().nullable().optional(),
		// Facilitator-specific fields
		loss_type: z.nativeEnum(LossType).nullable().optional(),
		policy_limit: z.number().min(0).nullable().optional(),
	}),
});

/**
 * Unlink party from claim input
 */
export const unlinkPartyFromClaimInput = z.object({
	id: z.string().uuid(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Compute display name for a party based on is_business flag
 */
export function computePartyDisplayName(party: {
	is_business: boolean;
	name?: string | null;
	first_name?: string | null;
	middle_name?: string | null;
	last_name?: string | null;
	suffix?: string | null;
}): string {
	if (party.is_business) {
		return party.name || '';
	}

	const parts = [party.first_name, party.middle_name, party.last_name].filter(Boolean);
	const fullName = parts.join(' ');

	if (party.suffix) {
		return `${fullName}, ${party.suffix}`;
	}

	return fullName;
}
