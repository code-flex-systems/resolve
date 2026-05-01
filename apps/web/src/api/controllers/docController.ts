import * as docQueries from '@/api/queries/docQueries';
import { ProtectedContext } from '@/server/trpc/trpc';
import type {
	DocParams,
	UpdateDocParams,
	DocGroupParams,
	UpdateDocGroupParams,
} from '@/schemas/docSchemas';
import * as blobStorage from '@/lib/azure/blobStorage';
import { logAdminAction, logAdminActions, AdminAction } from '@/api/utils/adminActionLogger';
import { EntityName } from '@/api/utils/activityLogger';
import { TRPCError } from '@trpc/server';

// =====================================================================
// DOCUMENT CONTROLLERS
// =====================================================================

/**
 * Create a document record with Azure Blob Storage integration.
 * Note: File upload to Azure happens before calling this function.
 *
 * @param ctx - request context
 * @param input - document parameters and storage key from Azure upload
 * @returns the newly created document
 */
export async function createDoc(
	ctx: ProtectedContext,
	{
		params,
		storageKey,
		autoOrganize = false,
	}: {
		params: DocParams;
		storageKey: string;
		autoOrganize?: boolean;
	}
) {
	// Create document and log admin action within transaction
	const created = await ctx.db.transaction().execute(async (trx) => {
		// If autoOrganize is true, set doc_group_id to the user's folder
		let finalParams = params;
		if (autoOrganize) {
			const userFolderId = await docQueries.getOrCreateUserFolder(
				{ ...ctx, db: trx },
				ctx.session.user.id
			);
			finalParams = { ...params, doc_group_id: userFolderId };
		}

		const doc = await docQueries.createDoc({ ...ctx, db: trx }, finalParams, storageKey);

		// Log document creation
		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: doc.id,
				entityName: EntityName.DOCUMENT,
				action: AdminAction.CREATE,
				value: {
					filename: doc.filename,
					alias: doc.alias,
					doc_type: doc.doc_type,
					claim_id: doc.claim_id,
					doc_group_id: doc.doc_group_id,
				},
			}
		);

		return doc;
	});

	return created;
}

/**
 * Get a single document by ID.
 *
 * @param ctx - request context
 * @param input - document id
 * @returns the document
 */
export async function getDoc(ctx: ProtectedContext, { docId }: { docId: string }) {
	return await docQueries.getDoc(ctx, docId);
}

/**
 * List documents with optional filtering and pagination.
 * Returns paginated results with total count.
 *
 * @param ctx - request context
 * @param input - filters and pagination parameters
 * @returns object with rows array and total count
 */
export async function listDocs(
	ctx: ProtectedContext,
	input: {
		filters?: {
			claim_id?: string;
			doc_group_id?: string | null;
			doc_type?: string;
			doc_status?: string;
			is_current_version?: boolean;
			question_id?: string;
			answer_id?: string;
		};
		limit?: number;
		offset?: number;
	}
) {
	return await docQueries.listDocsWithCount(ctx, input.filters, input.limit, input.offset);
}

/**
 * Update a document's metadata (not the file content).
 *
 * @param ctx - request context
 * @param input - document id and fields to update
 * @returns updated document
 */
export async function updateDoc(
	ctx: ProtectedContext,
	{
		docId,
		params,
	}: {
		docId: string;
		params: UpdateDocParams;
	}
) {
	// Update document and log admin action within transaction
	const updated = await ctx.db.transaction().execute(async (trx) => {
		const doc = await docQueries.updateDoc({ ...ctx, db: trx }, docId, params);

		// Log admin action for document update
		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: docId,
				entityName: EntityName.DOCUMENT,
				action: AdminAction.UPDATE,
				value: params,
			}
		);

		return doc;
	});

	return updated;
}

/**
 * Archive (soft delete) a document record.
 * Azure blob is preserved for audit trail.
 *
 * @param ctx - request context
 * @param input - document id
 */
export async function deleteDoc(ctx: ProtectedContext, { docId }: { docId: string }) {
	// Archive document and log admin action within transaction
	await ctx.db.transaction().execute(async (trx) => {
		const trxCtx = { ...ctx, db: trx };

		// Soft delete the document (returns archived doc for logging)
		const archived = await docQueries.archiveDoc(trxCtx, docId);

		if (!archived) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Document not found',
			});
		}

		// Log admin action for document deletion
		await logAdminAction(trxCtx, {
			entityId: docId,
			entityName: EntityName.DOCUMENT,
			action: AdminAction.DELETE,
			value: {
				filename: archived.filename,
				alias: archived.alias,
				doc_type: archived.doc_type,
				claim_id: archived.claim_id,
			},
		});
	});
}

/**
 * Download a document from Azure Blob Storage.
 *
 * @param ctx - request context
 * @param input - document id
 * @returns file buffer and metadata
 */
export async function downloadDoc(ctx: ProtectedContext, { docId }: { docId: string }) {
	// Get document metadata
	const doc = await docQueries.getDoc(ctx, docId);

	// Download from Azure Blob Storage
	const fileBuffer = await blobStorage.downloadDocument(doc.storage_key);

	return {
		fileBuffer,
		filename: doc.filename,
		mimeType: doc.mime_type,
	};
}

// =====================================================================
// DOCUMENT GROUP CONTROLLERS
// =====================================================================

/**
 * Create a document group (folder).
 *
 * @param ctx - request context
 * @param input - group parameters
 * @returns the newly created group
 */
