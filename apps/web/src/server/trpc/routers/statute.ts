import * as statuteController from '@/api/controllers/statuteController';
import { requireRole } from '@/lib/auth/requireRole';
import config from '@/config/config';
import { protectedProcedure, router } from '../trpc';
import {
	getStatuteRulesInput,
	getStatuteRuleInput,
	updateStatuteRuleInput,
	calculateStatuteLimitInput,
} from '@/schemas/statuteSchemas';

export const statuteRouter = router({
	// ========================================================================
	// READ OPERATIONS (All authenticated users)
	// ========================================================================

	/**
	 * Get all statute rules (54 jurisdictions).
	 * Available to all authenticated users for read-only display.
	 * This is a global table - not client-scoped.
	 */
	getStatuteRules: protectedProcedure.input(getStatuteRulesInput).query(async ({ ctx }) => {
		return statuteController.getStatuteRules(ctx);
	}),

	/**
	 * Get single statute rule by state code.
	 * Available to all authenticated users.
	 */
	getStatuteRule: protectedProcedure.input(getStatuteRuleInput).query(async ({ input, ctx }) => {
		return statuteController.getStatuteRule(ctx, input);
	}),

	/**
	 * Calculate applicable statute limit for a scenario.
	 * Used by claim workflows to determine statute dates.
	 * Available to all authenticated users.
	 */
	calculateStatuteLimit: protectedProcedure
		.input(calculateStatuteLimitInput)
		.query(async ({ input, ctx }) => {
			return statuteController.calculateStatuteLimit(ctx, input);
		}),

	// ========================================================================
	// MUTATION OPERATIONS (Admin only)
	// ========================================================================

	/**
	 * Update statute rule for a state (Admin only).
	 * Logs to admin_config_logs for audit trail.
	 */
	updateStatuteRule: protectedProcedure
		.input(updateStatuteRuleInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return statuteController.updateStatuteRule(ctx, input);
		}),
});
