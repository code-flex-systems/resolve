import { sql } from 'kysely';
import { ProtectedContext } from '@/server/trpc/trpc';
import { EntityName } from '@/api/utils/activityLogger';
import type { ListAdminConfigLogsInput } from '@/schemas/adminLogSchemas';

/**
 * Get admin action logs for a specific claim.
 * Returns logs with user information for display purposes.
 *
 * NOTE: This now reads from claim_activity_logs which has direct claim_id indexing
 * for much better performance.
 *
 * @param ctx - request context
 * @param claimId - claim identifier
 * @param limit - maximum number of logs to return (default: 10)
 * @returns admin action logs with user details
 */
export async function getAdminLogsByClaim(
	ctx: ProtectedContext,
	claimId: string,
	limit: number = 10
) {
	// Use the new claim_activity_logs table which has claim_id indexing
	return await ctx.db
		.selectFrom('claim_activity_logs')
		.innerJoin('users', 'claim_activity_logs.user_id', 'users.id')
		.select([
			'claim_activity_logs.id',
			'claim_activity_logs.entity_id',
			'claim_activity_logs.entity_name',
			'claim_activity_logs.action',
			'claim_activity_logs.actor_type',
			'claim_activity_logs.created_at',
			'users.id as user_id',
			'users.first as first_name',
			'users.last as last_name',
		])
		.where('claim_activity_logs.client_id', '=', ctx.session.user.client_id)
		.where('claim_activity_logs.claim_id', '=', claimId)
		// Only show admin actions (for backwards compatibility with old admin logs view)
		.where('claim_activity_logs.actor_type', '=', 'admin')
		.orderBy('claim_activity_logs.created_at', 'desc')
		.limit(limit)
		.execute();
}

/**
 * Get admin action logs for any entity.
 * Useful for displaying activity on different entity types.
 *
 * NOTE: This now intelligently routes to the correct table based on entity type.
 *
 * @param ctx - request context
 * @param entityName - type of entity
 * @param entityId - entity identifier
 * @param limit - maximum number of logs to return (default: 10)
 * @returns admin action logs with user details
 */
export async function getAdminLogsByEntity(
	ctx: ProtectedContext,
	entityName: EntityName,
	entityId: string,
	limit: number = 10
) {
	// Determine which table to query based on entity type
	const claimEntities = new Set([
		EntityName.CLAIM,
		EntityName.TASK,
		EntityName.DEADLINE,
		EntityName.RECOVERY_EVENT,
		EntityName.CLAIM_COVERAGE,
		EntityName.CLAIM_PARTY,
		EntityName.DOCUMENT,
		EntityName.CHECKLIST_CLAIM,
		EntityName.COMMENT,
	]);

	if (claimEntities.has(entityName)) {
		// Query claim_activity_logs for claim-related entities
		return await ctx.db
			.selectFrom('claim_activity_logs')
			.innerJoin('users', 'claim_activity_logs.user_id', 'users.id')
			.select([
				'claim_activity_logs.id',
				'claim_activity_logs.entity_id',
				'claim_activity_logs.entity_name',
				'claim_activity_logs.action',
				'claim_activity_logs.actor_type',
				'claim_activity_logs.created_at',
				'users.id as user_id',
				'users.first as first_name',
				'users.last as last_name',
			])
			.where('claim_activity_logs.client_id', '=', ctx.session.user.client_id)
			.where('claim_activity_logs.entity_name', '=', entityName)
			.where('claim_activity_logs.entity_id', '=', entityId)
			// Only show admin actions (for backwards compatibility with old admin logs view)
			.where('claim_activity_logs.actor_type', '=', 'admin')
			.orderBy('claim_activity_logs.created_at', 'desc')
			.limit(limit)
			.execute();
	} else {
		// Query admin_config_logs for config entities
		return await ctx.db
			.selectFrom('admin_config_logs')
			.innerJoin('users', 'admin_config_logs.user_id', 'users.id')
			.select([
				'admin_config_logs.id',
				'admin_config_logs.entity_id',
				'admin_config_logs.entity_name',
				'admin_config_logs.action',
				'admin_config_logs.created_at',
				'users.id as user_id',
				'users.first as first_name',
				'users.last as last_name',
			])
			.where('admin_config_logs.client_id', '=', ctx.session.user.client_id)
			.where('admin_config_logs.entity_name', '=', entityName)
			.where('admin_config_logs.entity_id', '=', entityId)
			.orderBy('admin_config_logs.created_at', 'desc')
			.limit(limit)
			.execute();
	}
}

