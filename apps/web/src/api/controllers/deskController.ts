import type { ProtectedContext } from '@/server/trpc/trpc';
import * as deskQueries from '@/api/queries/deskQueries';
import { logAdminAction, AdminAction } from '@/api/utils/adminActionLogger';
import { EntityName } from '@/api/utils/activityLogger';
import { TRPCError } from '@trpc/server';

// ============================================================================
// DESK LOCATION TYPE CONTROLLERS
// ============================================================================

/**
 * Get paginated list of desk location types
 */
export async function getDeskLocationTypes(
	ctx: ProtectedContext,
	{
		searchTerm,
		limit,
		offset,
		showDeleted,
	}: {
		searchTerm?: string;
		limit?: number;
		offset?: number;
		showDeleted?: boolean;
	}
) {
	return await deskQueries.getDeskLocationTypes(
		ctx,
		searchTerm,
		limit,
		offset,
		showDeleted
	);
}

/**
 * Get single desk location type by ID
 */
export async function getDeskLocationType(
	ctx: ProtectedContext,
	{ id }: { id: number }
) {
	return await deskQueries.getDeskLocationType(ctx, id);
}

/**
 * Create desk location type with admin logging
 * Optionally creates default desk locations
 */
export async function createDeskLocationType(
	ctx: ProtectedContext,
	input: {
		name: string;
		createDefaultLocations?: boolean;
	}
) {
	const created = await ctx.db.transaction().execute(async (trx) => {
		const deskLocationType = await deskQueries.createDeskLocationType(
			{ ...ctx, db: trx },
			input
		);

		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: deskLocationType.id,
				entityName: EntityName.DESK_LOCATION_TYPE,
				action: AdminAction.CREATE,
				value: {
					name: deskLocationType.name,
					createDefaultLocations: input.createDefaultLocations,
				},
			}
		);

		return deskLocationType;
	});

	return created;
}

/**
 * Update desk location type with admin logging
 */
export async function updateDeskLocationType(
	ctx: ProtectedContext,
	{
		id,
		params,
	}: {
		id: number;
		params: {
			name?: string;
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
		const deskLocationType = await deskQueries.updateDeskLocationType(
			{ ...ctx, db: trx },
			id,
			params
		);

		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: id,
				entityName: EntityName.DESK_LOCATION_TYPE,
				action: AdminAction.UPDATE,
				value: params,
			}
		);

		return deskLocationType;
	});

	return updated;
}

/**
 * Archive desk location type with admin logging (soft delete)
 * Prevents archival if type has active locations
 */
export async function archiveDeskLocationType(
	ctx: ProtectedContext,
	{ id }: { id: number }
) {
	const archived = await ctx.db.transaction().execute(async (trx) => {
		const deskLocationType = await deskQueries.archiveDeskLocationType(
			{ ...ctx, db: trx },
			id
		);

		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: id,
				entityName: EntityName.DESK_LOCATION_TYPE,
				action: AdminAction.DELETE,
				value: {
					name: deskLocationType.name,
				},
			}
		);

		return deskLocationType;
	});

	return archived;
}

/**
 * Restore archived desk location type with admin logging
 */
export async function restoreDeskLocationType(
	ctx: ProtectedContext,
	{ id }: { id: number }
) {
	const restored = await ctx.db.transaction().execute(async (trx) => {
		const deskLocationType = await deskQueries.restoreDeskLocationType(
			{ ...ctx, db: trx },
			id
		);

		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: id,
				entityName: EntityName.DESK_LOCATION_TYPE,
				action: AdminAction.UPDATE,
				value: {
					name: deskLocationType.name,
					action: 'restored',
				},
			}
		);

		return deskLocationType;
	});

	return restored;
}

// ============================================================================
// DESK LOCATION CONTROLLERS
// ============================================================================

/**
 * Get paginated list of desk locations
 */
export async function getDeskLocations(
	ctx: ProtectedContext,
	{
		deskLocationTypeId,
		searchTerm,
		limit,
		offset,
		showDeleted,
		showInactive,
	}: {
		deskLocationTypeId?: number;
		searchTerm?: string;
		limit?: number;
		offset?: number;
		showDeleted?: boolean;
		showInactive?: boolean;
	}
) {
	return await deskQueries.getDeskLocations(
		ctx,
		deskLocationTypeId,
		searchTerm,
		limit,
		offset,
		showDeleted,
		showInactive
	);
}

