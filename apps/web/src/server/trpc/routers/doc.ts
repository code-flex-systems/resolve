import { router, protectedProcedure } from '../trpc';
import {
	createDoc,
	getDoc,
	listDocs,
	updateDoc,
	deleteDoc,
	downloadDoc,
	createDocGroup,
	getDocGroup,
	listDocGroups,
	getDocGroupHierarchy,
	updateDocGroup,
	deleteDocGroup,
	getDocCountByClaimId,
	getDocCountByGroupId,
	getDocCountsByGroupIds,
	getDocumentStats,
} from '@/api/controllers/docController';
import {
	createDocInput,
	getDocInput,
	listDocsInput,
	updateDocInput,
	deleteDocInput,
	downloadDocInput,
	createDocGroupInput,
	getDocGroupInput,
	updateDocGroupInput,
	deleteDocGroupInput,
	getDocCountByClaimIdInput,
	getDocCountByGroupIdInput,
	getDocCountsByGroupIdsInput,
} from '@/schemas/docSchemas';
import config from '@/config/config';
import { requireRole } from '@/lib/auth/requireRole';

export const docRouter = router({
	// =====================================================================
	// DOCUMENT ENDPOINTS
	// =====================================================================

	createDoc: protectedProcedure.input(createDocInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return createDoc(ctx, input);
	}),

	getDoc: protectedProcedure.input(getDocInput).query(async ({ input, ctx }) => {
		return getDoc(ctx, input);
	}),

	listDocs: protectedProcedure.input(listDocsInput).query(async ({ input, ctx }) => {
		return listDocs(ctx, input);
	}),

	updateDoc: protectedProcedure.input(updateDocInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return updateDoc(ctx, input);
	}),

	deleteDoc: protectedProcedure.input(deleteDocInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return deleteDoc(ctx, input);
	}),

	downloadDoc: protectedProcedure.input(downloadDocInput).query(async ({ input, ctx }) => {
		return downloadDoc(ctx, input);
	}),

	// =====================================================================
	// DOCUMENT GROUP ENDPOINTS
	// =====================================================================

	createDocGroup: protectedProcedure.input(createDocGroupInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return createDocGroup(ctx, input);
	}),

	getDocGroup: protectedProcedure.input(getDocGroupInput).query(async ({ input, ctx }) => {
		return getDocGroup(ctx, input);
	}),

	listDocGroups: protectedProcedure.query(async ({ ctx }) => {
		return listDocGroups(ctx);
	}),

	getDocGroupHierarchy: protectedProcedure.query(async ({ ctx }) => {
		return getDocGroupHierarchy(ctx);
	}),

	updateDocGroup: protectedProcedure.input(updateDocGroupInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return updateDocGroup(ctx, input);
	}),

	deleteDocGroup: protectedProcedure.input(deleteDocGroupInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return deleteDocGroup(ctx, input);
	}),

	// =====================================================================
	// HELPER ENDPOINTS
	// =====================================================================

	getDocCountByClaimId: protectedProcedure
		.input(getDocCountByClaimIdInput)
		.query(async ({ input, ctx }) => {
			return getDocCountByClaimId(ctx, input);
		}),

	getDocCountByGroupId: protectedProcedure
		.input(getDocCountByGroupIdInput)
		.query(async ({ input, ctx }) => {
			return getDocCountByGroupId(ctx, input);
		}),

	getDocCountsByGroupIds: protectedProcedure
		.input(getDocCountsByGroupIdsInput)
		.query(async ({ input, ctx }) => {
			return getDocCountsByGroupIds(ctx, input);
		}),

	getDocumentStats: protectedProcedure.query(async ({ ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return getDocumentStats(ctx);
	}),
});
