import type { ProtectedContext } from '@/server/trpc/trpc';
import { sql } from 'kysely';
import { TRPCError } from '@trpc/server';
import { recalculateClaimExpectedRecovery } from './claimQueries';

// ============================================================================
// PARTY CRUD OPERATIONS
// ============================================================================

/**
 * Get paginated list of parties with optional search filter
 * Returns { rows, count } for server-side pagination
 * Includes primary contact info via LEFT JOINs
 */
export async function getParties(
	ctx: ProtectedContext,
	searchTerm?: string,
	limit?: number,
	offset?: number,
	showArchived?: boolean
) {
	// Base query with client scoping (Phase 4.1: jsonb_agg for contacts + GROUP BY)
	let query = ctx.db
		.selectFrom('party')
		.leftJoin('party_email', (join) =>
			join.onRef('party_email.party_id', '=', 'party.id').on('party_email.deleted_at', 'is', null)
		)
		.leftJoin('party_phone', (join) =>
			join.onRef('party_phone.party_id', '=', 'party.id').on('party_phone.deleted_at', 'is', null)
		)
		.leftJoin('party_address', (join) =>
			join
				.onRef('party_address.party_id', '=', 'party.id')
				.on('party_address.deleted_at', 'is', null)
				.on('party_address.address_status', '=', 'valid')
		)
		.select((eb) => [
			'party.id',
			'party.name',
			'party.party_type',
			'party.client_id',
			'party.created_at',
			'party.created_by',
			'party.updated_at',
			'party.updated_by',
			'party.deleted_at',
			'party.deleted_by',
			// Aggregate emails into jsonb array (ordered by created_at for deterministic primary)
			sql`jsonb_agg(jsonb_build_object(
				'email_address', ${eb.ref('party_email.email_address')},
				'email_type', ${eb.ref('party_email.email_type')}
			) ORDER BY ${eb.ref('party_email.created_at')} ASC) filter (where ${eb.ref('party_email.id')} is not null)`
				.$castTo<any>()
				.as('emails'),
			// Aggregate phones into jsonb array (ordered by created_at for deterministic primary)
			sql`jsonb_agg(jsonb_build_object(
				'phone_number', ${eb.ref('party_phone.phone_number')},
				'phone_type', ${eb.ref('party_phone.phone_type')}
			) ORDER BY ${eb.ref('party_phone.created_at')} ASC) filter (where ${eb.ref('party_phone.id')} is not null)`
				.$castTo<any>()
				.as('phones'),
			// Aggregate addresses into jsonb array (ordered by created_at for deterministic primary)
			sql`jsonb_agg(jsonb_build_object(
				'street_address', ${eb.ref('party_address.street_address')},
				'city', ${eb.ref('party_address.city')},
				'state', ${eb.ref('party_address.state')},
				'postal_code', ${eb.ref('party_address.postal_code')},
				'country', ${eb.ref('party_address.country')}
			) ORDER BY ${eb.ref('party_address.created_at')} ASC) filter (where ${eb.ref('party_address.id')} is not null)`
				.$castTo<any>()
				.as('addresses'),
		])
		.where('party.client_id', '=', ctx.session.user.client_id)
		.groupBy('party.id')
		.orderBy('party.name asc');

	// Filter by archived status
	if (showArchived) {
		// Show only archived parties
		query = query.where('party.deleted_at', 'is not', null);
	} else {
		// Show only active parties (default)
		query = query.where('party.deleted_at', 'is', null);
	}

	// Apply search filter if provided (prefix search - Phase 3.1 optimization)
	if (searchTerm) {
		query = query.where(sql<boolean>`party.name ILIKE ${`${searchTerm}%`}`);
	}

	// Count query (run in parallel with data query)
	const countQuery = ctx.db
		.selectFrom('party')
		.select(({ fn }) => fn.countAll().as('count'))
		.where('party.client_id', '=', ctx.session.user.client_id)
		.$if(!showArchived, (qb) => qb.where('party.deleted_at', 'is', null))
		.$if(!!showArchived, (qb) => qb.where('party.deleted_at', 'is not', null))
		.$if(!!searchTerm, (qb) => qb.where(sql<boolean>`party.name ILIKE ${`${searchTerm}%`}`))
		.executeTakeFirst();

	// Data query with pagination
	const rowsQuery = query
		.$if(limit !== undefined, (qb) => qb.limit(limit!))
		.$if(offset !== undefined, (qb) => qb.offset(offset!))
		.execute();

	// Execute in parallel
	const [countResult, rows] = await Promise.all([countQuery, rowsQuery]);

	// Transform results to extract primary contacts from arrays (Phase 4.1)
	const transformedRows = rows.map((party) => ({
		...party,
		// Extract primary contact from arrays (first element)
		primary_email: party.emails?.[0]?.email_address || null,
		primary_phone: party.phones?.[0]?.phone_number || null,
		primary_street_address: party.addresses?.[0]?.street_address || null,
		primary_city: party.addresses?.[0]?.city || null,
		primary_state: party.addresses?.[0]?.state || null,
		primary_postal_code: party.addresses?.[0]?.postal_code || null,
		primary_country: party.addresses?.[0]?.country || null,
		// Keep full contact arrays for UI
		all_emails: party.emails || [],
		all_phones: party.phones || [],
		all_addresses: party.addresses || [],
	}));

	return {
		rows: transformedRows,
		count: countResult?.count ? Number(countResult.count) : 0,
	};
}

/**
 * Get single party by ID with primary contact info
 */
