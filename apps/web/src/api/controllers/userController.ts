import * as userQueries from '@/api/queries/userQueries';
import { hashAllPasswords } from '../utils/hasherUtils';
import { ProtectedContext } from '@/server/trpc/trpc';

/**
 * List users with optional pagination.
 *
 * @param ctx - request context
 * @param input - filters and paging controls
 */
/**
 * Retrieve a single user.
 *
 * @param ctx - request context
 * @param input - user id
 */
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

/**
 * Retrieve a single user.
 *
 * @param ctx - request context
 * @param input - user id
 */
export async function getUser(ctx: ProtectedContext, { id }: { id: string }) {
	return await userQueries.getUser(ctx, id);
}

/**
 * Bulk create users with hashed passwords.
 *
 * @param ctx - request context
 * @param input - array of user objects
 */
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

/**
 * Update a user account.
 *
 * @param ctx - request context
 * @param input - user id and fields to modify
 */
export async function updateUser(
	ctx: ProtectedContext,
	{
		id,
		params,
	}: {
		id: string;
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

/**
 * Remove a user account.
 *
 * @param ctx - request context
 * @param input - user id
 */
export async function deleteUser(ctx: ProtectedContext, { id }: { id: string }) {
	await userQueries.deleteUser(ctx, id);
}
