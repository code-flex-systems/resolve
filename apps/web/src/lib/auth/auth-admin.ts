import { getSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Auth Admin Service
 *
 * Provides functions for managing users via the Supabase Auth admin API.
 * Roles and client membership live in our local users table (source of
 * truth) - Supabase only handles identity (email/password, bans, invites).
 */

// Effectively-permanent ban duration (100 years)
const PERMANENT_BAN = '876000h';

/**
 * Sends an invitation email to a new user.
 * Returns the Supabase auth user ID for linking to our local users row.
 * The invite email contains a link that lands the user on the
 * set-password page (via /auth/confirm).
 */
export async function inviteAuthUser(email: string): Promise<string> {
	const supabase = getSupabaseAdminClient();

	const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
		redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/set-password`,
	});

	if (error) {
		throw new Error(`Failed to invite user ${email}: ${error.message}`);
	}

	return data.user.id;
}

/**
 * Updates a user's email address in Supabase auth.
 * The new address is set directly (no confirmation email).
 */
export async function updateAuthUserEmail(authUserId: string, email: string): Promise<void> {
	const supabase = getSupabaseAdminClient();

	const { error } = await supabase.auth.admin.updateUserById(authUserId, {
		email,
		email_confirm: true,
	});

	if (error) {
		throw new Error(`Failed to update auth user email: ${error.message}`);
	}
}

/**
 * Disables a user (bans them from signing in)
 */
export async function disableAuthUser(authUserId: string): Promise<void> {
	const supabase = getSupabaseAdminClient();

	const { error } = await supabase.auth.admin.updateUserById(authUserId, {
		ban_duration: PERMANENT_BAN,
	});

	if (error) {
		throw new Error(`Failed to disable auth user: ${error.message}`);
	}
}

/**
 * Re-enables a user (lifts the ban)
 */
export async function enableAuthUser(authUserId: string): Promise<void> {
	const supabase = getSupabaseAdminClient();

	const { error } = await supabase.auth.admin.updateUserById(authUserId, {
		ban_duration: 'none',
	});

	if (error) {
		throw new Error(`Failed to enable auth user: ${error.message}`);
	}
}

/**
 * Permanently deletes a user from Supabase auth
 */
export async function deleteAuthUser(authUserId: string): Promise<void> {
	const supabase = getSupabaseAdminClient();

	const { error } = await supabase.auth.admin.deleteUser(authUserId);

	if (error) {
		throw new Error(`Failed to delete auth user: ${error.message}`);
	}
}
