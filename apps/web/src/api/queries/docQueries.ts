import { ProtectedContext } from '@/server/trpc/trpc';
import type { DocParams, UpdateDocParams, DocGroupParams, UpdateDocGroupParams } from '@/schemas/docSchemas';
import { DocType, DocStatus, DocGroupType } from '@/config/enums';

// =====================================================================
// DOC QUERIES
// =====================================================================

/**
 * Create a document record with Azure Blob Storage integration.
 * Note: File upload happens before calling this function.
 *
 * @param ctx - request context
 * @param params - document fields including storage_key from Azure upload
 * @param storageKey - Azure Blob Storage key from upload
 * @returns created document
 */
export async function createDoc(ctx: ProtectedContext, params: DocParams, storageKey: string) {
	return await ctx.db
		.insertInto('doc')
		.values({
			filename: params.filename,
			alias: params.alias,
			title: params.title,
			description: params.description,
			doc_type: params.doc_type || DocType.OTHER,
			doc_status: params.doc_status || DocStatus.APPROVED,
			storage_key: storageKey,
			file_size: params.file_size,
			mime_type: params.mime_type,
			preview_url: params.preview_url,
			doc_group_id: params.doc_group_id,
			claim_id: params.claim_id,
			recovery_event_id: params.recovery_event_id,
			deadline_id: params.deadline_id,
			page_instance_id: params.page_instance_id,
			question_id: params.question_id,
			answer_id: params.answer_id,
			version: 1,
			is_current_version: true,
			client_id: ctx.session.user.client_id!,
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Get a single document by ID.
 *
 * @param ctx - request context
 * @param docId - document identifier
 * @returns the document
 */
export async function getDoc(ctx: ProtectedContext, docId: number) {
	return await ctx.db
		.selectFrom('doc')
		.selectAll()
		.where('id', '=', docId)
		.where('client_id', '=', ctx.session.user.client_id)
		.executeTakeFirstOrThrow();
}

/**
 * Get all documents for the current client with optional filtering.
 *
 * @param ctx - request context
 * @param filters - optional filters (claim_id, doc_group_id, doc_type, doc_status)
 * @param limit - max number of results
 * @param offset - pagination offset
 * @returns array of documents
 */
export async function getDocs(
	ctx: ProtectedContext,
	filters?: {
		claim_id?: number;
		doc_group_id?: number | null;
		doc_type?: string;
		doc_status?: string;
		is_current_version?: boolean;
		question_id?: number;
		answer_id?: number;
	},
	limit: number = 100,
	offset: number = 0
) {
	let query = ctx.db
		.selectFrom('doc')
		.selectAll()
		.where('client_id', '=', ctx.session.user.client_id)
		.orderBy('created_at', 'desc')
		.limit(limit)
		.offset(offset);

	if (filters?.claim_id) {
		query = query.where('claim_id', '=', filters.claim_id);
	}

	if (filters?.doc_group_id !== undefined) {
		if (filters.doc_group_id === null) {
			query = query.where('doc_group_id', 'is', null);
		} else {
			query = query.where('doc_group_id', '=', filters.doc_group_id);
		}
	}

	if (filters?.doc_type) {
		query = query.where('doc_type', '=', filters.doc_type);
	}

	if (filters?.doc_status) {
		query = query.where('doc_status', '=', filters.doc_status);
	}

	if (filters?.is_current_version !== undefined) {
		query = query.where('is_current_version', '=', filters.is_current_version);
	}

	if (filters?.question_id) {
		query = query.where('question_id', '=', filters.question_id);
	}

	if (filters?.answer_id) {
		query = query.where('answer_id', '=', filters.answer_id);
	}

	return await query.execute();
}

/**
 * Get documents for a specific claim.
 *
 * @param ctx - request context
 * @param claimId - claim identifier
 * @returns array of documents
 */
export async function getDocsByClaimId(ctx: ProtectedContext, claimId: number) {
	return await ctx.db
		.selectFrom('doc')
		.selectAll()
		.where('claim_id', '=', claimId)
		.where('client_id', '=', ctx.session.user.client_id)
		.orderBy('created_at', 'desc')
		.execute();
}

/**
 * Update a document's metadata (not the file content).
 *
 * @param ctx - request context
 * @param docId - document identifier
 * @param params - fields to update
 * @returns updated document
 */
export async function updateDoc(ctx: ProtectedContext, docId: number, params: UpdateDocParams) {
	return await ctx.db
		.updateTable('doc')
		.set({
			...params,
			updated_by: ctx.session.user.id,
			updated_at: new Date(),
		})
		.where('id', '=', docId)
		.where('client_id', '=', ctx.session.user.client_id)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Fetch a document for logging before deletion.
 *
 * @param ctx - request context
 * @param docId - document identifier
 * @returns document details for logging
 */
export async function getDocForDeletion(ctx: ProtectedContext, docId: number) {
	return await ctx.db
		.selectFrom('doc')
		.select(['id', 'filename', 'alias', 'doc_type', 'storage_key', 'claim_id'])
		.where('id', '=', docId)
		.where('client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();
}

/**
 * Delete a document record from database.
 * Note: Azure blob deletion happens in controller.
 *
 * @param ctx - request context
 * @param docId - document identifier
 */
export async function deleteDoc(ctx: ProtectedContext, docId: number) {
	await ctx.db.deleteFrom('doc').where('id', '=', docId).where('client_id', '=', ctx.session.user.client_id).execute();
}

// =====================================================================
// DOC GROUP QUERIES
// =====================================================================

/**
 * Create a document group (folder).
 *
 * @param ctx - request context
 * @param params - group parameters
 * @returns created group
 */
export async function createDocGroup(ctx: ProtectedContext, params: DocGroupParams) {
	return await ctx.db
		.insertInto('doc_group')
		.values({
			name: params.name,
			description: params.description,
			parent_group_id: params.parent_group_id,
			group_type: params.group_type || DocGroupType.CUSTOM,
			claim_id: params.claim_id,
			color: params.color,
			icon: params.icon,
			sort_order: params.sort_order || 0,
			client_id: ctx.session.user.client_id!,
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Get a single document group by ID.
 *
 * @param ctx - request context
 * @param groupId - group identifier
 * @returns the group
 */
export async function getDocGroup(ctx: ProtectedContext, groupId: number) {
	return await ctx.db
		.selectFrom('doc_group')
		.selectAll()
		.where('id', '=', groupId)
		.where('client_id', '=', ctx.session.user.client_id)
		.executeTakeFirstOrThrow();
}

/**
 * Get all document groups for the current client.
 *
 * @param ctx - request context
 * @returns array of groups
 */
export async function getDocGroups(ctx: ProtectedContext) {
	return await ctx.db
		.selectFrom('doc_group')
		.leftJoin('users', 'users.id', 'doc_group.user_id')
		.selectAll('doc_group')
		.select(['users.first as user_first', 'users.last as user_last', 'users.email as user_email'])
		.where('doc_group.client_id', '=', ctx.session.user.client_id)
		.orderBy('doc_group.sort_order', 'asc')
		.orderBy('doc_group.name', 'asc')
		.execute();
}

/**
 * Get hierarchical document group structure as a tree.
 * Uses recursive CTE to build parent-child relationships.
 *
 * @param ctx - request context
 * @returns array of groups with hierarchy information
 */
export async function getDocGroupHierarchy(ctx: ProtectedContext) {
	// For now, return flat list - frontend can build tree
	// In future, can implement recursive CTE for true hierarchy
	return await getDocGroups(ctx);
}

/**
 * Update a document group.
 *
 * @param ctx - request context
 * @param groupId - group identifier
 * @param params - fields to update
 * @returns updated group
 */
export async function updateDocGroup(ctx: ProtectedContext, groupId: number, params: UpdateDocGroupParams) {
	return await ctx.db
		.updateTable('doc_group')
		.set({
			...params,
			updated_by: ctx.session.user.id,
			updated_at: new Date(),
		})
		.where('id', '=', groupId)
		.where('client_id', '=', ctx.session.user.client_id)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Fetch a document group for logging before deletion.
 *
 * @param ctx - request context
 * @param groupId - group identifier
 * @returns group details for logging
 */
export async function getDocGroupForDeletion(ctx: ProtectedContext, groupId: number) {
	return await ctx.db
		.selectFrom('doc_group')
		.select(['id', 'name', 'group_type', 'parent_group_id'])
		.where('id', '=', groupId)
		.where('client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();
}

/**
 * Delete a document group.
 * Note: Cascade delete handled by database constraint.
 *
 * @param ctx - request context
 * @param groupId - group identifier
 */
export async function deleteDocGroup(ctx: ProtectedContext, groupId: number) {
	await ctx.db
		.deleteFrom('doc_group')
		.where('id', '=', groupId)
		.where('client_id', '=', ctx.session.user.client_id)
		.execute();
}

/**
 * Get all documents in a group recursively (including documents in child groups).
 * This is needed when deleting a group to clean up all Azure blobs.
 *
 * @param ctx - request context
 * @param groupId - parent group id
 * @returns array of all documents in this group and its descendants
 */
export async function getDocsInGroupRecursive(ctx: ProtectedContext, groupId: number) {
	// Use recursive CTE to get all child groups
	const result = await ctx.db
		.withRecursive('group_tree', (db) =>
			db
				.selectFrom('doc_group')
				.select(['id'])
				.where('id', '=', groupId)
				.where('client_id', '=', ctx.session.user.client_id)
				.unionAll(
					db
						.selectFrom('doc_group')
						.innerJoin('group_tree', 'doc_group.parent_group_id', 'group_tree.id')
						.select(['doc_group.id'])
						.where('doc_group.client_id', '=', ctx.session.user.client_id)
				)
		)
		.selectFrom('doc')
		.innerJoin('group_tree', 'doc.doc_group_id', 'group_tree.id')
		.selectAll('doc')
		.where('doc.client_id', '=', ctx.session.user.client_id)
		.execute();

	return result;
}

// =====================================================================
// HELPER QUERIES
// =====================================================================

/**
 * Count documents for a claim.
 *
 * @param ctx - request context
 * @param claimId - claim identifier
 * @returns document count
 */
export async function getDocCountByClaimId(ctx: ProtectedContext, claimId: number): Promise<number> {
	const result = await ctx.db
		.selectFrom('doc')
		.select((eb) => eb.fn.count<string>('id').as('count'))
		.where('claim_id', '=', claimId)
		.where('client_id', '=', ctx.session.user.client_id)
		.executeTakeFirstOrThrow();

	return parseInt(result.count);
}

/**
 * Count documents in a group.
 *
 * @param ctx - request context
 * @param groupId - group identifier
 * @returns document count
 */
export async function getDocCountByGroupId(ctx: ProtectedContext, groupId: number): Promise<number> {
	const result = await ctx.db
		.selectFrom('doc')
		.select((eb) => eb.fn.count<string>('id').as('count'))
		.where('doc_group_id', '=', groupId)
		.where('client_id', '=', ctx.session.user.client_id)
		.executeTakeFirstOrThrow();

	return parseInt(result.count);
}

/**
 * Check if a document exists and belongs to the current client.
 *
 * @param ctx - request context
 * @param docId - document identifier
 * @returns true if exists, false otherwise
 */
export async function docExists(ctx: ProtectedContext, docId: number): Promise<boolean> {
	const result = await ctx.db
		.selectFrom('doc')
		.select('id')
		.where('id', '=', docId)
		.where('client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();

	return !!result;
}

/**
 * Get or create the root "Users" folder.
 * This folder is used as the parent for all user-specific folders.
 *
 * @param ctx - request context
 * @returns the Users folder id
 */
export async function getOrCreateUsersFolder(ctx: ProtectedContext): Promise<number> {
	// Always attempt to create Users folder (unique constraint prevents duplicates)
	const result = await ctx.db
		.insertInto('doc_group')
		.values({
			name: 'Users',
			description: 'User-specific document folders' as string | null,
			client_id: ctx.session.user.client_id!,
			group_type: DocGroupType.CATEGORY,
			parent_group_id: null,
			created_by: ctx.session.user.id,
		})
		.onConflict((oc) => oc.doNothing())
		.returningAll()
		.executeTakeFirst();

	// If insert was ignored due to conflict, fetch the existing folder
	if (!result) {
		const existing = await ctx.db
			.selectFrom('doc_group')
			.select('id')
			.where('client_id', '=', ctx.session.user.client_id)
			.where('name', '=', 'Users')
			.where('group_type', '=', DocGroupType.CATEGORY)
			.where('parent_group_id', 'is', null)
			.executeTakeFirstOrThrow();
		return existing.id;
	}

	return result.id;
}

/**
 * Get or create a user-specific folder under Users/.
 * This folder is used to organize documents uploaded by a specific user.
 *
 * @param ctx - request context
 * @param userId - user identifier
 * @returns the user folder id
 */
export async function getOrCreateUserFolder(ctx: ProtectedContext, userId: string): Promise<number> {
	// Ensure parent Users folder exists
	const usersRootFolderId = await getOrCreateUsersFolder(ctx);

	// Always attempt to create user folder (unique constraint prevents duplicates)
	const result = await ctx.db
		.insertInto('doc_group')
		.values({
			name: userId as string,
			client_id: ctx.session.user.client_id!,
			user_id: userId,
			parent_group_id: usersRootFolderId,
			group_type: DocGroupType.USER,
			created_by: ctx.session.user.id,
		})
		.onConflict((oc) => oc.doNothing())
		.returningAll()
		.executeTakeFirst();

	// If insert was ignored due to conflict, fetch the existing folder
	if (!result) {
		const existing = await ctx.db
			.selectFrom('doc_group')
			.select('id')
			.where('client_id', '=', ctx.session.user.client_id)
			.where('user_id', '=', userId)
			.where('group_type', '=', DocGroupType.USER)
			.executeTakeFirstOrThrow();
		return existing.id;
	}

	return result.id;
}
