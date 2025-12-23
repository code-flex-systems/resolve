import type { ProtectedContext } from '@/server/trpc/trpc';
import * as partyQueries from '@/api/queries/partyQueries';
import { logAdminAction, AdminAction, EntityName } from '@/api/utils/adminActionLogger';
import { TRPCError } from '@trpc/server';
import type { InlineContact } from '@/schemas/partySchemas';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if address data has any meaningful content
 */
function hasAddressData(address: { street_address?: string | null; city?: string | null; state?: string | null; postal_code?: string | null; country?: string | null } | undefined): boolean {
	if (!address) return false;
	return !!(address.street_address || address.city || address.state || address.postal_code || address.country);
}

// ============================================================================
// PARTY CRUD CONTROLLERS
// ============================================================================

/**
 * Get paginated list of parties
 */
export async function getParties(
	ctx: ProtectedContext,
	{
		searchTerm,
		limit,
		offset,
		showArchived,
	}: { searchTerm?: string; limit?: number; offset?: number; showArchived?: boolean }
) {
	return await partyQueries.getParties(ctx, searchTerm, limit, offset, showArchived);
}

/**
 * Get single party by ID
 */
export async function getParty(ctx: ProtectedContext, { id }: { id: number }) {
	return await partyQueries.getParty(ctx, id);
}

/**
 * Search parties for deduplication check
 */
export async function searchParties(
	ctx: ProtectedContext,
	{ searchTerm, partyType }: { searchTerm: string; partyType?: 'entity' | 'facilitator' }
) {
	return await partyQueries.searchParties(ctx, searchTerm, { partyType });
}

/**
 * Create party with transactional orchestration for inline contact data
 * Creates party + optional email, phone, address in a single transaction
 */
export async function createParty(
	ctx: ProtectedContext,
	input: {
		party_type: string;
		is_business?: boolean;
		name?: string;
		first_name?: string;
		middle_name?: string;
		last_name?: string;
		suffix?: string;
		organization?: string;
		notes?: string;
		contact?: InlineContact;
	}
) {
	const created = await ctx.db.transaction().execute(async (trx) => {
		const txCtx = { ...ctx, db: trx };

		// 1. Create the party record
		const party = await partyQueries.createParty(txCtx, {
			party_type: input.party_type,
			is_business: input.is_business,
			name: input.name,
			first_name: input.first_name,
			middle_name: input.middle_name,
			last_name: input.last_name,
			suffix: input.suffix,
			organization: input.organization,
			notes: input.notes,
		});

		// 2. If inline contact data provided, create those records
		if (input.contact?.email && input.contact.email.trim()) {
			await partyQueries.createPartyEmail(txCtx, {
				party_id: party.id,
				email_address: input.contact.email,
				email_type: input.contact.email_type ?? 'business',
			});
		}

		if (input.contact?.phone && input.contact.phone.trim()) {
			await partyQueries.createPartyPhone(txCtx, {
				party_id: party.id,
				phone_number: input.contact.phone,
				phone_type: input.contact.phone_type ?? 'work',
				phone_status: 'valid',
			});
		}

		if (hasAddressData(input.contact?.address)) {
			await partyQueries.createPartyAddress(txCtx, {
				party_id: party.id,
				street_address: input.contact!.address!.street_address,
				city: input.contact!.address!.city,
				state: input.contact!.address!.state,
				postal_code: input.contact!.address!.postal_code,
				country: input.contact!.address!.country,
				address_type: input.contact!.address_type ?? 'business',
				address_status: 'valid',
			});
		}

		// 3. Log admin action
		await logAdminAction(txCtx, {
			entityId: party.id,
			entityName: EntityName.PARTY,
			action: AdminAction.CREATE,
			value: {
				name: party.name,
				party_type: party.party_type,
				organization: party.organization,
				is_business: party.is_business,
			},
		});

		return party;
	});

	return created;
}

/**
 * Update party with transactional orchestration for inline contact data
 * Updates party + optional email, phone, address in a single transaction
 */
