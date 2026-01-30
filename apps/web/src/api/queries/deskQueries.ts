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
 * Uses COUNT(*) OVER() to get total count in a single query
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

	// Apply search filter if provided (prefix search for index usage)
	if (searchTerm) {
		query = query.where(
			sql<boolean>`desk_location_type.name ILIKE ${`${searchTerm}%`}`
		);
	}

	// Single query with COUNT(*) OVER() for total count
	const rowsWithCount = await query
		.select(sql<string>`COUNT(*) OVER()`.as('total_count'))
		.$if(limit !== undefined, (qb) => qb.limit(limit!))
		.$if(offset !== undefined, (qb) => qb.offset(offset!))
		.execute();

	const count = rowsWithCount.length > 0 ? parseInt(rowsWithCount[0].total_count ?? '0') : 0;
	const rows = rowsWithCount.map(({ total_count, ...row }) => ({
		...row,
		location_count: Number(row.location_count),
	}));

	return { rows, count };
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
			capacity_threshold: 100,
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
 * Uses COUNT(*) OVER() for both total count and user counts (avoiding derived table)
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
	// Uses window function for user_count to avoid expensive derived table join
	let query = ctx.db
		.selectFrom('desk_location')
		.leftJoin(
			'desk_location_type',
			'desk_location.desk_location_type_id',
			'desk_location_type.id'
		)
		.leftJoin('user_desk_location', (join) =>
			join
				.onRef('user_desk_location.desk_location_id', '=', 'desk_location.id')
				.on('user_desk_location.removed_at', 'is', null)
		)
		.select([
			'desk_location.id',
			'desk_location.name',
			'desk_location.desk_location_type_id',
			'desk_location.client_id',
			'desk_location.is_active',
			'desk_location.capacity_threshold',
			'desk_location.created_at',
			'desk_location.created_by',
			'desk_location.updated_at',
			'desk_location.updated_by',
			'desk_location.deleted_at',
			'desk_location_type.name as desk_location_type_name',
		])
		.select(
			sql<number>`COUNT(user_desk_location.id) OVER (PARTITION BY desk_location.id)`.as('user_count')
		)
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

	// Apply search filter if provided (prefix search for index usage)
	if (searchTerm) {
		query = query.where(
			sql<boolean>`desk_location.name ILIKE ${`${searchTerm}%`}`
		);
	}

	// Single query with COUNT(*) OVER() for total count
	// Use DISTINCT ON to dedupe rows expanded by the user_desk_location join
	const rowsWithCount = await ctx.db
		.selectFrom(query.as('filtered'))
		.distinctOn(['filtered.id'])
		.selectAll('filtered')
		.select(sql<string>`COUNT(*) OVER()`.as('total_count'))
		.orderBy('filtered.id')
		.$if(limit !== undefined, (qb) => qb.limit(limit!))
		.$if(offset !== undefined, (qb) => qb.offset(offset!))
		.execute();

	const count = rowsWithCount.length > 0 ? parseInt(rowsWithCount[0].total_count ?? '0') : 0;
	const rows = rowsWithCount.map(({ total_count, ...row }) => row);

	return { rows, count };
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
			'desk_location.capacity_threshold',
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
		capacity_threshold: number;
	}
) {
	return await ctx.db
		.insertInto('desk_location')
		.values({
			name: params.name,
			desk_location_type_id: params.desk_location_type_id,
			is_active: params.is_active ?? true,
			capacity_threshold: params.capacity_threshold,
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
		capacity_threshold?: number;
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
		.selectFrom('claim')
		.select(['claim.id', 'claim.claim_number'])
		.where('claim.desk_location_id', '=', deskLocationId)
		.where('claim.client_id', '=', ctx.session.user.client_id)
		.execute();
}

/**
 * Archive desk location (soft delete)
 * Prevents archival if location has assigned claims
 * Also removes all user assignments to this desk location
 */
export async function archiveDeskLocation(ctx: ProtectedContext, id: number) {
	// Validate desk location exists and belongs to client
	const deskLocation = await getDeskLocation(ctx, id);
	if (!deskLocation) {
		throw new Error('Desk location not found');
	}

	// Check for assigned claims (business logic guard - Phase 5.1 optimization)
	const assignedClaims = await getDeskLocationClaimAssignments(ctx, id);
	if (assignedClaims.length > 0) {
		throw new Error(
			`Cannot archive desk location - has ${assignedClaims.length} assigned claim(s). ` +
				`Please reassign claims first.`
		);
	}

	const deletedAt = new Date();

	// Helper function to perform the archive operations
	const performArchive = async (db: typeof ctx.db) => {
		// 1. Remove all user assignments to this desk location
		await db
			.updateTable('user_desk_location')
			.set({
				removed_at: deletedAt,
				removed_by: ctx.session.user.id,
			})
			.where('user_desk_location.desk_location_id', '=', id)
			.where('user_desk_location.removed_at', 'is', null)
			.execute();

		// 2. Archive the desk location
		return await db
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
	};

	// Check if we're already in a transaction
	if (ctx.db.isTransaction) {
		// Already in a transaction, use the existing transaction
		return await performArchive(ctx.db);
	} else {
		// Not in a transaction, create one
		return await ctx.db.transaction().execute(async (trx) => {
			return await performArchive(trx);
		});
	}
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

// ============================================================================
// USER DESK LOCATION ASSIGNMENT OPERATIONS (Phase 2)
// ============================================================================

/**
 * Get all desk location assignments for a specific user
 * Returns assignments with desk location and type information
 */
export async function getUserDeskLocations(ctx: ProtectedContext, userId: string) {
	return await ctx.db
		.selectFrom('user_desk_location')
		.leftJoin(
			'desk_location',
			'user_desk_location.desk_location_id',
			'desk_location.id'
		)
		.leftJoin(
			'desk_location_type',
			'desk_location.desk_location_type_id',
			'desk_location_type.id'
		)
		.select([
			'user_desk_location.id',
			'user_desk_location.user_id',
			'user_desk_location.desk_location_id',
			'user_desk_location.priority',
			'user_desk_location.assigned_at',
			'user_desk_location.assigned_by',
			'user_desk_location.removed_at',
			'user_desk_location.removed_by',
			'desk_location.name as desk_location_name',
			'desk_location.is_active as desk_location_is_active',
			'desk_location.desk_location_type_id',
			'desk_location_type.name as desk_location_type_name',
		])
		.where('user_desk_location.user_id', '=', userId)
		.where('user_desk_location.removed_at', 'is', null)
		.where('desk_location.deleted_at', 'is', null)
		.where('desk_location_type.deleted_at', 'is', null)
		.where('desk_location.client_id', '=', ctx.session.user.client_id)
		.orderBy('user_desk_location.priority asc')
		.execute();
}

/**
 * Get desk assignment counts for all users in the client
 * Returns a map of user_id -> count
 */
export async function getAllUserDeskAssignmentCounts(ctx: ProtectedContext) {
	const results = await ctx.db
		.selectFrom('user_desk_location')
		.leftJoin(
			'desk_location',
			'user_desk_location.desk_location_id',
			'desk_location.id'
		)
		.select([
			'user_desk_location.user_id',
		])
		.select((eb) => eb.fn.count('user_desk_location.id').as('assignment_count'))
		.where('user_desk_location.removed_at', 'is', null)
		.where('desk_location.deleted_at', 'is', null)
		.where('desk_location.client_id', '=', ctx.session.user.client_id)
		.groupBy('user_desk_location.user_id')
		.execute();

	// Convert to a map for easy lookup
	return results.reduce((acc, row) => {
		acc[row.user_id] = Number(row.assignment_count);
		return acc;
	}, {} as Record<string, number>);
}

/**
 * Get all users assigned to a specific desk location
 */
export async function getDeskLocationUsers(ctx: ProtectedContext, deskLocationId: number) {
	return await ctx.db
		.selectFrom('user_desk_location')
		.leftJoin('users', 'user_desk_location.user_id', 'users.id')
		.select([
			'user_desk_location.id',
			'user_desk_location.user_id',
			'user_desk_location.desk_location_id',
			'user_desk_location.priority',
			'user_desk_location.assigned_at',
			'user_desk_location.assigned_by',
			'users.first as user_first',
			'users.last as user_last',
			'users.email as user_email',
		])
		.where('user_desk_location.desk_location_id', '=', deskLocationId)
		.where('user_desk_location.removed_at', 'is', null)
		.orderBy('user_desk_location.priority asc')
		.execute();
}

/**
 * Assign user to desk location with priority
 * Automatically replaces any existing assignment at the same priority
 */
export async function assignUserToDeskLocation(
	ctx: ProtectedContext,
	params: {
		userId: string;
		deskLocationId: number;
		priority: number;
	}
) {
	// Validate the desk location exists and belongs to the client
	const deskLocation = await getDeskLocation(ctx, params.deskLocationId);
	if (!deskLocation) {
		throw new Error('Desk location not found');
	}

	// Helper function to perform the assignment
	const performAssignment = async (db: typeof ctx.db) => {
		// First, soft-delete any existing assignment at this priority for this user
		// (to make room for the new assignment at this priority slot)
		await db
			.updateTable('user_desk_location')
			.set({
				removed_at: sql`now()`,
				removed_by: ctx.session.user.id,
			})
			.where('user_desk_location.user_id', '=', params.userId)
			.where('user_desk_location.priority', '=', params.priority)
			.where('user_desk_location.removed_at', 'is', null)
			.execute();

		// Also soft-delete any existing assignment for this user-desk combo at ANY priority
		// (to allow reassigning the same desk at a different priority)
		await db
			.updateTable('user_desk_location')
			.set({
				removed_at: sql`now()`,
				removed_by: ctx.session.user.id,
			})
			.where('user_desk_location.user_id', '=', params.userId)
			.where('user_desk_location.desk_location_id', '=', params.deskLocationId)
			.where('user_desk_location.removed_at', 'is', null)
			.execute();

		// Then insert the new assignment
		return await db
			.insertInto('user_desk_location')
			.values({
				user_id: params.userId,
				desk_location_id: params.deskLocationId,
				priority: params.priority,
				assigned_by: ctx.session.user.id,
			})
			.returningAll()
			.executeTakeFirstOrThrow();
	};

	// If already in a transaction, use it; otherwise create a new one
	if (ctx.db.isTransaction) {
		return performAssignment(ctx.db);
	} else {
		return await ctx.db.transaction().execute(async (trx) => {
			return performAssignment(trx);
		});
	}
}

/**
 * Bulk assign multiple users to the same desk location with the same priority
 * All assignments happen in a single transaction (all-or-nothing)
 * Uses batched operations to minimize database round-trips
 */
export async function bulkAssignUsersToDeskLocation(
	ctx: ProtectedContext,
	params: {
		userIds: string[];
		deskLocationId: number;
		priority: number;
	}
) {
	if (params.userIds.length === 0) {
		return [];
	}

	// Validate the desk location exists and belongs to the client
	const deskLocation = await getDeskLocation(ctx, params.deskLocationId);
	if (!deskLocation) {
		throw new Error('Desk location not found');
	}

	// Helper function to perform the bulk assignments using batched queries
	const performBulkAssignment = async (db: typeof ctx.db) => {
		// Batch soft-delete any existing assignments at this priority for these users
		await db
			.updateTable('user_desk_location')
			.set({
				removed_at: sql`now()`,
				removed_by: ctx.session.user.id,
			})
			.where('user_desk_location.user_id', 'in', params.userIds)
			.where('user_desk_location.priority', '=', params.priority)
			.where('user_desk_location.removed_at', 'is', null)
			.execute();

		// Batch soft-delete any existing assignments for these users at this desk location
		await db
			.updateTable('user_desk_location')
			.set({
				removed_at: sql`now()`,
				removed_by: ctx.session.user.id,
			})
			.where('user_desk_location.user_id', 'in', params.userIds)
			.where('user_desk_location.desk_location_id', '=', params.deskLocationId)
			.where('user_desk_location.removed_at', 'is', null)
			.execute();

		// Batch insert all new assignments
		const insertValues = params.userIds.map((userId) => ({
			user_id: userId,
			desk_location_id: params.deskLocationId,
			priority: params.priority,
			assigned_by: ctx.session.user.id,
		}));

		return await db
			.insertInto('user_desk_location')
			.values(insertValues)
			.returningAll()
			.execute();
	};

	// Check if we're already in a transaction
	if (ctx.db.isTransaction) {
		return await performBulkAssignment(ctx.db);
	} else {
		return await ctx.db.transaction().execute(async (trx) => {
			return await performBulkAssignment(trx);
		});
	}
}

/**
 * Update user desk location assignment priority
 * Soft-deletes any existing assignment at the new priority first
 */
export async function updateUserDeskLocationPriority(
	ctx: ProtectedContext,
	id: number,
	newPriority: number
) {
	// Helper function to perform the priority update
	const performPriorityUpdate = async (db: typeof ctx.db) => {
		// Get the current assignment to find the user_id
		const current = await db
			.selectFrom('user_desk_location')
			.select(['user_id', 'priority'])
			.where('id', '=', id)
			.where('removed_at', 'is', null)
			.executeTakeFirst();

		if (!current) {
			throw new Error('Assignment not found');
		}

		// If priority is changing, soft-delete any existing assignment at the new priority
		if (current.priority !== newPriority) {
			await db
				.updateTable('user_desk_location')
				.set({
					removed_at: sql`now()`,
					removed_by: ctx.session.user.id,
				})
				.where('user_desk_location.user_id', '=', current.user_id)
				.where('user_desk_location.priority', '=', newPriority)
				.where('user_desk_location.id', '!=', id) // Don't soft-delete the one we're updating
				.where('user_desk_location.removed_at', 'is', null)
				.execute();
		}

		// Update the priority
		return await db
			.updateTable('user_desk_location')
			.set({
				priority: newPriority,
			})
			.where('user_desk_location.id', '=', id)
			.where('user_desk_location.removed_at', 'is', null)
			.returningAll()
			.executeTakeFirstOrThrow();
	};

	// Check if we're already in a transaction
	if (ctx.db.isTransaction) {
		// Already in a transaction, use the existing transaction
		return await performPriorityUpdate(ctx.db);
	} else {
		// Not in a transaction, create one
		return await ctx.db.transaction().execute(async (trx) => {
			return await performPriorityUpdate(trx);
		});
	}
}

/**
 * Remove user from desk location (soft delete)
 */
export async function removeUserFromDeskLocation(
	ctx: ProtectedContext,
	id: number
) {
	return await ctx.db
		.updateTable('user_desk_location')
		.set({
			removed_at: sql`now()`,
			removed_by: ctx.session.user.id,
		})
		.where('user_desk_location.id', '=', id)
		.where('user_desk_location.removed_at', 'is', null)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Update multiple user desk location priorities at once
 * Used for drag-and-drop reordering
 * Soft-deletes existing records and re-inserts with new priorities to avoid constraint conflicts
 * Uses batched operations to minimize database round-trips
 */
export async function updateUserDeskLocationPriorities(
	ctx: ProtectedContext,
	updates: Array<{ id: number; priority: number }>
) {
	if (updates.length === 0) {
		return [];
	}

	const ids = updates.map((u) => u.id);
	const priorityMap = new Map(updates.map((u) => [u.id, u.priority]));

	// Helper function to perform the priority updates
	const performPriorityUpdates = async (db: typeof ctx.db) => {
		// Get the existing records to preserve their data
		const existingRecords = await db
			.selectFrom('user_desk_location')
			.selectAll()
			.where('user_desk_location.id', 'in', ids)
			.where('user_desk_location.removed_at', 'is', null)
			.execute();

		// Soft-delete the existing records (batched)
		await db
			.updateTable('user_desk_location')
			.set({
				removed_at: sql`now()`,
				removed_by: ctx.session.user.id,
			})
			.where('user_desk_location.id', 'in', ids)
			.where('user_desk_location.removed_at', 'is', null)
			.execute();

		// Build batch insert values with new priorities
		const insertValues = existingRecords
			.filter((r) => priorityMap.has(r.id))
			.map((existing) => ({
				user_id: existing.user_id,
				desk_location_id: existing.desk_location_id,
				priority: priorityMap.get(existing.id)!,
				assigned_by: ctx.session.user.id,
			}));

		if (insertValues.length === 0) {
			return [];
		}

		// Batch insert all new records
		return await db
			.insertInto('user_desk_location')
			.values(insertValues)
			.returningAll()
			.execute();
	};

	// Check if we're already in a transaction
	if (ctx.db.isTransaction) {
		return await performPriorityUpdates(ctx.db);
	} else {
		return await ctx.db.transaction().execute(async (trx) => {
			return await performPriorityUpdates(trx);
		});
	}
}

/**
 * Update desk assignments for multiple users at once
 * Handles both individual user editing and bulk assignment
 * Uses batched soft-delete-all then batch insert approach to minimize round-trips
 * NOTE: This function expects to be called within a transaction from the controller
 */
export async function updateUsersDeskAssignments(
	ctx: ProtectedContext,
	updates: Array<{
		userId: string;
		assignments: Array<{ deskLocationId: number; priority: number }>;
	}>
) {
	if (updates.length === 0) {
		return [];
	}

	// Collect all user IDs for batch soft-delete
	const userIds = updates.map((u) => u.userId);

	// Batch soft-delete ALL existing assignments for all users at once
	await ctx.db
		.updateTable('user_desk_location')
		.set({
			removed_at: sql`now()`,
			removed_by: ctx.session.user.id,
		})
		.where('user_desk_location.user_id', 'in', userIds)
		.where('user_desk_location.removed_at', 'is', null)
		.execute();

	// Collect all insert values for batch insert
	const insertValues: Array<{
		user_id: string;
		desk_location_id: number;
		priority: number;
		assigned_by: string;
	}> = [];

	for (const { userId, assignments } of updates) {
		for (const { deskLocationId, priority } of assignments) {
			insertValues.push({
				user_id: userId,
				desk_location_id: deskLocationId,
				priority,
				assigned_by: ctx.session.user.id,
			});
		}
	}

	// Batch insert all new assignments
	if (insertValues.length > 0) {
		await ctx.db.insertInto('user_desk_location').values(insertValues).execute();
	}

	return updates.map(({ userId, assignments }) => ({
		userId,
		assignmentsUpdated: assignments.length,
	}));
}

/**
 * Get current user's desk assignments with claim counts per desk location
 * Used for the My Desk Assignments dashboard metric
 */
export async function getMyDeskAssignmentsWithClaimCounts(ctx: ProtectedContext) {
	return await ctx.db
		.selectFrom('user_desk_location')
		.leftJoin('desk_location', 'user_desk_location.desk_location_id', 'desk_location.id')
		.leftJoin('desk_location_type', 'desk_location.desk_location_type_id', 'desk_location_type.id')
		.leftJoin('claim', (join) =>
			join
				.onRef('claim.desk_location_id', '=', 'desk_location.id')
				.on('claim.client_id', '=', ctx.session.user.client_id)
		)
		.select([
			'user_desk_location.id',
			'user_desk_location.desk_location_id',
			'user_desk_location.priority',
			'user_desk_location.assigned_at',
			'desk_location.name as desk_location_name',
			'desk_location_type.name as desk_location_type_name',
		])
		.select((eb) => eb.fn.count('claim.id').as('claim_count'))
		.where('user_desk_location.user_id', '=', ctx.session.user.id)
		.where('user_desk_location.removed_at', 'is', null)
		.where('desk_location.deleted_at', 'is', null)
		.where('desk_location.client_id', '=', ctx.session.user.client_id)
		.groupBy([
			'user_desk_location.id',
			'user_desk_location.desk_location_id',
			'user_desk_location.priority',
			'user_desk_location.assigned_at',
			'desk_location.name',
			'desk_location_type.name',
		])
		.orderBy('user_desk_location.priority asc')
		.execute();
}

// ============================================================================
// CLAIM DESK LOCATION TRANSITION OPERATIONS
// ============================================================================

/**
 * Record a claim transition to a new desk location.
 * This creates an append-only audit trail of claim movements.
 */
export async function createClaimTransition(
	ctx: ProtectedContext,
	params: {
		claimId: number;
		deskLocationId: number;
		previousDeskLocationId?: number;
		enteredReason?: string;
	}
) {
	return await ctx.db
		.insertInto('claim_desk_location_transition')
		.values({
			client_id: ctx.session.user.client_id!,
			claim_id: params.claimId,
			desk_location_id: params.deskLocationId,
			previous_desk_location_id: params.previousDeskLocationId,
			entered_by: ctx.session.user.id,
			entered_reason: params.enteredReason,
		})
		.returning([
			'id',
			'claim_id',
			'desk_location_id',
			'previous_desk_location_id',
			'entered_at',
			'entered_by',
			'entered_reason',
			'created_at',
		])
		.executeTakeFirstOrThrow();
}

/**
 * Get transition history for a claim, with desk location names.
 * Ordered most recent first.
 */
export async function getClaimTransitions(ctx: ProtectedContext, claimId: number) {
	return await ctx.db
		.selectFrom('claim_desk_location_transition as t')
		.leftJoin('desk_location as to_loc', 'to_loc.id', 't.desk_location_id')
		.leftJoin('desk_location as from_loc', 'from_loc.id', 't.previous_desk_location_id')
		.select([
			't.id',
			't.claim_id',
			't.desk_location_id',
			't.previous_desk_location_id',
			't.entered_at',
			't.entered_by',
			't.entered_reason',
			't.created_at',
			'to_loc.name as desk_location_name',
			'from_loc.name as previous_desk_location_name',
		])
		.where('t.client_id', '=', ctx.session.user.client_id)
		.where('t.claim_id', '=', claimId)
		.where('t.deleted_at', 'is', null)
		.orderBy('t.entered_at desc')
		.execute();
}