export async function getParty(ctx: ProtectedContext, id: string) {
	const result = await ctx.db
		.selectFrom('party')
		.leftJoin('party_email', (join) =>
			join.onRef('party_email.party_id', '=', 'party.id').on('party_email.deleted_at', 'is', null)
		)
		.leftJoin('party_phone', (join) =>
			join.onRef('party_phone.party_id', '=', 'party.id').on('party_phone.deleted_at', 'is', null)
		)
		.leftJoin('party_address', (join) =>
			join
				.onRef('party_address.party_id', '=', 'party.id')
				.on('party_address.address_status', '=', 'valid')
				.on('party_address.deleted_at', 'is', null)
		)
		.selectAll('party')
		.select((eb) => [
			// Aggregate emails (ordered by created_at for deterministic primary)
			sql`jsonb_agg(jsonb_build_object(
				'email_address', ${eb.ref('party_email.email_address')},
				'email_type', ${eb.ref('party_email.email_type')}
			) ORDER BY ${eb.ref('party_email.created_at')} ASC) filter (where ${eb.ref('party_email.id')} is not null)`
				.$castTo<any>()
				.as('emails'),
			// Aggregate phones (ordered by created_at for deterministic primary)
			sql`jsonb_agg(jsonb_build_object(
				'phone_number', ${eb.ref('party_phone.phone_number')},
				'phone_type', ${eb.ref('party_phone.phone_type')}
			) ORDER BY ${eb.ref('party_phone.created_at')} ASC) filter (where ${eb.ref('party_phone.id')} is not null)`
				.$castTo<any>()
				.as('phones'),
			// Aggregate addresses (ordered by created_at for deterministic primary)
			sql`jsonb_agg(jsonb_build_object(
				'street_address', ${eb.ref('party_address.street_address')},
				'city', ${eb.ref('party_address.city')},
				'state', ${eb.ref('party_address.state')},
				'postal_code', ${eb.ref('party_address.postal_code')},
				'country', ${eb.ref('party_address.country')}
			) ORDER BY ${eb.ref('party_address.created_at')} ASC) filter (where ${eb.ref('party_address.id')} is not null)`
				.$castTo<any>()
				.as('addresses'),
		])
		.where('party.client_id', '=', ctx.session.user.client_id)
		.where('party.id', '=', id)
		.groupBy('party.id')
		.executeTakeFirst();

	if (!result) return undefined;

	// Extract primary contacts from arrays (first element, now deterministic)
	return {
		...result,
		primary_email: result.emails?.[0]?.email_address || null,
		primary_phone: result.phones?.[0]?.phone_number || null,
		primary_street_address: result.addresses?.[0]?.street_address || null,
		primary_city: result.addresses?.[0]?.city || null,
		primary_state: result.addresses?.[0]?.state || null,
		primary_postal_code: result.addresses?.[0]?.postal_code || null,
		primary_country: result.addresses?.[0]?.country || null,
	};
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
		// Join on the valid address (only one valid address per party is allowed)
		.leftJoin('party_address as valid_addr', (join) =>
			join
				.onRef('valid_addr.party_id', '=', 'party.id')
				.on('valid_addr.address_status', '=', 'valid')
				.on('valid_addr.deleted_at', 'is', null)
		)
		.select([
			'party.id',
			'party.name',
			'party.organization',
			'party.party_type',
			'party.is_business',
			'party.first_name',
			'party.last_name',
			'valid_addr.city as address_city',
			'valid_addr.state as address_state',
		])
		.where('party.client_id', '=', ctx.session.user.client_id)
		.where('party.deleted_at', 'is', null) // Exclude archived parties
		.where(sql<boolean>`party.name ILIKE ${`${searchTerm}%`}`) // Prefix search - Phase 3.1
		.orderBy('party.name asc')
		.limit(10);

	// Apply party type filter if provided
	if (options?.partyType) {
		query = query.where('party.party_type', '=', options.partyType);
	}

	return await query.execute();
}

/**
 * Create new party (core party record only - contact info handled by controller)
 */