export async function updateParty(
	ctx: ProtectedContext,
	{
		id,
		params,
	}: {
		id: number;
		params: {
			party_type?: string;
			is_business?: boolean;
			name?: string;
			first_name?: string;
			middle_name?: string;
			last_name?: string;
			suffix?: string;
			organization?: string;
			notes?: string;
			contact?: InlineContact;
		};
	}
) {
	// Extract contact from params for separate handling
	const { contact, ...partyParams } = params;

	if (Object.keys(partyParams).length === 0 && !contact) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'No updates provided',
		});
	}

	const updated = await ctx.db.transaction().execute(async (trx) => {
		const txCtx = { ...ctx, db: trx };

		// 1. Update the party record if there are party params
		let party;
		if (Object.keys(partyParams).length > 0) {
			party = await partyQueries.updateParty(txCtx, id, partyParams);
		} else {
			party = await partyQueries.getParty(txCtx, id);
		}

		if (!party) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Party not found',
			});
		}

		// 2. Handle inline contact data updates
		if (contact) {
			// Parallelize all contact info reads (Phase 1.1 optimization)
			const [existingEmails, existingPhones, existingAddresses] = await Promise.all([
				partyQueries.getPartyEmails(txCtx, id),
				partyQueries.getPartyPhones(txCtx, id),
				partyQueries.getPartyAddresses(txCtx, id),
			]);

			// Handle email - find existing or create new
			if (contact.email !== undefined) {
				if (contact.email && contact.email.trim()) {
					if (existingEmails.length > 0) {
						// Update first email
						await partyQueries.updatePartyEmail(txCtx, existingEmails[0].id, {
							email_address: contact.email,
							email_type: contact.email_type,
						});
					} else {
						// Create new email
						await partyQueries.createPartyEmail(txCtx, {
							party_id: id,
							email_address: contact.email,
							email_type: contact.email_type ?? 'business',
						});
					}
				}
			}

			// Handle phone - find existing or create new
			if (contact.phone !== undefined) {
				if (contact.phone && contact.phone.trim()) {
					if (existingPhones.length > 0) {
						// Update first phone
						await partyQueries.updatePartyPhone(txCtx, existingPhones[0].id, {
							phone_number: contact.phone,
							phone_type: contact.phone_type,
						});
					} else {
						// Create new phone
						await partyQueries.createPartyPhone(txCtx, {
							party_id: id,
							phone_number: contact.phone,
							phone_type: contact.phone_type ?? 'work',
							phone_status: 'valid',
						});
					}
				}
			}

			// Handle address - find existing valid address or create new
			if (contact.address !== undefined) {
				const validAddress = existingAddresses.find(a => a.address_status === 'valid');

				if (hasAddressData(contact.address)) {
					if (validAddress) {
						// Update existing valid address
						await partyQueries.updatePartyAddress(txCtx, validAddress.id, {
							street_address: contact.address.street_address,
							city: contact.address.city,
							state: contact.address.state,
							postal_code: contact.address.postal_code,
							country: contact.address.country,
							address_type: contact.address_type,
						});
					} else {
						// Create new address
						await partyQueries.createPartyAddress(txCtx, {
							party_id: id,
							street_address: contact.address.street_address,
							city: contact.address.city,
							state: contact.address.state,
							postal_code: contact.address.postal_code,
							country: contact.address.country,
							address_type: contact.address_type ?? 'business',
							address_status: 'valid',
						});
					}
				}
			}
		}

		// 3. Log admin action
		await logAdminAction(txCtx, {
			entityId: id,
			entityName: EntityName.PARTY,
			action: AdminAction.UPDATE,
			value: params,
		});

		return party;
	});

	return updated;
}

/**
 * Archive party with admin logging (soft delete)
 * Prevents archiving if party has active claim associations
 */
export async function archiveParty(ctx: ProtectedContext, { id }: { id: number }) {
	const archived = await ctx.db.transaction().execute(async (trx) => {
		const party = await partyQueries.archiveParty({ ...ctx, db: trx }, id);

		await logAdminAction({ ...ctx, db: trx }, {
			entityId: id,
			entityName: EntityName.PARTY,
			action: AdminAction.DELETE,
			value: {
				name: party.name,
				party_type: party.party_type,
				organization: party.organization,
			},
		});

		return party;
	});

	return archived;
}

/**
 * Restore party with admin logging (undo soft delete)
 */
