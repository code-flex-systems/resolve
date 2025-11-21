import type { ProtectedContext } from '@/server/trpc/trpc';
import * as deskQueries from '@/api/queries/deskQueries';
import {
	logAdminAction,
	AdminAction,
	EntityName,
} from '@/api/utils/adminActionLogger';
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