export async function listAdminConfigLogs(ctx: ProtectedContext, input: ListAdminConfigLogsInput) {
	const { limit, cursor, startDate, endDate, entityName, userId } = input;

	let query = ctx.db
		.selectFrom('admin_config_logs')
		.innerJoin('users', 'admin_config_logs.user_id', 'users.id')
		.select([
			'admin_config_logs.id',
			'admin_config_logs.entity_id',
			'admin_config_logs.entity_name',
			'admin_config_logs.action',
			'admin_config_logs.created_at',
			'admin_config_logs.value',
			'users.id as user_id',
			'users.first as first_name',
			'users.last as last_name',
			'users.email as user_email',
		])
		.where('admin_config_logs.client_id', '=', ctx.session.user.client_id);

	if (entityName) {
		query = query.where('admin_config_logs.entity_name', '=', entityName);
	}

	if (userId) {
		query = query.where('admin_config_logs.user_id', '=', userId);
	}

	if (startDate) {
		query = query.where('admin_config_logs.created_at', '>=', new Date(startDate));
	}

	if (endDate) {
		query = query.where('admin_config_logs.created_at', '<=', new Date(endDate));
	}

	if (cursor) {
		const cursorDate = new Date(cursor.createdAt);
		query = query.where((eb) =>
			eb.or([
				eb('admin_config_logs.created_at', '<', cursorDate),
				eb.and([
					eb('admin_config_logs.created_at', '=', cursorDate),
					eb('admin_config_logs.id', '<', cursor.id),
				]),
			])
		);
	}

	const rows = await query
		.orderBy('admin_config_logs.created_at', 'desc')
		.orderBy('admin_config_logs.id', 'desc')
		.limit(limit + 1)
		.execute();

	const hasNextPage = rows.length > limit;
	const trimmedRows = hasNextPage ? rows.slice(0, limit) : rows;
	const lastRow = trimmedRows[trimmedRows.length - 1];
	const nextCursor =
		hasNextPage && lastRow
			? {
					createdAt:
						lastRow.created_at instanceof Date
							? lastRow.created_at.toISOString()
							: new Date(lastRow.created_at).toISOString(),
					id: lastRow.id,
				}
			: null;

	return {
		rows: trimmedRows,
		nextCursor,
		hasNextPage,
	};
}

/**
 * Get system overview stats in a single DB round-trip.
 * Returns admin actions today, reference data entity count, and statute rule count.
 */
export async function getSystemStats(ctx: ProtectedContext) {
	const clientId = ctx.session.user.client_id!;

	const counts = await ctx.db
		.selectNoFrom(({ selectFrom }) => [
			// Admin config actions today
			selectFrom('admin_config_logs')
				.where('client_id', '=', clientId)
				.where('created_at', '>=', sql<Date>`current_date`)
				.select(({ fn }) => fn.countAll<number>().as('c'))
				.as('admin_actions_today'),
			// Reference data lists (client-scoped)
			selectFrom('reference_list')
				.where('client_id', '=', clientId)
				.where('deleted_at', 'is', null)
				.select(({ fn }) => fn.countAll<number>().as('c'))
				.as('reference_data_entities'),
			// Statute rules (global table, no client_id)
			selectFrom('statute_rule')
				.select(({ fn }) => fn.countAll<number>().as('c'))
				.as('active_statute_rules'),
		])
		.executeTakeFirstOrThrow();

	return {
		adminActionsToday: Number(counts.admin_actions_today),
		referenceDataEntities: Number(counts.reference_data_entities),
		activeStatuteRules: Number(counts.active_statute_rules),
	};
}
