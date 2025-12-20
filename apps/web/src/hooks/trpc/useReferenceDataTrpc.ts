import { trpc } from '@/lib/trpc';
import type { RouterInput, RouterOutput } from '@/types/routerTypes';
import type { ReferenceEntity } from '@/schemas/referenceDataSchemas';

type ReferenceDataInput = RouterInput['referenceData'];
type ReferenceDataOutput = RouterOutput['referenceData'];

/**
 * Custom hook for reference data management tRPC operations
 * Provides convenience wrappers with automatic cache invalidation
 *
 * Reference data is used for configurable business enums like:
 * - line_of_business, loss_type
 * - claim_substatus, claimant_party_role, adverse_party_role
 */
export function useReferenceDataTrpc() {
	const utils = trpc.useUtils();

	return {
		// ====================================================================
		// REFERENCE LIST OPERATIONS (Read-Only)
		// ====================================================================

		/**
		 * Get all reference lists (entity types)
		 * Returns list of configurable reference data entities
		 */
		lists: trpc.referenceData.getReferenceLists.useQuery,

		/**
		 * Get single reference list by entity name
		 */
		getList: trpc.referenceData.getReferenceList.useQuery,

		// ====================================================================
		// REFERENCE OPTION OPERATIONS
		// ====================================================================

		/**
		 * Get options for a reference entity
		 * This is the primary query used by select components
		 * Aggressively cached (options don't change often)
		 */
		options: trpc.referenceData.getReferenceOptions.useQuery,

		/**
		 * Get single option by entity and value
		 */
		getOption: trpc.referenceData.getReferenceOption.useQuery,

		/**
		 * Create new reference option
		 * Invalidates options list for the affected entity
		 */
		createOption: trpc.referenceData.createReferenceOption.useMutation({
			onSuccess(_data, variables) {
				utils.referenceData.getReferenceOptions.invalidate({
					entity: variables.entity,
				});
				utils.referenceData.getReferenceLists.invalidate();
			},
		}),

		/**
		 * Update reference option
		 * Invalidates options list for the affected entity
		 */
		updateOption: trpc.referenceData.updateReferenceOption.useMutation({
			onSuccess() {
				// Invalidate all options queries since we don't know the entity from the response
				utils.referenceData.getReferenceOptions.invalidate();
			},
		}),

		/**
		 * Delete reference option (soft delete)
		 * Prevents deletion of system defaults
		 * Invalidates options list for the affected entity
		 */
		deleteOption: trpc.referenceData.deleteReferenceOption.useMutation({
			onSuccess() {
				utils.referenceData.getReferenceOptions.invalidate();
			},
		}),

		/**
		 * Restore deleted reference option
		 * Invalidates options list for the affected entity
		 */
		restoreOption: trpc.referenceData.restoreReferenceOption.useMutation({
			onSuccess() {
				utils.referenceData.getReferenceOptions.invalidate();
			},
		}),

		// ====================================================================
		// UTILITY FUNCTIONS
		// ====================================================================

		/**
		 * Invalidate all reference data caches
		 * Useful after bulk operations or when data sync is needed
		 */
		invalidateAll() {
			utils.referenceData.getReferenceLists.invalidate();
			utils.referenceData.getReferenceOptions.invalidate();
		},

		/**
		 * Invalidate options for a specific entity
		 */
		invalidateEntity(entity: ReferenceEntity) {
			utils.referenceData.getReferenceOptions.invalidate({ entity });
		},
	};
}

/**
 * Export types for use in components
 * These are derived from the tRPC router output types
 */
export type ReferenceList = NonNullable<ReferenceDataOutput['getReferenceList']>;
export type ReferenceOption = NonNullable<
	ReferenceDataOutput['getReferenceOptions']
>[number];
export type ReferenceOptionList = ReferenceDataOutput['getReferenceOptions'];