export async function restoreParty(ctx: ProtectedContext, { id }: { id: number }) {
	const restored = await ctx.db.transaction().execute(async (trx) => {
		const party = await partyQueries.restoreParty({ ...ctx, db: trx }, id);

		await logAdminAction({ ...ctx, db: trx }, {
			entityId: id,
			entityName: EntityName.PARTY,
			action: AdminAction.UPDATE,
			value: {
				restored: true,
				name: party.name,
				party_type: party.party_type,
				organization: party.organization,
			},
		});

		return party;
	});

	return restored;
}

// ============================================================================
// PARTY ADDRESS CRUD CONTROLLERS (renamed from PARTY OFFICE)
// ============================================================================

/**
 * Get addresses for a party
 */
export async function getPartyAddresses(
	ctx: ProtectedContext,
	{ partyId, showArchived }: { partyId: number; showArchived?: boolean }
) {
	return await partyQueries.getPartyAddresses(ctx, partyId, showArchived);
}

/**
 * Get paginated list of all party addresses
 */
export async function getAllPartyAddresses(
	ctx: ProtectedContext,
	{
		searchTerm,
		limit,
		offset,
		showArchived,
	}: { searchTerm?: string; limit?: number; offset?: number; showArchived?: boolean }
) {
	return await partyQueries.getAllPartyAddresses(ctx, searchTerm, limit, offset, showArchived);
}

/**
 * Get single party address by ID
 */
export async function getPartyAddress(ctx: ProtectedContext, { id }: { id: number }) {
	return await partyQueries.getPartyAddress(ctx, id);
}

/**
 * Create party address with admin logging
 */
export async function createPartyAddress(
	ctx: ProtectedContext,
	input: {
		party_id: number;
		name?: string;
		street_address?: string | null;
		city?: string | null;
		state?: string | null;
		postal_code?: string | null;
		country?: string | null;
		address_type?: string;
		address_status?: string;
	}
) {
	const created = await ctx.db.transaction().execute(async (trx) => {
		const address = await partyQueries.createPartyAddress(
			{ ...ctx, db: trx },
			input
		);

		await logAdminAction({ ...ctx, db: trx }, {
			entityId: address.id,
			entityName: EntityName.PARTY_ADDRESS,
			action: AdminAction.CREATE,
			value: {
				party_id: address.party_id,
				name: address.name,
				city: address.city,
				state: address.state,
				address_type: address.address_type,
				address_status: address.address_status,
			},
		});

		return address;
	});

	return created;
}

/**
 * Update party address with admin logging
 */
export async function updatePartyAddress(
	ctx: ProtectedContext,
	{
		id,
		params,
	}: {
		id: number;
		params: {
			name?: string;
			street_address?: string | null;
			city?: string | null;
			state?: string | null;
			postal_code?: string | null;
			country?: string | null;
			address_type?: string;
			address_status?: string;
		};
	}
) {
	if (Object.keys(params).length === 0) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'No updates provided',
		});
	}

	const updated = await ctx.db.transaction().execute(async (trx) => {
		const address = await partyQueries.updatePartyAddress(
			{ ...ctx, db: trx },
			id,
			params
		);

		await logAdminAction({ ...ctx, db: trx }, {
			entityId: id,
			entityName: EntityName.PARTY_ADDRESS,
			action: AdminAction.UPDATE,
			value: params,
		});

		return address;
	});

	return updated;
}

/**
 * Archive party address with admin logging (soft delete)
 */
export async function archivePartyAddress(ctx: ProtectedContext, { id }: { id: number }) {
	const archived = await ctx.db.transaction().execute(async (trx) => {
		const address = await partyQueries.archivePartyAddress({ ...ctx, db: trx }, id);

		await logAdminAction({ ...ctx, db: trx }, {
			entityId: id,
			entityName: EntityName.PARTY_ADDRESS,
			action: AdminAction.DELETE,
			value: {
				party_id: address.party_id,
				name: address.name,
				city: address.city,
				state: address.state,
			},
		});

		return address;
	});

	return archived;
}

/**
 * Restore party address with admin logging (undo soft delete)
 */
export async function restorePartyAddress(ctx: ProtectedContext, { id }: { id: number }) {
	const restored = await ctx.db.transaction().execute(async (trx) => {
		const address = await partyQueries.restorePartyAddress({ ...ctx, db: trx }, id);

		await logAdminAction({ ...ctx, db: trx }, {
			entityId: id,
			entityName: EntityName.PARTY_ADDRESS,
			action: AdminAction.UPDATE,
			value: {
				restored: true,
				party_id: address.party_id,
				name: address.name,
				city: address.city,
				state: address.state,
			},
		});

		return address;
	});

	return restored;
}

