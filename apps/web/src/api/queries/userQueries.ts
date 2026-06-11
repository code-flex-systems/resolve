import config from '@/config/config';
import { ProtectedContext } from '@/server/trpc/trpc';
import { DateRangeStrict } from '@/types/types';
import { CompiledQuery, sql } from 'kysely';
import { sqlFilters } from '@/api/utils/utils';

/** Build a user name/email search filter for prefix matching */
function buildUserSearchFilter(eb: any, searchTerm: string, tablePrefix: string = 'users') {
	const term = searchTerm.toLowerCase();
	return eb.or([
		eb(
			sql`concat(lower(${eb.ref(`${tablePrefix}.first`)}), ' ', lower(${eb.ref(`${tablePrefix}.last`)}))`,
			'like',
			`${term}%`
		),
		eb(sql`lower(${eb.ref(`${tablePrefix}.email`)})`, 'like', `${term}%`),
	]);
}

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
						`${searchTerm.toLowerCase()}%`
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
		deskLocationTypeId?: string;
		deskLocationId?: string;
	}
) {
	// LEFT JOIN to active assignments + their desk location/type so we can aggregate per user.
	let query = ctx.db
		.selectFrom('users')
		.leftJoin('user_desk_location as udl', (join) =>
			join.onRef('udl.user_id', '=', 'users.id').on('udl.removed_at', 'is', null)
		)
		.leftJoin('desk_location as dl', (join) =>
			join.onRef('dl.id', '=', 'udl.desk_location_id').on('dl.deleted_at', 'is', null)
		)
		.leftJoin('desk_location_type as dlt', (join) =>
			join.onRef('dlt.id', '=', 'dl.desk_location_type_id').on('dlt.deleted_at', 'is', null)
		)
		.selectAll('users')
		.select([
			sql<number>`COUNT(udl.id) FILTER (WHERE dl.id IS NOT NULL)`.as('assignment_count'),
			sql<number>`COALESCE(SUM(dl.capacity_threshold) FILTER (WHERE dl.id IS NOT NULL), 0)`.as(
				'capacity'
			),
			sql`COALESCE(
				jsonb_agg(
					jsonb_build_object(
						'id', udl.id,
						'desk_location_id', udl.desk_location_id,
						'desk_location_name', dl.name,
						'desk_location_type_name', dlt.name,
						'priority', udl.priority
					)
					ORDER BY udl.priority ASC
				) FILTER (WHERE dl.id IS NOT NULL),
				'[]'::jsonb
			)`
				.$castTo<unknown>()
				.as('assignments'),
		])
		.select(sql<string>`COUNT(*) OVER()`.as('total_count'))
		.where('users.client_id', '=', ctx.session.user.client_id)
		.where('users.disabled', '=', false);

	// Apply search filter
	if (searchTerm) {
		query = query.where((eb) => buildUserSearchFilter(eb, searchTerm));
	}

	// Filter: only users who have at least one assignment matching the criteria.
	// EXISTS keeps the assignment aggregates unaffected by the filter.
	if (deskLocationId !== undefined) {
		query = query.where((eb) =>
			eb.exists(
				eb
					.selectFrom('user_desk_location as udl_filter')
					.select(sql`1`.as('one'))
					.whereRef('udl_filter.user_id', '=', 'users.id')
					.where('udl_filter.removed_at', 'is', null)
					.where('udl_filter.desk_location_id', '=', deskLocationId)
			)
		);
	} else if (deskLocationTypeId !== undefined) {
		query = query.where((eb) =>
			eb.exists(
				eb
					.selectFrom('user_desk_location as udl_filter')
					.innerJoin('desk_location as dl_filter', (join) =>
						join
							.onRef('dl_filter.id', '=', 'udl_filter.desk_location_id')
							.on('dl_filter.deleted_at', 'is', null)
					)
					.select(sql`1`.as('one'))
					.whereRef('udl_filter.user_id', '=', 'users.id')
					.where('udl_filter.removed_at', 'is', null)
					.where('dl_filter.desk_location_type_id', '=', deskLocationTypeId)
			)
		);
	}

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
	const results = await query
		.orderBy(['users.last', 'users.first'])
		.$if(limit !== undefined, (qb) => qb.limit(limit!))
		.$if(offset !== undefined, (qb) => qb.offset(offset!))
		.execute();

	// Extract total count from window function, then strip it from rows
	const count = results.length > 0 ? Number(results[0].total_count) : 0;
	const rows = results.map(({ total_count, ...row }) => row);

	return { rows, count };
}

