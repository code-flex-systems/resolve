import * as userQueries from '@/api/queries/userQueries';

export async function getUsersController({
	disabled,
	limit,
	offset,
}: {
	disabled?: boolean;
	limit?: number;
	offset?: number;
}) {
	const [rows, count] = await Promise.all([
		userQueries.getUsers(disabled, limit, offset),
		userQueries.getUserCount(disabled, limit, offset),
	]);
	return { rows, count };
}

export async function getUserController({ id }: { id: number }) {
	return await userQueries.getUser(id);
}

export async function createUserController({
	first,
	last,
	email,
	password_hash,
	phone,
	role,
}: {
	first: string;
	last: string;
	email: string;
	password_hash: string;
	phone?: string;
	role?: string;
}) {
	return await userQueries.createUser({ first, last, email, password_hash, phone, role });
}

export async function updateUserController({
	id,
	params,
}: {
	id: number;
	params: Partial<{
		name: string;
		email: string;
		password_hash: string;
		phone_number?: string;
		role?: string;
		disabled?: boolean;
	}>;
}) {
	return await userQueries.updateUser(id, params);
}

export async function deleteUserController({ id }: { id: number }) {
	await userQueries.deleteUser(id);
}
