import { trpc } from '@/lib/trpc';
import type { RouterOutput } from '@/types/routerTypes';

type StatuteOutput = RouterOutput['statute'];

/**
 * Custom hook for statute rules tRPC operations
 * Provides convenience wrappers with automatic cache invalidation
 *
 * Statute rules are global (not client-scoped) since they represent
 * legal requirements that don't vary by client.
 */
export function useStatuteTrpc() {
	const utils = trpc.useUtils();

	return {
		// ====================================================================
		// READ OPERATIONS
		// ====================================================================

		/**
		 * Get all statute rules (54 jurisdictions)
		 * Returns all states with their configured rules
		 */
		list: trpc.statute.getStatuteRules.useQuery,

		/**
		 * Get single statute rule by state code
		 */
		get: trpc.statute.getStatuteRule.useQuery,

		/**
		 * Calculate statute limit for a scenario
		 * Used by claim workflows to determine statute dates
		 */
		calculate: trpc.statute.calculateStatuteLimit.useQuery,

		// ====================================================================
		// MUTATION OPERATIONS (Admin only)
		// ====================================================================

		/**
		 * Update statute rule for a state
		 * Invalidates list and specific state queries
		 */
		update: trpc.statute.updateStatuteRule.useMutation({
			onSuccess(data) {
				// Invalidate the list query
				utils.statute.getStatuteRules.invalidate();
				// Invalidate the specific state query
				utils.statute.getStatuteRule.invalidate({ stateCode: data.state_code });
				// Invalidate calculate queries since rules changed
				utils.statute.calculateStatuteLimit.invalidate();
			},
		}),

		// ====================================================================
		// UTILITY FUNCTIONS
		// ====================================================================

		/**
		 * Invalidate all statute caches
		 * Useful after bulk operations or when data sync is needed
		 */
		invalidateAll() {
			utils.statute.getStatuteRules.invalidate();
			utils.statute.getStatuteRule.invalidate();
			utils.statute.calculateStatuteLimit.invalidate();
		},
	};
}

/**
 * Export types for use in components
 * These are derived from the tRPC router output types
 */
export type StatuteRule = NonNullable<StatuteOutput['getStatuteRule']>;
export type StatuteRuleList = StatuteOutput['getStatuteRules'];
export type CalculatedStatuteLimit = StatuteOutput['calculateStatuteLimit'];