// Legacy aliases for backwards compatibility
export const getPartyOffices = getPartyAddresses;
export const getAllPartyOffices = getAllPartyAddresses;
export const getPartyOffice = getPartyAddress;
export const createPartyOffice = createPartyAddress;
export const updatePartyOffice = updatePartyAddress;
export const archivePartyOffice = archivePartyAddress;
export const restorePartyOffice = restorePartyAddress;

// ============================================================================
// PARTY PHONE CRUD CONTROLLERS
// ============================================================================

/**
 * Get phones for a party
 */
export async function getPartyPhones(
	ctx: ProtectedContext,
	{ partyId, showArchived }: { partyId: number; showArchived?: boolean }
) {
	return await partyQueries.getPartyPhones(ctx, partyId, showArchived);
}

/**
 * Get single party phone by ID
 */
export async function getPartyPhone(ctx: ProtectedContext, { id }: { id: number }) {
	return await partyQueries.getPartyPhone(ctx, id);
}

/**
 * Create party phone with admin logging
 */
export async function createPartyPhone(
	ctx: ProtectedContext,
	input: {
		party_id: number;
		country_code?: string;
		area_code?: string;
		phone_number: string;
		extension?: string;
		phone_type: string;
		phone_status?: string;
	}
) {
	const created = await ctx.db.transaction().execute(async (trx) => {
		const phone = await partyQueries.createPartyPhone(
			{ ...ctx, db: trx },
			input
		);

		await logAdminAction({ ...ctx, db: trx }, {
			entityId: phone.id,
			entityName: EntityName.PARTY_PHONE,
			action: AdminAction.CREATE,
			value: {
				party_id: phone.party_id,
				phone_number: phone.phone_number,
				phone_type: phone.phone_type,
			},
		});

		return phone;
	});

	return created;
}

/**
 * Update party phone with admin logging
 */
export async function updatePartyPhone(
	ctx: ProtectedContext,
	{
		id,
		params,
	}: {
		id: number;
		params: {
			country_code?: string;
			area_code?: string;
			phone_number?: string;
			extension?: string;
			phone_type?: string;
			phone_status?: string;
		};
	}
) {
	if (Object.keys(params).length === 0) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'No updates provided',
		});
	}

	const updated = await ctx.db.transaction().execute(async (trx) => {
		const phone = await partyQueries.updatePartyPhone(
			{ ...ctx, db: trx },
			id,
			params
		);

		await logAdminAction({ ...ctx, db: trx }, {
			entityId: id,
			entityName: EntityName.PARTY_PHONE,
			action: AdminAction.UPDATE,
			value: params,
		});

		return phone;
	});

	return updated;
}

/**
 * Archive party phone with admin logging (soft delete)
 */
export async function archivePartyPhone(ctx: ProtectedContext, { id }: { id: number }) {
	const archived = await ctx.db.transaction().execute(async (trx) => {
		const phone = await partyQueries.archivePartyPhone({ ...ctx, db: trx }, id);

		await logAdminAction({ ...ctx, db: trx }, {
			entityId: id,
			entityName: EntityName.PARTY_PHONE,
			action: AdminAction.DELETE,
			value: {
				party_id: phone.party_id,
				phone_number: phone.phone_number,
				phone_type: phone.phone_type,
			},
		});

		return phone;
	});

	return archived;
}

/**
 * Restore party phone with admin logging (undo soft delete)
 */
export async function restorePartyPhone(ctx: ProtectedContext, { id }: { id: number }) {
	const restored = await ctx.db.transaction().execute(async (trx) => {
		const phone = await partyQueries.restorePartyPhone({ ...ctx, db: trx }, id);

		await logAdminAction({ ...ctx, db: trx }, {
			entityId: id,
			entityName: EntityName.PARTY_PHONE,
			action: AdminAction.UPDATE,
			value: {
				restored: true,
				party_id: phone.party_id,
				phone_number: phone.phone_number,
				phone_type: phone.phone_type,
			},
		});

		return phone;
	});

	return restored;
}

// ============================================================================
// PARTY EMAIL CRUD CONTROLLERS
// ============================================================================

/**
 * Get emails for a party
 */
