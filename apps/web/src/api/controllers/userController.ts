import * as userQueries from '@/api/queries/userQueries';
import { hashAllPasswords, hashPasswordIfPresent } from '../utils/hasherUtils';
import { ProtectedContext } from '@/server/trpc/trpc';
import { enqueueLog } from '@/lib/logs/logQueue';
import { safeLog } from '@/lib/logs/safeLog';
import { logAuthEvent } from '@/lib/logs/logAuthEvents';
import { AuthEventType } from '@/config/enums';
import { generateStrongPassword } from '@/lib/auth/generateStrongPassword';
import { sendEmail } from '@/lib/email/sendEmail';

/**
 * List users with optional pagination.
 *
 * @param ctx - request context
 * @param input - filters and paging controls
 */
export async function getUsers(
	ctx: ProtectedContext,
	{
		disabled,
		limit,
		offset,
		searchTerm,
	}: { disabled?: boolean; limit?: number; offset?: number; searchTerm?: string }
) {
	const [rows, count] = await Promise.all([
		userQueries.getUsers(ctx, disabled, limit, offset, searchTerm),
		userQueries.getUserCount(ctx, disabled, searchTerm),
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
			phone?: string;
		}[];
	}
) {
	const usersWithPasswords: {
		first: string;
		last: string;
		email: string;
		password: string;
		phone?: string;
	}[] = users.map((u) => ({ ...u, password: generateStrongPassword() }));
	const hashedUsers = await hashAllPasswords(usersWithPasswords);
	const createdUsers = await userQueries.createUsers(ctx, hashedUsers);

	await Promise.all(
		usersWithPasswords.map(async (user) => {
			sendEmail({
				to: user.email,
				subject: 'Welcome to Manifest!',
				html: `<p>Your password is <b>${user.password}</b>.</p>`,
			});
		})
	);

	createdUsers.forEach((u) => {
		enqueueLog(() =>
			safeLog(
				() =>
					logAuthEvent(ctx.session.user.id, AuthEventType.AccountCreated, {
						details: { createdId: u.id, createdEmail: u.email },
					}),
				'authLog'
			)
		);
	});
	return createdUsers;
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
			password: string;
			phone_number?: string;
			role?: string;
			disabled?: boolean;
			email_verified?: Date;
			phone_verified?: Date;
			onboarding_email_sent?: boolean;
			must_change_password?: boolean;
		}>;
	}
) {
	const hashedParams = params.password
		? await hashPasswordIfPresent({ ...params, password: params.password })
		: params;
	return await userQueries.updateUser(ctx, id, hashedParams);
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