export async function getUsers(ctx: ProtectedContext, searchTerm?: string, role?: string) {
	let query = ctx.db
		.selectFrom('users')
		.select(['id', 'first', 'last', 'email', 'phone'])
		.where((eb) => {
			const andClause = [
				eb('disabled', '=', false),
				eb('client_id', '=', ctx.session.user.client_id),
			];
			if (searchTerm) {
				andClause.push(
					eb(
						sql`concat(lower(${eb.ref('first')}), ' ', lower(${eb.ref('last')}))`,
						'like',
						`${searchTerm.toLowerCase()}%`
					)
				);
			}
			if (role) {
				andClause.push(eb('role', '=', role));
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
	filters: { range: DateRangeStrict; users?: string[] }
) {
	// Count login sessions per day from auth_events.
	// Join through users table for client scoping since auth_events has no client_id.
	const startDate = filters.range[0].toISOString().split('T')[0];
	const endDate = filters.range[1].toISOString().split('T')[0];

	const query: CompiledQuery<{ activity_date: string; active_users: string }> = sql`
        select
            gs.day::date as activity_date,
            coalesce(count(distinct ae.user_id), 0) as active_users
        from generate_series(
            ${startDate}::date,
            ${endDate}::date,
            interval '1 day'
        ) as gs(day)
        left join auth_events ae on date(ae.created_at) = gs.day::date
            and ae.event_type = 'login'
            and ae.user_id in (select id from users where client_id = ${ctx.session.user.client_id})
            ${sqlFilters.inArray('ae.user_id', filters.users)}
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
export async function getUserCount(
	ctx: ProtectedContext,
	disabled?: boolean,
	inactive?: boolean,
	searchTerm?: string
) {
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
					eb(
						sql`concat(lower(${eb.ref('first')}), ' ', lower(${eb.ref('last')}))`,
						'like',
						`${searchTerm.toLowerCase()}%`
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
	await ctx.db
		.deleteFrom('users')
		.where('id', '=', id)
		.where('client_id', '=', ctx.session.user.client_id)
		.execute();
}

/**
 * Create a local user row for an invited user.
 * Called at invite time - the Supabase auth user already exists, so the
 * row is linked immediately via auth_user_id. Upserts by email so
 * re-inviting an existing address just relinks/updates the row.
 *
 * @param db - db instance
 * @param user - invited user data
 */
export async function createInvitedUser(
	db: ProtectedContext['db'],
	user: {
		email: string;
		role: string;
		client_id: string;
		auth_user_id: string;
	}
) {
	return await db
		.insertInto('users')
		.values({
			first: '',
			last: '',
			email: user.email,
			role: user.role,
			client_id: user.client_id,
			auth_user_id: user.auth_user_id,
		})
		.onConflict((oc) =>
			oc.column('email').doUpdateSet({
				role: user.role,
				client_id: user.client_id,
				auth_user_id: user.auth_user_id,
			})
		)
		.returningAll()
		.executeTakeFirst();
}

/**
 * Get user management overview stats in a single DB round-trip.
 * Returns totals, role breakdown, and recent signup count.
 */
export async function getUserManagementStats(ctx: ProtectedContext) {
	const clientId = ctx.session.user.client_id!;

	// Single table scan with FILTER clauses + role breakdown in parallel
	const [counts, byRole] = await Promise.all([
		ctx.db
			.selectFrom('users')
			.where('client_id', '=', clientId)
			.select(({ fn }) => [
				fn.countAll<number>().as('total'),
				sql<number>`count(*) filter (where not disabled)`.as('active'),
				sql<number>`count(*) filter (where disabled)`.as('disabled'),
				sql<number>`count(*) filter (where created_at >= now() - interval '30 days')`.as(
					'recent_signups'
				),
			])
			.executeTakeFirstOrThrow(),
		ctx.db
			.selectFrom('users')
			.where('client_id', '=', clientId)
			.where('disabled', '=', false)
			.groupBy('role')
			.select(({ fn }) => ['role', fn.countAll<number>().as('count')])
			.execute(),
	]);

	return {
		total: Number(counts.total),
		active: Number(counts.active),
		disabled: Number(counts.disabled),
		recentSignups: Number(counts.recent_signups),
		byRole: byRole.map((r) => ({ role: r.role ?? 'unknown', count: Number(r.count) })),
	};
}
