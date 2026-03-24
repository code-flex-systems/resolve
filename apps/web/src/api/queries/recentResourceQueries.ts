import type { ProtectedContext } from '@/server/trpc/trpc';
import { sql } from 'kysely';

/**
 * Upsert a recent resource visit for the current user.
 * If the user has already visited this resource, update the visited_at timestamp.
 */
export async function trackResourceVisit(
	ctx: ProtectedContext,
	input: {
		resource_type: string;
		resource_id: string;
		resource_label?: string | null;
		resource_url: string;
	}
) {
	const userId = ctx.session.user.id;
	const clientId = ctx.session.user.client_id!;

	return await ctx.db
		.insertInto('user_recent_resource')
		.values({
			user_id: userId,
			client_id: clientId,
			resource_type: input.resource_type,
			resource_id: input.resource_id,
			resource_label: input.resource_label ?? null,
			resource_url: input.resource_url,
		})
		.onConflict((oc) =>
			oc.columns(['user_id', 'resource_type', 'resource_id']).doUpdateSet({
				visited_at: sql`now()`,
				resource_label: input.resource_label ?? null,
				resource_url: input.resource_url,
			})
		)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Get the most recently visited resources for the current user.
 */
export async function getRecentResources(ctx: ProtectedContext, limit: number) {
	const userId = ctx.session.user.id;

	return await ctx.db
		.selectFrom('user_recent_resource')
		.selectAll()
		.where('user_id', '=', userId)
		.orderBy('visited_at', 'desc')
		.limit(limit)
		.execute();
}
