import * as referenceDataController from '@/api/controllers/referenceDataController';
import { requireRole } from '@/lib/auth/requireRole';
import config from '@/config/config';
import { protectedProcedure, router } from '../trpc';
import {
	getReferenceListsInput,
	getReferenceListInput,
	getReferenceOptionsInput,
	getReferenceOptionInput,
	createReferenceOptionInput,
	updateReferenceOptionInput,
	deleteReferenceOptionInput,
	restoreReferenceOptionInput,
} from '@/schemas/referenceDataSchemas';

export const referenceDataRouter = router({
	// ========================================================================
	// REFERENCE LIST READ OPERATIONS (All authenticated users)
	// ========================================================================

	/**
	 * Get all reference lists for the client
	 * Available to all authenticated users
	 */
	getReferenceLists: protectedProcedure.input(getReferenceListsInput).query(async ({ ctx }) => {
		return referenceDataController.getReferenceLists(ctx);
	}),

	/**
	 * Get single reference list by entity name
	 * Available to all authenticated users
	 */
	getReferenceList: protectedProcedure
		.input(getReferenceListInput)
		.query(async ({ input, ctx }) => {
			return referenceDataController.getReferenceList(ctx, input);
		}),

	// ========================================================================
	// REFERENCE OPTION READ OPERATIONS (All authenticated users)
	// ========================================================================

	/**
	 * Get options for a reference entity
	 * Available to all authenticated users (for select dropdowns)
	 * showInactive/showDeleted params only affect admins (regular users always see only active, non-deleted)
	 */
	getReferenceOptions: protectedProcedure
		.input(getReferenceOptionsInput)
		.query(async ({ input, ctx }) => {
			// Regular users can only see active, non-deleted options
			const isAdmin =
				ctx.session.user.role === config.ROLES.ADMIN ||
				ctx.session.user.role === config.ROLES.SUPER_ADMIN;
			const showInactive = isAdmin ? input.showInactive : false;
			const showDeleted = isAdmin ? input.showDeleted : false;
			return referenceDataController.getReferenceOptions(ctx, {
				entity: input.entity,
				showInactive,
				showDeleted,
			});
		}),

	/**
	 * Get single reference option by entity and value
	 * Available to all authenticated users
	 * includeDeactivated allows looking up options that have been soft-deleted (for display purposes)
	 */
	getReferenceOption: protectedProcedure
		.input(getReferenceOptionInput)
		.query(async ({ input, ctx }) => {
			return referenceDataController.getReferenceOption(ctx, {
				entity: input.entity,
				value: input.value,
				includeDeactivated: input.includeDeactivated,
			});
		}),

	// ========================================================================
	// REFERENCE OPTION MUTATION OPERATIONS (Admin only)
	// ========================================================================

	/**
	 * Create new reference option (Admin only)
	 */
	createReferenceOption: protectedProcedure
		.input(createReferenceOptionInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return referenceDataController.createReferenceOption(ctx, input);
		}),

	/**
	 * Update reference option (Admin only)
	 */
	updateReferenceOption: protectedProcedure
		.input(updateReferenceOptionInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return referenceDataController.updateReferenceOption(ctx, input);
		}),

	/**
	 * Delete reference option (Admin only)
	 * Soft deletes the option - prevents deletion of system defaults
	 */
	deleteReferenceOption: protectedProcedure
		.input(deleteReferenceOptionInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return referenceDataController.deleteReferenceOption(ctx, input);
		}),

	/**
	 * Restore deleted reference option (Admin only)
	 */
	restoreReferenceOption: protectedProcedure
		.input(restoreReferenceOptionInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return referenceDataController.restoreReferenceOption(ctx, input);
		}),
});
