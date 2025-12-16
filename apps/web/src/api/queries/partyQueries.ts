import type { ProtectedContext } from '@/server/trpc/trpc';
import { sql } from 'kysely';
import { recalculateClaimExpectedRecovery } from './claimQueries';

// ============================================================================
// PARTY CRUD OPERATIONS
// ============================================================================

/**
 * Get paginated list of parties with optional search filter
 * Returns { rows, count } for server-side pagination
 */
export async function getParties(
	ctx: ProtectedContext,
	searchTerm?: string,
	limit?: number,
	offset?: number,
	showArchived?: boolean
) {
	// Base query with client scoping
	let query = ctx.db
		.selectFrom('party')
		.selectAll()
		.where('party.client_id', '=', ctx.session.user.client_id)
		.orderBy('party.name asc');

	// Filter by archived status
	if (showArchived) {
		// Show only archived parties
		query = query.where('party.deleted_at', 'is not', null);
	} else {
		// Show only active parties (default)
		query = query.where('party.deleted_at', 'is', null);
	}

	// Apply search filter if provided
	if (searchTerm) {
		query = query.where(sql<boolean>`party.name ILIKE ${`%${searchTerm}%`}`);
	}

	// Count query (run in parallel with data query)
	const countQuery = query
		.clearSelect()
		.clearOrderBy()
		.select(({ fn }) => fn.countAll().as('count'))
		.executeTakeFirst();

	// Data query with pagination
	const rowsQuery = query
		.$if(limit !== undefined, (qb) => qb.limit(limit!))
		.$if(offset !== undefined, (qb) => qb.offset(offset!))
		.execute();

	// Execute in parallel
	const [countResult, rows] = await Promise.all([countQuery, rowsQuery]);

	return {
		rows,
		count: countResult?.count ? Number(countResult.count) : 0,
	};
}

/**
 * Get single party by ID
 */
export async function getParty(ctx: ProtectedContext, id: number) {
	return await ctx.db
		.selectFrom('party')
		.selectAll()
		.where('party.client_id', '=', ctx.session.user.client_id)
		.where('party.id', '=', id)
		.executeTakeFirst();
}

/**
 * Search parties by name (for deduplication check)
 * Returns top 10 matches using ILIKE for case-insensitive partial matching
 * Excludes archived parties
 *
 * @param ctx - request context
 * @param searchTerm - search term to match against party name
 * @param options - optional filters
 * @param options.partyType - filter by party type ('entity' or 'facilitator')
 */
export async function searchParties(
	ctx: ProtectedContext,
	searchTerm: string,
	options?: { partyType?: 'entity' | 'facilitator' }
) {
	let query = ctx.db
		.selectFrom('party')
		.selectAll()
		.where('party.client_id', '=', ctx.session.user.client_id)
		.where('party.deleted_at', 'is', null) // Exclude archived parties
		.where(sql<boolean>`party.name ILIKE ${`%${searchTerm}%`}`)
		.orderBy('party.name asc')
		.limit(10);

	// Apply party type filter if provided
	if (options?.partyType) {
		query = query.where('party.party_type', '=', options.partyType);
	}

	return await query.execute();
}

/**
 * Create new party
 */
