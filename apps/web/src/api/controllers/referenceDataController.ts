import type { ProtectedContext } from '@/server/trpc/trpc';
import * as referenceDataQueries from '@/api/queries/referenceDataQueries';
import { logAdminAction, AdminAction } from '@/api/utils/adminActionLogger';
import { EntityName } from '@/api/utils/activityLogger';
import { TRPCError } from '@trpc/server';

// ============================================================================
// REFERENCE LIST CONTROLLERS (Read-Only - Lists are seeded)
// ============================================================================

/**
 * Get all reference lists for the client
 */
export async function getReferenceLists(ctx: ProtectedContext) {
	return await referenceDataQueries.getReferenceLists(ctx);
}

/**
 * Get single reference list by entity name
 */
export async function getReferenceList(
	ctx: ProtectedContext,
	{ entity }: { entity: string }
) {
	return await referenceDataQueries.getReferenceList(ctx, entity);
}

// ============================================================================
// REFERENCE OPTION CONTROLLERS
// ============================================================================

/**
 * Get options for a reference entity
 * Used by both admin UI and regular select components
 */
export async function getReferenceOptions(
	ctx: ProtectedContext,
	{ entity, showInactive, showDeleted }: { entity: string; showInactive?: boolean; showDeleted?: boolean }
) {
	return await referenceDataQueries.getReferenceOptions(ctx, entity, { showInactive, showDeleted });
}

/**
 * Get single reference option by entity and value
 * @param includeDeactivated - if true, also returns deactivated (soft-deleted) options
 */
export async function getReferenceOption(
	ctx: ProtectedContext,
	{ entity, value, includeDeactivated }: { entity: string; value: string; includeDeactivated?: boolean }
) {
	return await referenceDataQueries.getReferenceOption(ctx, entity, value, { includeDeactivated });
}

/**
 * Create new reference option with admin logging
 */
export async function createReferenceOption(
	ctx: ProtectedContext,
	input: {
		entity: string;
		value: string;
		display_label: string;
		description?: string;
		icon_emoji?: string;
		color_hex?: string;
	}
) {
	const created = await ctx.db.transaction().execute(async (trx) => {
		const option = await referenceDataQueries.createReferenceOption(
			{ ...ctx, db: trx },
			input
		);

		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: option.id,
				entityName: EntityName.REFERENCE_OPTION,
				action: AdminAction.CREATE,
				value: {
					entity: input.entity,
					value: option.value,
					display_label: option.display_label,
				},
			}
		);

		return option;
	});

	return created;
}

/**
 * Update reference option with admin logging
 */
export async function updateReferenceOption(
	ctx: ProtectedContext,
	{
		id,
		params,
	}: {
		id: number;
		params: {
			display_label?: string;
			description?: string;
			icon_emoji?: string;
			color_hex?: string;
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
		const option = await referenceDataQueries.updateReferenceOption(
			{ ...ctx, db: trx },
			id,
			params
		);

		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: id,
				entityName: EntityName.REFERENCE_OPTION,
				action: AdminAction.UPDATE,
				value: params,
			}
		);

		return option;
	});

	return updated;
}

/**
 * Delete reference option with admin logging (soft delete)
 * Prevents deletion of system default options
 */
export async function deleteReferenceOption(
	ctx: ProtectedContext,
	{ id }: { id: number }
) {
	const deleted = await ctx.db.transaction().execute(async (trx) => {
		const option = await referenceDataQueries.deleteReferenceOption(
			{ ...ctx, db: trx },
			id
		);

		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: id,
				entityName: EntityName.REFERENCE_OPTION,
				action: AdminAction.DELETE,
				value: {
					value: option.value,
					display_label: option.display_label,
				},
			}
		);

		return option;
	});

	return deleted;
}

/**
 * Restore deleted reference option with admin logging
 */
export async function restoreReferenceOption(
	ctx: ProtectedContext,
	{ id }: { id: number }
) {
	const restored = await ctx.db.transaction().execute(async (trx) => {
		const option = await referenceDataQueries.restoreReferenceOption(
			{ ...ctx, db: trx },
			id
		);

		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: id,
				entityName: EntityName.REFERENCE_OPTION,
				action: AdminAction.UPDATE,
				value: {
					value: option.value,
					display_label: option.display_label,
					action: 'restored',
				},
			}
		);

		return option;
	});

	return restored;
}
