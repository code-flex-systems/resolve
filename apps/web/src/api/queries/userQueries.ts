import config from '@/config/config';
import { ProtectedContext } from '@/server/trpc/trpc';
import { DateRangeStrict } from '@/types/types';
import { CompiledQuery, sql } from 'kysely';

/**
 * Retrieve users for the current client with optional pagination.
 *
 * @param ctx - request context
 * @param disabled - filter by disabled state
 * @param limit - result limit
 * @param offset - starting offset
 * @param searchTerm - optional search term
 * @returns array of users
 */
export async function getUsersPaginated(
	ctx: ProtectedContext,
	disabled?: boolean,
	inactive?: boolean,
	limit?: number,
	offset?: number,
	searchTerm?: string
) {
	let query = ctx.db
		.selectFrom('users')
		.selectAll()
		.where((eb) => {
			const andClause = [
				eb('disabled', '=', Boolean(disabled)),
				eb('client_id', '=', ctx.session.user.client_id),
			];
			if (searchTerm) {
				andClause.push(
					eb(
						sql`concat(lower(${eb.ref('first')}), ' ', lower(${eb.ref('last')}))`,
						'like',
						`%${searchTerm.toLowerCase()}%`
					)
				);
			}
			if (inactive === true) {
				andClause.push(
					eb.or([
						eb('last_login', 'is', null),
						eb('last_login', '<', sql`now() - interval '30 days'`.$castTo<Date>()),
					])
				);
			}
			return eb.and(andClause);
		})
		.orderBy(['last', 'first']);
	if (limit != null && offset != null) {
		query = query.limit(limit).offset(offset);
	}
	return await query.execute();
}

/**
 * Retrieve users with desk assignment counts and optional filters
 * Used for the User Desk Assignments tab
 */
export async function getUsersWithDeskAssignments(
	ctx: ProtectedContext,
	{
		limit,
		offset,
		searchTerm,
		deskLocationTypeId,
		deskLocationId,
	}: {
		limit?: number;
		offset?: number;
		searchTerm?: string;
		deskLocationTypeId?: number;
		deskLocationId?: number;
	}
) {
	// Base query - all users with assignment counts
	let query = ctx.db
		.selectFrom('users')
		.leftJoin(
			(eb) =>
				eb
					.selectFrom('user_desk_location')
					.select([
						'user_desk_location.user_id',
						eb.fn.countAll<number>().as('assignment_count'),
					])
					.where('user_desk_location.removed_at', 'is', null)
					.groupBy('user_desk_location.user_id')
					.as('assignment_counts'),
			(join) => join.onRef('assignment_counts.user_id', '=', 'users.id')
		)
		.selectAll('users')
		.select(sql<number>`MAX(COALESCE(assignment_counts.assignment_count, 0))`.as('assignment_count'))
		.where('users.client_id', '=', ctx.session.user.client_id)
		.where('users.disabled', '=', false);

	// Apply search filter
	if (searchTerm) {
		query = query.where((eb) =>
			eb.or([
				eb(
					sql`concat(lower(${eb.ref('users.first')}), ' ', lower(${eb.ref('users.last')}))`,
					'like',
					`%${searchTerm.toLowerCase()}%`
				),
				eb(sql`lower(${eb.ref('users.email')})`, 'like', `%${searchTerm.toLowerCase()}%`),
			])
		);
	}

	// If desk filters are provided, filter to users with at least one matching assignment
	if (deskLocationTypeId !== undefined || deskLocationId !== undefined) {
		if (deskLocationId !== undefined) {
			query = query
				.innerJoin('user_desk_location', (join) =>
					join
						.onRef('users.id', '=', 'user_desk_location.user_id')
						.on('user_desk_location.removed_at', 'is', null)
						.on('user_desk_location.desk_location_id', '=', deskLocationId)
				);
		} else if (deskLocationTypeId !== undefined) {
			query = query
				.innerJoin('user_desk_location', (join) =>
					join.onRef('users.id', '=', 'user_desk_location.user_id').on('user_desk_location.removed_at', 'is', null)
				)
				.innerJoin('desk_location', (join) =>
					join
						.onRef('user_desk_location.desk_location_id', '=', 'desk_location.id')
						.on('desk_location.deleted_at', 'is', null)
						.on('desk_location.desk_location_type_id', '=', deskLocationTypeId)
				);
		}
	}

	// Build count query using subquery to count distinct users matching filters
	// This avoids TypeScript issues with changing query types when adding joins
	const buildCountQuery = async () => {
		// Build a subquery to find matching user IDs
		let userIdsQuery = ctx.db
			.selectFrom('users')
			.select('users.id')
			.where('users.client_id', '=', ctx.session.user.client_id)
			.where('users.disabled', '=', false);

		if (searchTerm) {
			userIdsQuery = userIdsQuery.where((eb) =>
				eb.or([
					eb(
						sql`concat(lower(${eb.ref('users.first')}), ' ', lower(${eb.ref('users.last')}))`,
						'like',
						`%${searchTerm.toLowerCase()}%`
					),
					eb(sql`lower(${eb.ref('users.email')})`, 'like', `%${searchTerm.toLowerCase()}%`),
				])
			);
		}

		if (deskLocationId !== undefined) {
			userIdsQuery = userIdsQuery.innerJoin('user_desk_location', (join) =>
				join
					.onRef('users.id', '=', 'user_desk_location.user_id')
					.on('user_desk_location.removed_at', 'is', null)
					.on('user_desk_location.desk_location_id', '=', deskLocationId)
			) as typeof userIdsQuery;
		} else if (deskLocationTypeId !== undefined) {
			userIdsQuery = userIdsQuery
				.innerJoin('user_desk_location', (join) =>
					join.onRef('users.id', '=', 'user_desk_location.user_id').on('user_desk_location.removed_at', 'is', null)
				)
				.innerJoin('desk_location', (join) =>
					join
						.onRef('user_desk_location.desk_location_id', '=', 'desk_location.id')
						.on('desk_location.deleted_at', 'is', null)
						.on('desk_location.desk_location_type_id', '=', deskLocationTypeId)
				) as typeof userIdsQuery;
		}

		// Count distinct user IDs
		const result = await ctx.db
			.selectFrom(userIdsQuery.distinct().as('filtered_users'))
			.select(({ fn }) => fn.countAll<number>().as('count'))
			.executeTakeFirst();

		return result;
	};

	// Always group by user columns to support assignment count aggregation
	query = query.groupBy([
		'users.id',
		'users.first',
		'users.last',
		'users.email',
		'users.phone',
		'users.role',
		'users.client_id',
		'users.created_at',
		'users.created_by',
		'users.updated_at',
		'users.updated_by',
		'users.disabled',
		'users.last_login',
		'users.email_verified',
		'users.phone_verified',
		'users.onboarding_email_sent',
	]);

	// Data query with pagination
	const rowsQuery = query
		.orderBy(['users.last', 'users.first'])
		.$if(limit !== undefined, (qb) => qb.limit(limit!))
		.$if(offset !== undefined, (qb) => qb.offset(offset!))
		.execute();

	// Execute in parallel
	const [countResult, rows] = await Promise.all([buildCountQuery(), rowsQuery]);

	return {
		rows,
		count: countResult?.count ? Number(countResult.count) : 0,
	};
}

