import type { ProtectedContext } from '@/server/trpc/trpc';
import { sql } from 'kysely';

// ============================================================================
// REFERENCE LIST OPERATIONS (Entity Types)
// ============================================================================

/**
 * Get all reference lists for the client
 * Returns list of entity types (e.g., line_of_business, loss_type)
 */
export async function getReferenceLists(ctx: ProtectedContext) {
	return await ctx.db
		.selectFrom('reference_list')
		.select([
			'reference_list.id',
			'reference_list.entity',
			'reference_list.display_name',
			'reference_list.description',
			'reference_list.client_id',
			'reference_list.created_at',
		])
		.where('reference_list.client_id', '=', ctx.session.user.client_id)
		.where('reference_list.deleted_at', 'is', null)
		.orderBy('reference_list.display_name asc')
		.execute();
}

/**
 * Get single reference list by entity name
 */
export async function getReferenceList(ctx: ProtectedContext, entity: string) {
	return await ctx.db
		.selectFrom('reference_list')
		.selectAll()
		.where('reference_list.client_id', '=', ctx.session.user.client_id)
		.where('reference_list.entity', '=', entity)
		.where('reference_list.deleted_at', 'is', null)
		.executeTakeFirst();
}

// ============================================================================
// REFERENCE OPTION OPERATIONS
// ============================================================================

/**
 * Get options for a specific reference entity
 * Sorted alphabetically by display_label
 * Optionally includes inactive and/or deleted options (for admin UI)
 */
export async function getReferenceOptions(
	ctx: ProtectedContext,
	entity: string,
	options?: { showInactive?: boolean; showDeleted?: boolean }
) {
	// First get the reference list
	const referenceList = await getReferenceList(ctx, entity);
	if (!referenceList) {
		return [];
	}

	const { showInactive = false, showDeleted = false } = options ?? {};

	let query = ctx.db
		.selectFrom('reference_option')
		.select([
			'reference_option.id',
			'reference_option.reference_list_id',
			'reference_option.value',
			'reference_option.display_label',
			'reference_option.description',
			'reference_option.icon_emoji',
			'reference_option.color_hex',
			'reference_option.sort_order',
			'reference_option.is_active',
			'reference_option.is_system_default',
			'reference_option.client_id',
			'reference_option.created_at',
			'reference_option.created_by',
			'reference_option.updated_at',
			'reference_option.deleted_at',
		])
		.where('reference_option.reference_list_id', '=', referenceList.id)
		.where('reference_option.client_id', '=', ctx.session.user.client_id)
		.orderBy('reference_option.display_label asc');

	// Filter by deleted status (unless showDeleted is true for admin UI)
	if (!showDeleted) {
		query = query.where('reference_option.deleted_at', 'is', null);
	}

	// Filter by active status (unless showInactive is true)
	if (!showInactive) {
		query = query.where('reference_option.is_active', '=', true);
	}

	return await query.execute();
}

/**
 * Get single reference option by entity and value
 * @param includeDeactivated - if true, also returns deactivated (soft-deleted) options
 */
export async function getReferenceOption(
	ctx: ProtectedContext,
	entity: string,
	value: string,
	options?: { includeDeactivated?: boolean }
) {
	const referenceList = await getReferenceList(ctx, entity);
	if (!referenceList) {
		return null;
	}

	const { includeDeactivated = false } = options ?? {};

	let query = ctx.db
		.selectFrom('reference_option')
		.selectAll()
		.where('reference_option.reference_list_id', '=', referenceList.id)
		.where('reference_option.client_id', '=', ctx.session.user.client_id)
		.where('reference_option.value', '=', value);

	if (!includeDeactivated) {
		query = query.where('reference_option.deleted_at', 'is', null);
	}

	const result = await query.executeTakeFirst();
	return result ?? null;
}

/**
 * Get reference option by ID
 */
