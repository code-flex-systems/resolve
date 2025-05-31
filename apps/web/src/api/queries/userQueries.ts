import { db } from '@/api/database/kysely';

export async function getUsers(disabled?: boolean, limit?: number, offset?: number) {
	let query = db.selectFrom('users').selectAll().where('disabled', '=', Boolean(disabled)).orderBy(['last', 'first']);
	if (limit != null && offset != null) {
		query = query.limit(limit).offset(offset);
	}
	return await query.execute();
}

export async function getUserCount(disabled?: boolean, limit?: number, offset?: number) {
	let query = db
		.selectFrom('users')
		.select(({ fn }) => fn.countAll().as('count'))
		.where('disabled', '=', Boolean(disabled));
	if (limit != null && offset != null) {
		query = query.limit(limit).offset(offset);
	}
	const count = await query.executeTakeFirst();
	return parseInt(count?.count?.toString() ?? '0');
}

export async function getUser(id: number) {
	return await db.selectFrom('users').selectAll().where('id', '=', id).executeTakeFirst();
}

export async function createUser(params: {
	first: string;
	last: string;
	email: string;
	password_hash: string;
	phone?: string;
	role?: string;
}) {
	const [user] = await db.insertInto('users').values(params).returningAll().execute();
	return user;
}

export async function updateUser(
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

export async function deleteUser(id: number) {
	await db.deleteFrom('users').where('id', '=', id).execute();
}
