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
	updateClerkUser,
	updateUserRole,
	disableClerkUser,
	enableClerkUser,
	deleteClerkUser,
	inviteUserToOrganization,
	getClerkUserIdByEmail,
} from '@/lib/clerk/clerk-admin';

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
 * Invite users to the organization via Clerk.
 * Sends invitation emails - users will be created in local DB via webhook
 * when they accept the invitation and complete signup.
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

	// Look up Clerk org ID from our client table
	const client = await ctx.db
		.selectFrom('client')
		.select('clerk_org_id')
		.where('id', '=', clientId)
		.executeTakeFirst();

	if (!client?.clerk_org_id) {
		throw new Error('Clerk organization ID not found for client');
	}

	const invitedUsers: { email: string; role: string }[] = [];

	for (const user of users) {
		const role = user.role || config.ROLES.CONTRIBUTOR;

		// Send invitation via Clerk (user will receive email to complete signup)
		// The local user record will be created by the webhook when they accept
		await inviteUserToOrganization(client.clerk_org_id, user.email, role);

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
 * Syncs profile changes to Clerk and updates local DB.
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
	const clientId = ctx.session.user.client_id;

	// Sync profile changes to Clerk (if not a placeholder user)
	if (!id.startsWith('pending_')) {
		// First, look up the user to get their email for Clerk API lookup
		const user = await userQueries.getUser(ctx, id);
		if (!user) {
			throw new Error('User not found');
		}

		// Get the Clerk user ID by email
		const clerkUserId = await getClerkUserIdByEmail(user.email);
		if (!clerkUserId) {
			console.warn(`No Clerk user found for email ${user.email}, skipping Clerk sync`);
		} else {
			// Update name/phone in Clerk
			if (params.first !== undefined || params.last !== undefined || params.phone !== undefined) {
				await updateClerkUser({
					userId: clerkUserId,
					firstName: params.first,
					lastName: params.last,
					phone: params.phone,
				});
			}

			// Update role in Clerk organization
			if (params.role !== undefined && clientId) {
				// Look up Clerk org ID from our client table
				const client = await ctx.db
					.selectFrom('client')
					.select('clerk_org_id')
					.where('id', '=', clientId)
					.executeTakeFirst();

				if (client?.clerk_org_id) {
					await updateUserRole({
						userId: clerkUserId,
						organizationId: client.clerk_org_id,
						role: params.role,
					});
				}
			}

			// Handle disable/enable via Clerk ban/unban
			if (params.disabled !== undefined) {
				if (params.disabled) {
					await disableClerkUser(clerkUserId);
				} else {
					await enableClerkUser(clerkUserId);
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
 * Deletes from Clerk first, then local DB.
 *
 * @param ctx - request context
 * @param input - user id
 */
export async function deleteUser(ctx: ProtectedContext, { id }: { id: string }) {
	// Delete user from local DB and log admin action
	await ctx.db.transaction().execute(async (trx) => {
		// Fetch user data BEFORE deletion for logging and Clerk lookup
		const user = await userQueries.getUser({ ...ctx, db: trx }, id);

		if (!user) {
			throw new Error('User not found');
		}

		// Delete from Clerk first (if not a placeholder user)
		if (!id.startsWith('pending_')) {
			const clerkUserId = await getClerkUserIdByEmail(user.email);
			if (clerkUserId) {
				await deleteClerkUser(clerkUserId);
			} else {
				console.warn(`No Clerk user found for email ${user.email}, skipping Clerk deletion`);
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
