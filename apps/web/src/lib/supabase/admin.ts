import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Singleton Supabase admin client using the service-role key.
 * Bypasses RLS - server-side only. Used for auth admin operations
 * (invites, bans, deletes) and storage operations.
 */
let adminClientInstance: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
	if (!adminClientInstance) {
		const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
		const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

		if (!url || !serviceRoleKey) {
			throw new Error(
				'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set'
			);
		}

		adminClientInstance = createClient(url, serviceRoleKey, {
			auth: {
				autoRefreshToken: false,
				persistSession: false,
			},
		});
	}
	return adminClientInstance;
}
