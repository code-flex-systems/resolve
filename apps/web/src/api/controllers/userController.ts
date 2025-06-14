import * as userQueries from '@/api/queries/userQueries';
import { hashAllPasswords } from '../utils/hasherUtils';
import { ProtectedContext } from '@/server/trpc/trpc';

export async function getUsers(
	ctx: ProtectedContext,
	{ disabled, limit, offset }: { disabled?: boolean; limit?: number; offset?: number }
) {
	const [rows, count] = await Promise.all([
		userQueries.getUsers(ctx, disabled, limit, offset),
		userQueries.getUserCount(ctx, disabled),
	]);
	return { rows, count };
}

export async function getUser(ctx: ProtectedContext, { id }: { id: number }) {
	return await userQueries.getUser(ctx, id);
}

export async function createUsers(
	ctx: ProtectedContext,
	{
		users,
	}: {
		users: {
			first: string;
			last: string;
			email: string;
			password: string;
			phone?: string;
		}[];
	}
) {
	const hashedUsers = await hashAllPasswords(users);
	return await userQueries.createUsers(ctx, hashedUsers);
}

export async function updateUser(
	ctx: ProtectedContext,
	{
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
	}
) {
	return await userQueries.updateUser(ctx, id, params);
}

export async function deleteUser(ctx: ProtectedContext, { id }: { id: number }) {
	await userQueries.deleteUser(ctx, id);
}
