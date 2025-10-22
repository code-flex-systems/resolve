import * as userQueries from '@/api/queries/userQueries';
import { hashAllPasswords, hashPasswordIfPresent } from '../utils/hasherUtils';
import { ProtectedContext } from '@/server/trpc/trpc';
import { enqueueLog } from '@/lib/logs/logQueue';
import { safeLog } from '@/lib/logs/safeLog';
import { logAuthEvent } from '@/lib/logs/logAuthEvents';
import { AuthEventType } from '@/config/enums';
import { generateStrongPassword } from '@/lib/auth/generateStrongPassword';
import { sendEmail } from '@/lib/email/sendEmail';
import { readFileSync } from 'fs';
import path from 'path';
import config from '@/config/config';
import { DateRangeStrict } from '@/types/types';

export async function getUsers(ctx: ProtectedContext, { searchTerm }: { searchTerm?: string }) {
	const results = await userQueries.getUsers(ctx, searchTerm);
	return results;
}

export async function getInactiveUserCount(ctx: ProtectedContext) {
	const results = await userQueries.getInactiveUserCount(ctx);
	return results;
}

/**
 * List users with optional pagination.
 *
 * @param ctx - request context
 * @param input - filters and paging controls
 */
export async function getUsersPaginated(
	ctx: ProtectedContext,
	{
		disabled,
		inactive,
		limit,
		offset,
		searchTerm,
	}: { disabled?: boolean; inactive?: boolean; limit?: number; offset?: number; searchTerm?: string }
) {
	const [rows, count] = await Promise.all([
		userQueries.getUsersPaginated(ctx, disabled, inactive, limit, offset, searchTerm),
		userQueries.getUserCount(ctx, disabled, inactive, searchTerm),
	]);
	return { rows, count };
}

export async function getUserActivity(
	ctx: ProtectedContext,
	{
		filters,
	}: {
		filters: {
			range: DateRangeStrict;
			checklistId?: number;
			claimId?: number;
			users?: string[];
			searchTerm?: string;
		};
	}
) {
	return await userQueries.getUserActivity(ctx, filters);
}

export async function getUserActivityDetail(ctx: ProtectedContext, { date }: { date: string }) {
	return await userQueries.getUserActivityDetail(ctx, date);
}

/**
 * Count active/inactive users with client ID.
 *
 * @param ctx - request context
 * @param input - client ID
 */
export async function getUserCount(ctx: ProtectedContext, { clientId }: { clientId: string }) {
	return await userQueries.getUserCountMetrics(ctx, clientId);
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
				html: getOnboardingTemplate()
					.replace('{{AppName}}', config.APP_NAME)
					.replace('{{userEmail}}', user.email)
					.replace('{{defaultPassword}}', user.password)
					.replace('{{loginLink}}', `${process.env.BASE_URL}/login`),
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
			first: string;
			last: string;
			email: string;
			phone?: string;
			role?: string;
			disabled?: boolean;
		}>;
	}
) {
	const updatedUser = await userQueries.updateUser(ctx, id, params);
	if (params.disabled != null) {
		await sendEmail({
			to: updatedUser.email,
			subject: params.disabled ? 'Account Deactivation' : 'Account Reactivation',
			html: getAccountActivationTemplate(params.disabled ? 'deactivation' : 'reactivation', updatedUser.email),
		});
	}
	return updatedUser;
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

// private methods

export function getOnboardingTemplate(): string {
	const filePath = path.join(process.cwd(), 'src/api/email-templates', 'onboarding-template.html');
	return readFileSync(filePath, 'utf-8');
}

export function getAccountActivationTemplate(type: 'deactivation' | 'reactivation', email: string): string {
	const filePath = path.join(process.cwd(), 'src/api/email-templates', `account-${type}-template.html`);
	const template = readFileSync(filePath, 'utf-8');
	return template
		.replace('{{AppName}}', config.APP_NAME)
		.replace('{{userEmail}}', email)
		.replace('{{loginLink}}', `${process.env.BASE_URL}/login`);
}
