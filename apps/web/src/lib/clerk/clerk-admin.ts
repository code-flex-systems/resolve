import config from '@/config/config';
import { getClerkClient } from './clerk-utils';

/**
 * Clerk Admin Service
 *
 * Provides functions for managing users via Clerk Backend API.
 * This wraps the Clerk SDK to provide a clean interface for user management.
 */

/**
 * Maps app role to Clerk org role
 * App roles: Admin, Contributor
 * Clerk default roles: org:admin, org:member
 *
 * Note: Super Admin is handled separately via user metadata (publicMetadata.isSuperAdmin)
 * and is not an org-level role.
 */
function mapAppRoleToClerkRole(appRole: string): string {
	const roleMap: Record<string, string> = {
		[config.ROLES.SUPER_ADMIN]: 'org:admin', // Super admins get org:admin, plus metadata flag
		[config.ROLES.ADMIN]: 'org:admin',
		[config.ROLES.CONTRIBUTOR]: 'org:member',
	};

	return roleMap[appRole] || 'org:member';
}

/**
 * Looks up a Clerk user ID by email address.
 * Returns null if no user found with that email.
 */
export async function getClerkUserIdByEmail(email: string): Promise<string | null> {
	const client = getClerkClient();
	const users = await client.users.getUserList({
		emailAddress: [email],
		limit: 1,
	});

	if (users.data.length === 0) {
		return null;
	}

	return users.data[0].id;
}

interface UpdateClerkUserParams {
	userId: string;
	firstName?: string;
	lastName?: string;
	phone?: string;
}

/**
 * Updates a user's profile in Clerk
 */
export async function updateClerkUser(params: UpdateClerkUserParams): Promise<void> {
	const client = getClerkClient();

	const updateData: Record<string, unknown> = {};
	if (params.firstName !== undefined) updateData.firstName = params.firstName;
	if (params.lastName !== undefined) updateData.lastName = params.lastName;
	if (params.phone !== undefined) {
		updateData.primaryPhoneNumberId = params.phone || null;
	}

	if (Object.keys(updateData).length > 0) {
		await client.users.updateUser(params.userId, updateData);
	}
}

interface UpdateUserRoleParams {
	userId: string;
	organizationId: string;
	role: string;
}

/**
 * Updates a user's role in an organization
 * Also updates the isSuperAdmin metadata flag if changing to/from Super Admin
 */
export async function updateUserRole(params: UpdateUserRoleParams): Promise<void> {
	const client = getClerkClient();

	const isSuperAdmin = params.role === config.ROLES.SUPER_ADMIN;

	// Update org membership role
	await client.organizations.updateOrganizationMembership({
		organizationId: params.organizationId,
		userId: params.userId,
		role: mapAppRoleToClerkRole(params.role),
	});

	// Update super admin metadata
	await client.users.updateUser(params.userId, {
		publicMetadata: { isSuperAdmin },
	});
}

/**
 * Disables a user (bans them from signing in)
 */
export async function disableClerkUser(userId: string): Promise<void> {
	const client = getClerkClient();
	await client.users.banUser(userId);
}

/**
 * Re-enables a user (unbans them)
 */
export async function enableClerkUser(userId: string): Promise<void> {
	const client = getClerkClient();
	await client.users.unbanUser(userId);
}

/**
 * Permanently deletes a user from Clerk
 */
export async function deleteClerkUser(userId: string): Promise<void> {
	const client = getClerkClient();
	await client.users.deleteUser(userId);
}

/**
 * Sends an invitation email to join the organization
 *
 * Note: For Super Admin users, we set the org role to org:admin.
 * The isSuperAdmin metadata flag needs to be set after the user accepts
 * the invitation and their account is created (via webhook or manual update).
 */
export async function inviteUserToOrganization(
	organizationId: string,
	email: string,
	role: string
): Promise<void> {
	const client = getClerkClient();

	await client.organizations.createOrganizationInvitation({
		organizationId,
		emailAddress: email,
		role: mapAppRoleToClerkRole(role),
		redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/sign-up`,
	});
}
