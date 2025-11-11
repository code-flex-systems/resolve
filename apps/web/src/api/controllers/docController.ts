import * as docQueries from '@/api/queries/docQueries';
import { ProtectedContext } from '@/server/trpc/trpc';
import type { DocParams, UpdateDocParams, DocGroupParams, UpdateDocGroupParams } from '@/schemas/docSchemas';
import * as blobStorage from '@/lib/azure/blobStorage';
import { logAdminAction, AdminAction, EntityName } from '@/api/utils/adminActionLogger';
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
			const userFolderId = await docQueries.getOrCreateUserFolder({ ...ctx, db: trx }, ctx.session.user.id);
			finalParams = { ...params, doc_group_id: userFolderId };
		}

		const doc = await docQueries.createDoc({ ...ctx, db: trx }, finalParams, storageKey);

		// Log document creation
		await logAdminAction({ ...ctx, db: trx }, {
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
		});

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
export async function getDoc(
	ctx: ProtectedContext,
	{ docId }: { docId: number }
) {
	return await docQueries.getDoc(ctx, docId);
}

/**
 * List documents with optional filtering and pagination.
 *
 * @param ctx - request context
 * @param input - filters and pagination parameters
 * @returns array of documents
 */
export async function listDocs(
	ctx: ProtectedContext,
	input: {
		filters?: {
			claim_id?: number;
			doc_group_id?: number | null;
			doc_type?: string;
			doc_status?: string;
			is_current_version?: boolean;
			question_id?: number;
			answer_id?: number;
		};
		limit?: number;
		offset?: number;
	}
) {
	return await docQueries.getDocs(ctx, input.filters, input.limit, input.offset);
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
		docId: number;
		params: UpdateDocParams;
	}
) {
	// Update document and log admin action within transaction
	const updated = await ctx.db.transaction().execute(async (trx) => {
		const doc = await docQueries.updateDoc({ ...ctx, db: trx }, docId, params);

		// Log admin action for document update
		await logAdminAction({ ...ctx, db: trx }, {
			entityId: docId,
			entityName: EntityName.DOCUMENT,
			action: AdminAction.UPDATE,
			value: params,
		});

		return doc;
	});

	return updated;
}

/**
 * Delete a document record and its Azure blob.
 *
 * @param ctx - request context
 * @param input - document id
 */
export async function deleteDoc(
	ctx: ProtectedContext,
	{ docId }: { docId: number }
) {
	// Delete document and log admin action within transaction
	await ctx.db.transaction().execute(async (trx) => {
		// Fetch document data BEFORE deletion for logging and Azure cleanup
		const doc = await docQueries.getDocForDeletion({ ...ctx, db: trx }, docId);

		if (!doc) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Document not found',
			});
		}

		// Delete from Azure Blob Storage first
		try {
			await blobStorage.deleteDocument(doc.storage_key);
		} catch (error) {
			console.error('Failed to delete document from Azure:', error);
			// Continue with DB deletion even if Azure deletion fails
			// The blob will be orphaned but won't affect functionality
		}

		// Delete the document record from database
		await docQueries.deleteDoc({ ...ctx, db: trx }, docId);

		// Log admin action for document deletion
		await logAdminAction({ ...ctx, db: trx }, {
			entityId: docId,
			entityName: EntityName.DOCUMENT,
			action: AdminAction.DELETE,
			value: {
				filename: doc.filename,
				alias: doc.alias,
				doc_type: doc.doc_type,
				claim_id: doc.claim_id,
				storage_key: doc.storage_key,
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
export async function downloadDoc(
	ctx: ProtectedContext,
	{ docId }: { docId: number }
) {
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
		await logAdminAction({ ...ctx, db: trx }, {
			entityId: group.id,
			entityName: EntityName.DOC_GROUP,
			action: AdminAction.CREATE,
			value: {
				name: group.name,
				group_type: group.group_type,
				parent_group_id: group.parent_group_id,
				claim_id: group.claim_id,
			},
		});

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
export async function getDocGroup(
	ctx: ProtectedContext,
	{ groupId }: { groupId: number }
) {
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
		groupId: number;
		params: UpdateDocGroupParams;
	}
) {
	// Update doc group and log admin action within transaction
	const updated = await ctx.db.transaction().execute(async (trx) => {
		const group = await docQueries.updateDocGroup({ ...ctx, db: trx }, groupId, params);

		// Log admin action for doc group update
		await logAdminAction({ ...ctx, db: trx }, {
			entityId: groupId,
			entityName: EntityName.DOC_GROUP,
			action: AdminAction.UPDATE,
			value: params,
		});

		return group;
	});

	return updated;
}

/**
 * Delete a document group and all documents within it.
 * IMPORTANT: This also deletes all documents in the group from both DB and Azure Blob Storage.
 *
 * @param ctx - request context
 * @param input - group id
 */
export async function deleteDocGroup(
	ctx: ProtectedContext,
	{ groupId }: { groupId: number }
) {
	// Delete doc group and log admin action within transaction
	await ctx.db.transaction().execute(async (trx) => {
		// Fetch group data BEFORE deletion for logging
		const group = await docQueries.getDocGroupForDeletion({ ...ctx, db: trx }, groupId);

		if (!group) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Document group not found',
			});
		}

		// CRITICAL: Get all documents in this group (recursively including subgroups)
		// Since doc_group has ON DELETE CASCADE for child groups, and doc has ON DELETE SET NULL,
		// we need to manually delete all documents to clean up Azure storage
		const docsInGroup = await docQueries.getDocsInGroupRecursive({ ...ctx, db: trx }, groupId);

		// Delete all documents in the group (this cleans up Azure storage)
		for (const doc of docsInGroup) {
			try {
				await blobStorage.deleteDocument(doc.storage_key);
			} catch (error) {
				console.error(`Failed to delete document ${doc.id} from Azure:`, error);
				// Continue with other deletions even if one fails
			}

			// Delete from database
			await docQueries.deleteDoc({ ...ctx, db: trx }, doc.id);

			// Log individual document deletion
			await logAdminAction({ ...ctx, db: trx }, {
				entityId: doc.id,
				entityName: EntityName.DOCUMENT,
				action: AdminAction.DELETE,
				value: {
					filename: doc.filename,
					alias: doc.alias,
					deleted_with_group: group.name,
				},
			});
		}

		// Now delete the doc group (CASCADE will handle child groups)
		await docQueries.deleteDocGroup({ ...ctx, db: trx }, groupId);

		// Log admin action for doc group deletion
		await logAdminAction({ ...ctx, db: trx }, {
			entityId: groupId,
			entityName: EntityName.DOC_GROUP,
			action: AdminAction.DELETE,
			value: {
				name: group.name,
				group_type: group.group_type,
				parent_group_id: group.parent_group_id,
				documents_deleted: docsInGroup.length,
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
	{ claimId }: { claimId: number }
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
	{ groupId }: { groupId: number }
) {
	return await docQueries.getDocCountByGroupId(ctx, groupId);
}
