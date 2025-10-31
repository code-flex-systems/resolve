import { trpc } from '@/lib/trpc';
import type { RouterOutput } from '@/types/routerTypes';

type DocOutput = RouterOutput['doc'];

export function useDocTrpc() {
	const utils = trpc.useUtils();

	return {
		// Document hooks
		createDoc: trpc.doc.createDoc.useMutation({
			onSuccess(_data, variables) {
				// Invalidate documents list
				utils.doc.listDocs.invalidate();
				// Invalidate doc counts
				if (variables.params.claim_id) {
					utils.doc.getDocCountByClaimId.invalidate({ claimId: variables.params.claim_id });
				}
				if (variables.params.doc_group_id) {
					utils.doc.getDocCountByGroupId.invalidate({ groupId: variables.params.doc_group_id });
				}
			},
		}),

		getDoc: trpc.doc.getDoc.useQuery,

		listDocs: trpc.doc.listDocs.useQuery,

		updateDoc: trpc.doc.updateDoc.useMutation({
			onSuccess(_data, variables) {
				// Invalidate the specific document
				utils.doc.getDoc.invalidate({ docId: variables.docId });
				// Invalidate documents list
				utils.doc.listDocs.invalidate();
			},
		}),

		deleteDoc: trpc.doc.deleteDoc.useMutation({
			onSuccess(_data, variables) {
				// Invalidate documents list
				utils.doc.listDocs.invalidate();
				// Invalidate the specific document query
				utils.doc.getDoc.invalidate({ docId: variables.docId });
				// Note: Doc counts will be invalidated if we know the claim/group context
				// For now, invalidate all count queries
				utils.doc.getDocCountByClaimId.invalidate();
				utils.doc.getDocCountByGroupId.invalidate();
			},
		}),

		downloadDoc: trpc.doc.downloadDoc.useQuery,

		// Document Group hooks
		createDocGroup: trpc.doc.createDocGroup.useMutation({
			onSuccess() {
				// Invalidate all doc group queries
				utils.doc.listDocGroups.invalidate();
				utils.doc.getDocGroupHierarchy.invalidate();
			},
		}),

		getDocGroup: trpc.doc.getDocGroup.useQuery,

		listDocGroups: trpc.doc.listDocGroups.useQuery,

		getDocGroupHierarchy: trpc.doc.getDocGroupHierarchy.useQuery,

		updateDocGroup: trpc.doc.updateDocGroup.useMutation({
			onSuccess(_data, variables) {
				// Invalidate the specific group
				utils.doc.getDocGroup.invalidate({ groupId: variables.groupId });
				// Invalidate all group lists
				utils.doc.listDocGroups.invalidate();
				utils.doc.getDocGroupHierarchy.invalidate();
			},
		}),

		deleteDocGroup: trpc.doc.deleteDocGroup.useMutation({
			onSuccess(_data, variables) {
				// Invalidate all group queries
				utils.doc.listDocGroups.invalidate();
				utils.doc.getDocGroupHierarchy.invalidate();
				utils.doc.getDocGroup.invalidate({ groupId: variables.groupId });
				// Invalidate documents list since group deletion may affect documents
				utils.doc.listDocs.invalidate();
			},
		}),

		// Helper hooks
		getDocCountByClaimId: trpc.doc.getDocCountByClaimId.useQuery,

		getDocCountByGroupId: trpc.doc.getDocCountByGroupId.useQuery,
	};
}

// Export types for use in components
export type Doc = DocOutput['getDoc'];
export type DocListItem = DocOutput['listDocs'][number];
export type DocGroup = DocOutput['getDocGroup'];
export type DocGroupListItem = DocOutput['listDocGroups'][number];
export type DocGroupHierarchy = DocOutput['getDocGroupHierarchy'];
export type DocDownload = DocOutput['downloadDoc'];
