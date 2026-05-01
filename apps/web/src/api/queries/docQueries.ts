import { sql } from 'kysely';
import { ProtectedContext } from '@/server/trpc/trpc';
import type {
	DocParams,
	UpdateDocParams,
	DocGroupParams,
	UpdateDocGroupParams,
} from '@/schemas/docSchemas';
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
export async function getDoc(ctx: ProtectedContext, docId: string) {
	return await ctx.db
		.selectFrom('doc')
		.selectAll()
		.where('id', '=', docId)
		.where('client_id', '=', ctx.session.user.client_id)
		.where('deleted_at', 'is', null)
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
		claim_id?: string;
		doc_group_id?: string | null;
		doc_type?: string;
		doc_status?: string;
		is_current_version?: boolean;
		question_id?: string;
		answer_id?: string;
	},
	limit: number = 100,
	offset: number = 0
) {
	let query = ctx.db
		.selectFrom('doc')
		.selectAll()
		.where('client_id', '=', ctx.session.user.client_id)
		.where('deleted_at', 'is', null)
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
 * List documents with count for server-side pagination.
 * Uses parallel queries for rows and count.
 *
 * @param ctx - request context
 * @param filters - optional filters (claim_id, doc_group_id, doc_type, doc_status)
 * @param limit - max number of results
 * @param offset - pagination offset
 * @returns object with rows array and total count
 */
export async function listDocsWithCount(
	ctx: ProtectedContext,
	filters?: {
		claim_id?: string;
		doc_group_id?: string | null;
		doc_type?: string;
		doc_status?: string;
		is_current_version?: boolean;
		question_id?: string;
		answer_id?: string;
	},
	limit: number = 100,
	offset: number = 0
) {
	// Build base query with filters (no pagination, no select)
	let baseQuery = ctx.db
		.selectFrom('doc')
		.where('client_id', '=', ctx.session.user.client_id)
		.where('deleted_at', 'is', null);

	if (filters?.claim_id) {
		baseQuery = baseQuery.where('claim_id', '=', filters.claim_id);
	}

	if (filters?.doc_group_id !== undefined) {
		if (filters.doc_group_id === null) {
			baseQuery = baseQuery.where('doc_group_id', 'is', null);
		} else {
			baseQuery = baseQuery.where('doc_group_id', '=', filters.doc_group_id);
		}
	}

	if (filters?.doc_type) {
		baseQuery = baseQuery.where('doc_type', '=', filters.doc_type);
	}

	if (filters?.doc_status) {
		baseQuery = baseQuery.where('doc_status', '=', filters.doc_status);
	}

	if (filters?.is_current_version !== undefined) {
		baseQuery = baseQuery.where('is_current_version', '=', filters.is_current_version);
	}

	if (filters?.question_id) {
		baseQuery = baseQuery.where('question_id', '=', filters.question_id);
	}

	if (filters?.answer_id) {
		baseQuery = baseQuery.where('answer_id', '=', filters.answer_id);
	}

	// Run count and rows queries in parallel
	const [countResult, rows] = await Promise.all([
		// Count query
		baseQuery.select((eb) => eb.fn.countAll().as('count')).executeTakeFirst(),
		// Rows query with pagination and narrowed select for efficiency
		baseQuery
			.select([
				'id',
				'filename',
				'alias',
				'title',
				'doc_type',
				'doc_status',
				'file_size',
				'mime_type',
				'doc_group_id',
				'claim_id',
				'created_at',
				'created_by',
			])
			.orderBy('created_at', 'desc')
			.limit(limit)
			.offset(offset)
			.execute(),
	]);

	return {
		rows,
		count: countResult?.count ? Number(countResult.count) : 0,
	};
}

/**
 * Get documents for a specific claim.
 *
 * @param ctx - request context
 * @param claimId - claim identifier
 * @returns array of documents
 */
export async function getDocsByClaimId(ctx: ProtectedContext, claimId: string) {
	return await ctx.db
		.selectFrom('doc')
		.selectAll()
		.where('claim_id', '=', claimId)
		.where('client_id', '=', ctx.session.user.client_id)
		.where('deleted_at', 'is', null)
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
export async function updateDoc(ctx: ProtectedContext, docId: string, params: UpdateDocParams) {
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
export async function getDocForDeletion(ctx: ProtectedContext, docId: string) {
	return await ctx.db
		.selectFrom('doc')
		.select(['id', 'filename', 'alias', 'doc_type', 'storage_key', 'claim_id'])
		.where('id', '=', docId)
		.where('client_id', '=', ctx.session.user.client_id)
		.where('deleted_at', 'is', null)
		.executeTakeFirst();
}

/**
 * Delete a document record from database.
 * Note: Azure blob deletion happens in controller.
 *
 * @param ctx - request context
 * @param docId - document identifier
 */
export async function deleteDoc(ctx: ProtectedContext, docId: string) {
	await ctx.db
		.updateTable('doc')
		.set({
			deleted_at: new Date(),
			deleted_by: ctx.session.user.id,
		})
		.where('id', '=', docId)
		.where('client_id', '=', ctx.session.user.client_id)
		.where('deleted_at', 'is', null)
		.execute();
}

// =====================================================================
// DOC GROUP QUERIES
// =====================================================================

/**
 * Reserved folder names that cannot be used by users
 */
const RESERVED_FOLDER_NAMES = ['Users', 'Shared'];

/**
 * Validate folder name against reserved names
 * @param name - folder name to validate
 * @throws Error if name is reserved
 */
function validateFolderName(name: string) {
	if (RESERVED_FOLDER_NAMES.includes(name)) {
		throw new Error(`"${name}" is a reserved folder name and cannot be used`);
	}
}

/**
 * Create a document group (folder).
 *
 * @param ctx - request context
 * @param params - group parameters
 * @returns created group
 */
export async function createDocGroup(ctx: ProtectedContext, params: DocGroupParams) {
	// Validate folder name against reserved names (unless creating system folders)
	if (!params.system) {
		validateFolderName(params.name);
	}

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
			system: params.system || false,
			user_id: params.user_id,
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
export async function getDocGroup(ctx: ProtectedContext, groupId: string) {
	return await ctx.db
		.selectFrom('doc_group')
		.selectAll()
		.where('id', '=', groupId)
		.where('client_id', '=', ctx.session.user.client_id)
		.where('deleted_at', 'is', null)
		.executeTakeFirstOrThrow();
}

/**
 * Get all document groups for the current client.
 *
 * @param ctx - request context
 * @returns array of groups
 */
export async function getDocGroups(ctx: ProtectedContext) {
	// Ensure Shared folder exists
	await getOrCreateSharedFolder(ctx);

	return await ctx.db
		.selectFrom('doc_group')
		.leftJoin('users', 'users.id', 'doc_group.user_id')
		.selectAll('doc_group')
		.select(['users.first as user_first', 'users.last as user_last', 'users.email as user_email'])
		.where('doc_group.client_id', '=', ctx.session.user.client_id)
		.where('doc_group.deleted_at', 'is', null)
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
export async function updateDocGroup(
	ctx: ProtectedContext,
	groupId: string,
	params: UpdateDocGroupParams
) {
	// Validate new name if being changed
	if (params.name) {
		validateFolderName(params.name);
	}

	// Combine system check with update — WHERE system = false ensures system folders can't be updated
	const updated = await ctx.db
		.updateTable('doc_group')
		.set({
			...params,
			updated_by: ctx.session.user.id,
			updated_at: new Date(),
		})
		.where('id', '=', groupId)
		.where('client_id', '=', ctx.session.user.client_id)
		.where('system', '=', false)
		.returningAll()
		.executeTakeFirst();

	if (!updated) {
		throw new Error('Document group not found or cannot update system folders');
	}

	return updated;
}

/**
 * Fetch a document group for logging before deletion.
 *
 * @param ctx - request context
 * @param groupId - group identifier
 * @returns group details for logging
 */
export async function getDocGroupForDeletion(ctx: ProtectedContext, groupId: string) {
	return await ctx.db
		.selectFrom('doc_group')
		.select(['id', 'name', 'group_type', 'parent_group_id', 'system'])
		.where('id', '=', groupId)
		.where('client_id', '=', ctx.session.user.client_id)
		.where('deleted_at', 'is', null)
		.executeTakeFirst();
}

/**
 * Delete a document group.
 * Note: Cascade delete handled by database constraint.
 *
 * @param ctx - request context
 * @param groupId - group identifier
 */
export async function deleteDocGroup(ctx: ProtectedContext, groupId: string) {
	// Combine system check with delete — WHERE system = false ensures system folders can't be deleted
	const deleted = await ctx.db
		.deleteFrom('doc_group')
		.where('id', '=', groupId)
		.where('client_id', '=', ctx.session.user.client_id)
		.where('system', '=', false)
		.returning('id')
		.executeTakeFirst();

	if (!deleted) {
		throw new Error('Document group not found or cannot delete system folders');
	}
}

/**
 * Get all documents in a group recursively (including documents in child groups).
 * This is needed when deleting a group to clean up all Azure blobs.
 *
 * @param ctx - request context
 * @param groupId - parent group id
 * @returns array of all documents in this group and its descendants
 */
export async function getDocsInGroupRecursive(ctx: ProtectedContext, groupId: string) {
	// Use recursive CTE to get all child groups (non-deleted)
	const result = await ctx.db
		.withRecursive('group_tree', (db) =>
			db
				.selectFrom('doc_group')
				.select(['id'])
				.where('id', '=', groupId)
				.where('client_id', '=', ctx.session.user.client_id)
				.where('deleted_at', 'is', null)
				.unionAll(
					db
						.selectFrom('doc_group')
						.innerJoin('group_tree', 'doc_group.parent_group_id', 'group_tree.id')
						.select(['doc_group.id'])
						.where('doc_group.client_id', '=', ctx.session.user.client_id)
						.where('doc_group.deleted_at', 'is', null)
				)
		)
		.selectFrom('doc')
		.innerJoin('group_tree', 'doc.doc_group_id', 'group_tree.id')
		.selectAll('doc')
		.where('doc.client_id', '=', ctx.session.user.client_id)
		.where('doc.deleted_at', 'is', null)
		.execute();

	return result;
}

/**
 * Batch soft delete all documents in a group and its child groups.
 * Uses recursive CTE to find all group IDs, then batch UPDATE with RETURNING.
 *
 * @param ctx - request context
 * @param groupId - parent group id
 * @returns array of archived documents with fields needed for logging
 */
export async function archiveDocsInGroupRecursive(ctx: ProtectedContext, groupId: string) {
	const clientId = ctx.session.user.client_id!;

	// Use recursive CTE to get all group IDs, then batch UPDATE all docs
	return await ctx.db
		.withRecursive('group_tree', (db) =>
			db
				.selectFrom('doc_group')
				.select(['id'])
				.where('id', '=', groupId)
				.where('client_id', '=', clientId)
				.where('deleted_at', 'is', null)
				.unionAll(
					db
						.selectFrom('doc_group')
						.innerJoin('group_tree', 'doc_group.parent_group_id', 'group_tree.id')
						.select(['doc_group.id'])
						.where('doc_group.client_id', '=', clientId)
						.where('doc_group.deleted_at', 'is', null)
				)
		)
		.updateTable('doc')
		.set({
			deleted_at: sql`now()`,
			deleted_by: ctx.session.user.id,
		})
		.where('doc.doc_group_id', 'in', (eb) => eb.selectFrom('group_tree').select('id'))
		.where('doc.client_id', '=', clientId)
		.where('doc.deleted_at', 'is', null)
		.returning(['id', 'filename', 'alias', 'doc_type', 'claim_id'])
		.execute();
}

/**
 * Batch soft delete a group and all its child groups.
 * Uses recursive CTE to find all group IDs, then batch UPDATE with RETURNING.
 *
 * @param ctx - request context
 * @param groupId - parent group id
 * @returns array of archived groups with fields needed for logging
 */
export async function archiveDocGroupRecursive(ctx: ProtectedContext, groupId: string) {
	const clientId = ctx.session.user.client_id!;

	// Use recursive CTE to get all group IDs, then batch UPDATE all groups
	return await ctx.db
		.withRecursive('group_tree', (db) =>
			db
				.selectFrom('doc_group')
				.select(['id'])
				.where('id', '=', groupId)
				.where('client_id', '=', clientId)
				.where('deleted_at', 'is', null)
				.unionAll(
					db
						.selectFrom('doc_group')
						.innerJoin('group_tree', 'doc_group.parent_group_id', 'group_tree.id')
						.select(['doc_group.id'])
						.where('doc_group.client_id', '=', clientId)
						.where('doc_group.deleted_at', 'is', null)
				)
		)
		.updateTable('doc_group')
		.set({
			deleted_at: sql`now()`,
			deleted_by: ctx.session.user.id,
		})
		.where('doc_group.id', 'in', (eb) => eb.selectFrom('group_tree').select('id'))
		.where('doc_group.client_id', '=', clientId)
		.where('doc_group.deleted_at', 'is', null)
		.returning(['id', 'name', 'group_type', 'parent_group_id'])
		.execute();
}

/**
 * Soft delete a single document.
 *
 * @param ctx - request context
 * @param docId - document identifier
 * @returns archived document with fields needed for logging
 */
export async function archiveDoc(ctx: ProtectedContext, docId: string) {
	return await ctx.db
		.updateTable('doc')
		.set({
			deleted_at: sql`now()`,
			deleted_by: ctx.session.user.id,
		})
		.where('id', '=', docId)
		.where('client_id', '=', ctx.session.user.client_id)
		.where('deleted_at', 'is', null)
		.returning(['id', 'filename', 'alias', 'doc_type', 'claim_id', 'storage_key'])
		.executeTakeFirst();
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
export async function getDocCountByClaimId(
	ctx: ProtectedContext,
	claimId: string
): Promise<number> {
	const result = await ctx.db
		.selectFrom('doc')
		.select((eb) => eb.fn.count<string>('id').as('count'))
		.where('claim_id', '=', claimId)
		.where('client_id', '=', ctx.session.user.client_id)
		.where('deleted_at', 'is', null)
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
export async function getDocCountByGroupId(
	ctx: ProtectedContext,
	groupId: string
): Promise<number> {
	const result = await ctx.db
		.selectFrom('doc')
		.select((eb) => eb.fn.count<string>('id').as('count'))
		.where('doc_group_id', '=', groupId)
		.where('client_id', '=', ctx.session.user.client_id)
		.where('deleted_at', 'is', null)
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
export async function docExists(ctx: ProtectedContext, docId: string): Promise<boolean> {
	const result = await ctx.db
		.selectFrom('doc')
		.select('id')
		.where('id', '=', docId)
		.where('client_id', '=', ctx.session.user.client_id)
		.where('deleted_at', 'is', null)
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
export async function getOrCreateUsersFolder(ctx: ProtectedContext): Promise<string> {
	// Always attempt to create Users folder (unique constraint prevents duplicates)
	const result = await ctx.db
		.insertInto('doc_group')
		.values({
			name: 'Users',
			description: 'User-specific document folders' as string | null,
			client_id: ctx.session.user.client_id!,
			group_type: DocGroupType.CATEGORY,
			parent_group_id: null,
			system: true,
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
			.where('deleted_at', 'is', null)
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
export async function getOrCreateUserFolder(
	ctx: ProtectedContext,
	userId: string
): Promise<string> {
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
			.where('deleted_at', 'is', null)
			.executeTakeFirstOrThrow();
		return existing.id;
	}

	return result.id;
}

/**
 * Get or create the root "Shared" folder.
 * This folder is used for documents that should be accessible to all users in the client.
 *
 * @param ctx - request context
 * @returns the Shared folder id
 */
export async function getOrCreateSharedFolder(ctx: ProtectedContext): Promise<string> {
	// Always attempt to create Shared folder (unique constraint prevents duplicates)
	const result = await ctx.db
		.insertInto('doc_group')
		.values({
			name: 'Shared',
			description: 'Shared documents accessible to all users' as string | null,
			client_id: ctx.session.user.client_id!,
			group_type: DocGroupType.CATEGORY,
			parent_group_id: null,
			system: true,
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
			.where('name', '=', 'Shared')
			.where('group_type', '=', DocGroupType.CATEGORY)
			.where('parent_group_id', 'is', null)
			.where('system', '=', true)
			.where('deleted_at', 'is', null)
			.executeTakeFirstOrThrow();
		return existing.id;
	}

	return result.id;
}

/**
 * Get the Shared folder and all its contents (folders and documents) recursively.
 * Used for displaying the shared folder view to regular users.
 *
 * @param ctx - request context
 * @returns object with shared folder info, child folders, and documents
 */
export async function getSharedFolderContents(ctx: ProtectedContext) {
	// Ensure Shared folder exists
	const sharedFolderId = await getOrCreateSharedFolder(ctx);

	// Get the shared folder
	const sharedFolder = await ctx.db
		.selectFrom('doc_group')
		.selectAll()
		.where('id', '=', sharedFolderId)
		.where('client_id', '=', ctx.session.user.client_id)
		.where('deleted_at', 'is', null)
		.executeTakeFirstOrThrow();

	// Get all child folders recursively using CTE (non-deleted only)
	const childFolders = await ctx.db
		.withRecursive('folder_tree', (db) =>
			db
				.selectFrom('doc_group')
				.selectAll()
				.where('parent_group_id', '=', sharedFolderId)
				.where('client_id', '=', ctx.session.user.client_id)
				.where('deleted_at', 'is', null)
				.unionAll(
					db
						.selectFrom('doc_group')
						.innerJoin('folder_tree', 'doc_group.parent_group_id', 'folder_tree.id')
						.selectAll('doc_group')
						.where('doc_group.client_id', '=', ctx.session.user.client_id)
						.where('doc_group.deleted_at', 'is', null)
				)
		)
		.selectFrom('folder_tree')
		.selectAll()
		.orderBy('sort_order', 'asc')
		.orderBy('name', 'asc')
		.execute();

	return {
		sharedFolder,
		childFolders,
	};
}

/**
 * Get document counts for multiple group IDs in a single query.
 * Used for efficiently displaying folder document counts in the documents admin view.
 *
 * @param ctx - request context
 * @param groupIds - array of group IDs to get counts for
 * @returns array of {doc_group_id, count} objects
 */
export async function getDocCountsByGroupIds(ctx: ProtectedContext, groupIds: string[]) {
	if (groupIds.length === 0) return [];

	const results = await ctx.db
		.selectFrom('doc')
		.select(['doc_group_id', ({ fn }) => fn.count<number>('id').as('count')])
		.where('client_id', '=', ctx.session.user.client_id)
		.where('deleted_at', 'is', null)
		.where('doc_group_id', 'in', groupIds)
		.groupBy('doc_group_id')
		.execute();

	return results;
}

/**
 * Get document overview stats in a single DB round-trip.
 * Returns total count, breakdown by type, and recent upload count.
 */
export async function getDocumentStats(ctx: ProtectedContext) {
	const clientId = ctx.session.user.client_id!;

	// Single scan for totals + type breakdown in parallel (type breakdown needs GROUP BY)
	const [counts, byType] = await Promise.all([
		ctx.db
			.selectFrom('doc')
			.where('client_id', '=', clientId)
			.where('deleted_at', 'is', null)
			.select(({ fn }) => [
				fn.countAll<number>().as('total'),
				sql<number>`count(*) filter (where created_at >= now() - interval '7 days')`.as(
					'recent_uploads'
				),
			])
			.executeTakeFirstOrThrow(),
		ctx.db
			.selectFrom('doc')
			.where('client_id', '=', clientId)
			.where('deleted_at', 'is', null)
			.groupBy('doc_type')
			.select(({ fn }) => ['doc_type', fn.countAll<number>().as('count')])
			.execute(),
	]);

	return {
		total: Number(counts.total),
		recentUploads: Number(counts.recent_uploads),
		byType: byType.map((r) => ({ type: r.doc_type, count: Number(r.count) })),
	};
}
