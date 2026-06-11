import * as userQueries from '@/api/queries/userQueries';
import { ProtectedContext } from '@/server/trpc/trpc';
import { enqueueLog } from '@/lib/logs/logQueue';
import { safeLog } from '@/lib/logs/safeLog';
import { logAuthEvent } from '@/lib/logs/logAuthEvents';
import { AuthEventType } from '@/config/enums';
import { readFileSync } from 'fs';
import path from 'path';
import config from '@/config/config';
import { DateRangeStrict } from '@/types/types';
import { logAdminAction, logAdminActions, AdminAction } from '@/api/utils/adminActionLogger';
import { EntityName } from '@/api/utils/activityLogger';
import {
	inviteAuthUser,
	updateAuthUserEmail,
	disableAuthUser,
	enableAuthUser,
	deleteAuthUser,
} from '@/lib/auth/auth-admin';

export async function getUsers(
	ctx: ProtectedContext,
	{ searchTerm, role }: { searchTerm?: string; role?: string }
) {
	const results = await userQueries.getUsers(ctx, searchTerm, role);
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
	}: {
		disabled?: boolean;
		inactive?: boolean;
		limit?: number;
		offset?: number;
		searchTerm?: string;
	}
) {
	const [rows, count] = await Promise.all([
		userQueries.getUsersPaginated(ctx, disabled, inactive, limit, offset, searchTerm),
		userQueries.getUserCount(ctx, disabled, inactive, searchTerm),
	]);
	return { rows, count };
}

/**
 * List users with desk assignment counts and optional filters.
 * Used for the User Desk Assignments tab.
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
	return await userQueries.getUsersWithDeskAssignments(ctx, {
		limit,
		offset,
		searchTerm,
		deskLocationTypeId,
		deskLocationId,
	});
}

export async function getUserActivity(
	ctx: ProtectedContext,
	{
		filters,
	}: {
		filters: {
			range: DateRangeStrict;
			users?: string[];
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
 * Invite users via Supabase auth.
 * Sends invitation emails and creates the local user row immediately,
 * linked to the new auth user. Role and client_id live on the local row.
 *
 * @param ctx - request context
 * @param input - array of user objects with email and optional role
 */
export async function createUsers(
	ctx: ProtectedContext,
	{
		users,
	}: {
		users: {
			email: string;
			role?: string;
		}[];
	}
) {
	const clientId = ctx.session.user.client_id;
	if (!clientId) {
		throw new Error('Client ID not found in session');
	}

	const invitedUsers: { email: string; role: string }[] = [];

	for (const user of users) {
		const role = user.role || config.ROLES.CONTRIBUTOR;

		// Send invitation email via Supabase auth, then create the local
		// user row linked to the new auth user
		const authUserId = await inviteAuthUser(user.email);
		await userQueries.createInvitedUser(ctx.db, {
			email: user.email,
			role,
			client_id: clientId,
			auth_user_id: authUserId,
		});

		invitedUsers.push({
			email: user.email,
			role,
		});
	}

	// Log admin actions for invitations
	await logAdminActions(
		ctx,
		invitedUsers.map((u) => ({
			entityId: u.email, // Use email as identifier since user doesn't exist yet
			entityName: EntityName.USER,
			action: AdminAction.CREATE,
			value: { email: u.email, role: u.role, status: 'invited' },
		}))
	);

	invitedUsers.forEach((u) => {
		enqueueLog(() =>
			safeLog(
				() =>
					logAuthEvent(ctx.session.user.id, AuthEventType.AccountCreated, {
						details: { invitedEmail: u.email, status: 'invitation_sent' },
					}),
				'authLog'
			)
		);
	});

	// Return invited users info (they don't have IDs yet until they accept)
	return invitedUsers.map((u) => ({
		id: null,
		email: u.email,
		role: u.role,
		status: 'invited',
	}));
}

/**
 * Update a user account.
 * Syncs identity changes (email, disabled status) to Supabase auth and
 * updates the local DB. Name, phone, and role live only in the local DB.
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
	// Sync identity changes to Supabase auth (if not a placeholder user)
	if (!id.startsWith('pending_')) {
		const user = await userQueries.getUser(ctx, id);
		if (!user) {
			throw new Error('User not found');
		}

		if (!user.auth_user_id) {
			console.warn(`No auth user linked for ${user.email}, skipping auth sync`);
		} else {
			// Email is the sign-in identifier - keep Supabase auth in sync
			if (params.email !== undefined && params.email !== user.email) {
				await updateAuthUserEmail(user.auth_user_id, params.email);
			}

			// Handle disable/enable via Supabase ban/unban
			if (params.disabled !== undefined) {
				if (params.disabled) {
					await disableAuthUser(user.auth_user_id);
				} else {
					await enableAuthUser(user.auth_user_id);
				}
			}
		}
	}

	// Update local DB and log admin action
	const updatedUser = await ctx.db.transaction().execute(async (trx) => {
		const updated = await userQueries.updateUser({ ...ctx, db: trx }, id, params);

		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: id,
				entityName: EntityName.USER,
				action: AdminAction.UPDATE,
				value: params,
			}
		);

		return updated;
	});

	return updatedUser;
}

/**
 * Remove a user account.
 * Deletes from Supabase auth first, then local DB.
 *
 * @param ctx - request context
 * @param input - user id
 */
export async function deleteUser(ctx: ProtectedContext, { id }: { id: string }) {
	// Delete user from local DB and log admin action
	await ctx.db.transaction().execute(async (trx) => {
		// Fetch user data BEFORE deletion for logging and auth user lookup
		const user = await userQueries.getUser({ ...ctx, db: trx }, id);

		if (!user) {
			throw new Error('User not found');
		}

		// Delete from Supabase auth first (if linked)
		if (!id.startsWith('pending_')) {
			if (user.auth_user_id) {
				await deleteAuthUser(user.auth_user_id);
			} else {
				console.warn(`No auth user linked for ${user.email}, skipping auth deletion`);
			}
		}

		// Delete the user from local DB
		await userQueries.deleteUser({ ...ctx, db: trx }, id);

		// Log admin action for user deletion
		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: id,
				entityName: EntityName.USER,
				action: AdminAction.DELETE,
				value: { email: user.email, first: user.first, last: user.last },
			}
		);
	});
}

// private methods

export function getOnboardingTemplate(): string {
	const filePath = path.join(process.cwd(), 'src/api/email-templates', 'onboarding-template.html');
	return readFileSync(filePath, 'utf-8');
}

export async function getManagementStats(ctx: ProtectedContext) {
	return userQueries.getUserManagementStats(ctx);
}

export function getAccountActivationTemplate(
	type: 'deactivation' | 'reactivation',
	email: string
): string {
	const filePath = path.join(
		process.cwd(),
		'src/api/email-templates',
		`account-${type}-template.html`
	);
	const template = readFileSync(filePath, 'utf-8');
	return template
		.replace('{{AppName}}', config.APP_NAME)
		.replace('{{userEmail}}', email)
		.replace('{{loginLink}}', `${process.env.BASE_URL}/login`);
}
