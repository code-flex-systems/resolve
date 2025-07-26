import { db } from '@/api/database/kysely';
import config from '@/config/config';
import { ProtectedContext } from '@/server/trpc/trpc';
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
	limit?: number,
	offset?: number,
	searchTerm?: string
) {
	let query = db
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
			return eb.and(andClause);
		})
		.orderBy(['last', 'first']);
	if (limit != null && offset != null) {
		query = query.limit(limit).offset(offset);
	}
	return await query.execute();
}

export async function getUsers(ctx: ProtectedContext, searchTerm?: string) {
	let query = db
		.selectFrom('users')
		.select(['first', 'last', 'email'])
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

export async function getUserActivity(ctx: ProtectedContext, daysBack = 30) {
	const query: CompiledQuery<{ activity_date: string; active_users: string }> = sql`
        select
            gs.day::date as activity_date,
            count(distinct r.user_id) as active_users
        from generate_series(
            CURRENT_DATE - interval '${sql.raw(daysBack.toString())} days',
            CURRENT_DATE,
            interval '1 day'
        ) as gs(day)
        left join response_audit_logs r on date(r.created_at) = gs.day
        where client_id = ${ctx.session.user.client_id}
        group by gs.day
        order by gs.day
    `.compile(db);
	return (await db.executeQuery(query))?.rows ?? [];
}

export async function getUserActivityDetail(ctx: ProtectedContext, date: string) {
	return await db
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
export async function getUserCount(ctx: ProtectedContext, disabled?: boolean, searchTerm?: string) {
	const query = db
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
	const results = await db
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
	return await db
		.selectFrom('users')
		.selectAll()
		.where((eb) => eb.and([eb('id', '=', id), eb('client_id', '=', ctx.session.user.client_id)]))
		.executeTakeFirst();
}

/**
 * Bulk create users for the current client.
 *
 * @param ctx - request context
 * @param users - array of user objects without ids
 * @returns the first created user
 */
export async function createUsers(
	ctx: ProtectedContext,
	users: {
		first: string;
		last: string;
		email: string;
		password_hash: string;
		phone?: string;
	}[]
) {
	return await db
		.insertInto('users')
		.values(
			users.map((u) => ({
				...u,
				role: config.ROLES.CONTRIBUTOR,
				client_id: ctx.session.user.client_id,
				created_by: ctx.session.user.id,
			}))
		)
		.returningAll()
		.execute();
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
		name: string;
		email: string;
		password: string;
		phone_number?: string;
		role?: string;
		disabled?: boolean;
		email_verified?: Date;
		phone_verified?: Date;
		onboarding_email_sent?: boolean;
		must_change_password?: boolean;
	}>
) {
	const [user] = await db
		.updateTable('users')
		.set({ ...params, updated_by: ctx.session.user.id, updated_at: sql`now()` })
		.where('id', '=', id)
		.returningAll()
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
	await db.deleteFrom('users').where('id', '=', id).execute();
}
