import type { ProtectedContext } from '@/server/trpc/trpc';
import * as partyQueries from '@/api/queries/partyQueries';
import { logAdminAction, AdminAction, EntityName } from '@/api/utils/adminActionLogger';
import { TRPCError } from '@trpc/server';

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
	{ searchTerm }: { searchTerm: string }
) {
	return await partyQueries.searchParties(ctx, searchTerm);
}

/**
 * Create party with admin logging
 */
export async function createParty(
	ctx: ProtectedContext,
	input: {
		party_type: string;
		party_category: string;
		name: string;
		organization?: string;
		email?: string;
		phone?: string;
		address?: string;
		notes?: string;
	}
) {
	const created = await ctx.db.transaction().execute(async (trx) => {
		const party = await partyQueries.createParty({ ...ctx, db: trx }, input);

		await logAdminAction({ ...ctx, db: trx }, {
			entityId: party.id,
			entityName: EntityName.PARTY,
			action: AdminAction.CREATE,
			value: {
				name: party.name,
				party_type: party.party_type,
				party_category: party.party_category,
				organization: party.organization,
			},
		});

		return party;
	});

	return created;
}

/**
 * Update party with admin logging
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
			party_category?: string;
			name?: string;
			organization?: string;
			email?: string;
			phone?: string;
			address?: string;
			notes?: string;
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
		const party = await partyQueries.updateParty(
			{ ...ctx, db: trx },
			id,
			params
		);

		await logAdminAction({ ...ctx, db: trx }, {
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
				party_category: party.party_category,
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
				party_category: party.party_category,
				organization: party.organization,
			},
		});

		return party;
	});

	return restored;
}

// ============================================================================
// PARTY OFFICE CRUD CONTROLLERS
// ============================================================================

/**
 * Get offices for a party
 */
export async function getPartyOffices(
	ctx: ProtectedContext,
	{ partyId, showArchived }: { partyId: number; showArchived?: boolean }
) {
	return await partyQueries.getPartyOffices(ctx, partyId, showArchived);
}

/**
 * Get paginated list of all party offices
 */
export async function getAllPartyOffices(
	ctx: ProtectedContext,
	{
		searchTerm,
		limit,
		offset,
		showArchived,
	}: { searchTerm?: string; limit?: number; offset?: number; showArchived?: boolean }
) {
	return await partyQueries.getAllPartyOffices(ctx, searchTerm, limit, offset, showArchived);
}

/**
 * Create party office with admin logging
 */
export async function createPartyOffice(
	ctx: ProtectedContext,
	input: {
		party_id: number;
		office_name?: string;
		address?: string;
		phone?: string;
		fax?: string;
		is_primary?: boolean;
	}
) {
	const created = await ctx.db.transaction().execute(async (trx) => {
		const office = await partyQueries.createPartyOffice(
			{ ...ctx, db: trx },
			input
		);

		await logAdminAction({ ...ctx, db: trx }, {
			entityId: office.id,
			entityName: EntityName.PARTY_OFFICE,
			action: AdminAction.CREATE,
			value: {
				party_id: office.party_id,
				office_name: office.office_name,
				address: office.address,
			},
		});

		return office;
	});

	return created;
}

/**
 * Update party office with admin logging
 */
export async function updatePartyOffice(
	ctx: ProtectedContext,
	{
		id,
		params,
	}: {
		id: number;
		params: {
			office_name?: string;
			address?: string;
			phone?: string;
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
		const office = await partyQueries.updatePartyOffice(
			{ ...ctx, db: trx },
			id,
			params
		);

		await logAdminAction({ ...ctx, db: trx }, {
			entityId: id,
			entityName: EntityName.PARTY_OFFICE,
			action: AdminAction.UPDATE,
			value: params,
		});

		return office;
	});

	return updated;
}

/**
 * Archive party office with admin logging (soft delete)
 */
export async function archivePartyOffice(ctx: ProtectedContext, { id }: { id: number }) {
	const archived = await ctx.db.transaction().execute(async (trx) => {
		const office = await partyQueries.archivePartyOffice({ ...ctx, db: trx }, id);

		await logAdminAction({ ...ctx, db: trx }, {
			entityId: id,
			entityName: EntityName.PARTY_OFFICE,
			action: AdminAction.DELETE,
			value: {
				party_id: office.party_id,
				office_name: office.office_name,
				address: office.address,
			},
		});

		return office;
	});

	return archived;
}

/**
 * Restore party office with admin logging (undo soft delete)
 */
export async function restorePartyOffice(ctx: ProtectedContext, { id }: { id: number }) {
	const restored = await ctx.db.transaction().execute(async (trx) => {
		const office = await partyQueries.restorePartyOffice({ ...ctx, db: trx }, id);

		await logAdminAction({ ...ctx, db: trx }, {
			entityId: id,
			entityName: EntityName.PARTY_OFFICE,
			action: AdminAction.UPDATE,
			value: {
				restored: true,
				party_id: office.party_id,
				office_name: office.office_name,
				address: office.address,
			},
		});

		return office;
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
	{ partyId, officeId, showArchived }: { partyId: number; officeId?: number; showArchived?: boolean }
) {
	return await partyQueries.getPartyRepresentatives(ctx, partyId, officeId, showArchived);
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
 * Create party representative with admin logging
 */
export async function createPartyRepresentative(
	ctx: ProtectedContext,
	input: {
		party_id: number;
		office_id?: number;
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
			office_id?: number;
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
	{ claimId }: { claimId: number }
) {
	return await partyQueries.getClaimParties(ctx, claimId);
}

/**
 * Link party to claim with admin logging
 */
export async function linkPartyToClaim(
	ctx: ProtectedContext,
	input: {
		claim_id: number;
		party_id: number;
		role: string;
		liability_percentage?: number;
		coverage_amount?: number;
		is_primary?: boolean;
		notes?: string;
	}
) {
	const created = await ctx.db.transaction().execute(async (trx) => {
		const claimParty = await partyQueries.linkPartyToClaim(
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

		return claimParty;
	});

	return created;
}

/**
 * Update claim party relationship with admin logging
 */
export async function updateClaimParty(
	ctx: ProtectedContext,
	{
		id,
		params,
	}: {
		id: number;
		params: {
			role?: string;
			liability_percentage?: number;
			coverage_amount?: number;
			is_primary?: boolean;
			notes?: string;
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
		const claimParty = await partyQueries.updateClaimParty(
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

		return claimParty;
	});

	return updated;
}

/**
 * Unlink party from claim with admin logging
 */
export async function unlinkPartyFromClaim(
	ctx: ProtectedContext,
	{ id }: { id: number }
) {
	await ctx.db.transaction().execute(async (trx) => {
		const claimParty = await partyQueries.getClaimPartyForDeletion(
			{ ...ctx, db: trx },
			id
		);

		await partyQueries.unlinkPartyFromClaim({ ...ctx, db: trx }, id);

		if (claimParty) {
			await logAdminAction({ ...ctx, db: trx }, {
				entityId: id,
				entityName: EntityName.CLAIM_PARTY,
				action: AdminAction.DELETE,
				value: {
					claim_id: claimParty.claim_id,
					party_id: claimParty.party_id,
					party_name: claimParty.party_name,
					role: claimParty.role,
				},
			});
		}
	});
}
