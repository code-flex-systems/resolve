import * as userQueries from '@/api/queries/userQueries';
import { hashAllPasswords } from '../utils/hasherUtils';

export async function getUsers({ disabled, limit, offset }: { disabled?: boolean; limit?: number; offset?: number }) {
	const [rows, count] = await Promise.all([
		userQueries.getUsers(disabled, limit, offset),
		userQueries.getUserCount(disabled, limit, offset),
	]);
	return { rows, count };
}

export async function getUser({ id }: { id: number }) {
	return await userQueries.getUser(id);
}

export async function createUsers({
	users,
}: {
	users: {
		first: string;
		last: string;
		email: string;
		password: string;
		phone?: string;
		role?: string;
	}[];
}) {
	const hashedUsers = await hashAllPasswords(users);
	return await userQueries.createUsers(hashedUsers);
}

export async function updateUser({
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

export async function deleteUser({ id }: { id: number }) {
	await userQueries.deleteUser(id);
}