export async function getUsers(ctx: ProtectedContext, searchTerm?: string) {
	let query = ctx.db
		.selectFrom('users')
		.select(['id', 'first', 'last', 'email', 'phone'])
		.where((eb) => {
			const andClause = [eb('disabled', '=', false), eb('client_id', '=', ctx.session.user.client_id)];
			if (searchTerm) {
				andClause.push(
					eb(
						sql`concat(lower(${eb.ref('first')}), ' ', lower(${eb.ref('last')}))`,
						'like',
						`${searchTerm.toLowerCase()}%`
					)
				);
			}
			return eb.and(andClause);
		})
		.orderBy(['last', 'first']);
	return await query.execute();
}

export async function getInactiveUserCount(ctx: ProtectedContext) {
	const count = await ctx.db
		.selectFrom('users')
		.select(({ fn }) => fn.countAll().as('count'))
		.where('disabled', '=', false)
		.where((eb) =>
			eb.or([
				eb('last_login', 'is', null),
				eb('last_login', '<', sql`now() - interval '30 days'`.$castTo<Date>()),
			])
		)
		.where('client_id', '=', ctx.session.user.client_id)
		.executeTakeFirstOrThrow();
	return { count: parseInt(count.count.toString()) };
}

export async function getUserActivity(
	ctx: ProtectedContext,
	filters: { range: DateRangeStrict; checklistId?: number; claimId?: number; users?: string[]; searchTerm?: string }
) {
	// Format dates as YYYY-MM-DD strings to avoid timezone issues with generate_series
	const startDate = filters.range[0].toISOString().split('T')[0];
	const endDate = filters.range[1].toISOString().split('T')[0];

	const query: CompiledQuery<{ activity_date: string; active_users: string }> = sql`
        select
            gs.day::date as activity_date,
            coalesce(count(distinct r.user_id), 0) as active_users
        from generate_series(
            ${startDate}::date,
            ${endDate}::date,
            interval '1 day'
        ) as gs(day)
        left join response_audit_logs r on date(r.created_at) = gs.day::date
            and r.client_id = ${ctx.session.user.client_id}
            ${sql.raw(filters.checklistId ? `and r.checklist_id = ${filters.checklistId}` : '')}
            ${sql.raw(filters.claimId ? `and r.claim_id = ${filters.claimId}` : '')}
            ${sql.raw(filters.users?.length ? `and r.user_id in (${filters.users.map((u) => `'${u}'`)})` : '')}
            ${sql.raw(filters.searchTerm ? `and r.question_text ilike '%${filters.searchTerm}%'` : '')}
        group by gs.day
        order by gs.day
    `.compile(ctx.db);
	return (await ctx.db.executeQuery(query))?.rows ?? [];
}

