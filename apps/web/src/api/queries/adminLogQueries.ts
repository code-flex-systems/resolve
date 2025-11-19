import { ProtectedContext } from '@/server/trpc/trpc';
import { EntityName } from '@/api/utils/adminActionLogger';
import { sql } from 'kysely';

/**
 * Get admin action logs for a specific claim.
 * Returns logs with user information for display purposes.
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
	return await ctx.db
		.selectFrom('admin_action_logs')
		.innerJoin('users', 'admin_action_logs.user_id', 'users.id')
		.select([
			'admin_action_logs.id',
			'admin_action_logs.entity_id',
			'admin_action_logs.entity_name',
			'admin_action_logs.action',
			'admin_action_logs.created_at',
			'users.id as user_id',
			'users.first as first_name',
			'users.last as last_name',
		])
		.where('admin_action_logs.client_id', '=', ctx.session.user.client_id)
		.where((eb) => {
			// Get entity IDs for coverage and checklist_claim related to this claim
			const coverageCondition = eb.and([
				eb('admin_action_logs.entity_name', '=', EntityName.CLAIM_COVERAGE),
				eb(
					sql`admin_action_logs.entity_id::integer`,
					'in',
					eb.selectFrom('claim_coverage').select('id').where('claim_id', '=', claimId)
				),
			]);

			const checklistClaimCondition = sql<boolean>`
				admin_action_logs.entity_name = ${EntityName.CHECKLIST_CLAIM}
				AND admin_action_logs.entity_id in (
					select checklist_id::text || '-' || claim_id::text
					from checklist_claim
					where claim_id = ${claimId}
				)
			`;

			return eb.or([
				// Direct claim actions
				eb.and([
					eb('admin_action_logs.entity_name', '=', EntityName.CLAIM),
					eb('admin_action_logs.entity_id', '=', claimId.toString()),
				]),
				coverageCondition,
				checklistClaimCondition,
			]);
		})
		.orderBy('admin_action_logs.created_at', 'desc')
		.limit(limit)
		.execute();
}

/**
 * Get admin action logs for any entity.
 * Useful for displaying activity on different entity types.
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
	return await ctx.db
		.selectFrom('admin_action_logs')
		.innerJoin('users', 'admin_action_logs.user_id', 'users.id')
		.select([
			'admin_action_logs.id',
			'admin_action_logs.entity_id',
			'admin_action_logs.entity_name',
			'admin_action_logs.action',
			'admin_action_logs.created_at',
			'users.id as user_id',
			'users.first as first_name',
			'users.last as last_name',
		])
		.where('admin_action_logs.client_id', '=', ctx.session.user.client_id)
		.where('admin_action_logs.entity_name', '=', entityName)
		.where('admin_action_logs.entity_id', '=', entityId)
		.orderBy('admin_action_logs.created_at', 'desc')
		.limit(limit)
		.execute();
}
