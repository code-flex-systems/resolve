import { db } from '@/api/database/kysely';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Session shape that matches our existing application expectations
 * This provides compatibility with existing code that uses session.user.*
 */
export interface AppSession {
	user: {
		id: string; // Internal UUID from users table
		authUserId: string; // Supabase auth user ID (for auth admin API calls)
		name: string | null;
		email: string | null;
		phone: string | null;
		role: string | null;
		client_id: string | null;
	};
}

/**
 * Look up internal user by Supabase auth user ID
 */
async function getUserByAuthUserId(authUserId: string) {
	return await db
		.selectFrom('users')
		.select(['id', 'first', 'last', 'email', 'phone', 'role', 'client_id', 'disabled'])
		.where('auth_user_id', '=', authUserId)
		.executeTakeFirst();
}

/**
 * Look up internal user by email and link the Supabase auth user ID.
 * Handles first sign-in after an invite (the local row is created at
 * invite time, before the auth user has signed in) and any rows that
 * predate the Supabase migration.
 */
async function linkUserByEmail(email: string, authUserId: string) {
	return await db
		.updateTable('users')
		.set({ auth_user_id: authUserId, last_login: new Date() })
		.where('email', '=', email)
		.where('auth_user_id', 'is', null)
		.returning(['id', 'first', 'last', 'email', 'phone', 'role', 'client_id', 'disabled'])
		.executeTakeFirst();
}

/**
 * Server-side function to get the current session.
 * Reads the Supabase auth user from cookies, then loads role/client_id
 * from the local users table (the source of truth for authorization).
 *
 * Usage:
 * const session = await getSession();
 * if (!session) { ... handle unauthenticated ... }
 * const { id, name, email, role, client_id } = session.user;
 */
export async function getSession(): Promise<AppSession | null> {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user: authUser },
	} = await supabase.auth.getUser();

	if (!authUser) {
		return null;
	}

	// Local users table is the source of truth for role and client_id.
	// This is an invite-only application - rows are created at invite time,
	// so an auth user without a local row gets no session.
	let internalUser = await getUserByAuthUserId(authUser.id);

	if (!internalUser && authUser.email) {
		internalUser = await linkUserByEmail(authUser.email, authUser.id);
	}

	if (!internalUser) {
		console.error('No internal user found for auth user:', authUser.id, authUser.email);
		return null;
	}

	// Disabled users are banned in Supabase auth as well; this is defense in depth
	if (internalUser.disabled) {
		return null;
	}

	const name = [internalUser.first, internalUser.last].filter(Boolean).join(' ') || null;

	return {
		user: {
			id: internalUser.id,
			authUserId: authUser.id,
			name,
			email: internalUser.email,
			phone: internalUser.phone,
			role: internalUser.role,
			client_id: internalUser.client_id,
		},
	};
}
