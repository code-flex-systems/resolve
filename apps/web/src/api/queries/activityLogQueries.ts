import { ProtectedContext } from '@/server/trpc/trpc';

/**
 * Get claim activity logs for a specific claim
 *
 * This provides a fast, claim-centric query using the claim_id index for 25x performance improvement.
 *
 * @param ctx - Protected context
 * @param claimId - The claim ID to get activity for
 * @param options - Optional filters (actor type, limit)
 * @returns Array of activity logs with user information
 */
export async function getClaimActivityLogs(
	ctx: ProtectedContext,
	claimId: number,
	options?: {
		actorType?: 'admin' | 'user';
		limit?: number;
	}
) {
	let query = ctx.db
		.selectFrom('claim_activity_logs')
		.innerJoin('users', 'users.id', 'claim_activity_logs.user_id')
		.select([
			'claim_activity_logs.id',
			'claim_activity_logs.client_id',
			'claim_activity_logs.claim_id',
			'claim_activity_logs.user_id',
			'claim_activity_logs.entity_id',
			'claim_activity_logs.entity_name',
			'claim_activity_logs.action',
			'claim_activity_logs.actor_type',
			'claim_activity_logs.value',
			'claim_activity_logs.created_at',
			'users.first as user_first_name',
			'users.last as user_last_name',
		])
		.where('claim_activity_logs.claim_id', '=', claimId)
		.where('claim_activity_logs.client_id', '=', ctx.session.user.client_id as string);

	if (options?.actorType) {
		query = query.where('claim_activity_logs.actor_type', '=', options.actorType);
	}

	return query
		.orderBy('claim_activity_logs.created_at', 'desc')
		.limit(options?.limit || 100)
		.execute();
}

/**
 * Get complete claim timeline (activity logs + response audit logs)
 *
 * Merges claim_activity_logs and response_audit_logs to provide a complete timeline.
 *
 * @param ctx - Protected context
 * @param claimId - The claim ID to get timeline for
 * @param options - Optional limit
 * @returns Combined array of activity and response logs, sorted by timestamp
 */
