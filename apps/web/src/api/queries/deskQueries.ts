import type { ProtectedContext } from '@/server/trpc/trpc';
import { sql } from 'kysely';
import { SUGGESTED_DESK_LOCATIONS } from '@/schemas/deskSchemas';

// ============================================================================
// DESK LOCATION TYPE CRUD OPERATIONS
// ============================================================================

/**
 * Get paginated list of desk location types with optional search filter
 * Returns { rows, count } for server-side pagination
 * Includes location_count for each type
 */
export async function getDeskLocationTypes(
	ctx: ProtectedContext,
	searchTerm?: string,
	limit?: number,
	offset?: number,
	showDeleted?: boolean
) {
	// Base query with client scoping and location count
	let query = ctx.db
		.selectFrom('desk_location_type')
		.leftJoin('desk_location', (join) =>
			join
				.onRef('desk_location.desk_location_type_id', '=', 'desk_location_type.id')
				.on('desk_location.deleted_at', 'is', null)
		)
		.select([
			'desk_location_type.id',
			'desk_location_type.name',
			'desk_location_type.client_id',
			'desk_location_type.created_at',
			'desk_location_type.created_by',
			'desk_location_type.updated_at',
			'desk_location_type.updated_by',
			'desk_location_type.deleted_at',
		])
		.select((eb) => eb.fn.count('desk_location.id').as('location_count'))
		.where('desk_location_type.client_id', '=', ctx.session.user.client_id)
		.groupBy([
			'desk_location_type.id',
			'desk_location_type.name',
			'desk_location_type.client_id',
			'desk_location_type.created_at',
			'desk_location_type.created_by',
			'desk_location_type.updated_at',
			'desk_location_type.updated_by',
			'desk_location_type.deleted_at',
		])
		.orderBy('desk_location_type.name asc');

	// Filter by deleted status
	if (showDeleted) {
		// Show only deleted types
		query = query.where('desk_location_type.deleted_at', 'is not', null);
	} else {
		// Show only active types (default)
		query = query.where('desk_location_type.deleted_at', 'is', null);
	}

	// Apply search filter if provided
	if (searchTerm) {
		query = query.where(
			sql<boolean>`desk_location_type.name ILIKE ${`%${searchTerm}%`}`
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
		rows: rows.map((row) => ({
			...row,
			location_count: Number(row.location_count),
		})),
		count: countResult?.count ? Number(countResult.count) : 0,
	};
}

/**
 * Get single desk location type by ID
 */
export async function getDeskLocationType(ctx: ProtectedContext, id: number) {
	return await ctx.db
		.selectFrom('desk_location_type')
		.selectAll()
		.where('desk_location_type.client_id', '=', ctx.session.user.client_id)
		.where('desk_location_type.id', '=', id)
		.executeTakeFirst();
}

/**
 * Create new desk location type
 * Optionally creates default desk locations based on suggested list
 */
export async function createDeskLocationType(
	ctx: ProtectedContext,
	params: {
		name: string;
		createDefaultLocations?: boolean;
	}
) {
	// Create the desk location type
	const deskLocationType = await ctx.db
		.insertInto('desk_location_type')
		.values({
			name: params.name,
			client_id: ctx.session.user.client_id!,
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();

	// If requested, create default desk locations
	if (params.createDefaultLocations) {
		const defaultLocations = SUGGESTED_DESK_LOCATIONS.map((name) => ({
			name,
			desk_location_type_id: deskLocationType.id,
			client_id: ctx.session.user.client_id!,
			created_by: ctx.session.user.id,
			is_active: true,
		}));

		await ctx.db.insertInto('desk_location').values(defaultLocations).execute();
	}

	return deskLocationType;
}

/**
 * Update existing desk location type
 */
export async function updateDeskLocationType(
	ctx: ProtectedContext,
	id: number,
	params: {
		name?: string;
	}
) {
	return await ctx.db
		.updateTable('desk_location_type')
		.set({
			...params,
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		})
		.where('desk_location_type.id', '=', id)
		.where('desk_location_type.client_id', '=', ctx.session.user.client_id)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Check if desk location type has desk locations
 * Used before deletion to prevent data inconsistencies
 */
export async function getDeskLocationTypeLocations(
	ctx: ProtectedContext,
	deskLocationTypeId: number
) {
	return await ctx.db
		.selectFrom('desk_location')
		.selectAll()
		.where('desk_location.desk_location_type_id', '=', deskLocationTypeId)
		.where('desk_location.deleted_at', 'is', null)
		.execute();
}

/**
 * Archive desk location type (soft delete)
 * Prevents archival if type has active (non-archived) locations
 */
export async function archiveDeskLocationType(
	ctx: ProtectedContext,
	id: number
) {
	const deskLocationType = await getDeskLocationType(ctx, id);
	if (!deskLocationType) {
		throw new Error('Desk location type not found');
	}

	// Check for active desk locations
	const activeLocations = await getDeskLocationTypeLocations(ctx, id);
	if (activeLocations.length > 0) {
		throw new Error(
			`Cannot archive desk location type - contains ${activeLocations.length} active location(s). ` +
				`Please archive all locations first.`
		);
	}

	const deletedAt = new Date();

	// Soft delete desk location type
	return await ctx.db
		.updateTable('desk_location_type')
		.set({
			deleted_at: deletedAt,
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		})
		.where('desk_location_type.id', '=', id)
		.where('desk_location_type.client_id', '=', ctx.session.user.client_id)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Restore archived desk location type
 */
export async function restoreDeskLocationType(
	ctx: ProtectedContext,
	id: number
) {
	return await ctx.db
		.updateTable('desk_location_type')
		.set({
			deleted_at: null,
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		})
		.where('desk_location_type.id', '=', id)
		.where('desk_location_type.client_id', '=', ctx.session.user.client_id)
		.returningAll()
		.executeTakeFirstOrThrow();
}

// ============================================================================
// DESK LOCATION CRUD OPERATIONS
// ============================================================================

/**
 * Get paginated list of desk locations with optional filters
 * Returns { rows, count } for server-side pagination
 */
export async function getDeskLocations(
	ctx: ProtectedContext,
	deskLocationTypeId?: number,
	searchTerm?: string,
	limit?: number,
	offset?: number,
	showDeleted?: boolean,
	showInactive?: boolean
) {
	// Base query with client scoping
	let query = ctx.db
		.selectFrom('desk_location')
		.leftJoin(
			'desk_location_type',
			'desk_location.desk_location_type_id',
			'desk_location_type.id'
		)
		.select([
			'desk_location.id',
			'desk_location.name',
			'desk_location.desk_location_type_id',
			'desk_location.client_id',
			'desk_location.is_active',
			'desk_location.created_at',
			'desk_location.created_by',
			'desk_location.updated_at',
			'desk_location.updated_by',
			'desk_location.deleted_at',
			'desk_location_type.name as desk_location_type_name',
		])
		.where('desk_location.client_id', '=', ctx.session.user.client_id)
		.orderBy('desk_location_type.name asc')
		.orderBy('desk_location.name asc');

	// Filter by desk location type if provided
	if (deskLocationTypeId !== undefined) {
		query = query.where(
			'desk_location.desk_location_type_id',
			'=',
			deskLocationTypeId
		);
	}

	// Filter by deleted status
	if (showDeleted) {
		// Show only deleted locations
		query = query.where('desk_location.deleted_at', 'is not', null);
	} else {
		// Show only active locations (default)
		query = query.where('desk_location.deleted_at', 'is', null);
	}

	// Filter by active status (only if not showing deleted)
	if (!showDeleted && !showInactive) {
		query = query.where('desk_location.is_active', '=', true);
	}

	// Apply search filter if provided
	if (searchTerm) {
		query = query.where(
			sql<boolean>`desk_location.name ILIKE ${`%${searchTerm}%`}`
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
 * Get single desk location by ID
 */
export async function getDeskLocation(ctx: ProtectedContext, id: number) {
	return await ctx.db
		.selectFrom('desk_location')
		.leftJoin(
			'desk_location_type',
			'desk_location.desk_location_type_id',
			'desk_location_type.id'
		)
		.select([
			'desk_location.id',
			'desk_location.name',
			'desk_location.desk_location_type_id',
			'desk_location.client_id',
			'desk_location.is_active',
			'desk_location.created_at',
			'desk_location.created_by',
			'desk_location.updated_at',
			'desk_location.updated_by',
			'desk_location.deleted_at',
			'desk_location_type.name as desk_location_type_name',
		])
		.where('desk_location.client_id', '=', ctx.session.user.client_id)
		.where('desk_location.id', '=', id)
		.executeTakeFirst();
}

/**
 * Create new desk location
 */
export async function createDeskLocation(
	ctx: ProtectedContext,
	params: {
		name: string;
		desk_location_type_id: number;
		is_active?: boolean;
	}
) {
	return await ctx.db
		.insertInto('desk_location')
		.values({
			name: params.name,
			desk_location_type_id: params.desk_location_type_id,
			is_active: params.is_active ?? true,
			client_id: ctx.session.user.client_id!,
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Update existing desk location
 */
export async function updateDeskLocation(
	ctx: ProtectedContext,
	id: number,
	params: {
		name?: string;
		desk_location_type_id?: number;
		is_active?: boolean;
	}
) {
	return await ctx.db
		.updateTable('desk_location')
		.set({
			...params,
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		})
		.where('desk_location.id', '=', id)
		.where('desk_location.client_id', '=', ctx.session.user.client_id)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Check if desk location has assigned claims
 * Used before deletion to prevent data inconsistencies
 */
export async function getDeskLocationClaimAssignments(
	ctx: ProtectedContext,
	deskLocationId: number
) {
	return await ctx.db
		.selectFrom('checklist_claim')
		.select(['checklist_claim.checklist_id', 'checklist_claim.claim_id'])
		.where('checklist_claim.desk_location_id', '=', deskLocationId)
		.execute();
}

/**
 * Archive desk location (soft delete)
 * Prevents archival if location has assigned claims
 * In Phase 2, will also set removed_at on user_desk_location records
 */
export async function archiveDeskLocation(ctx: ProtectedContext, id: number) {
	const deskLocation = await getDeskLocation(ctx, id);
	if (!deskLocation) {
		throw new Error('Desk location not found');
	}

	// Check for assigned claims
	const assignedClaims = await getDeskLocationClaimAssignments(ctx, id);
	if (assignedClaims.length > 0) {
		throw new Error(
			`Cannot archive desk location - has ${assignedClaims.length} assigned claim(s). ` +
				`Please reassign claims first.`
		);
	}

	const deletedAt = new Date();

	// Soft delete desk location
	// TODO Phase 2: Also set removed_at on user_desk_location records
	return await ctx.db
		.updateTable('desk_location')
		.set({
			deleted_at: deletedAt,
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		})
		.where('desk_location.id', '=', id)
		.where('desk_location.client_id', '=', ctx.session.user.client_id)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Restore archived desk location
 */
export async function restoreDeskLocation(ctx: ProtectedContext, id: number) {
	return await ctx.db
		.updateTable('desk_location')
		.set({
			deleted_at: null,
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		})
		.where('desk_location.id', '=', id)
		.where('desk_location.client_id', '=', ctx.session.user.client_id)
		.returningAll()
		.executeTakeFirstOrThrow();
}