/**
 * Get single desk location by ID
 */
export async function getDeskLocation(
	ctx: ProtectedContext,
	{ id }: { id: number }
) {
	return await deskQueries.getDeskLocation(ctx, id);
}

/**
 * Create desk location with admin logging
 */
export async function createDeskLocation(
	ctx: ProtectedContext,
	input: {
		name: string;
		desk_location_type_id: number;
		is_active?: boolean;
	}
) {
	const created = await ctx.db.transaction().execute(async (trx) => {
		const deskLocation = await deskQueries.createDeskLocation(
			{ ...ctx, db: trx },
			input
		);

		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: deskLocation.id,
				entityName: EntityName.DESK_LOCATION,
				action: AdminAction.CREATE,
				value: {
					name: deskLocation.name,
					desk_location_type_id: deskLocation.desk_location_type_id,
					is_active: deskLocation.is_active,
				},
			}
		);

		return deskLocation;
	});

	return created;
}

/**
 * Update desk location with admin logging
 */
export async function updateDeskLocation(
	ctx: ProtectedContext,
	{
		id,
		params,
	}: {
		id: number;
		params: {
			name?: string;
			desk_location_type_id?: number;
			is_active?: boolean;
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
		const deskLocation = await deskQueries.updateDeskLocation(
			{ ...ctx, db: trx },
			id,
			params
		);

		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: id,
				entityName: EntityName.DESK_LOCATION,
				action: AdminAction.UPDATE,
				value: params,
			}
		);

		return deskLocation;
	});

	return updated;
}

/**
 * Archive desk location with admin logging (soft delete)
 * Prevents archival if location has assigned claims
 */
export async function archiveDeskLocation(
	ctx: ProtectedContext,
	{ id }: { id: number }
) {
	const archived = await ctx.db.transaction().execute(async (trx) => {
		const deskLocation = await deskQueries.archiveDeskLocation(
			{ ...ctx, db: trx },
			id
		);

		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: id,
				entityName: EntityName.DESK_LOCATION,
				action: AdminAction.DELETE,
				value: {
					name: deskLocation.name,
					desk_location_type_id: deskLocation.desk_location_type_id,
				},
			}
		);

		return deskLocation;
	});

	return archived;
}

/**
 * Restore archived desk location with admin logging
 */
export async function restoreDeskLocation(
	ctx: ProtectedContext,
	{ id }: { id: number }
) {
	const restored = await ctx.db.transaction().execute(async (trx) => {
		const deskLocation = await deskQueries.restoreDeskLocation(
			{ ...ctx, db: trx },
			id
		);

		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: id,
				entityName: EntityName.DESK_LOCATION,
				action: AdminAction.UPDATE,
				value: {
					name: deskLocation.name,
					desk_location_type_id: deskLocation.desk_location_type_id,
					action: 'restored',
				},
			}
		);

		return deskLocation;
	});

	return restored;
}

// ============================================================================
// USER DESK LOCATION ASSIGNMENT CONTROLLERS (Phase 2)
// ============================================================================

/**
 * Get user desk location assignments for a specific user
 */
export async function getUserDeskLocations(
	ctx: ProtectedContext,
	{ userId }: { userId: string }
) {
	return await deskQueries.getUserDeskLocations(ctx, userId);
}

/**
 * Get users assigned to a specific desk location
 */
export async function getDeskLocationUsers(
	ctx: ProtectedContext,
	{ deskLocationId }: { deskLocationId: number }
) {
	return await deskQueries.getDeskLocationUsers(ctx, deskLocationId);
}

/**
 * Assign user to desk location with admin logging
 */
export async function assignUserToDeskLocation(
	ctx: ProtectedContext,
	input: {
		userId: string;
		deskLocationId: number;
		priority: number;
	}
) {
	const assigned = await ctx.db.transaction().execute(async (trx) => {
		const assignment = await deskQueries.assignUserToDeskLocation(
			{ ...ctx, db: trx },
			input
		);

		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: assignment.id,
				entityName: EntityName.USER_DESK_LOCATION,
				action: AdminAction.CREATE,
				value: {
					userId: input.userId,
					deskLocationId: input.deskLocationId,
					priority: input.priority,
				},
			}
		);

		return assignment;
	});

	return assigned;
}

/**
 * Bulk assign multiple users to desk location with admin logging
 * All-or-nothing transaction
 */