export async function getUserActivityDetail(ctx: ProtectedContext, date: string) {
	return await ctx.db
		.selectFrom('response_audit_logs')
		.leftJoin('users', 'response_audit_logs.user_id', 'users.id')
		.selectAll('response_audit_logs')
		.select(['users.first', 'users.last', 'users.email', 'users.role'])
		.where((eb) =>
			eb.and([
				eb('response_audit_logs.client_id', '=', ctx.session.user.client_id),
				eb(sql`date(${eb.ref('response_audit_logs.created_at')})`, '=', date),
			])
		)
		.orderBy('response_audit_logs.created_at')
		.execute();
}

/**
 * Count users for the current client.
 *
 * @param ctx - request context
 * @param disabled - filter by disabled status
 * @param searchTerm - optional search term
 * @returns number of users
 */
export async function getUserCount(ctx: ProtectedContext, disabled?: boolean, inactive?: boolean, searchTerm?: string) {
	const query = ctx.db
		.selectFrom('users')
		.select(({ fn }) => fn.countAll().as('count'))
		.where((eb) => {
			const andClause = [
				eb('disabled', '=', Boolean(disabled)),
				eb('client_id', '=', ctx.session.user.client_id),
			];
			if (searchTerm) {
				andClause.push(
					eb.or([
						eb(sql`lower(${eb.ref('first')})`, 'like', `${searchTerm.toLowerCase()}%`),
						eb(sql`lower(${eb.ref('last')})`, 'like', `${searchTerm.toLowerCase()}%`),
					])
				);
			}
			if (inactive === true) {
				andClause.push(
					eb.or([
						eb('last_login', 'is', null),
						eb('last_login', '<', sql`now() - interval '30 days'`.$castTo<Date>()),
					])
				);
			}
			return eb.and(andClause);
		});
	const count = await query.executeTakeFirst();
	return parseInt(count?.count?.toString() ?? '0');
}

/**
 * Count active/inactive users with client ID.
 *
 * @param ctx - request context
 * @param clientId - client ID
 * @returns active/inactive count
 */
export async function getUserCountMetrics(ctx: ProtectedContext, clientId: string) {
	const results = await ctx.db
		.selectFrom('users')
		.select(({ fn }) => ['disabled', fn.count('id').as('count')])
		.where('client_id', '=', clientId)
		.groupBy('disabled')
		.execute();
	let total = 0;
	const formattedResults = results.map((r) => {
		const count = parseInt(r.count.toString());
		total += count;
		return { ...r, count };
	});
	return {
		total,
		active: formattedResults.find((r) => !r.disabled)?.count ?? 0,
		inactive: formattedResults.find((r) => r.disabled)?.count ?? 0,
	};
}

/**
 * Retrieve a single user by id.
 *
 * @param ctx - request context
 * @param id - user identifier
 * @returns the user or undefined
 */
export async function getUser(ctx: ProtectedContext, id: string) {
	return await ctx.db
		.selectFrom('users')
		.selectAll()
		.where((eb) => eb.and([eb('id', '=', id), eb('client_id', '=', ctx.session.user.client_id)]))
		.executeTakeFirst();
}

/**
 * Update a user's profile information.
 *
 * @param ctx - request context
 * @param id - user identifier
 * @param params - fields to modify
 * @returns updated user
 */
export async function updateUser(
	ctx: ProtectedContext,
	id: string,
	params: Partial<{
		first: string;
		last: string;
		email: string;
		phone?: string;
		role?: string;
		disabled?: boolean;
	}>
) {
	const [user] = await ctx.db
		.updateTable('users')
		.set({ ...params, updated_by: ctx.session.user.id, updated_at: sql`now()` })
		.where('id', '=', id)
		.where('client_id', '=', ctx.session.user.client_id)
		.returning(['first', 'last', 'email', 'phone'])
		.execute();
	return user;
}

/**
 * Remove a user account.
 *
 * @param ctx - request context
 * @param id - user identifier to delete
 */
export async function deleteUser(ctx: ProtectedContext, id: string) {
	await ctx.db.deleteFrom('users').where('id', '=', id).where('client_id', '=', ctx.session.user.client_id).execute();
}

/**
 * Upsert a user by email (for webhook sync).
 * Creates if not exists, updates if exists.
 *
 * @param ctx - db instance
 * @param user - user data from Clerk
 */
export async function upsertUserFromClerk(
	db: ProtectedContext['db'],
	user: {
		first: string;
		last: string;
		email: string;
		phone?: string;
		role: string;
		client_id: string;
	}
) {
	// Use email for conflict resolution since that's the unique identifier
	// The internal UUID is generated by the DB on insert
	return await db
		.insertInto('users')
		.values({
			first: user.first,
			last: user.last,
			email: user.email,
			phone: user.phone,
			role: user.role,
			client_id: user.client_id,
		})
		.onConflict((oc) =>
			oc.column('email').doUpdateSet({
				first: user.first,
				last: user.last,
				phone: user.phone,
				role: user.role,
				client_id: user.client_id,
			})
		)
		.returningAll()
		.executeTakeFirst();
}
