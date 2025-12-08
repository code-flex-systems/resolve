import { Kysely } from 'kysely';
import { DB } from '@/api/database/types';

/**
 * Look up a client by their Clerk organization ID.
 * Used by webhooks to map Clerk orgs to internal client IDs.
 *
 * @param db - database instance
 * @param clerkOrgId - Clerk organization ID
 * @returns client record or undefined
 */
export async function getClientByClerkOrgId(db: Kysely<DB>, clerkOrgId: string) {
	return await db
		.selectFrom('client')
		.selectAll()
		.where('clerk_org_id', '=', clerkOrgId)
		.executeTakeFirst();
}