export async function createParty(
	ctx: ProtectedContext,
	params: {
		party_type: string;
		party_category: string;
		name: string;
		organization?: string;
		email?: string;
		phone?: string;
		street_address?: string | null;
		city?: string | null;
		state?: string | null;
		postal_code?: string | null;
		country?: string | null;
		notes?: string;
	}
) {
	return await ctx.db
		.insertInto('party')
		.values({
			client_id: ctx.session.user.client_id!,
			created_by: ctx.session.user.id,
			...params,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Update existing party
 */
export async function updateParty(
	ctx: ProtectedContext,
	id: number,
	params: {
		party_type?: string;
		party_category?: string;
		name?: string;
		organization?: string;
		email?: string;
		phone?: string;
		street_address?: string | null;
		city?: string | null;
		state?: string | null;
		postal_code?: string | null;
		country?: string | null;
		notes?: string;
	}
) {
	return await ctx.db
		.updateTable('party')
		.set({
			...params,
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		})
		.where('party.id', '=', id)
		.where('party.client_id', '=', ctx.session.user.client_id)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Check if party has active claim associations
 * Used before archiving to prevent data inconsistencies
 */
export async function getActiveClaimAssociations(ctx: ProtectedContext, partyId: number) {
	return await ctx.db
		.selectFrom('claim_party')
		.innerJoin('claim', 'claim.id', 'claim_party.claim_id')
		.select(['claim_party.id', 'claim.claim_number', 'claim.substatus'])
		.where('claim_party.party_id', '=', partyId)
		.where('claim_party.deleted_at', 'is', null)
		.where('claim.substatus', 'not in', ['Completed', 'Cancelled'])
		.execute();
}

/**
 * Archive party (soft delete)
 * Cascades to party_office and party_representative
 * Prevents archiving if party has active claim associations
 */
export async function archiveParty(ctx: ProtectedContext, id: number) {
	const party = await getParty(ctx, id);
	if (!party) {
		throw new Error('Party not found');
	}

	// Check for active claim associations
	const activeClaims = await getActiveClaimAssociations(ctx, id);
	if (activeClaims.length > 0) {
		throw new Error(
			`Cannot archive party - associated with ${activeClaims.length} active claim(s). ` +
				`Please remove party from active claims first.`
		);
	}

	const deletedAt = new Date();
	const deletedBy = ctx.session.user.email!;

	// Archive party
	await ctx.db
		.updateTable('party')
		.set({ deleted_at: deletedAt, deleted_by: deletedBy })
		.where('party.id', '=', id)
		.where('party.client_id', '=', ctx.session.user.client_id)
		.execute();

	// Cascade to party offices (party_id FK to party which we already verified via getParty)
	await ctx.db
		.updateTable('party_office')
		.set({ deleted_at: deletedAt, deleted_by: deletedBy })
		.where('party_office.party_id', '=', id)
		.where(
			'party_office.party_id',
			'in',
			ctx.db
				.selectFrom('party')
				.select('party.id')
				.where('party.client_id', '=', ctx.session.user.client_id)
				.where('party.id', '=', id)
		)
		.execute();

	// Cascade to party representatives
	await ctx.db
		.updateTable('party_representative')
		.set({ deleted_at: deletedAt, deleted_by: deletedBy })
		.where('party_representative.party_id', '=', id)
		.where(
			'party_representative.party_id',
			'in',
			ctx.db
				.selectFrom('party')
				.select('party.id')
				.where('party.client_id', '=', ctx.session.user.client_id)
				.where('party.id', '=', id)
		)
		.execute();

	return party;
}

/**
 * Restore party (undo soft delete)
 * Cascades to party_office and party_representative
 */
export async function restoreParty(ctx: ProtectedContext, id: number) {
	const party = await getParty(ctx, id);
	if (!party) {
		throw new Error('Party not found');
	}

	// Restore party
	await ctx.db
		.updateTable('party')
		.set({ deleted_at: null, deleted_by: null })
		.where('party.id', '=', id)
		.where('party.client_id', '=', ctx.session.user.client_id)
		.execute();

	// Cascade to party offices
	await ctx.db
		.updateTable('party_office')
		.set({ deleted_at: null, deleted_by: null })
		.where('party_office.party_id', '=', id)
		.where(
			'party_office.party_id',
			'in',
			ctx.db
				.selectFrom('party')
				.select('party.id')
				.where('party.client_id', '=', ctx.session.user.client_id)
				.where('party.id', '=', id)
		)
		.execute();

	// Cascade to party representatives
	await ctx.db
		.updateTable('party_representative')
		.set({ deleted_at: null, deleted_by: null })
		.where('party_representative.party_id', '=', id)
		.where(
			'party_representative.party_id',
			'in',
			ctx.db
				.selectFrom('party')
				.select('party.id')
				.where('party.client_id', '=', ctx.session.user.client_id)
				.where('party.id', '=', id)
		)
		.execute();

	return party;
}

// ============================================================================
// PARTY OFFICE CRUD OPERATIONS
// ============================================================================

/**
 * Get all offices for a party
 */
export async function getPartyOffices(ctx: ProtectedContext, partyId: number, showArchived?: boolean) {
	// Verify party belongs to client (via join)
	let query = ctx.db
		.selectFrom('party_office')
		.innerJoin('party', 'party.id', 'party_office.party_id')
		.selectAll('party_office')
		.select(['party.name as party_name', 'party.deleted_at as party_deleted_at'])
		.where('party.client_id', '=', ctx.session.user.client_id)
		.where('party_office.party_id', '=', partyId);

	// Filter by archived status
	if (showArchived) {
		// Show only archived offices
		query = query.where('party_office.deleted_at', 'is not', null);
	} else {
		// Show only active offices (default)
		query = query.where('party_office.deleted_at', 'is', null);
	}

	return await query.orderBy('party_office.is_primary desc').orderBy('party_office.office_name asc').execute();
}

/**
 * Get paginated list of all party offices across all parties with optional search filter
 * Returns { rows, count } for server-side pagination
 */
export async function getAllPartyOffices(
	ctx: ProtectedContext,
	searchTerm?: string,
	limit?: number,
	offset?: number,
	showArchived?: boolean
) {
	// Base query with client scoping and party info
	let query = ctx.db
		.selectFrom('party_office')
		.innerJoin('party', 'party.id', 'party_office.party_id')
		.selectAll('party_office')
		.select([
			'party.name as party_name',
			'party.organization as party_organization',
			'party.deleted_at as party_deleted_at',
		])
		.where('party.client_id', '=', ctx.session.user.client_id)
		.orderBy('party.name asc')
		.orderBy('party_office.is_primary desc')
		.orderBy('party_office.office_name asc');

	// Filter by archived status
	if (showArchived) {
		// Show only archived offices
		query = query.where('party_office.deleted_at', 'is not', null);
	} else {
		// Show only active offices (default)
		query = query.where('party_office.deleted_at', 'is', null);
	}

	// Apply search filter if provided (search by party name, office name, city, or state)
	if (searchTerm) {
		query = query.where((eb) =>
			eb.or([
				sql<boolean>`party.name ILIKE ${`%${searchTerm}%`}`,
				sql<boolean>`party_office.office_name ILIKE ${`%${searchTerm}%`}`,
				sql<boolean>`party_office.city ILIKE ${`%${searchTerm}%`}`,
				sql<boolean>`party_office.state ILIKE ${`%${searchTerm}%`}`,
			])
		);
	}

	// Count query (run in parallel with data query)
	const countQuery = query
		.clearSelect()
		.clearOrderBy()
		.select(({ fn }) => fn.countAll().as('count'))
		.executeTakeFirst();

	// Data query with pagination
	const rowsQuery = query
		.$if(limit !== undefined, (qb) => qb.limit(limit!))
		.$if(offset !== undefined, (qb) => qb.offset(offset!))
		.execute();

	// Execute in parallel
	const [countResult, rows] = await Promise.all([countQuery, rowsQuery]);

	return {
		rows,
		count: countResult?.count ? Number(countResult.count) : 0,
	};
}

/**
 * Create party office
 * If is_primary is true, unsets all other primaries for this party first
 */
export async function createPartyOffice(
	ctx: ProtectedContext,
	params: {
		party_id: number;
		office_name?: string;
		street_address?: string | null;
		city?: string | null;
		state?: string | null;
		postal_code?: string | null;
		country?: string | null;
		phone?: string;
		fax?: string;
		is_primary?: boolean;
	}
) {
	// Verify party belongs to client
	const partyBelongsToClient = ctx.db
		.selectFrom('party')
		.select('party.id')
		.where('party.client_id', '=', ctx.session.user.client_id)
		.where('party.id', '=', params.party_id);

	// If setting as primary, unset all other primaries for this party
	if (params.is_primary) {
		await ctx.db
			.updateTable('party_office')
			.set({ is_primary: false })
			.where('party_id', '=', params.party_id)
			.where('party_id', 'in', partyBelongsToClient)
			.where('is_primary', '=', true)
			.execute();
	}

	return await ctx.db
		.insertInto('party_office')
		.values({
			...params,
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Update party office
 * If is_primary is true, unsets all other primaries for this party first
 */
export async function updatePartyOffice(
	ctx: ProtectedContext,
	id: number,
	params: {
		office_name?: string;
		street_address?: string | null;
		city?: string | null;
		state?: string | null;
		postal_code?: string | null;
		country?: string | null;
		phone?: string;
		fax?: string;
		is_primary?: boolean;
	}
) {
	// If setting as primary, get the party_id and unset all other primaries
	if (params.is_primary) {
		const office = await ctx.db
			.selectFrom('party_office')
			.innerJoin('party', 'party.id', 'party_office.party_id')
			.select('party_office.party_id')
			.where('party_office.id', '=', id)
			.where('party.client_id', '=', ctx.session.user.client_id)
			.executeTakeFirst();

		if (office) {
			await ctx.db
				.updateTable('party_office')
				.set({ is_primary: false })
				.where('party_id', '=', office.party_id)
				.where('id', '!=', id)
				.where('is_primary', '=', true)
				.where(
					'party_id',
					'in',
					ctx.db
						.selectFrom('party')
						.select('party.id')
						.where('party.client_id', '=', ctx.session.user.client_id)
				)
				.execute();
		}
	}

	return await ctx.db
		.updateTable('party_office')
		.set({
			...params,
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		})
		.where('party_office.id', '=', id)
		.where(
			'party_office.party_id',
			'in',
			ctx.db.selectFrom('party').select('party.id').where('party.client_id', '=', ctx.session.user.client_id)
		)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Get party office by ID (for operations that need full office data)
 */
export async function getPartyOffice(ctx: ProtectedContext, id: number) {
	return await ctx.db
		.selectFrom('party_office')
		.innerJoin('party', 'party.id', 'party_office.party_id')
		.selectAll('party_office')
		.select(['party.name as party_name'])
		.where('party.client_id', '=', ctx.session.user.client_id)
		.where('party_office.id', '=', id)
		.executeTakeFirst();
}

/**
 * Archive party office (soft delete)
 */
export async function archivePartyOffice(ctx: ProtectedContext, id: number) {
	const office = await getPartyOffice(ctx, id);
	if (!office) {
		throw new Error('Office not found');
	}

	const deletedAt = new Date();
	const deletedBy = ctx.session.user.email!;

	await ctx.db
		.updateTable('party_office')
		.set({ deleted_at: deletedAt, deleted_by: deletedBy })
		.where('party_office.id', '=', id)
		.where(
			'party_office.party_id',
			'in',
			ctx.db.selectFrom('party').select('party.id').where('party.client_id', '=', ctx.session.user.client_id)
		)
		.execute();

	return office;
}

/**
 * Restore party office (undo soft delete)
 */
export async function restorePartyOffice(ctx: ProtectedContext, id: number) {
	const office = await getPartyOffice(ctx, id);
	if (!office) {
		throw new Error('Office not found');
	}

	await ctx.db
		.updateTable('party_office')
		.set({ deleted_at: null, deleted_by: null })
		.where('party_office.id', '=', id)
		.where(
			'party_office.party_id',
			'in',
			ctx.db.selectFrom('party').select('party.id').where('party.client_id', '=', ctx.session.user.client_id)
		)
		.execute();

	return office;
}

// ============================================================================
// PARTY REPRESENTATIVE CRUD OPERATIONS
// ============================================================================

/**
 * Get all representatives for a party (optionally filtered by office)
 */
export async function getPartyRepresentatives(
	ctx: ProtectedContext,
	partyId: number,
	officeId?: number,
	showArchived?: boolean
) {
	// Verify party belongs to client (via join)
	let query = ctx.db
		.selectFrom('party_representative')
		.innerJoin('party', 'party.id', 'party_representative.party_id')
		.leftJoin('party_office', 'party_office.id', 'party_representative.office_id')
		.selectAll('party_representative')
		.select(['party_office.office_name as office_name', 'party_office.deleted_at as office_deleted_at'])
		.where('party.client_id', '=', ctx.session.user.client_id)
		.where('party_representative.party_id', '=', partyId);

	// Filter by archived status
	if (showArchived) {
		// Show only archived representatives
		query = query.where('party_representative.deleted_at', 'is not', null);
	} else {
		// Show only active representatives (default)
		query = query.where('party_representative.deleted_at', 'is', null);
	}

	// Optional office filter
	if (officeId !== undefined) {
		query = query.where('party_representative.office_id', '=', officeId);
	}

	return await query
		.orderBy('party_representative.is_primary desc')
		.orderBy('party_representative.last_name asc')
		.orderBy('party_representative.first_name asc')
		.execute();
}

/**
 * Get paginated list of all party representatives across all parties with optional search filter
 * Returns { rows, count } for server-side pagination
 */
export async function getAllPartyRepresentatives(
	ctx: ProtectedContext,
	searchTerm?: string,
	limit?: number,
	offset?: number,
	showArchived?: boolean
) {
	// Base query with client scoping and party/office info
	let query = ctx.db
		.selectFrom('party_representative')
		.innerJoin('party', 'party.id', 'party_representative.party_id')
		.leftJoin('party_office', 'party_office.id', 'party_representative.office_id')
		.selectAll('party_representative')
		.select([
			'party.name as party_name',
			'party.organization as party_organization',
			'party.deleted_at as party_deleted_at',
			'party_office.office_name as office_name',
			'party_office.street_address as office_street_address',
			'party_office.city as office_city',
			'party_office.state as office_state',
			'party_office.postal_code as office_postal_code',
			'party_office.country as office_country',
			'party_office.deleted_at as office_deleted_at',
		])
		.where('party.client_id', '=', ctx.session.user.client_id)
		.orderBy('party.name asc')
		.orderBy('party_representative.is_primary desc')
		.orderBy('party_representative.last_name asc')
		.orderBy('party_representative.first_name asc');

	// Filter by archived status
	if (showArchived) {
		// Show only archived representatives
		query = query.where('party_representative.deleted_at', 'is not', null);
	} else {
		// Show only active representatives (default)
		query = query.where('party_representative.deleted_at', 'is', null);
	}

	// Apply search filter if provided (search by party name, representative name, title, email)
	if (searchTerm) {
		query = query.where((eb) =>
			eb.or([
				sql<boolean>`party.name ILIKE ${`%${searchTerm}%`}`,
				sql<boolean>`concat(party_representative.first_name, ' ', party_representative.last_name) ILIKE ${`%${searchTerm}%`}`,
				sql<boolean>`party_representative.title ILIKE ${`%${searchTerm}%`}`,
				sql<boolean>`party_representative.email ILIKE ${`%${searchTerm}%`}`,
			])
		);
	}

	// Count query (run in parallel with data query)
	const countQuery = query
		.clearSelect()
		.clearOrderBy()
		.select(({ fn }) => fn.countAll().as('count'))
		.executeTakeFirst();

	// Data query with pagination
	const rowsQuery = query
		.$if(limit !== undefined, (qb) => qb.limit(limit!))
		.$if(offset !== undefined, (qb) => qb.offset(offset!))
		.execute();

	// Execute in parallel
	const [countResult, rows] = await Promise.all([countQuery, rowsQuery]);

	return {
		rows,
		count: countResult?.count ? Number(countResult.count) : 0,
	};
}

/**
 * Get single party representative by ID with party and office information
 */
export async function getPartyRepresentative(ctx: ProtectedContext, id: number) {
	return await ctx.db
		.selectFrom('party_representative')
		.innerJoin('party', 'party.id', 'party_representative.party_id')
		.leftJoin('party_office', 'party_office.id', 'party_representative.office_id')
		.selectAll('party_representative')
		.select(['party.name as party_name', 'party_office.office_name as office_name'])
		.where('party.client_id', '=', ctx.session.user.client_id)
		.where('party_representative.id', '=', id)
		.executeTakeFirst();
}

/**
 * Archive party representative (soft delete)
 */
export async function archivePartyRepresentative(ctx: ProtectedContext, id: number) {
	const representative = await getPartyRepresentative(ctx, id);
	if (!representative) {
		throw new Error('Representative not found');
	}

	const deletedAt = new Date();
	const deletedBy = ctx.session.user.email!;

	await ctx.db
		.updateTable('party_representative')
		.set({ deleted_at: deletedAt, deleted_by: deletedBy })
		.where('party_representative.id', '=', id)
		.where(
			'party_representative.party_id',
			'in',
			ctx.db.selectFrom('party').select('party.id').where('party.client_id', '=', ctx.session.user.client_id)
		)
		.execute();

	return representative;
}

/**
 * Restore party representative (undo soft delete)
 */
export async function restorePartyRepresentative(ctx: ProtectedContext, id: number) {
	const representative = await getPartyRepresentative(ctx, id);
	if (!representative) {
		throw new Error('Representative not found');
	}

	await ctx.db
		.updateTable('party_representative')
		.set({ deleted_at: null, deleted_by: null })
		.where('party_representative.id', '=', id)
		.where(
			'party_representative.party_id',
			'in',
			ctx.db.selectFrom('party').select('party.id').where('party.client_id', '=', ctx.session.user.client_id)
		)
		.execute();

	return representative;
}

/**
 * Create party representative
 * If is_primary is true, unsets all other primaries for this party first
 */
export async function createPartyRepresentative(
	ctx: ProtectedContext,
	params: {
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
	// Verify party belongs to client
	const partyBelongsToClient = ctx.db
		.selectFrom('party')
		.select('party.id')
		.where('party.client_id', '=', ctx.session.user.client_id)
		.where('party.id', '=', params.party_id);

	// If setting as primary, unset all other primaries for this party
	if (params.is_primary) {
		await ctx.db
			.updateTable('party_representative')
			.set({ is_primary: false })
			.where('party_id', '=', params.party_id)
			.where('party_id', 'in', partyBelongsToClient)
			.where('is_primary', '=', true)
			.execute();
	}

	return await ctx.db
		.insertInto('party_representative')
		.values({
			...params,
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Update party representative
 * If is_primary is true, unsets all other primaries for this party first
 */
export async function updatePartyRepresentative(
	ctx: ProtectedContext,
	id: number,
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
	}
) {
	// If setting as primary, get the party_id and unset all other primaries
	if (params.is_primary) {
		const representative = await ctx.db
			.selectFrom('party_representative')
			.innerJoin('party', 'party.id', 'party_representative.party_id')
			.select('party_representative.party_id')
			.where('party_representative.id', '=', id)
			.where('party.client_id', '=', ctx.session.user.client_id)
			.executeTakeFirst();

		if (representative) {
			await ctx.db
				.updateTable('party_representative')
				.set({ is_primary: false })
				.where('party_id', '=', representative.party_id)
				.where('id', '!=', id)
				.where('is_primary', '=', true)
				.where(
					'party_id',
					'in',
					ctx.db
						.selectFrom('party')
						.select('party.id')
						.where('party.client_id', '=', ctx.session.user.client_id)
				)
				.execute();
		}
	}

	return await ctx.db
		.updateTable('party_representative')
		.set({
			...params,
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		})
		.where('party_representative.id', '=', id)
		.where(
			'party_representative.party_id',
			'in',
			ctx.db.selectFrom('party').select('party.id').where('party.client_id', '=', ctx.session.user.client_id)
		)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Get party representative for deletion (for admin logging)
 */
export async function getPartyRepresentativeForDeletion(ctx: ProtectedContext, id: number) {
	return await ctx.db
		.selectFrom('party_representative')
		.innerJoin('party', 'party.id', 'party_representative.party_id')
		.select([
			'party_representative.id',
			'party_representative.party_id',
			'party_representative.first_name',
			'party_representative.last_name',
			'party_representative.title',
			'party_representative.email',
		])
		.where('party_representative.id', '=', id)
		.where('party.client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();
}

/**
 * Delete party representative
 */
export async function deletePartyRepresentative(ctx: ProtectedContext, id: number) {
	await ctx.db
		.deleteFrom('party_representative')
		.where('party_representative.id', '=', id)
		.where(
			'party_representative.party_id',
			'in',
			ctx.db.selectFrom('party').select('party.id').where('party.client_id', '=', ctx.session.user.client_id)
		)
		.execute();
}

// ============================================================================
// CLAIM PARTY LINKING OPERATIONS
// ============================================================================

/**
 * Get all parties linked to a claim with their role information
 *
 * @param ctx - request context
 * @param claimId - claim identifier
 * @param options - optional filters
 * @param options.partyType - filter by party type ('entity' or 'facilitator')
 * @returns array of claim parties with nested party, representative, office, liabilities, and coverages
 */
export async function getClaimParties(
	ctx: ProtectedContext,
	claimId: number,
	options?: { partyType?: 'entity' | 'facilitator' }
) {
	// Fetch claim parties with related data
	let query = ctx.db
		.selectFrom('claim_party')
		.innerJoin('party', 'party.id', 'claim_party.party_id')
		.innerJoin('claim', 'claim.id', 'claim_party.claim_id')
		.leftJoin('party_representative', 'party_representative.id', 'claim_party.representative_id')
		.leftJoin('party_office', (join) =>
			join
				.onRef('party_office.party_id', '=', 'party.id')
				.on('party_office.is_primary', '=', true)
				.on('party_office.deleted_at', 'is', null)
		)
		.selectAll('claim_party')
		.select([
			'party.id as party_id',
			'party.name as party_name',
			'party.party_type as party_type',
			'party.party_category as party_category',
			'party.organization as party_organization',
			'party.email as party_email',
			'party.phone as party_phone',
			'party_representative.id as representative_id',
			'party_representative.first_name as representative_first_name',
			'party_representative.last_name as representative_last_name',
			'party_representative.email as representative_email',
			'party_representative.phone as representative_phone',
			'party_representative.title as representative_title',
			'party_office.id as office_id',
			'party_office.office_name as office_name',
			'party_office.street_address as office_street_address',
			'party_office.city as office_city',
			'party_office.state as office_state',
			'party_office.postal_code as office_postal_code',
			'party_office.country as office_country',
			'party_office.phone as office_phone',
		])
		.where('claim.client_id', '=', ctx.session.user.client_id)
		.where('claim_party.claim_id', '=', claimId)
		.where('claim_party.deleted_at', 'is', null)
		.orderBy('party.name', 'asc');

	// Apply party type filter if provided
	if (options?.partyType) {
		query = query.where('party.party_type', '=', options.partyType);
	}

	const results = await query.execute();

	// If no claim parties, return empty array
	if (results.length === 0) {
		return [];
	}

	// Fetch all non-deleted liabilities for these claim parties
	const claimPartyIds = results.map((r) => r.id);
	const liabilities = await ctx.db
		.selectFrom('claim_liability')
		.selectAll()
		.where('claim_liability.claim_party_id', 'in', claimPartyIds)
		.where('claim_liability.deleted_at', 'is', null)
		.orderBy('claim_liability.created_at', 'asc')
		.execute();

	// Group liabilities by claim_party_id
	const liabilitiesByParty = liabilities.reduce(
		(acc, liability) => {
			if (!acc[liability.claim_party_id]) {
				acc[liability.claim_party_id] = [];
			}
			acc[liability.claim_party_id].push(liability);
			return acc;
		},
		{} as Record<number, typeof liabilities>
	);

	// Fetch all non-deleted coverages for these claim parties
	const coverages = await ctx.db
		.selectFrom('claim_coverage')
		.selectAll()
		.where('claim_coverage.claim_party_id', 'in', claimPartyIds)
		.where('claim_coverage.client_id', '=', ctx.session.user.client_id)
		.where('claim_coverage.deleted_at', 'is', null)
		.orderBy('claim_coverage.created_at', 'asc')
		.execute();

	// Group coverages by claim_party_id
	const coveragesByParty = coverages.reduce(
		(acc, coverage) => {
			if (coverage.claim_party_id) {
				if (!acc[coverage.claim_party_id]) {
					acc[coverage.claim_party_id] = [];
				}
				acc[coverage.claim_party_id].push(coverage);
			}
			return acc;
		},
		{} as Record<number, typeof coverages>
	);

	// Transform results to nest party, representative, office, liabilities, and coverages data
	return results.map((row) => ({
		id: row.id,
		claim_id: row.claim_id,
		party_id: row.party_id,
		role: row.role,
		is_primary: row.is_primary,
		notes: row.notes,
		external_reference: row.external_reference,
		liability_percentage: row.liability_percentage,
		created_at: row.created_at,
		created_by: row.created_by,
		representative_id: row.representative_id,
		party: {
			id: row.party_id,
			name: row.party_name,
			party_type: row.party_type,
			party_category: row.party_category,
			organization: row.party_organization,
			email: row.party_email,
			phone: row.party_phone,
		},
		representative: row.representative_id
			? {
					id: row.representative_id,
					first_name: row.representative_first_name!,
					last_name: row.representative_last_name!,
					email: row.representative_email,
					phone: row.representative_phone,
					title: row.representative_title,
				}
			: null,
		office: row.office_id
			? {
					id: row.office_id,
					office_name: row.office_name!,
					street_address: row.office_street_address,
					city: row.office_city,
					state: row.office_state,
					postal_code: row.office_postal_code,
					country: row.office_country,
					phone: row.office_phone,
				}
			: null,
		liabilities: liabilitiesByParty[row.id] || [],
		coverages: coveragesByParty[row.id] || [],
	}));
}

/**
 * Link party to claim with role information
 * Recalculates expected_recovery after creation
 *
 * @returns claimParty and updated expectedRecovery
 */
export async function linkPartyToClaim(
	ctx: ProtectedContext,
	params: {
		claim_id: number;
		party_id: number;
		role: string;
		representative_id?: number | null;
		is_primary?: boolean;
		notes?: string;
		external_reference?: string;
		liability_percentage?: number;
	}
) {
	const claimParty = await ctx.db
		.insertInto('claim_party')
		.values({
			claim_id: params.claim_id,
			party_id: params.party_id,
			role: params.role,
			representative_id: params.representative_id,
			is_primary: params.is_primary,
			notes: params.notes,
			external_reference: params.external_reference,
			liability_percentage: params.liability_percentage?.toString(),
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();

	// Recalculate expected_recovery and return the new value
	const expectedRecovery = await recalculateClaimExpectedRecovery(ctx, params.claim_id);

	return { claimParty, expectedRecovery };
}

/**
 * Update claim party relationship
 * Recalculates expected_recovery after update
 *
 * @returns claimParty and updated expectedRecovery
 */
export async function updateClaimParty(
	ctx: ProtectedContext,
	id: number,
	params: {
		role?: string;
		representative_id?: number | null;
		is_primary?: boolean;
		notes?: string;
		external_reference?: string;
		liability_percentage?: number | null;
	}
) {
	const claimParty = await ctx.db
		.updateTable('claim_party')
		.set({
			...(params.role !== undefined && { role: params.role }),
			...(params.representative_id !== undefined && { representative_id: params.representative_id }),
			...(params.is_primary !== undefined && { is_primary: params.is_primary }),
			...(params.notes !== undefined && { notes: params.notes }),
			...(params.external_reference !== undefined && { external_reference: params.external_reference }),
			...(params.liability_percentage !== undefined && {
				liability_percentage:
					params.liability_percentage === null ? null : params.liability_percentage?.toString(),
			}),
		})
		.where('claim_party.id', '=', id)
		.where(
			'claim_party.claim_id',
			'in',
			ctx.db.selectFrom('claim').select('claim.id').where('claim.client_id', '=', ctx.session.user.client_id)
		)
		.returningAll()
		.executeTakeFirstOrThrow();

	// Recalculate expected_recovery and return the new value
	const expectedRecovery = await recalculateClaimExpectedRecovery(ctx, claimParty.claim_id);

	return { claimParty, expectedRecovery };
}

/**
 * Get claim party for deletion (for admin logging)
 */
export async function getClaimPartyForDeletion(ctx: ProtectedContext, id: number) {
	return await ctx.db
		.selectFrom('claim_party')
		.innerJoin('party', 'party.id', 'claim_party.party_id')
		.innerJoin('claim', 'claim.id', 'claim_party.claim_id')
		.select([
			'claim_party.id as id',
			'claim_party.claim_id as claim_id',
			'claim_party.party_id as party_id',
			'claim_party.role as role',
			'party.name as party_name',
			'claim.claim_number as claim_number',
		])
		.where('claim_party.id', '=', id)
		.where('claim.client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();
}

/**
 * Unlink party from claim (delete claim_party relationship)
 * Also archives any coverages associated with this claim party
 * Recalculates expected_recovery and total_incurred after deletion
 *
 * @returns updated expectedRecovery, totalIncurred, and claimId
 */
export async function unlinkPartyFromClaim(ctx: ProtectedContext, id: number) {
	// Get claim_id before deletion for recalculation (with client check)
	const claimParty = await ctx.db
		.selectFrom('claim_party')
		.innerJoin('claim', 'claim.id', 'claim_party.claim_id')
		.select(['claim_party.claim_id'])
		.where('claim_party.id', '=', id)
		.where('claim.client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();

	if (!claimParty) {
		throw new Error('Claim party not found');
	}

	// Import dynamically to avoid circular dependency
	const { archiveCoveragesByClaimParty } = await import('./coverageQueries');
	const { recalculateTotalIncurred } = await import('./claimQueries');

	// Archive any coverages associated with this claim party
	await archiveCoveragesByClaimParty(ctx, id);

	await ctx.db
		.deleteFrom('claim_party')
		.where('claim_party.id', '=', id)
		.where(
			'claim_party.claim_id',
			'in',
			ctx.db.selectFrom('claim').select('claim.id').where('claim.client_id', '=', ctx.session.user.client_id)
		)
		.execute();

	// Recalculate expected_recovery and total_incurred
	const expectedRecovery = await recalculateClaimExpectedRecovery(ctx, claimParty.claim_id);
	const totalIncurred = await recalculateTotalIncurred(ctx, claimParty.claim_id);

	return { expectedRecovery, totalIncurred, claimId: claimParty.claim_id };
}

/**
 * Get total liability percentage for a claim (sum of all party liability_percentages)
 * Used to calculate "our liability" as (100 - total party liability percentage)
 */
export async function getClaimLiabilityPercentageTotal(ctx: ProtectedContext, claimId: number) {
	const result = await ctx.db
		.selectFrom('claim_party')
		.innerJoin('claim', 'claim.id', 'claim_party.claim_id')
		.select(({ fn }) => fn.sum<string>('claim_party.liability_percentage').as('total_liability_percentage'))
		.where('claim.client_id', '=', ctx.session.user.client_id)
		.where('claim_party.claim_id', '=', claimId)
		.where('claim_party.deleted_at', 'is', null)
		.executeTakeFirst();

	return result?.total_liability_percentage ? parseFloat(result.total_liability_percentage) : 0;
}
