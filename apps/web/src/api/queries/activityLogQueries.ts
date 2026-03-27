import { sql } from 'kysely';
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
	claimId: string,
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

export type TimelineEntry = {
	id: number;
	claim_id: string;
	type: 'activity' | 'response_audit';
	action: string;
	user_id: string;
	user_first: string;
	user_last: string;
	created_at: Date;
	value: unknown | null;
};

/**
 * Get complete claim timeline (activity logs + response audit logs)
 *
 * Uses SQL UNION ALL to merge claim_activity_logs and response_audit_logs into a single
 * sorted result set. Both queries are normalized to the same column shape, combined,
 * and ordered by created_at desc in the database — enabling future pagination.
 *
 * @param ctx - Protected context
 * @param claimId - The claim ID to get timeline for
 * @param options - Optional limit
 * @returns Combined array of activity and response logs, sorted by timestamp
 */
export async function getCompleteClaimTimeline(
	ctx: ProtectedContext,
	claimId: string,
	options?: { limit?: number }
): Promise<TimelineEntry[]> {
	const limit = options?.limit || 100;
	const clientId = ctx.session.user.client_id as string;

	const activityQuery = ctx.db
		.selectFrom('claim_activity_logs')
		.innerJoin('users', 'users.id', 'claim_activity_logs.user_id')
		.select([
			'claim_activity_logs.id',
			'claim_activity_logs.claim_id',
			sql.lit('activity').as('type'),
			'claim_activity_logs.action',
			'claim_activity_logs.user_id',
			'users.first as user_first',
			'users.last as user_last',
			'claim_activity_logs.created_at',
			'claim_activity_logs.value',
		])
		.where('claim_activity_logs.claim_id', '=', claimId)
		.where('claim_activity_logs.client_id', '=', clientId);

	const responseQuery = ctx.db
		.selectFrom('response_audit_logs')
		.innerJoin('users', 'users.id', 'response_audit_logs.user_id')
		.select([
			'response_audit_logs.id',
			sql<string>`response_audit_logs.claim_id`.as('claim_id'),
			sql.lit('response_audit').as('type'),
			'response_audit_logs.action',
			sql<string>`response_audit_logs.user_id`.as('user_id'),
			'users.first as user_first',
			'users.last as user_last',
			'response_audit_logs.created_at',
			sql<unknown>`jsonb_build_object(
				'question_id', response_audit_logs.question_id,
				'question_text', response_audit_logs.question_text,
				'new_response_text', response_audit_logs.new_response_text
			)`.as('value'),
		])
		.where('response_audit_logs.claim_id', '=', claimId)
		.where('response_audit_logs.client_id', '=', clientId);

	const rows = await activityQuery
		.unionAll(responseQuery as any)
		.orderBy('created_at', 'desc')
		.limit(limit)
		.execute();

	return rows as unknown as TimelineEntry[];
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

export async function listClaimActivityLogs(
	ctx: ProtectedContext,
	input: {
		limit: number;
		cursor?: { createdAt: string; id: number };
		startDate?: string;
		endDate?: string;
		entityName?: string;
		userId?: string;
		claimId?: string;
		actorType?: 'admin' | 'user';
	}
) {
	const { limit, cursor, startDate, endDate, entityName, userId, claimId, actorType } = input;

	let query = ctx.db
		.selectFrom('claim_activity_logs')
		.innerJoin('users', 'claim_activity_logs.user_id', 'users.id')
		.innerJoin('claim', 'claim.id', 'claim_activity_logs.claim_id')
		.select([
			'claim_activity_logs.id',
			'claim_activity_logs.claim_id',
			'claim_activity_logs.entity_id',
			'claim_activity_logs.entity_name',
			'claim_activity_logs.action',
			'claim_activity_logs.actor_type',
			'claim_activity_logs.created_at',
			'claim_activity_logs.value',
			'users.id as user_id',
			'users.first as first_name',
			'users.last as last_name',
			'users.email as user_email',
			'claim.claim_number as claim_number',
			'claim.insured as claim_insured',
		])
		.where('claim_activity_logs.client_id', '=', ctx.session.user.client_id)
		.where('claim.client_id', '=', ctx.session.user.client_id);

	if (entityName) {
		query = query.where('claim_activity_logs.entity_name', '=', entityName);
	}

	if (userId) {
		query = query.where('claim_activity_logs.user_id', '=', userId);
	}

	if (claimId) {
		query = query.where('claim_activity_logs.claim_id', '=', claimId);
	}

	if (actorType) {
		query = query.where('claim_activity_logs.actor_type', '=', actorType);
	}

	if (startDate) {
		query = query.where('claim_activity_logs.created_at', '>=', new Date(startDate));
	}

	if (endDate) {
		query = query.where('claim_activity_logs.created_at', '<=', new Date(endDate));
	}

	if (cursor) {
		const cursorDate = new Date(cursor.createdAt);
		query = query.where((eb) =>
			eb.or([
				eb('claim_activity_logs.created_at', '<', cursorDate),
				eb.and([
					eb('claim_activity_logs.created_at', '=', cursorDate),
					eb('claim_activity_logs.id', '<', cursor.id),
				]),
			])
		);
	}

	const rows = await query
		.orderBy('claim_activity_logs.created_at', 'desc')
		.orderBy('claim_activity_logs.id', 'desc')
		.limit(limit + 1)
		.execute();

	const hasNextPage = rows.length > limit;
	const trimmedRows = hasNextPage ? rows.slice(0, limit) : rows;
	const lastRow = trimmedRows[trimmedRows.length - 1];
	const nextCursor = hasNextPage && lastRow
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
