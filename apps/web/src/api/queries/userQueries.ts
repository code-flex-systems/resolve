import { db } from '@/api/database/kysely';
import config from '@/config/config';
import { ProtectedContext } from '@/server/trpc/trpc';

export async function getUsers(ctx: ProtectedContext, disabled?: boolean, limit?: number, offset?: number) {
	let query = db
		.selectFrom('users')
		.selectAll()
		.where((eb) =>
			eb.and([eb('disabled', '=', Boolean(disabled)), eb('client_id', '=', ctx.session.user.client_id)])
		)
		.orderBy(['last', 'first']);
	if (limit != null && offset != null) {
		query = query.limit(limit).offset(offset);
	}
	return await query.execute();
}

export async function getUserCount(ctx: ProtectedContext, disabled?: boolean) {
	let query = db
		.selectFrom('users')
		.select(({ fn }) => fn.countAll().as('count'))
		.where((eb) =>
			eb.and([eb('disabled', '=', Boolean(disabled)), eb('client_id', '=', ctx.session.user.client_id)])
		);
	const count = await query.executeTakeFirst();
	return parseInt(count?.count?.toString() ?? '0');
}

export async function getUser(ctx: ProtectedContext, id: number) {
	return await db
		.selectFrom('users')
		.selectAll()
		.where((eb) => eb.and([eb('id', '=', id), eb('client_id', '=', ctx.session.user.client_id)]))
		.executeTakeFirst();
}

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
	const [user] = await db
		.insertInto('users')
		.values(users.map((u) => ({ ...u, role: config.ROLES.CONTRIBUTOR, client_id: ctx.session.user.client_id })))
		.returningAll()
		.execute();
	return user;
}

export async function updateUser(
	ctx: ProtectedContext,
	id: number,
	params: Partial<{
		name: string;
		email: string;
		password_hash: string;
		phone?: string;
		role?: string;
		disabled?: boolean;
	}>
) {
	const [user] = await db.updateTable('users').set(params).where('id', '=', id).returningAll().execute();
	return user;
}

export async function deleteUser(ctx: ProtectedContext, id: number) {
	await db.deleteFrom('users').where('id', '=', id).execute();
}
