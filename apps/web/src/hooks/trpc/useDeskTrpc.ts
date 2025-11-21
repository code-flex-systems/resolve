import { trpc } from '@/lib/trpc';
import type { RouterInput, RouterOutput } from '@/types/routerTypes';

type DeskInput = RouterInput['desk'];
type DeskOutput = RouterOutput['desk'];

/**
 * Custom hook for desk location hierarchy tRPC operations
 * Provides convenience wrappers with automatic cache invalidation
 *
 * Phase 1: Basic type and location management
 * Future phases will add user assignment operations
 */
export function useDeskTrpc() {
	const utils = trpc.useUtils();

	return {
		// ====================================================================
		// DESK LOCATION TYPE OPERATIONS
		// ====================================================================

		/**
		 * Get paginated list of desk location types
		 */
		listTypes: trpc.desk.getDeskLocationTypes.useQuery,

		/**
		 * Get single desk location type by ID
		 */
		getType: trpc.desk.getDeskLocationType.useQuery,

		/**
		 * Create desk location type
		 * Optionally creates default desk locations if createDefaultLocations is true
		 * Invalidates both type and location lists
		 */
		createType: trpc.desk.createDeskLocationType.useMutation({
			onSuccess() {
				utils.desk.getDeskLocationTypes.invalidate();
				utils.desk.getDeskLocations.invalidate();
			},
		}),

		/**
		 * Update desk location type
		 * Invalidates type lists and the specific type query
		 */
		updateType: trpc.desk.updateDeskLocationType.useMutation({
			onSuccess({ id }) {
				utils.desk.getDeskLocationTypes.invalidate();
				utils.desk.getDeskLocationType.invalidate({ id });
				utils.desk.getDeskLocations.invalidate();
			},
		}),

		/**
		 * Archive desk location type (soft delete)
		 * Prevents archival if type has active locations
		 * Invalidates type lists
		 */
		archiveType: trpc.desk.archiveDeskLocationType.useMutation({
			onSuccess() {
				utils.desk.getDeskLocationTypes.invalidate();
				utils.desk.getDeskLocations.invalidate();
			},
		}),

		/**
		 * Restore archived desk location type
		 * Invalidates type lists
		 */
		restoreType: trpc.desk.restoreDeskLocationType.useMutation({
			onSuccess() {
				utils.desk.getDeskLocationTypes.invalidate();
				utils.desk.getDeskLocations.invalidate();
			},
		}),

		// ====================================================================
		// DESK LOCATION OPERATIONS
		// ====================================================================

		/**
		 * Get paginated list of desk locations
		 * Can filter by desk location type ID
		 */
		listLocations: trpc.desk.getDeskLocations.useQuery,

		/**
		 * Get single desk location by ID
		 */
		getLocation: trpc.desk.getDeskLocation.useQuery,

		/**
		 * Create desk location within a desk location type
		 * Invalidates location lists and parent type query
		 */
		createLocation: trpc.desk.createDeskLocation.useMutation({
			onSuccess(data) {
				utils.desk.getDeskLocations.invalidate();
				utils.desk.getDeskLocationType.invalidate({
					id: data.desk_location_type_id,
				});
			},
		}),

		/**
		 * Update desk location
		 * Can update name, type association, or active status
		 * Invalidates location lists and specific location query
		 */
		updateLocation: trpc.desk.updateDeskLocation.useMutation({
			onSuccess({ id, desk_location_type_id }) {
				utils.desk.getDeskLocations.invalidate();
				utils.desk.getDeskLocation.invalidate({ id });
				utils.desk.getDeskLocationType.invalidate({
					id: desk_location_type_id,
				});
			},
		}),

		/**
		 * Archive desk location (soft delete)
		 * Prevents archival if location has assigned claims
		 * Invalidates location lists and parent type
		 */
		archiveLocation: trpc.desk.archiveDeskLocation.useMutation({
			onSuccess(data) {
				utils.desk.getDeskLocations.invalidate();
				utils.desk.getDeskLocationType.invalidate({
					id: data.desk_location_type_id,
				});
			},
		}),

		/**
		 * Restore archived desk location
		 * Invalidates location lists and parent type
		 */
		restoreLocation: trpc.desk.restoreDeskLocation.useMutation({
			onSuccess(data) {
				utils.desk.getDeskLocations.invalidate();
				utils.desk.getDeskLocationType.invalidate({
					id: data.desk_location_type_id,
				});
			},
		}),
	};
}

/**
 * Export types for use in components
 * These are derived from the tRPC router output types
 */
export type DeskLocationTypeWithLocations = NonNullable<
	DeskOutput['getDeskLocationType']
>;
export type DeskLocationWithType = NonNullable<
	DeskOutput['getDeskLocation']
>;
export type DeskLocationTypeList = DeskOutput['getDeskLocationTypes'];
export type DeskLocationList = DeskOutput['getDeskLocations'];
