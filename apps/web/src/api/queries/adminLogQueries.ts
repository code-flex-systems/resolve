import { ProtectedContext } from '@/server/trpc/trpc';
import { EntityName } from '@/api/utils/adminActionLogger';
import { sql } from 'kysely';

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
	claimId: number,
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