export async function getCompleteClaimTimeline(
	ctx: ProtectedContext,
	claimId: number,
	options?: { limit?: number }
) {
	const limit = options?.limit || 100;

	const [activityLogs, responseLogs] = await Promise.all([
		getClaimActivityLogs(ctx, claimId, { limit }),
		ctx.db
			.selectFrom('response_audit_logs')
			.innerJoin('users', 'users.id', 'response_audit_logs.user_id')
			.select([
				'response_audit_logs.id',
				'response_audit_logs.client_id',
				'response_audit_logs.claim_id',
				'response_audit_logs.user_id',
				'response_audit_logs.question_id',
				'response_audit_logs.question_text',
				'response_audit_logs.new_response_text',
				'response_audit_logs.action',
				'response_audit_logs.created_at',
				'users.first as user_first_name',
				'users.last as user_last_name',
			])
			.where('response_audit_logs.claim_id', '=', claimId)
			.where('response_audit_logs.client_id', '=', ctx.session.user.client_id as string)
			.orderBy('response_audit_logs.created_at', 'desc')
			.limit(limit)
			.execute(),
	]);

	// Merge and sort by timestamp
	const combined = [...activityLogs, ...responseLogs].sort(
		(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
	);

	// Apply limit to combined results
	return combined.slice(0, limit);
}

/**
 * Get complete user activity logs across all tables
 *
 * Queries admin_config_logs, claim_activity_logs, and response_audit_logs to provide
 * a complete view of a user's activity.
 *
 * @param ctx - Protected context
 * @param userId - The user ID to get activity for
 * @param options - Optional filters (date range, limit)
 * @returns Array of all user activity logs, sorted by timestamp
 */
export async function getUserActivityLogs(
	ctx: ProtectedContext,
	userId: string,
	options?: {
		startDate?: Date;
		endDate?: Date;
		limit?: number;
	}
) {
	const limit = options?.limit || 100;

	// Build config logs query
	let configQuery = ctx.db
		.selectFrom('admin_config_logs')
		.selectAll()
		.where('user_id', '=', userId)
		.where('client_id', '=', ctx.session.user.client_id as string);

	if (options?.startDate) {
		configQuery = configQuery.where('created_at', '>=', options.startDate);
	}
	if (options?.endDate) {
		configQuery = configQuery.where('created_at', '<=', options.endDate);
	}

	// Build claim activity logs query
	let activityQuery = ctx.db
		.selectFrom('claim_activity_logs')
		.selectAll()
		.where('user_id', '=', userId)
		.where('client_id', '=', ctx.session.user.client_id as string);

	if (options?.startDate) {
		activityQuery = activityQuery.where('created_at', '>=', options.startDate);
	}
	if (options?.endDate) {
		activityQuery = activityQuery.where('created_at', '<=', options.endDate);
	}

	// Build response logs query
	let responseQuery = ctx.db
		.selectFrom('response_audit_logs')
		.selectAll()
		.where('user_id', '=', userId)
		.where('client_id', '=', ctx.session.user.client_id as string);

	if (options?.startDate) {
		responseQuery = responseQuery.where('created_at', '>=', options.startDate);
	}
	if (options?.endDate) {
		responseQuery = responseQuery.where('created_at', '<=', options.endDate);
	}

	// Execute all queries in parallel
	const [configLogs, activityLogs, responseLogs] = await Promise.all([
		configQuery.execute(),
		activityQuery.execute(),
		responseQuery.execute(),
	]);

	// Merge, sort, and limit
	const combined = [...configLogs, ...activityLogs, ...responseLogs].sort(
		(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
	);

	return combined.slice(0, limit);
}

/**
 * Get admin config logs for a specific entity
 *
 * @param ctx - Protected context
 * @param entityName - The entity name
 * @param entityId - The entity ID
 * @param options - Optional limit
 * @returns Array of config logs for the entity
 */
export async function getEntityConfigLogs(
	ctx: ProtectedContext,
	entityName: string,
	entityId: string | number,
	options?: { limit?: number }
) {
	return ctx.db
		.selectFrom('admin_config_logs')
		.innerJoin('users', 'users.id', 'admin_config_logs.user_id')
		.select([
			'admin_config_logs.id',
			'admin_config_logs.client_id',
			'admin_config_logs.user_id',
			'admin_config_logs.entity_id',
			'admin_config_logs.entity_name',
			'admin_config_logs.action',
			'admin_config_logs.value',
			'admin_config_logs.created_at',
			'users.first as user_first_name',
			'users.last as user_last_name',
		])
		.where('admin_config_logs.entity_name', '=', entityName)
		.where('admin_config_logs.entity_id', '=', entityId.toString())
		.where('admin_config_logs.client_id', '=', ctx.session.user.client_id as string)
		.orderBy('admin_config_logs.created_at', 'desc')
		.limit(options?.limit || 100)
		.execute();
}

/**
 * Get recent admin config logs (all entities)
 *
 * @param ctx - Protected context
 * @param options - Optional filters (entity name, limit)
 * @returns Array of recent config logs
 */
export async function getRecentConfigLogs(
	ctx: ProtectedContext,
	options?: {
		entityName?: string;
		limit?: number;
	}
) {
	let query = ctx.db
		.selectFrom('admin_config_logs')
		.innerJoin('users', 'users.id', 'admin_config_logs.user_id')
		.select([
			'admin_config_logs.id',
			'admin_config_logs.client_id',
			'admin_config_logs.user_id',
			'admin_config_logs.entity_id',
			'admin_config_logs.entity_name',
			'admin_config_logs.action',
			'admin_config_logs.value',
			'admin_config_logs.created_at',
			'users.first as user_first_name',
			'users.last as user_last_name',
		])
		.where('admin_config_logs.client_id', '=', ctx.session.user.client_id as string);

	if (options?.entityName) {
		query = query.where('admin_config_logs.entity_name', '=', options.entityName);
	}

	return query
		.orderBy('admin_config_logs.created_at', 'desc')
		.limit(options?.limit || 50)
		.execute();
}