export async function createDocGroup(
	ctx: ProtectedContext,
	{ params }: { params: DocGroupParams }
) {
	// Create doc group and log admin action within transaction
	const created = await ctx.db.transaction().execute(async (trx) => {
		const group = await docQueries.createDocGroup({ ...ctx, db: trx }, params);

		// Log doc group creation
		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: group.id,
				entityName: EntityName.DOC_GROUP,
				action: AdminAction.CREATE,
				value: {
					name: group.name,
					group_type: group.group_type,
					parent_group_id: group.parent_group_id,
					claim_id: group.claim_id,
				},
			}
		);

		return group;
	});

	return created;
}

/**
 * Get a single document group by ID.
 *
 * @param ctx - request context
 * @param input - group id
 * @returns the group
 */
export async function getDocGroup(ctx: ProtectedContext, { groupId }: { groupId: string }) {
	return await docQueries.getDocGroup(ctx, groupId);
}

/**
 * List all document groups for the current client.
 *
 * @param ctx - request context
 * @returns array of groups
 */
export async function listDocGroups(ctx: ProtectedContext) {
	return await docQueries.getDocGroups(ctx);
}

/**
 * Get hierarchical document group structure.
 *
 * @param ctx - request context
 * @returns array of groups with hierarchy information
 */
export async function getDocGroupHierarchy(ctx: ProtectedContext) {
	return await docQueries.getDocGroupHierarchy(ctx);
}

/**
 * Update a document group.
 *
 * @param ctx - request context
 * @param input - group id and fields to update
 * @returns updated group
 */
export async function updateDocGroup(
	ctx: ProtectedContext,
	{
		groupId,
		params,
	}: {
		groupId: string;
		params: UpdateDocGroupParams;
	}
) {
	// Update doc group and log admin action within transaction
	const updated = await ctx.db.transaction().execute(async (trx) => {
		const group = await docQueries.updateDocGroup({ ...ctx, db: trx }, groupId, params);

		// Log admin action for doc group update
		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: groupId,
				entityName: EntityName.DOC_GROUP,
				action: AdminAction.UPDATE,
				value: params,
			}
		);

		return group;
	});

	return updated;
}

/**
 * Archive (soft delete) a document group and all documents within it.
 * Uses batch operations for efficiency - single UPDATE for all docs, single UPDATE for all groups.
 * Azure blobs are preserved for audit trail.
 *
 * @param ctx - request context
 * @param input - group id
 */
export async function deleteDocGroup(ctx: ProtectedContext, { groupId }: { groupId: string }) {
	// Archive doc group and log admin action within transaction
	await ctx.db.transaction().execute(async (trx) => {
		const trxCtx = { ...ctx, db: trx };

		// Fetch group data BEFORE archiving for logging and system folder check
		const group = await docQueries.getDocGroupForDeletion(trxCtx, groupId);

		if (!group) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Document group not found',
			});
		}

		// System folders cannot be deleted
		if (group.system) {
			throw new TRPCError({
				code: 'FORBIDDEN',
				message: 'Cannot delete system folders',
			});
		}

		// Batch soft delete all documents in the group (single UPDATE with RETURNING)
		const archivedDocs = await docQueries.archiveDocsInGroupRecursive(trxCtx, groupId);

		// Batch soft delete all groups (single UPDATE with RETURNING)
		const archivedGroups = await docQueries.archiveDocGroupRecursive(trxCtx, groupId);

		// Bulk log document deletions (single INSERT)
		if (archivedDocs.length > 0) {
			await logAdminActions(
				trxCtx,
				archivedDocs.map((doc) => ({
					entityId: doc.id,
					entityName: EntityName.DOCUMENT,
					action: AdminAction.DELETE,
					value: {
						filename: doc.filename,
						alias: doc.alias,
						deleted_with_group: group.name,
					},
				}))
			);
		}

		// Log group deletion (includes count of archived docs and groups)
		await logAdminAction(trxCtx, {
			entityId: groupId,
			entityName: EntityName.DOC_GROUP,
			action: AdminAction.DELETE,
			value: {
				name: group.name,
				group_type: group.group_type,
				parent_group_id: group.parent_group_id,
				documents_archived: archivedDocs.length,
				groups_archived: archivedGroups.length,
			},
		});
	});
}

// =====================================================================
// HELPER CONTROLLERS
// =====================================================================

/**
 * Get document count for a claim.
 *
 * @param ctx - request context
 * @param input - claim id
 * @returns document count
 */
export async function getDocCountByClaimId(
	ctx: ProtectedContext,
	{ claimId }: { claimId: string }
) {
	return await docQueries.getDocCountByClaimId(ctx, claimId);
}

/**
 * Get document count for a group.
 *
 * @param ctx - request context
 * @param input - group id
 * @returns document count
 */
export async function getDocCountByGroupId(
	ctx: ProtectedContext,
	{ groupId }: { groupId: string }
) {
	return await docQueries.getDocCountByGroupId(ctx, groupId);
}

/**
 * Get document counts for multiple groups in a single query.
 *
 * @param ctx - request context
 * @param input - array of group ids
 * @returns array of {doc_group_id, count} objects
 */
export async function getDocCountsByGroupIds(
	ctx: ProtectedContext,
	{ groupIds }: { groupIds: string[] }
) {
	return await docQueries.getDocCountsByGroupIds(ctx, groupIds);
}

/**
 * Get document overview stats (total, recent uploads, breakdown by type).
 *
 * @param ctx - request context
 * @returns document stats
 */
export async function getDocumentStats(ctx: ProtectedContext) {
	return docQueries.getDocumentStats(ctx);
}