export async function getReferenceOptionById(ctx: ProtectedContext, id: number) {
	return await ctx.db
		.selectFrom('reference_option')
		.leftJoin('reference_list', 'reference_option.reference_list_id', 'reference_list.id')
		.select([
			'reference_option.id',
			'reference_option.reference_list_id',
			'reference_option.value',
			'reference_option.display_label',
			'reference_option.description',
			'reference_option.icon_emoji',
			'reference_option.color_hex',
			'reference_option.sort_order',
			'reference_option.is_active',
			'reference_option.is_system_default',
			'reference_option.client_id',
			'reference_option.created_at',
			'reference_option.created_by',
			'reference_option.updated_at',
			'reference_option.deleted_at',
			'reference_list.entity',
		])
		.where('reference_option.id', '=', id)
		.where('reference_option.client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();
}

/**
 * Create new reference option
 */
export async function createReferenceOption(
	ctx: ProtectedContext,
	params: {
		entity: string;
		value: string;
		display_label: string;
		description?: string;
		icon_emoji?: string;
		color_hex?: string;
	}
) {
	// First get the reference list
	const referenceList = await getReferenceList(ctx, params.entity);
	if (!referenceList) {
		throw new Error(`Reference list not found for entity: ${params.entity}`);
	}

	// Check for duplicate value
	const existing = await getReferenceOption(ctx, params.entity, params.value);
	if (existing) {
		throw new Error(`Option with value '${params.value}' already exists for ${params.entity}`);
	}

	return await ctx.db
		.insertInto('reference_option')
		.values({
			reference_list_id: referenceList.id,
			value: params.value,
			display_label: params.display_label,
			description: params.description,
			icon_emoji: params.icon_emoji,
			color_hex: params.color_hex,
			sort_order: 0, // Not actively used; sorting is alphabetical
			is_active: true,
			is_system_default: false, // User-created options are not system defaults
			client_id: ctx.session.user.client_id!,
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Update existing reference option
 */
export async function updateReferenceOption(
	ctx: ProtectedContext,
	id: number,
	params: {
		display_label?: string;
		description?: string;
		icon_emoji?: string;
		color_hex?: string;
		is_active?: boolean;
	}
) {
	// Update reference option (existence check implicit in executeTakeFirstOrThrow - Phase 5.1 optimization)
	return await ctx.db
		.updateTable('reference_option')
		.set({
			...params,
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		})
		.where('reference_option.id', '=', id)
		.where('reference_option.client_id', '=', ctx.session.user.client_id)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Soft delete reference option
 * Prevents deletion of system default options
 */
export async function deleteReferenceOption(ctx: ProtectedContext, id: number) {
	// Check that the option exists and belongs to this client
	const existing = await getReferenceOptionById(ctx, id);
	if (!existing) {
		throw new Error('Reference option not found');
	}

	// Prevent deletion of system defaults
	if (existing.is_system_default) {
		throw new Error('Cannot delete system default options. You can deactivate them instead.');
	}

	return await ctx.db
		.updateTable('reference_option')
		.set({
			deleted_at: sql`now()`,
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		})
		.where('reference_option.id', '=', id)
		.where('reference_option.client_id', '=', ctx.session.user.client_id)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Restore soft-deleted reference option
 */
export async function restoreReferenceOption(ctx: ProtectedContext, id: number) {
	return await ctx.db
		.updateTable('reference_option')
		.set({
			deleted_at: null,
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		})
		.where('reference_option.id', '=', id)
		.where('reference_option.client_id', '=', ctx.session.user.client_id)
		.returningAll()
		.executeTakeFirstOrThrow();
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate that a value is valid for a given reference entity
 * Used for runtime validation when saving entities with reference data values
 */
export async function validateReferenceValue(
	ctx: ProtectedContext,
	entity: string,
	value: string
): Promise<boolean> {
	const option = await getReferenceOption(ctx, entity, value);
	return !!option && option.is_active;
}

/**
 * Get valid values for a reference entity (for error messages)
 */
export async function getValidReferenceValues(
	ctx: ProtectedContext,
	entity: string
): Promise<string[]> {
	const options = await getReferenceOptions(ctx, entity);
	return options.map((o) => o.value);
}