export async function getPartyEmails(
	ctx: ProtectedContext,
	{ partyId, showArchived }: { partyId: number; showArchived?: boolean }
) {
	return await partyQueries.getPartyEmails(ctx, partyId, showArchived);
}

/**
 * Get single party email by ID
 */
export async function getPartyEmail(ctx: ProtectedContext, { id }: { id: number }) {
	return await partyQueries.getPartyEmail(ctx, id);
}

/**
 * Create party email with admin logging
 */
export async function createPartyEmail(
	ctx: ProtectedContext,
	input: {
		party_id: number;
		email_address: string;
		email_type?: string;
	}
) {
	const created = await ctx.db.transaction().execute(async (trx) => {
		const email = await partyQueries.createPartyEmail(
			{ ...ctx, db: trx },
			input
		);

		await logAdminAction({ ...ctx, db: trx }, {
			entityId: email.id,
			entityName: EntityName.PARTY_EMAIL,
			action: AdminAction.CREATE,
			value: {
				party_id: email.party_id,
				email_address: email.email_address,
				email_type: email.email_type,
			},
		});

		return email;
	});

	return created;
}

/**
 * Update party email with admin logging
 */
export async function updatePartyEmail(
	ctx: ProtectedContext,
	{
		id,
		params,
	}: {
		id: number;
		params: {
			email_address?: string;
			email_type?: string;
		};
	}
) {
	if (Object.keys(params).length === 0) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'No updates provided',
		});
	}

	const updated = await ctx.db.transaction().execute(async (trx) => {
		const email = await partyQueries.updatePartyEmail(
			{ ...ctx, db: trx },
			id,
			params
		);

		await logAdminAction({ ...ctx, db: trx }, {
			entityId: id,
			entityName: EntityName.PARTY_EMAIL,
			action: AdminAction.UPDATE,
			value: params,
		});

		return email;
	});

	return updated;
}

/**
 * Archive party email with admin logging (soft delete)
 */
export async function archivePartyEmail(ctx: ProtectedContext, { id }: { id: number }) {
	const archived = await ctx.db.transaction().execute(async (trx) => {
		const email = await partyQueries.archivePartyEmail({ ...ctx, db: trx }, id);

		await logAdminAction({ ...ctx, db: trx }, {
			entityId: id,
			entityName: EntityName.PARTY_EMAIL,
			action: AdminAction.DELETE,
			value: {
				party_id: email.party_id,
				email_address: email.email_address,
				email_type: email.email_type,
			},
		});

		return email;
	});

	return archived;
}

/**
 * Restore party email with admin logging (undo soft delete)
 */
export async function restorePartyEmail(ctx: ProtectedContext, { id }: { id: number }) {
	const restored = await ctx.db.transaction().execute(async (trx) => {
		const email = await partyQueries.restorePartyEmail({ ...ctx, db: trx }, id);

		await logAdminAction({ ...ctx, db: trx }, {
			entityId: id,
			entityName: EntityName.PARTY_EMAIL,
			action: AdminAction.UPDATE,
			value: {
				restored: true,
				party_id: email.party_id,
				email_address: email.email_address,
				email_type: email.email_type,
			},
		});

		return email;
	});

	return restored;
}

// ============================================================================
// PARTY REPRESENTATIVE CRUD CONTROLLERS
// ============================================================================

/**
 * Get representatives for a party
 */
export async function getPartyRepresentatives(
	ctx: ProtectedContext,
	{ partyId, addressId, showArchived }: { partyId: number; addressId?: number; showArchived?: boolean }
) {
	return await partyQueries.getPartyRepresentatives(ctx, partyId, addressId, showArchived);
}

/**
 * Get paginated list of all party representatives
 */
export async function getAllPartyRepresentatives(
	ctx: ProtectedContext,
	{
		searchTerm,
		limit,
		offset,
		showArchived,
	}: { searchTerm?: string; limit?: number; offset?: number; showArchived?: boolean }
) {
	return await partyQueries.getAllPartyRepresentatives(ctx, searchTerm, limit, offset, showArchived);
}

/**
 * Get single party representative by ID
 */
export async function getPartyRepresentative(ctx: ProtectedContext, { id }: { id: number }) {
	return await partyQueries.getPartyRepresentative(ctx, id);
}

/**
 * Create party representative with admin logging
 */
