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
		.leftJoin(
			(eb) =>
				eb
					.selectFrom('user_desk_location')
					.select(['user_desk_location.desk_location_id', eb.fn.countAll<number>().as('user_count')])
					.where('user_desk_location.removed_at', 'is', null)
					.groupBy('user_desk_location.desk_location_id')
					.as('user_counts'),
			(join) => join.onRef('user_counts.desk_location_id', '=', 'desk_location.id')
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
			sql<number>`COALESCE(user_counts.user_count, 0)`.as('user_count'),
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

	// Soft delete desk location and remove user assignments in a transaction
	const result = await ctx.db.transaction().execute(async (trx) => {
		// 1. Remove all user assignments to this desk location
		await trx
			.updateTable('user_desk_location')
			.set({
				removed_at: deletedAt,
				removed_by: ctx.session.user.id,
			})
			.where('user_desk_location.desk_location_id', '=', id)
			.where('user_desk_location.removed_at', 'is', null)
			.execute();

		// 2. Archive the desk location
		return await trx
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
	});

	return result;
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

		// Then insert the new assignment
		try {
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
		} catch (error: any) {
			// Check for unique constraint violation (user already assigned to this desk location at a different priority)
			if (error.code === '23505' && (
				error.constraint === 'idx_user_desk_location_unique_user_desk' ||
				(error.message && error.message.includes('idx_user_desk_location_unique_user_desk'))
			)) {
				throw new Error(
					`One or more users are already assigned to "${deskLocation.name}" at a different priority. Please remove the existing assignment first or choose a different desk location.`
				);
			}
			throw error;
		}
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
 */
export async function bulkAssignUsersToDeskLocation(
	ctx: ProtectedContext,
	params: {
		userIds: string[];
		deskLocationId: number;
		priority: number;
	}
) {
	// Validate the desk location exists and belongs to the client
	const deskLocation = await getDeskLocation(ctx, params.deskLocationId);
	if (!deskLocation) {
		throw new Error('Desk location not found');
	}

	return await ctx.db.transaction().execute(async (trx) => {
		const results = [];

		for (const userId of params.userIds) {
			// First, soft-delete any existing assignment at this priority for this user
			await trx
				.updateTable('user_desk_location')
				.set({
					removed_at: sql`now()`,
					removed_by: ctx.session.user.id,
				})
				.where('user_desk_location.user_id', '=', userId)
				.where('user_desk_location.priority', '=', params.priority)
				.where('user_desk_location.removed_at', 'is', null)
				.execute();

			// Then insert the new assignment
			try {
				const result = await trx
					.insertInto('user_desk_location')
					.values({
						user_id: userId,
						desk_location_id: params.deskLocationId,
						priority: params.priority,
						assigned_by: ctx.session.user.id,
					})
					.returningAll()
					.executeTakeFirstOrThrow();

				results.push(result);
			} catch (error: any) {
				// Check for unique constraint violation (user already assigned to this desk location at a different priority)
				if (error.code === '23505' && (
					error.constraint === 'idx_user_desk_location_unique_user_desk' ||
					(error.message && error.message.includes('idx_user_desk_location_unique_user_desk'))
				)) {
					throw new Error(
						`One or more users are already assigned to "${deskLocation.name}" at a different priority. Please remove the existing assignments first or choose a different desk location.`
					);
				}
				throw error;
			}
		}

		return results;
	});
}

/**
 * Update user desk location assignment priority
 */
export async function updateUserDeskLocationPriority(
	ctx: ProtectedContext,
	id: number,
	newPriority: number
) {
	return await ctx.db
		.updateTable('user_desk_location')
		.set({
			priority: newPriority,
		})
		.where('user_desk_location.id', '=', id)
		.where('user_desk_location.removed_at', 'is', null)
		.returningAll()
		.executeTakeFirstOrThrow();
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
 */
export async function updateUserDeskLocationPriorities(
	ctx: ProtectedContext,
	updates: Array<{ id: number; priority: number }>
) {
	return await ctx.db.transaction().execute(async (trx) => {
		const results = [];
		for (const update of updates) {
			const result = await trx
				.updateTable('user_desk_location')
				.set({
					priority: update.priority,
				})
				.where('user_desk_location.id', '=', update.id)
				.where('user_desk_location.removed_at', 'is', null)
				.returningAll()
				.executeTakeFirstOrThrow();
			results.push(result);
		}
		return results;
	});
}

/**
 * Update desk assignments for multiple users at once
 * Handles both individual user editing and bulk assignment
 * Diffs existing vs desired assignments and applies changes atomically
 * NOTE: This function expects to be called within a transaction from the controller
 */
export async function updateUsersDeskAssignments(
	ctx: ProtectedContext,
	updates: Array<{
		userId: string;
		assignments: Array<{ deskLocationId: number; priority: number }>;
	}>
) {
	const results = [];

	for (const { userId, assignments: desiredAssignments } of updates) {
		// Get existing assignments for this user
		const existingAssignments = await ctx.db
			.selectFrom('user_desk_location')
			.selectAll()
			.where('user_desk_location.user_id', '=', userId)
			.where('user_desk_location.removed_at', 'is', null)
			.execute();

		// Remove or update assignments that are no longer in desired list
		for (const existing of existingAssignments) {
			const matchingDesired = desiredAssignments.find(
				(d) => d.deskLocationId === existing.desk_location_id && d.priority === existing.priority
			);

			if (!matchingDesired) {
				// Check if same location exists at different priority
				const sameLocationDifferentPriority = desiredAssignments.find(
					(d) => d.deskLocationId === existing.desk_location_id && d.priority !== existing.priority
				);

				if (sameLocationDifferentPriority) {
					// Update priority instead of remove/add
					await ctx.db
						.updateTable('user_desk_location')
						.set({ priority: sameLocationDifferentPriority.priority })
						.where('user_desk_location.id', '=', existing.id)
						.execute();
				} else {
					// Remove assignment
					await ctx.db
						.updateTable('user_desk_location')
						.set({
							removed_at: sql`now()`,
							removed_by: ctx.session.user.id,
						})
						.where('user_desk_location.id', '=', existing.id)
						.execute();
				}
			}
		}

		// Add new assignments that don't exist
		for (const desired of desiredAssignments) {
			const existsAlready = existingAssignments.some(
				(e) => e.desk_location_id === desired.deskLocationId
			);

			if (!existsAlready) {
				await ctx.db
					.insertInto('user_desk_location')
					.values({
						user_id: userId,
						desk_location_id: desired.deskLocationId,
						priority: desired.priority,
						assigned_by: ctx.session.user.id,
					})
					.execute();
			}
		}

		results.push({ userId, assignmentsUpdated: desiredAssignments.length });
	}

	return results;
}
