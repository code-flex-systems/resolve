import * as deskController from '@/api/controllers/deskController';
import { requireRole } from '@/lib/auth/requireRole';
import config from '@/config/config';
import { protectedProcedure, router } from '../trpc';
import {
	getDeskLocationTypesInput,
	getDeskLocationTypeInput,
	createDeskLocationTypeInput,
	updateDeskLocationTypeInput,
	deleteDeskLocationTypeInput,
	getDeskLocationsInput,
	getDeskLocationInput,
	createDeskLocationInput,
	updateDeskLocationInput,
	deleteDeskLocationInput,
	getUserDeskLocationsInput,
	getDeskLocationUsersInput,
	assignUserToDeskLocationInput,
	bulkAssignUsersToDeskLocationInput,
	updateUserDeskLocationPriorityInput,
	removeUserFromDeskLocationInput,
	updateUserDeskLocationPrioritiesInput,
	updateUsersDeskAssignmentsInput,
} from '@/schemas/deskSchemas';

export const deskRouter = router({
	// ========================================================================
	// DESK LOCATION TYPE CRUD OPERATIONS
	// ========================================================================

	/**
	 * Get paginated list of desk location types (Admin only)
	 */
	getDeskLocationTypes: protectedProcedure
		.input(getDeskLocationTypesInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return deskController.getDeskLocationTypes(ctx, input);
		}),

	/**
	 * Get single desk location type by ID (Admin only)
	 */
	getDeskLocationType: protectedProcedure
		.input(getDeskLocationTypeInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return deskController.getDeskLocationType(ctx, input);
		}),

	/**
	 * Create desk location type (Admin only)
	 * Optionally creates default desk locations
	 */
	createDeskLocationType: protectedProcedure
		.input(createDeskLocationTypeInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return deskController.createDeskLocationType(ctx, input);
		}),

	/**
	 * Update desk location type (Admin only)
	 */
	updateDeskLocationType: protectedProcedure
		.input(updateDeskLocationTypeInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return deskController.updateDeskLocationType(ctx, input);
		}),

	/**
	 * Archive desk location type (Admin only)
	 * Soft deletes the type - prevents archival if type has active locations
	 */
	archiveDeskLocationType: protectedProcedure
		.input(deleteDeskLocationTypeInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return deskController.archiveDeskLocationType(ctx, input);
		}),

	/**
	 * Restore archived desk location type (Admin only)
	 */
	restoreDeskLocationType: protectedProcedure
		.input(deleteDeskLocationTypeInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return deskController.restoreDeskLocationType(ctx, input);
		}),

	// ========================================================================
	// DESK LOCATION CRUD OPERATIONS
	// ========================================================================

	/**
	 * Get paginated list of desk locations (Admin only)
	 * Can filter by desk location type
	 */
	getDeskLocations: protectedProcedure
		.input(getDeskLocationsInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return deskController.getDeskLocations(ctx, input);
		}),

	/**
	 * Get single desk location by ID (Admin only)
	 */
	getDeskLocation: protectedProcedure
		.input(getDeskLocationInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return deskController.getDeskLocation(ctx, input);
		}),

	/**
	 * Create desk location (Admin only)
	 */
	createDeskLocation: protectedProcedure
		.input(createDeskLocationInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return deskController.createDeskLocation(ctx, input);
		}),

	/**
	 * Update desk location (Admin only)
	 */
	updateDeskLocation: protectedProcedure
		.input(updateDeskLocationInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return deskController.updateDeskLocation(ctx, input);
		}),

	/**
	 * Archive desk location (Admin only)
	 * Soft deletes the location - prevents archival if location has assigned claims
	 */
	archiveDeskLocation: protectedProcedure
		.input(deleteDeskLocationInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return deskController.archiveDeskLocation(ctx, input);
		}),

	/**
	 * Restore archived desk location (Admin only)
	 */
	restoreDeskLocation: protectedProcedure
		.input(deleteDeskLocationInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return deskController.restoreDeskLocation(ctx, input);
		}),

	// ========================================================================
	// USER DESK LOCATION ASSIGNMENT OPERATIONS (Phase 2)
	// ========================================================================

	/**
	 * Get desk location assignments for a specific user (Admin only)
	 */
	getUserDeskLocations: protectedProcedure
		.input(getUserDeskLocationsInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return deskController.getUserDeskLocations(ctx, input);
		}),

	/**
	 * Get users assigned to a specific desk location (Admin only)
	 */
	getDeskLocationUsers: protectedProcedure
		.input(getDeskLocationUsersInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return deskController.getDeskLocationUsers(ctx, input);
		}),

	/**
	 * Assign user to desk location with priority (Admin only)
	 */
	assignUserToDeskLocation: protectedProcedure
		.input(assignUserToDeskLocationInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return deskController.assignUserToDeskLocation(ctx, input);
		}),

	/**
	 * Bulk assign multiple users to desk location with priority (Admin only)
	 * All-or-nothing transaction - if any assignment fails, none are applied
	 */
	bulkAssignUsersToDeskLocation: protectedProcedure
		.input(bulkAssignUsersToDeskLocationInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return deskController.bulkAssignUsersToDeskLocation(ctx, input);
		}),

	/**
	 * Update user desk location priority (Admin only)
	 */
	updateUserDeskLocationPriority: protectedProcedure
		.input(updateUserDeskLocationPriorityInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return deskController.updateUserDeskLocationPriority(ctx, input);
		}),

	/**
	 * Remove user from desk location (Admin only)
	 * Soft deletes the assignment
	 */
	removeUserFromDeskLocation: protectedProcedure
		.input(removeUserFromDeskLocationInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return deskController.removeUserFromDeskLocation(ctx, input);
		}),

	/**
	 * Bulk update user desk location priorities (Admin only)
	 * Used for managing all of a user's desk assignments at once
	 */
	updateUserDeskLocationPriorities: protectedProcedure
		.input(updateUserDeskLocationPrioritiesInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return deskController.updateUserDeskLocationPriorities(ctx, input);
		}),

	/**
	 * Get count of desk assignments for all users (Admin only)
	 * Returns a map of userId -> count
	 */
	getAllUserDeskAssignmentCounts: protectedProcedure.query(async ({ ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return deskController.getAllUserDeskAssignmentCounts(ctx);
	}),

	/**
	 * Update user desk assignments (unified endpoint, Admin only)
	 * Takes complete desired state for one or more users and applies changes atomically
	 * Handles individual and bulk updates efficiently (supports 1-50 users)
	 */
	updateUsersDeskAssignments: protectedProcedure
		.input(updateUsersDeskAssignmentsInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return deskController.updateUsersDeskAssignments(ctx, input);
		}),
});