export async function createPartyRepresentative(
	ctx: ProtectedContext,
	input: {
		party_id: number;
		address_id?: number;
		first_name: string;
		last_name: string;
		title?: string;
		email?: string;
		phone?: string;
		mobile_phone?: string;
		fax?: string;
		is_primary?: boolean;
	}
) {
	const created = await ctx.db.transaction().execute(async (trx) => {
		const representative = await partyQueries.createPartyRepresentative(
			{ ...ctx, db: trx },
			input
		);

		await logAdminAction({ ...ctx, db: trx }, {
			entityId: representative.id,
			entityName: EntityName.PARTY_REPRESENTATIVE,
			action: AdminAction.CREATE,
			value: {
				party_id: representative.party_id,
				first_name: representative.first_name,
				last_name: representative.last_name,
				title: representative.title,
				email: representative.email,
			},
		});

		return representative;
	});

	return created;
}

/**
 * Update party representative with admin logging
 */
export async function updatePartyRepresentative(
	ctx: ProtectedContext,
	{
		id,
		params,
	}: {
		id: number;
		params: {
			address_id?: number;
			first_name?: string;
			last_name?: string;
			title?: string;
			email?: string;
			phone?: string;
			mobile_phone?: string;
			fax?: string;
			is_primary?: boolean;
		};
	}
) {
	if (Object.keys(params).length === 0) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'No updates provided',
		});
	}

	const updated = await ctx.db.transaction().execute(async (trx) => {
		const representative = await partyQueries.updatePartyRepresentative(
			{ ...ctx, db: trx },
			id,
			params
		);

		await logAdminAction({ ...ctx, db: trx }, {
			entityId: id,
			entityName: EntityName.PARTY_REPRESENTATIVE,
			action: AdminAction.UPDATE,
			value: params,
		});

		return representative;
	});

	return updated;
}

/**
 * Archive party representative with admin logging (soft delete)
 */
export async function archivePartyRepresentative(ctx: ProtectedContext, { id }: { id: number }) {
	const archived = await ctx.db.transaction().execute(async (trx) => {
		const representative = await partyQueries.archivePartyRepresentative({ ...ctx, db: trx }, id);

		await logAdminAction({ ...ctx, db: trx }, {
			entityId: id,
			entityName: EntityName.PARTY_REPRESENTATIVE,
			action: AdminAction.DELETE,
			value: {
				party_id: representative.party_id,
				first_name: representative.first_name,
				last_name: representative.last_name,
				title: representative.title,
				email: representative.email,
			},
		});

		return representative;
	});

	return archived;
}

/**
 * Restore party representative with admin logging (undo soft delete)
 */
export async function restorePartyRepresentative(ctx: ProtectedContext, { id }: { id: number }) {
	const restored = await ctx.db.transaction().execute(async (trx) => {
		const representative = await partyQueries.restorePartyRepresentative({ ...ctx, db: trx }, id);

		await logAdminAction({ ...ctx, db: trx }, {
			entityId: id,
			entityName: EntityName.PARTY_REPRESENTATIVE,
			action: AdminAction.UPDATE,
			value: {
				restored: true,
				party_id: representative.party_id,
				first_name: representative.first_name,
				last_name: representative.last_name,
				title: representative.title,
				email: representative.email,
			},
		});

		return representative;
	});

	return restored;
}

// ============================================================================
// CLAIM PARTY LINKING CONTROLLERS
// ============================================================================

/**
 * Get parties linked to a claim
 */
export async function getClaimParties(
	ctx: ProtectedContext,
	{ claimId, partyType, roleListEntity }: {
		claimId: number;
		partyType?: 'entity' | 'facilitator';
		roleListEntity?: 'claimant_party_role' | 'adverse_party_role';
	}
) {
	return await partyQueries.getClaimParties(ctx, claimId, { partyType, roleListEntity });
}

/**
 * Link party to claim with admin logging
 * @returns claimParty and updated expectedRecovery
 */
