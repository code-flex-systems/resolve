import type { ProtectedContext } from '@/server/trpc/trpc';
import { sql } from 'kysely';
import { getDeskLocationQueueDepth } from './workflowAnalyticsQueries';

/**
 * Get overview dashboard counts: SLA breaches, warnings, pending suggestions, and pending approvals.
 */
export async function getOverviewCounts(ctx: ProtectedContext) {
	const clientId = ctx.session.user.client_id!;

	const [queueDepth, pendingSuggestions, pendingApprovals] = await Promise.all([
		getDeskLocationQueueDepth(ctx),

		ctx.db
			.selectFrom('workflow_suggestion')
			.select(sql<string>`count(*)`.as('count'))
			.where('status', '=', 'pending')
			.where('client_id', '=', clientId)
			.executeTakeFirstOrThrow(),

		ctx.db
			.selectFrom('workflow_rule_execution')
			.select(sql<string>`count(*)`.as('count'))
			.where('status', '=', 'pending')
			.where('execution_mode', '=', 'suggest')
			.where('client_id', '=', clientId)
			.executeTakeFirstOrThrow(),
	]);

	// Sum breach/warning counts across all desk locations
	let slaBreaches = 0;
	let slaWarnings = 0;
	for (const row of queueDepth.rows) {
		slaBreaches += row.breached ?? 0;
		slaWarnings += row.warning ?? 0;
	}

	return {
		slaBreaches,
		slaWarnings,
		pendingSuggestions: parseInt(pendingSuggestions.count),
		pendingApprovals: parseInt(pendingApprovals.count),
	};
}