export async function createParty(
	ctx: ProtectedContext,
	params: {
		party_type: string;
		is_business?: boolean;
		name?: string;
		first_name?: string;
		middle_name?: string;
		last_name?: string;
		suffix?: string;
		organization?: string;
		notes?: string;
	}
) {
	return await ctx.db
		.insertInto('party')
		.values({
			client_id: ctx.session.user.client_id!,
			created_by: ctx.session.user.id,
			// For individual parties, compute the name from first/last name
			name:
				params.is_business === false
					? [params.first_name, params.last_name].filter(Boolean).join(' ')
					: params.name!,
			party_type: params.party_type,
			is_business: params.is_business ?? true,
			first_name: params.first_name,
			middle_name: params.middle_name,
			last_name: params.last_name,
			suffix: params.suffix,
			organization: params.organization,
			notes: params.notes,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Update existing party (core party record only - contact info handled by controller)
 */
export async function updateParty(
	ctx: ProtectedContext,
	id: string,
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
	}
) {
	// Build update values
	const updateValues: Record<string, unknown> = {
		updated_by: ctx.session.user.id,
		updated_at: sql`now()`,
	};

	if (params.party_type !== undefined) updateValues.party_type = params.party_type;
	if (params.is_business !== undefined) updateValues.is_business = params.is_business;
	if (params.name !== undefined) updateValues.name = params.name;
	if (params.first_name !== undefined) updateValues.first_name = params.first_name;
	if (params.middle_name !== undefined) updateValues.middle_name = params.middle_name;
	if (params.last_name !== undefined) updateValues.last_name = params.last_name;
	if (params.suffix !== undefined) updateValues.suffix = params.suffix;
	if (params.organization !== undefined) updateValues.organization = params.organization;
	if (params.notes !== undefined) updateValues.notes = params.notes;

	// For individual parties, update the name from first/last name if they changed
	if (
		params.is_business === false &&
		(params.first_name !== undefined || params.last_name !== undefined)
	) {
		// Fetch current values to compute new name
		const currentParty = await ctx.db
			.selectFrom('party')
			.select(['first_name', 'last_name'])
			.where('id', '=', id)
			.executeTakeFirst();

		if (currentParty) {
			const firstName = params.first_name ?? currentParty.first_name;
			const lastName = params.last_name ?? currentParty.last_name;
			updateValues.name = [firstName, lastName].filter(Boolean).join(' ');
		}
	}

	return await ctx.db
		.updateTable('party')
		.set(updateValues)
		.where('party.id', '=', id)
		.where('party.client_id', '=', ctx.session.user.client_id)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Check if party has active claim associations
 * Used before archiving to prevent data inconsistencies
 */
export async function getActiveClaimAssociations(ctx: ProtectedContext, partyId: string) {
	return await ctx.db
		.selectFrom('claim_party')
		.innerJoin('claim', 'claim.id', 'claim_party.claim_id')
		.select(['claim_party.id', 'claim.claim_number', 'claim.substatus'])
		.where('claim_party.party_id', '=', partyId)
		.where('claim_party.client_id', '=', ctx.session.user.client_id)
		.where('claim_party.deleted_at', 'is', null)
		.where('claim.substatus', 'not in', ['Completed', 'Cancelled'])
		.where('claim.client_id', '=', ctx.session.user.client_id)
		.execute();
}

/**
 * Archive party (soft delete)
 * Cascades to party_address, party_phone, party_email, and party_representative
 * Prevents archiving if party has active claim associations
 */
export async function archiveParty(ctx: ProtectedContext, id: string) {
	// Check for active claim associations (business logic guard - Phase 5.1)
	const activeClaims = await getActiveClaimAssociations(ctx, id);
	if (activeClaims.length > 0) {
		throw new Error(
			`Cannot archive party - associated with ${activeClaims.length} active claim(s). ` +
				`Please remove party from active claims first.`
		);
	}

	const deletedAt = new Date();
	const deletedBy = ctx.session.user.id;

	// Archive party (existence check implicit in executeTakeFirstOrThrow - Phase 5.1 optimization)
	const party = await ctx.db
		.updateTable('party')
		.set({ deleted_at: deletedAt, deleted_by: deletedBy })
		.where('party.id', '=', id)
		.where('party.client_id', '=', ctx.session.user.client_id)
		.where('party.deleted_at', 'is', null)
		.returningAll()
		.executeTakeFirstOrThrow();

	// Cascade to party addresses
	await ctx.db
		.updateTable('party_address')
		.set({ deleted_at: deletedAt, deleted_by: deletedBy })
		.where('party_address.party_id', '=', id)
		.where('party_address.deleted_at', 'is', null)
		.execute();

	// Cascade to party phones
	await ctx.db
		.updateTable('party_phone')
		.set({ deleted_at: deletedAt, deleted_by: deletedBy })
		.where('party_phone.party_id', '=', id)
		.where('party_phone.deleted_at', 'is', null)
		.execute();

	// Cascade to party emails
	await ctx.db
		.updateTable('party_email')
		.set({ deleted_at: deletedAt, deleted_by: deletedBy })
		.where('party_email.party_id', '=', id)
		.where('party_email.deleted_at', 'is', null)
		.execute();

	// Cascade to party representatives
	await ctx.db
		.updateTable('party_representative')
		.set({ deleted_at: deletedAt, deleted_by: deletedBy })
		.where('party_representative.party_id', '=', id)
		.where('party_representative.deleted_at', 'is', null)
		.execute();

	return party;
}

/**
 * Restore party (undo soft delete)
 * Cascades to party_address, party_phone, party_email, and party_representative
 */
export async function restoreParty(ctx: ProtectedContext, id: string) {
	// Restore party (existence check implicit in executeTakeFirstOrThrow - Phase 5.1 optimization)
	const party = await ctx.db
		.updateTable('party')
		.set({ deleted_at: null, deleted_by: null })
		.where('party.id', '=', id)
		.where('party.client_id', '=', ctx.session.user.client_id)
		.where('party.deleted_at', 'is not', null)
		.returningAll()
		.executeTakeFirstOrThrow();

	// Cascade to party addresses
	await ctx.db
		.updateTable('party_address')
		.set({ deleted_at: null, deleted_by: null })
		.where('party_address.party_id', '=', id)
		.execute();

	// Cascade to party phones
	await ctx.db
		.updateTable('party_phone')
		.set({ deleted_at: null, deleted_by: null })
		.where('party_phone.party_id', '=', id)
		.execute();

	// Cascade to party emails
	await ctx.db
		.updateTable('party_email')
		.set({ deleted_at: null, deleted_by: null })
		.where('party_email.party_id', '=', id)
		.execute();

	// Cascade to party representatives
	await ctx.db
		.updateTable('party_representative')
		.set({ deleted_at: null, deleted_by: null })
		.where('party_representative.party_id', '=', id)
		.execute();

	return party;
}

// ============================================================================
// PARTY ADDRESS CRUD OPERATIONS (renamed from PARTY OFFICE)
// ============================================================================

/**
 * Get all addresses for a party
 */
export async function getPartyAddresses(
	ctx: ProtectedContext,
	partyId: string,
	showArchived?: boolean
) {
	// Verify party belongs to client (via join)
	let query = ctx.db
		.selectFrom('party_address')
		.innerJoin('party', 'party.id', 'party_address.party_id')
		.selectAll('party_address')
		.select(['party.name as party_name', 'party.deleted_at as party_deleted_at'])
		.where('party.client_id', '=', ctx.session.user.client_id)
		.where('party_address.party_id', '=', partyId);

	// Filter by archived status
	if (showArchived) {
		query = query.where('party_address.deleted_at', 'is not', null);
	} else {
		query = query.where('party_address.deleted_at', 'is', null);
	}

	return await query
		.orderBy(sql`CASE WHEN party_address.address_status = 'valid' THEN 0 ELSE 1 END`)
		.orderBy('party_address.name asc')
		.execute();
}

/**
 * Get paginated list of all party addresses across all parties with optional search filter
 * Returns { rows, count } for server-side pagination
 */
export async function getAllPartyAddresses(
	ctx: ProtectedContext,
	searchTerm?: string,
	limit?: number,
	offset?: number,
	showArchived?: boolean
) {
	// Base query with client scoping and party info
	let query = ctx.db
		.selectFrom('party_address')
		.innerJoin('party', 'party.id', 'party_address.party_id')
		.selectAll('party_address')
		.select([
			'party.name as party_name',
			'party.organization as party_organization',
			'party.deleted_at as party_deleted_at',
		])
		.where('party.client_id', '=', ctx.session.user.client_id)
		.orderBy('party.name asc')
		.orderBy(sql`CASE WHEN party_address.address_status = 'valid' THEN 0 ELSE 1 END`)
		.orderBy('party_address.name asc');

	// Filter by archived status
	if (showArchived) {
		query = query.where('party_address.deleted_at', 'is not', null);
	} else {
		query = query.where('party_address.deleted_at', 'is', null);
	}

	// Apply search filter if provided (prefix search - Phase 3.1 optimization)
	if (searchTerm) {
		query = query.where((eb) =>
			eb.or([
				sql<boolean>`party.name ILIKE ${`${searchTerm}%`}`,
				sql<boolean>`party_address.name ILIKE ${`${searchTerm}%`}`,
				sql<boolean>`party_address.city ILIKE ${`${searchTerm}%`}`,
				sql<boolean>`party_address.state ILIKE ${`${searchTerm}%`}`,
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
 * Get single party address by ID
 */
export async function getPartyAddress(ctx: ProtectedContext, id: string) {
	return await ctx.db
		.selectFrom('party_address')
		.innerJoin('party', 'party.id', 'party_address.party_id')
		.selectAll('party_address')
		.select(['party.name as party_name'])
		.where('party.client_id', '=', ctx.session.user.client_id)
		.where('party_address.id', '=', id)
		.executeTakeFirst();
}

/**
 * Create party address
 * If address_status is 'valid', unsets all other valid addresses for this party first
 */
export async function createPartyAddress(
	ctx: ProtectedContext,
	params: {
		party_id: string;
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
	// Verify party belongs to client
	const party = await ctx.db
		.selectFrom('party')
		.select(['id', 'client_id'])
		.where('party.client_id', '=', ctx.session.user.client_id)
		.where('party.id', '=', params.party_id)
		.executeTakeFirst();

	if (!party) {
		throw new Error('Party not found');
	}

	// If setting as valid, unset all other valid addresses for this party
	if (params.address_status === 'valid') {
		await ctx.db
			.updateTable('party_address')
			.set({ address_status: 'unknown' })
			.where('party_id', '=', params.party_id)
			.where('address_status', '=', 'valid')
			.where('deleted_at', 'is', null)
			.execute();
	}

	return await ctx.db
		.insertInto('party_address')
		.values({
			party_id: params.party_id,
			name: params.name,
			street_address: params.street_address,
			city: params.city,
			state: params.state,
			postal_code: params.postal_code,
			country: params.country,
			address_type: params.address_type ?? 'business',
			address_status: params.address_status ?? 'valid',
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Update party address
 * If address_status changes to 'valid', unsets all other valid addresses for this party first
 */
export async function updatePartyAddress(
	ctx: ProtectedContext,
	id: string,
	params: {
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
	// If setting as valid, get the party_id and unset all other valid addresses
	if (params.address_status === 'valid') {
		const address = await ctx.db
			.selectFrom('party_address')
			.innerJoin('party', 'party.id', 'party_address.party_id')
			.select('party_address.party_id')
			.where('party_address.id', '=', id)
			.where('party.client_id', '=', ctx.session.user.client_id)
			.executeTakeFirst();

		if (address) {
			await ctx.db
				.updateTable('party_address')
				.set({ address_status: 'unknown' })
				.where('party_id', '=', address.party_id)
				.where('id', '!=', id)
				.where('address_status', '=', 'valid')
				.where('deleted_at', 'is', null)
				.execute();
		}
	}

	const updateValues: Record<string, unknown> = {
		updated_by: ctx.session.user.id,
		updated_at: sql`now()`,
	};

	if (params.name !== undefined) updateValues.name = params.name;
	if (params.street_address !== undefined) updateValues.street_address = params.street_address;
	if (params.city !== undefined) updateValues.city = params.city;
	if (params.state !== undefined) updateValues.state = params.state;
	if (params.postal_code !== undefined) updateValues.postal_code = params.postal_code;
	if (params.country !== undefined) updateValues.country = params.country;
	if (params.address_type !== undefined) updateValues.address_type = params.address_type;
	if (params.address_status !== undefined) updateValues.address_status = params.address_status;

	return await ctx.db
		.updateTable('party_address')
		.set(updateValues)
		.where('party_address.id', '=', id)
		.where(
			'party_address.party_id',
			'in',
			ctx.db
				.selectFrom('party')
				.select('party.id')
				.where('party.client_id', '=', ctx.session.user.client_id)
		)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Archive party address (soft delete)
 */
export async function archivePartyAddress(ctx: ProtectedContext, id: string) {
	const deletedAt = new Date();
	const deletedBy = ctx.session.user.id;

	// Archive address (existence check implicit in executeTakeFirstOrThrow - Phase 5.2 optimization)
	const address = await ctx.db
		.updateTable('party_address')
		.set({ deleted_at: deletedAt, deleted_by: deletedBy })
		.where('party_address.id', '=', id)
		.where('party_address.deleted_at', 'is', null)
		.where(
			'party_address.party_id',
			'in',
			ctx.db
				.selectFrom('party')
				.select('party.id')
				.where('party.client_id', '=', ctx.session.user.client_id)
		)
		.returningAll()
		.executeTakeFirstOrThrow();

	return address;
}

/**
 * Restore party address (undo soft delete)
 */
export async function restorePartyAddress(ctx: ProtectedContext, id: string) {
	// Restore address (existence check implicit in executeTakeFirstOrThrow - Phase 5.2 optimization)
	const address = await ctx.db
		.updateTable('party_address')
		.set({ deleted_at: null, deleted_by: null })
		.where('party_address.id', '=', id)
		.where('party_address.deleted_at', 'is not', null)
		.where(
			'party_address.party_id',
			'in',
			ctx.db
				.selectFrom('party')
				.select('party.id')
				.where('party.client_id', '=', ctx.session.user.client_id)
		)
		.returningAll()
		.executeTakeFirstOrThrow();

	return address;
}

// ============================================================================
// PARTY PHONE CRUD OPERATIONS
// ============================================================================

/**
 * Get all phones for a party
 */
export async function getPartyPhones(
	ctx: ProtectedContext,
	partyId: string,
	showArchived?: boolean
) {
	let query = ctx.db
		.selectFrom('party_phone')
		.innerJoin('party', 'party.id', 'party_phone.party_id')
		.selectAll('party_phone')
		.where('party.client_id', '=', ctx.session.user.client_id)
		.where('party_phone.party_id', '=', partyId);

	if (showArchived) {
		query = query.where('party_phone.deleted_at', 'is not', null);
	} else {
		query = query.where('party_phone.deleted_at', 'is', null);
	}

	return await query.orderBy('party_phone.created_at asc').execute();
}

/**
 * Get single party phone by ID
 */
export async function getPartyPhone(ctx: ProtectedContext, id: string) {
	return await ctx.db
		.selectFrom('party_phone')
		.innerJoin('party', 'party.id', 'party_phone.party_id')
		.selectAll('party_phone')
		.where('party.client_id', '=', ctx.session.user.client_id)
		.where('party_phone.id', '=', id)
		.executeTakeFirst();
}

/**
 * Create party phone
 */
export async function createPartyPhone(
	ctx: ProtectedContext,
	params: {
		party_id: string;
		country_code?: string;
		area_code?: string;
		phone_number: string;
		extension?: string;
		phone_type: string;
		phone_status?: string;
	}
) {
	// Verify party belongs to client
	const party = await ctx.db
		.selectFrom('party')
		.select(['id', 'client_id'])
		.where('party.client_id', '=', ctx.session.user.client_id)
		.where('party.id', '=', params.party_id)
		.executeTakeFirst();

	if (!party) {
		throw new Error('Party not found');
	}

	return await ctx.db
		.insertInto('party_phone')
		.values({
			party_id: params.party_id,
			client_id: ctx.session.user.client_id!,
			country_code: params.country_code,
			area_code: params.area_code,
			phone_number: params.phone_number,
			extension: params.extension,
			phone_type: params.phone_type,
			phone_status: params.phone_status ?? 'unknown',
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Update party phone
 */
export async function updatePartyPhone(
	ctx: ProtectedContext,
	id: string,
	params: {
		country_code?: string;
		area_code?: string;
		phone_number?: string;
		extension?: string;
		phone_type?: string;
		phone_status?: string;
	}
) {
	const updateValues: Record<string, unknown> = {
		updated_by: ctx.session.user.id,
		updated_at: sql`now()`,
	};

	if (params.country_code !== undefined) updateValues.country_code = params.country_code;
	if (params.area_code !== undefined) updateValues.area_code = params.area_code;
	if (params.phone_number !== undefined) updateValues.phone_number = params.phone_number;
	if (params.extension !== undefined) updateValues.extension = params.extension;
	if (params.phone_type !== undefined) updateValues.phone_type = params.phone_type;
	if (params.phone_status !== undefined) updateValues.phone_status = params.phone_status;

	return await ctx.db
		.updateTable('party_phone')
		.set(updateValues)
		.where('party_phone.id', '=', id)
		.where('party_phone.client_id', '=', ctx.session.user.client_id)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Archive party phone (soft delete)
 */
export async function archivePartyPhone(ctx: ProtectedContext, id: string) {
	// Archive phone (existence check implicit in executeTakeFirstOrThrow - Phase 5.2 optimization)
	const phone = await ctx.db
		.updateTable('party_phone')
		.set({ deleted_at: new Date(), deleted_by: ctx.session.user.id })
		.where('party_phone.id', '=', id)
		.where('party_phone.client_id', '=', ctx.session.user.client_id)
		.where('party_phone.deleted_at', 'is', null)
		.returningAll()
		.executeTakeFirstOrThrow();

	return phone;
}

/**
 * Restore party phone (undo soft delete)
 */
export async function restorePartyPhone(ctx: ProtectedContext, id: string) {
	// Restore phone (existence check implicit in executeTakeFirstOrThrow - Phase 5.2 optimization)
	const phone = await ctx.db
		.updateTable('party_phone')
		.set({ deleted_at: null, deleted_by: null })
		.where('party_phone.id', '=', id)
		.where('party_phone.client_id', '=', ctx.session.user.client_id)
		.where('party_phone.deleted_at', 'is not', null)
		.returningAll()
		.executeTakeFirstOrThrow();

	return phone;
}

// ============================================================================
// PARTY EMAIL CRUD OPERATIONS
// ============================================================================

/**
 * Get all emails for a party
 */
export async function getPartyEmails(
	ctx: ProtectedContext,
	partyId: string,
	showArchived?: boolean
) {
	let query = ctx.db
		.selectFrom('party_email')
		.innerJoin('party', 'party.id', 'party_email.party_id')
		.selectAll('party_email')
		.where('party.client_id', '=', ctx.session.user.client_id)
		.where('party_email.party_id', '=', partyId);

	if (showArchived) {
		query = query.where('party_email.deleted_at', 'is not', null);
	} else {
		query = query.where('party_email.deleted_at', 'is', null);
	}

	return await query.orderBy('party_email.created_at asc').execute();
}

/**
 * Get single party email by ID
 */
export async function getPartyEmail(ctx: ProtectedContext, id: string) {
	return await ctx.db
		.selectFrom('party_email')
		.innerJoin('party', 'party.id', 'party_email.party_id')
		.selectAll('party_email')
		.where('party.client_id', '=', ctx.session.user.client_id)
		.where('party_email.id', '=', id)
		.executeTakeFirst();
}

/**
 * Create party email
 */
export async function createPartyEmail(
	ctx: ProtectedContext,
	params: {
		party_id: string;
		email_address: string;
		email_type?: string;
	}
) {
	// Verify party belongs to client
	const party = await ctx.db
		.selectFrom('party')
		.select(['id', 'client_id'])
		.where('party.client_id', '=', ctx.session.user.client_id)
		.where('party.id', '=', params.party_id)
		.executeTakeFirst();

	if (!party) {
		throw new Error('Party not found');
	}

	return await ctx.db
		.insertInto('party_email')
		.values({
			party_id: params.party_id,
			client_id: ctx.session.user.client_id!,
			email_address: params.email_address,
			email_type: params.email_type ?? 'business',
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Update party email
 */
export async function updatePartyEmail(
	ctx: ProtectedContext,
	id: string,
	params: {
		email_address?: string;
		email_type?: string;
	}
) {
	const updateValues: Record<string, unknown> = {
		updated_by: ctx.session.user.id,
		updated_at: sql`now()`,
	};

	if (params.email_address !== undefined) updateValues.email_address = params.email_address;
	if (params.email_type !== undefined) updateValues.email_type = params.email_type;

	return await ctx.db
		.updateTable('party_email')
		.set(updateValues)
		.where('party_email.id', '=', id)
		.where('party_email.client_id', '=', ctx.session.user.client_id)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Archive party email (soft delete)
 */
export async function archivePartyEmail(ctx: ProtectedContext, id: string) {
	// Archive email (existence check implicit in executeTakeFirstOrThrow - Phase 5.2 optimization)
	const email = await ctx.db
		.updateTable('party_email')
		.set({ deleted_at: new Date(), deleted_by: ctx.session.user.id })
		.where('party_email.id', '=', id)
		.where('party_email.client_id', '=', ctx.session.user.client_id)
		.where('party_email.deleted_at', 'is', null)
		.returningAll()
		.executeTakeFirstOrThrow();

	return email;
}

/**
 * Restore party email (undo soft delete)
 */
export async function restorePartyEmail(ctx: ProtectedContext, id: string) {
	// Restore email (existence check implicit in executeTakeFirstOrThrow - Phase 5.2 optimization)
	const email = await ctx.db
		.updateTable('party_email')
		.set({ deleted_at: null, deleted_by: null })
		.where('party_email.id', '=', id)
		.where('party_email.client_id', '=', ctx.session.user.client_id)
		.where('party_email.deleted_at', 'is not', null)
		.returningAll()
		.executeTakeFirstOrThrow();

	return email;
}

// ============================================================================
// PARTY REPRESENTATIVE CRUD OPERATIONS
// ============================================================================

/**
 * Get all representatives for a party (optionally filtered by address)
 */
export async function getPartyRepresentatives(
	ctx: ProtectedContext,
	partyId: string,
	addressId?: string,
	showArchived?: boolean
) {
	// Verify party belongs to client (via join)
	let query = ctx.db
		.selectFrom('party_representative')
		.innerJoin('party', 'party.id', 'party_representative.party_id')
		.leftJoin('party_address', 'party_address.id', 'party_representative.address_id')
		.selectAll('party_representative')
		.select([
			'party_address.name as address_name',
			'party_address.deleted_at as address_deleted_at',
		])
		.where('party.client_id', '=', ctx.session.user.client_id)
		.where('party_representative.party_id', '=', partyId);

	// Filter by archived status
	if (showArchived) {
		query = query.where('party_representative.deleted_at', 'is not', null);
	} else {
		query = query.where('party_representative.deleted_at', 'is', null);
	}

	// Optional address filter
	if (addressId !== undefined) {
		query = query.where('party_representative.address_id', '=', addressId);
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
	// Base query with client scoping and party/address info
	let query = ctx.db
		.selectFrom('party_representative')
		.innerJoin('party', 'party.id', 'party_representative.party_id')
		.leftJoin('party_address', 'party_address.id', 'party_representative.address_id')
		.selectAll('party_representative')
		.select([
			'party.name as party_name',
			'party.organization as party_organization',
			'party.deleted_at as party_deleted_at',
			'party_address.name as address_name',
			'party_address.street_address as address_street_address',
			'party_address.city as address_city',
			'party_address.state as address_state',
			'party_address.postal_code as address_postal_code',
			'party_address.country as address_country',
			'party_address.deleted_at as address_deleted_at',
		])
		.where('party.client_id', '=', ctx.session.user.client_id)
		.orderBy('party.name asc')
		.orderBy('party_representative.is_primary desc')
		.orderBy('party_representative.last_name asc')
		.orderBy('party_representative.first_name asc');

	// Filter by archived status
	if (showArchived) {
		query = query.where('party_representative.deleted_at', 'is not', null);
	} else {
		query = query.where('party_representative.deleted_at', 'is', null);
	}

	// Apply search filter if provided (prefix search - Phase 3.1 optimization)
	if (searchTerm) {
		query = query.where((eb) =>
			eb.or([
				sql<boolean>`party.name ILIKE ${`${searchTerm}%`}`,
				sql<boolean>`concat(party_representative.first_name, ' ', party_representative.last_name) ILIKE ${`${searchTerm}%`}`,
				sql<boolean>`party_representative.title ILIKE ${`${searchTerm}%`}`,
				sql<boolean>`party_representative.email ILIKE ${`${searchTerm}%`}`,
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
 * Get single party representative by ID with party and address information
 */
export async function getPartyRepresentative(ctx: ProtectedContext, id: string) {
	return await ctx.db
		.selectFrom('party_representative')
		.innerJoin('party', 'party.id', 'party_representative.party_id')
		.leftJoin('party_address', 'party_address.id', 'party_representative.address_id')
		.selectAll('party_representative')
		.select(['party.name as party_name', 'party_address.name as address_name'])
		.where('party.client_id', '=', ctx.session.user.client_id)
		.where('party_representative.id', '=', id)
		.executeTakeFirst();
}

/**
 * Archive party representative (soft delete)
 */
export async function archivePartyRepresentative(ctx: ProtectedContext, id: string) {
	const representative = await getPartyRepresentative(ctx, id);
	if (!representative) {
		throw new Error('Representative not found');
	}

	const deletedAt = new Date();
	const deletedBy = ctx.session.user.id;

	await ctx.db
		.updateTable('party_representative')
		.set({ deleted_at: deletedAt, deleted_by: deletedBy })
		.where('party_representative.id', '=', id)
		.where(
			'party_representative.party_id',
			'in',
			ctx.db
				.selectFrom('party')
				.select('party.id')
				.where('party.client_id', '=', ctx.session.user.client_id)
		)
		.execute();

	return representative;
}

/**
 * Restore party representative (undo soft delete)
 */
export async function restorePartyRepresentative(ctx: ProtectedContext, id: string) {
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
			ctx.db
				.selectFrom('party')
				.select('party.id')
				.where('party.client_id', '=', ctx.session.user.client_id)
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
		party_id: string;
		address_id?: string;
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
	id: string,
	params: {
		address_id?: string;
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
			ctx.db
				.selectFrom('party')
				.select('party.id')
				.where('party.client_id', '=', ctx.session.user.client_id)
		)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Get party representative for deletion (for admin logging)
 */
export async function getPartyRepresentativeForDeletion(ctx: ProtectedContext, id: string) {
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
export async function deletePartyRepresentative(ctx: ProtectedContext, id: string) {
	await ctx.db
		.deleteFrom('party_representative')
		.where('party_representative.id', '=', id)
		.where(
			'party_representative.party_id',
			'in',
			ctx.db
				.selectFrom('party')
				.select('party.id')
				.where('party.client_id', '=', ctx.session.user.client_id)
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
 * @param options.roleListEntity - filter by role list entity ('claimant_party_role' or 'adverse_party_role')
 * @returns array of claim parties with nested party, representative, address, and coverages
 */
export async function getClaimParties(
	ctx: ProtectedContext,
	claimId: string,
	options?: {
		partyType?: 'entity' | 'facilitator';
		roleListEntity?: 'claimant_party_role' | 'adverse_party_role';
	}
) {
	// Fetch claim parties with related data
	let query = ctx.db
		.selectFrom('claim_party')
		.innerJoin('party', 'party.id', 'claim_party.party_id')
		.innerJoin('claim', 'claim.id', 'claim_party.claim_id')
		.leftJoin('party_representative', 'party_representative.id', 'claim_party.representative_id')
		// Join to facilitator's selected office (from claim_party.address_id)
		.leftJoin('party_address as selected_address', (join) =>
			join
				.onRef('selected_address.id', '=', 'claim_party.address_id')
				.on('selected_address.deleted_at', 'is', null)
		)
		// Join to party's primary valid address (fallback for entities)
		.leftJoin('party_address', (join) =>
			join
				.onRef('party_address.party_id', '=', 'party.id')
				.on('party_address.address_status', '=', 'valid')
				.on('party_address.deleted_at', 'is', null)
		)
		.leftJoin('party_email', (join) =>
			join.onRef('party_email.party_id', '=', 'party.id').on('party_email.deleted_at', 'is', null)
		)
		.leftJoin('party_phone', (join) =>
			join.onRef('party_phone.party_id', '=', 'party.id').on('party_phone.deleted_at', 'is', null)
		)
		.selectAll('claim_party')
		.select([
			'party.id as party_id',
			'party.name as party_name',
			'party.party_type as party_type',
			'party.organization as party_organization',
			'party.is_business as party_is_business',
			'party.first_name as party_first_name',
			'party.last_name as party_last_name',
			'party_email.email_address as party_email',
			'party_phone.phone_number as party_phone',
			'party_representative.id as representative_id',
			'party_representative.first_name as representative_first_name',
			'party_representative.last_name as representative_last_name',
			'party_representative.email as rep_email',
			'party_representative.phone as rep_phone',
			'party_representative.title as rep_title',
			// For facilitators: use selected office, for entities: use party's primary address
			sql<number | null>`COALESCE(selected_address.id, party_address.id)`.as('address_id'),
			sql<string | null>`COALESCE(selected_address.name, party_address.name)`.as('address_name'),
			sql<
				string | null
			>`COALESCE(selected_address.street_address, party_address.street_address)`.as(
				'address_street_address'
			),
			sql<string | null>`COALESCE(selected_address.city, party_address.city)`.as('address_city'),
			sql<string | null>`COALESCE(selected_address.state, party_address.state)`.as('address_state'),
			sql<string | null>`COALESCE(selected_address.postal_code, party_address.postal_code)`.as(
				'address_postal_code'
			),
			sql<string | null>`COALESCE(selected_address.country, party_address.country)`.as(
				'address_country'
			),
		])
		.distinctOn('claim_party.id')
		.where('claim.client_id', '=', ctx.session.user.client_id)
		.where('claim_party.client_id', '=', ctx.session.user.client_id)
		.where('claim_party.claim_id', '=', claimId)
		.where('claim_party.deleted_at', 'is', null)
		.orderBy('claim_party.id')
		.orderBy('party.name', 'asc');

	// Apply party type filter if provided
	if (options?.partyType) {
		query = query.where('party.party_type', '=', options.partyType);
	}

	// Apply role list entity filter if provided (filter by roles in that reference list)
	// Since role is now a TEXT[] array, we use the PostgreSQL overlap operator (&&)
	// to check if any role in the claim_party.role array is in the reference list
	if (options?.roleListEntity) {
		const roleListEntity = options.roleListEntity; // Extract to ensure type narrowing
		query = query.where((eb) =>
			eb(
				'claim_party.role',
				'&&',
				eb
					.selectFrom('reference_option')
					.innerJoin('reference_list', 'reference_list.id', 'reference_option.reference_list_id')
					.select((eb) => eb.fn.agg<string[]>('array_agg', ['reference_option.value']).as('values'))
					.where('reference_list.entity', '=', roleListEntity)
					.where('reference_list.client_id', '=', ctx.session.user.client_id)
					.where('reference_list.deleted_at', 'is', null)
					.where('reference_option.deleted_at', 'is', null)
					.where('reference_option.is_active', '=', true)
			)
		);
	}

	const results = await query.execute();

	// If no claim parties, return empty array
	if (results.length === 0) {
		return [];
	}

	// Fetch all non-deleted coverages for these claim parties
	const claimPartyIds = results.map((r) => r.id);
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
		{} as Record<string, typeof coverages>
	);

	// Transform results to nest party, representative, address, and coverages data
	return results.map((row) => ({
		id: row.id,
		claim_id: row.claim_id,
		party_id: row.party_id,
		role: row.role,
		is_primary: row.is_primary,
		notes: row.notes,
		external_reference: row.external_reference,
		liability_percentage: row.liability_percentage,
		loss_type: row.loss_type,
		policy_limit: row.policy_limit,
		parent_claim_party_id: row.parent_claim_party_id,
		created_at: row.created_at,
		created_by: row.created_by,
		// Structured representative (for facilitators)
		representative_id: row.representative_id,
		address_id: row.address_id,
		// Free-form representative field (for entities)
		representative_name: row.representative_name,
		party: {
			id: row.party_id,
			name: row.party_name,
			party_type: row.party_type,
			organization: row.party_organization,
			is_business: row.party_is_business,
			first_name: row.party_first_name,
			last_name: row.party_last_name,
			email: row.party_email,
			phone: row.party_phone,
		},
		representative: row.representative_id
			? {
					id: row.representative_id,
					first_name: row.representative_first_name!,
					last_name: row.representative_last_name!,
					email: row.rep_email,
					phone: row.rep_phone,
					title: row.rep_title,
				}
			: null,
		address: row.address_id
			? {
					id: row.address_id,
					name: row.address_name!,
					street_address: row.address_street_address,
					city: row.address_city,
					state: row.address_state,
					postal_code: row.address_postal_code,
					country: row.address_country,
				}
			: null,
		coverages: coveragesByParty[row.id] || [],
	}));
}

/**
 * Get the primary claim party for a claim (lightweight query)
 * Returns only essential fields without JOINs for party contacts/coverages
 *
 * @param ctx - Protected context
 * @param claimId - Claim ID
 * @returns Primary claim party or null if none exists
 */
export async function getPrimaryClaimParty(
	ctx: ProtectedContext,
	claimId: string
): Promise<{
	id: string;
	claim_id: string;
	party_id: string;
	role: string[];
	representative_id: string | null;
	is_primary: boolean;
} | null> {
	const result = await ctx.db
		.selectFrom('claim_party')
		.innerJoin('claim', 'claim.id', 'claim_party.claim_id')
		.select([
			'claim_party.id',
			'claim_party.claim_id',
			'claim_party.party_id',
			'claim_party.role',
			'claim_party.representative_id',
			'claim_party.is_primary',
		])
		.where('claim_party.claim_id', '=', claimId)
		.where('claim_party.client_id', '=', ctx.session.user.client_id)
		.where('claim_party.is_primary', '=', true)
		.where('claim_party.deleted_at', 'is', null)
		.where('claim.client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();

	return result ?? null;
}

/**
 * Calculate total liability percentage for a claim (from entities only)
 * @param excludeClaimPartyId - Optional claim_party ID to exclude (for update validation)
 */
export async function getTotalLiabilityForClaim(
	ctx: ProtectedContext,
	claimId: string,
	excludeClaimPartyId?: string
): Promise<number> {
	let query = ctx.db
		.selectFrom('claim_party')
		.innerJoin('party', 'party.id', 'claim_party.party_id')
		.select(
			sql<string>`COALESCE(SUM(CAST(claim_party.liability_percentage AS DECIMAL)), 0)`.as('total')
		)
		.where('claim_party.claim_id', '=', claimId)
		.where('claim_party.client_id', '=', ctx.session.user.client_id)
		.where('claim_party.deleted_at', 'is', null)
		.where('party.party_type', '=', 'entity') // Only entities have liability
		.where('claim_party.liability_percentage', 'is not', null);

	if (excludeClaimPartyId) {
		query = query.where('claim_party.id', '!=', excludeClaimPartyId);
	}

	const result = await query.executeTakeFirst();
	return parseFloat(result?.total || '0');
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
		claim_id: string;
		party_id: string;
		role: string[];
		// Structured representative (facilitators)
		representative_id?: string | null;
		address_id?: string | null;
		// Free-form representative (entities)
		representative_name?: string | null;
		// Other fields
		is_primary?: boolean;
		notes?: string;
		external_reference?: string;
		liability_percentage?: number;
		parent_claim_party_id?: string | null;
		// Facilitator-specific fields
		loss_type?: string | null;
		policy_limit?: number | null;
	}
) {
	// Validate combined liability doesn't exceed 100%
	if (params.liability_percentage != null) {
		const currentTotal = await getTotalLiabilityForClaim(ctx, params.claim_id);
		const projectedTotal = currentTotal + params.liability_percentage;
		if (projectedTotal > 100) {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: `Combined liability cannot exceed 100%. Current total is ${currentTotal.toFixed(1)}%, adding ${params.liability_percentage}% would result in ${projectedTotal.toFixed(1)}%.`,
			});
		}
	}

	const claimParty = await ctx.db
		.insertInto('claim_party')
		.values({
			claim_id: params.claim_id,
			party_id: params.party_id,
			role: params.role,
			representative_id: params.representative_id,
			address_id: params.address_id,
			representative_name: params.representative_name,
			is_primary: params.is_primary,
			notes: params.notes,
			external_reference: params.external_reference,
			liability_percentage: params.liability_percentage?.toString(),
			parent_claim_party_id: params.parent_claim_party_id,
			loss_type: params.loss_type,
			policy_limit: params.policy_limit?.toString(),
			client_id: ctx.session.user.client_id!,
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();

	// Controller is responsible for orchestrating recalculation if needed
	return { claimParty };
}

/**
 * Update claim party relationship
 * Recalculates expected_recovery after update
 *
 * @returns claimParty and updated expectedRecovery
 */
export async function updateClaimParty(
	ctx: ProtectedContext,
	id: string,
	params: {
		role?: string[];
		// Structured representative (facilitators)
		representative_id?: string | null;
		address_id?: string | null;
		// Free-form representative (entities)
		representative_name?: string | null;
		// Other fields
		is_primary?: boolean;
		notes?: string;
		external_reference?: string;
		liability_percentage?: number | null;
		parent_claim_party_id?: string | null;
		// Facilitator-specific fields
		loss_type?: string | null;
		policy_limit?: number | null;
	}
) {
	// Validate combined liability doesn't exceed 100% (if updating liability_percentage to a non-null value)
	if (params.liability_percentage != null) {
		// Get the claim_id for this claim_party
		const existing = await ctx.db
			.selectFrom('claim_party')
			.select('claim_id')
			.where('claim_party.id', '=', id)
			.where('claim_party.client_id', '=', ctx.session.user.client_id)
			.executeTakeFirstOrThrow();

		const currentTotal = await getTotalLiabilityForClaim(ctx, existing.claim_id, id);
		const projectedTotal = currentTotal + params.liability_percentage;
		if (projectedTotal > 100) {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: `Combined liability cannot exceed 100%. Current total from other parties is ${currentTotal.toFixed(1)}%, setting this to ${params.liability_percentage}% would result in ${projectedTotal.toFixed(1)}%.`,
			});
		}
	}

	const claimParty = await ctx.db
		.updateTable('claim_party')
		.set({
			...(params.role !== undefined && { role: params.role }),
			...(params.representative_id !== undefined && {
				representative_id: params.representative_id,
			}),
			...(params.address_id !== undefined && { address_id: params.address_id }),
			...(params.representative_name !== undefined && {
				representative_name: params.representative_name,
			}),
			...(params.is_primary !== undefined && { is_primary: params.is_primary }),
			...(params.notes !== undefined && { notes: params.notes }),
			...(params.external_reference !== undefined && {
				external_reference: params.external_reference,
			}),
			...(params.liability_percentage !== undefined && {
				liability_percentage:
					params.liability_percentage === null ? null : params.liability_percentage?.toString(),
			}),
			...(params.parent_claim_party_id !== undefined && {
				parent_claim_party_id: params.parent_claim_party_id,
			}),
			...(params.loss_type !== undefined && { loss_type: params.loss_type }),
			...(params.policy_limit !== undefined && {
				policy_limit: params.policy_limit === null ? null : params.policy_limit?.toString(),
			}),
		})
		.where('claim_party.id', '=', id)
		.where('claim_party.client_id', '=', ctx.session.user.client_id)
		.where(
			'claim_party.claim_id',
			'in',
			ctx.db
				.selectFrom('claim')
				.select('claim.id')
				.where('claim.client_id', '=', ctx.session.user.client_id)
		)
		.returningAll()
		.executeTakeFirstOrThrow();

	// Controller is responsible for orchestrating recalculation if needed
	return { claimParty };
}

/**
 * Get claim party for deletion (for admin logging)
 */
export async function getClaimPartyForDeletion(ctx: ProtectedContext, id: string) {
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
		.where('claim_party.client_id', '=', ctx.session.user.client_id)
		.where('claim.client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();
}

/**
 * Archive (soft delete) a claim party and all its children recursively
 * Also archives any coverages associated with this claim party and its children
 * Controller is responsible for recalculating expected_recovery and total_incurred
 *
 * @returns claimId for controller to orchestrate recalculation
 */
export async function archiveClaimParty(ctx: ProtectedContext, id: string) {
	// Get claim_id before archiving (with client check)
	const claimParty = await ctx.db
		.selectFrom('claim_party')
		.innerJoin('claim', 'claim.id', 'claim_party.claim_id')
		.select(['claim_party.claim_id'])
		.where('claim_party.id', '=', id)
		.where('claim_party.client_id', '=', ctx.session.user.client_id)
		.where('claim.client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();

	if (!claimParty) {
		throw new Error('Claim party not found');
	}

	// Get all claim_party IDs recursively (parent + children)
	const allClaimPartyIds = await getClaimPartyIdsWithChildren(ctx, id);

	// Import dynamically to avoid circular dependency
	const { archiveCoveragesByClaimPartyIds } = await import('./coverageQueries');

	// Archive coverages for all affected claim_parties in a single batch query (Phase 1.2 optimization)
	await archiveCoveragesByClaimPartyIds(ctx, allClaimPartyIds);

	// Soft delete all claim_parties (parent + children)
	await ctx.db
		.updateTable('claim_party')
		.set({
			deleted_at: new Date(),
			deleted_by: ctx.session.user.id,
		})
		.where('claim_party.id', 'in', allClaimPartyIds)
		.where('claim_party.client_id', '=', ctx.session.user.client_id)
		.where(
			'claim_party.claim_id',
			'in',
			ctx.db
				.selectFrom('claim')
				.select('claim.id')
				.where('claim.client_id', '=', ctx.session.user.client_id)
		)
		.where('claim_party.deleted_at', 'is', null)
		.execute();

	// Controller is responsible for orchestrating recalculation
	return { claimId: claimParty.claim_id };
}

/**
 * Get all claim_party IDs including children recursively
 * Uses recursive CTE to find all nested facilitators
 */
async function getClaimPartyIdsWithChildren(
	ctx: ProtectedContext,
	rootId: string
): Promise<string[]> {
	const result = await sql<{ id: string }>`
		WITH RECURSIVE claim_party_tree AS (
			-- Base case: the root claim_party
			SELECT id FROM claim_party WHERE id = ${rootId} AND deleted_at IS NULL
			UNION ALL
			-- Recursive case: children (facilitators) of current nodes
			SELECT cp.id
			FROM claim_party cp
			INNER JOIN claim_party_tree cpt ON cp.parent_claim_party_id = cpt.id
			WHERE cp.deleted_at IS NULL
		)
		SELECT id FROM claim_party_tree
	`.execute(ctx.db);

	return result.rows.map((row) => row.id);
}

/**
 * Get total liability percentage for a claim (sum of all party liability_percentages)
 * Used to calculate "our liability" as (100 - total party liability percentage)
 */
export async function getClaimLiabilityPercentageTotal(ctx: ProtectedContext, claimId: string) {
	const result = await ctx.db
		.selectFrom('claim_party')
		.innerJoin('claim', 'claim.id', 'claim_party.claim_id')
		.select(({ fn }) =>
			fn.sum<string>('claim_party.liability_percentage').as('total_liability_percentage')
		)
		.where('claim.client_id', '=', ctx.session.user.client_id)
		.where('claim_party.client_id', '=', ctx.session.user.client_id)
		.where('claim_party.claim_id', '=', claimId)
		.where('claim_party.deleted_at', 'is', null)
		.executeTakeFirst();

	return result?.total_liability_percentage ? parseFloat(result.total_liability_percentage) : 0;
}

/**
 * Get party management overview stats in a single DB round-trip.
 * Returns party totals by type, plus address and representative counts.
 */
export async function getPartyManagementStats(ctx: ProtectedContext) {
	const clientId = ctx.session.user.client_id!;

	// Party counts: single scan with FILTER; address/rep: subqueries (different tables)
	const [partyCounts, addressRepCounts] = await Promise.all([
		ctx.db
			.selectFrom('party')
			.where('client_id', '=', clientId)
			.where('deleted_at', 'is', null)
			.select(() => [
				sql<number>`count(*)`.as('total_parties'),
				sql<number>`count(*) filter (where party_type = 'entity')`.as('entities'),
				sql<number>`count(*) filter (where party_type = 'facilitator')`.as('facilitators'),
			])
			.executeTakeFirstOrThrow(),
		ctx.db
			.selectNoFrom(({ selectFrom }) => [
				selectFrom('party_address')
					.innerJoin('party', 'party.id', 'party_address.party_id')
					.where('party.client_id', '=', clientId)
					.where('party.deleted_at', 'is', null)
					.where('party_address.deleted_at', 'is', null)
					.select(({ fn }) => fn.countAll<number>().as('c'))
					.as('total_addresses'),
				selectFrom('party_representative')
					.innerJoin('party', 'party.id', 'party_representative.party_id')
					.where('party.client_id', '=', clientId)
					.where('party.deleted_at', 'is', null)
					.where('party_representative.deleted_at', 'is', null)
					.select(({ fn }) => fn.countAll<number>().as('c'))
					.as('total_representatives'),
			])
			.executeTakeFirstOrThrow(),
	]);
	const counts = { ...partyCounts, ...addressRepCounts };

	return {
		totalParties: Number(counts.total_parties),
		entities: Number(counts.entities),
		facilitators: Number(counts.facilitators),
		totalAddresses: Number(counts.total_addresses),
		totalRepresentatives: Number(counts.total_representatives),
	};
}