export async function linkPartyToClaim(
	ctx: ProtectedContext,
	input: {
		claim_id: number;
		party_id: number;
		role: string[];
		representative_id?: number | null;
		address_id?: number | null;
		// Free-form representative fields (for entities)
		representative_name?: string | null;
		representative_title?: string | null;
		representative_email?: string | null;
		representative_phone?: string | null;
		is_primary?: boolean;
		notes?: string;
		external_reference?: string;
		liability_percentage?: number;
		parent_claim_party_id?: number | null;
		// Facilitator-specific fields
		loss_type?: string | null;
		policy_limit?: number | null;
	}
) {
	const result = await ctx.db.transaction().execute(async (trx) => {
		const { claimParty } = await partyQueries.linkPartyToClaim(
			{ ...ctx, db: trx },
			input
		);

		await logAdminAction({ ...ctx, db: trx }, {
			entityId: claimParty.id,
			entityName: EntityName.CLAIM_PARTY,
			action: AdminAction.CREATE,
			value: {
				claim_id: claimParty.claim_id,
				party_id: claimParty.party_id,
				role: claimParty.role,
			},
		});

		// Orchestrate recalculation if liability_percentage was provided
		let expectedRecovery: number | null = null;
		if (input.liability_percentage !== undefined) {
			const { recalculateClaimExpectedRecovery } = await import('@/api/queries/claimQueries');
			expectedRecovery = await recalculateClaimExpectedRecovery({ ...ctx, db: trx }, claimParty.claim_id);
		}

		return { claimParty, expectedRecovery };
	});

	return result;
}

/**
 * Update claim party relationship with admin logging
 * @returns claimParty and updated expectedRecovery
 */
export async function updateClaimParty(
	ctx: ProtectedContext,
	{
		id,
		params,
	}: {
		id: number;
		params: {
			role?: string[];
			representative_id?: number | null;
			address_id?: number | null;
			// Free-form representative fields (for entities)
			representative_name?: string | null;
			representative_title?: string | null;
			representative_email?: string | null;
			representative_phone?: string | null;
			is_primary?: boolean;
			notes?: string;
			external_reference?: string;
			liability_percentage?: number | null;
			parent_claim_party_id?: number | null;
			// Facilitator-specific fields
			loss_type?: string | null;
			policy_limit?: number | null;
		};
	}
) {
	if (Object.keys(params).length === 0) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'No updates provided',
		});
	}

	const result = await ctx.db.transaction().execute(async (trx) => {
		const { claimParty } = await partyQueries.updateClaimParty(
			{ ...ctx, db: trx },
			id,
			params
		);

		await logAdminAction({ ...ctx, db: trx }, {
			entityId: id,
			entityName: EntityName.CLAIM_PARTY,
			action: AdminAction.UPDATE,
			value: params,
		});

		// Orchestrate recalculation if liability_percentage was updated
		let expectedRecovery: number | null = null;
		if (params.liability_percentage !== undefined) {
			const { recalculateClaimExpectedRecovery } = await import('@/api/queries/claimQueries');
			expectedRecovery = await recalculateClaimExpectedRecovery({ ...ctx, db: trx }, claimParty.claim_id);
		}

		return { claimParty, expectedRecovery };
	});

	return result;
}

/**
 * Archive (soft delete) claim party with admin logging
 * Cascades to archive all nested facilitators and coverages
 * @returns expectedRecovery and claimId
 */
export async function archiveClaimParty(
	ctx: ProtectedContext,
	{ id }: { id: number }
) {
	const result = await ctx.db.transaction().execute(async (trx) => {
		const claimPartyForLog = await partyQueries.getClaimPartyForDeletion(
			{ ...ctx, db: trx },
			id
		);

		const { claimId } = await partyQueries.archiveClaimParty({ ...ctx, db: trx }, id);

		if (claimPartyForLog) {
			await logAdminAction({ ...ctx, db: trx }, {
				entityId: id,
				entityName: EntityName.CLAIM_PARTY,
				action: AdminAction.DELETE,
				value: {
					claim_id: claimPartyForLog.claim_id,
					party_id: claimPartyForLog.party_id,
					party_name: claimPartyForLog.party_name,
					role: claimPartyForLog.role,
				},
			});
		}

		// Orchestrate recalculation - archiving always affects both expected_recovery and total_incurred
		const { recalculateClaimExpectedRecovery, recalculateTotalIncurred } = await import('@/api/queries/claimQueries');
		const expectedRecovery = await recalculateClaimExpectedRecovery({ ...ctx, db: trx }, claimId);
		const totalIncurred = await recalculateTotalIncurred({ ...ctx, db: trx }, claimId);

		return { expectedRecovery, totalIncurred, claimId };
	});

	return result;
}