export async function bulkAssignUsersToDeskLocation(
	ctx: ProtectedContext,
	input: {
		userIds: string[];
		deskLocationId: number;
		priority: number;
	}
) {
	const assignments = await deskQueries.bulkAssignUsersToDeskLocation(ctx, input);

	// Log the bulk assignment action
	await logAdminAction(
		ctx,
		{
			entityId: 0, // Bulk operation
			entityName: EntityName.USER_DESK_LOCATION,
			action: AdminAction.CREATE,
			value: {
				bulkAssignment: true,
				userCount: input.userIds.length,
				deskLocationId: input.deskLocationId,
				priority: input.priority,
			},
		}
	);

	return assignments;
}

/**
 * Update user desk location priority with admin logging
 */
export async function updateUserDeskLocationPriority(
	ctx: ProtectedContext,
	{
		id,
		priority,
	}: {
		id: number;
		priority: number;
	}
) {
	const updated = await ctx.db.transaction().execute(async (trx) => {
		const assignment = await deskQueries.updateUserDeskLocationPriority(
			{ ...ctx, db: trx },
			id,
			priority
		);

		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: id,
				entityName: EntityName.USER_DESK_LOCATION,
				action: AdminAction.UPDATE,
				value: {
					priority,
				},
			}
		);

		return assignment;
	});

	return updated;
}

/**
 * Remove user from desk location with admin logging (soft delete)
 */
export async function removeUserFromDeskLocation(
	ctx: ProtectedContext,
	{ id }: { id: number }
) {
	const removed = await ctx.db.transaction().execute(async (trx) => {
		const assignment = await deskQueries.removeUserFromDeskLocation(
			{ ...ctx, db: trx },
			id
		);

		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: id,
				entityName: EntityName.USER_DESK_LOCATION,
				action: AdminAction.DELETE,
				value: {
					userId: assignment.user_id,
					deskLocationId: assignment.desk_location_id,
				},
			}
		);

		return assignment;
	});

	return removed;
}

/**
 * Bulk update user desk location priorities with admin logging
 */
export async function updateUserDeskLocationPriorities(
	ctx: ProtectedContext,
	{ updates }: { updates: Array<{ id: number; priority: number }> }
) {
	const updated = await ctx.db.transaction().execute(async (trx) => {
		const assignments = await deskQueries.updateUserDeskLocationPriorities(
			{ ...ctx, db: trx },
			updates
		);

		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: 0, // Bulk operation
				entityName: EntityName.USER_DESK_LOCATION,
				action: AdminAction.UPDATE,
				value: {
					bulkUpdate: true,
					count: updates.length,
					updates,
				},
			}
		);

		return assignments;
	});

	return updated;
}

/**
 * Get count of desk assignments for all users
 * Returns a map of userId -> count
 */
export async function getAllUserDeskAssignmentCounts(ctx: ProtectedContext) {
	return await deskQueries.getAllUserDeskAssignmentCounts(ctx);
}

/**
 * Update user desk assignments (unified endpoint)
 * Takes complete desired state for each user and diffs with existing assignments
 * Handles individual and bulk updates efficiently
 */
export async function updateUsersDeskAssignments(
	ctx: ProtectedContext,
	{
		updates,
	}: {
		updates: Array<{
			userId: string;
			assignments: Array<{ deskLocationId: number; priority: number }>;
		}>;
	}
) {
	const updated = await ctx.db.transaction().execute(async (trx) => {
		const results = await deskQueries.updateUsersDeskAssignments(
			{ ...ctx, db: trx },
			updates
		);

		// Log each user's assignment update
		for (const result of results) {
			const userUpdate = updates.find((u) => u.userId === result.userId);
			await logAdminAction(
				{ ...ctx, db: trx },
				{
					entityId: 0, // No single entity ID for this operation
					entityName: EntityName.USER_DESK_LOCATION,
					action: AdminAction.UPDATE,
					value: {
						userId: result.userId,
						assignmentsUpdated: result.assignmentsUpdated,
						newState: userUpdate?.assignments,
					},
				}
			);
		}

		return results;
	});

	return updated;
}

/**
 * Get current user's desk assignments with claim counts
 * Used for the My Desk Assignments dashboard metric
 */
export async function getMyDeskAssignmentsWithClaimCounts(ctx: ProtectedContext) {
	return await deskQueries.getMyDeskAssignmentsWithClaimCounts(ctx);
}
