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
});
