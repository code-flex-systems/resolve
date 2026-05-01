import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/api/database/kysely';
import { getClientByClerkOrgId } from '@/api/queries/clientQueries';
import { mapClerkRoleToAppRole } from '@/lib/clerk/clerk-utils';

/**
 * Session shape that matches our existing application expectations
 * This provides compatibility with existing code that uses session.user.*
 */
export interface AppSession {
	user: {
		id: string; // Internal UUID from users table
		clerkId: string; // Clerk user ID (for Clerk API calls)
		name: string | null;
		email: string | null;
		phone: string | null;
		role: string | null;
		client_id: string | null;
	};
}

/**
 * Look up internal user by email address
 */
async function getUserByEmail(email: string) {
	return await db
		.selectFrom('users')
		.select(['id', 'first', 'last', 'phone', 'role', 'client_id'])
		.where('email', '=', email)
		.executeTakeFirst();
}

/**
 * Create a local user record for a Clerk user who doesn't exist yet.
 * This handles the case where user signs in before webhook has synced them.
 */
async function createUserFromClerk(params: {
	email: string;
	first: string;
	last: string;
	phone: string | null;
	role: string;
	client_id: string | null;
}) {
	// Use DO UPDATE SET with a no-op (setting email to itself) to make
	// RETURNING work for both insert and conflict cases
	return await db
		.insertInto('users')
		.values({
			email: params.email,
			first: params.first,
			last: params.last,
			phone: params.phone,
			role: params.role,
			client_id: params.client_id,
		})
		.onConflict((oc) =>
			oc.column('email').doUpdateSet({
				email: params.email, // no-op update to trigger RETURNING
			})
		)
		.returning(['id', 'first', 'last', 'phone', 'role', 'client_id'])
		.executeTakeFirst();
}

/**
 * Server-side function to get the current session
 * Returns session matching the existing shape for compatibility with TRPC context
 *
 * Usage:
 * const session = await getClerkSession();
 * if (!session) { ... handle unauthenticated ... }
 * const { id, name, email, role, client_id } = session.user;
 */
export async function getClerkSession(): Promise<AppSession | null> {
	const { userId, orgId, orgRole } = await auth();

	if (!userId) {
		return null;
	}

	// Get full user details from Clerk
	const clerkUser = await currentUser();
	if (!clerkUser) {
		return null;
	}

	// Primary email (required to look up internal user)
	const email =
		clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
		null;
	if (!email) {
		return null;
	}

	// Check for super admin via user metadata (cross-organization role)
	const isSuperAdmin = clerkUser.publicMetadata?.isSuperAdmin === true;

	// Derive role from Clerk org membership
	const clerkRole = mapClerkRoleToAppRole(orgRole ?? undefined, isSuperAdmin);

	// Look up internal client_id from Clerk org ID
	let client_id: string | null = null;
	if (orgId) {
		const client = await getClientByClerkOrgId(db, orgId);
		client_id = client?.id || null;
	}

	// Look up internal user by email to get UUID and other stored data
	let internalUser = await getUserByEmail(email);

	// If user doesn't exist in our DB, create them automatically
	// This handles the case where user signs in before webhook has synced them
	if (!internalUser) {
		const clerkPhone =
			clerkUser.phoneNumbers.find((p) => p.id === clerkUser.primaryPhoneNumberId)?.phoneNumber ||
			null;

		internalUser = await createUserFromClerk({
			email,
			first: clerkUser.firstName || '',
			last: clerkUser.lastName || '',
			phone: clerkPhone,
			role: clerkRole,
			client_id,
		});
	}

	// At this point internalUser should always exist
	if (!internalUser) {
		console.error('Failed to create or find internal user for email:', email);
		return null;
	}

	// Build full name from internal user data
	const name = [internalUser.first, internalUser.last].filter(Boolean).join(' ') || null;

	return {
		user: {
			id: internalUser.id,
			clerkId: userId,
			name,
			email,
			phone: internalUser.phone,
			role: internalUser.role || clerkRole,
			client_id: internalUser.client_id || client_id,
		},
	};
}
