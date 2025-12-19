import { ProtectedContext } from '@/server/trpc/trpc';

/**
 * Admin action types that can be logged
 */
export enum AdminAction {
	CREATE = 'CREATE',
	UPDATE = 'UPDATE',
	DELETE = 'DELETE',
	BULK_UPDATE = 'BULK_UPDATE',
	BULK_DELETE = 'BULK_DELETE',
}

/**
 * Entity types that admin actions can be performed on
 */
export enum EntityName {
	// Core entities
	USER = 'user',
	CLIENT = 'client',
	CHECKLIST = 'checklist',
	CLAIM = 'claim',
	CHECKLIST_CLAIM = 'checklist_claim',
	CLAIM_COVERAGE = 'claim_coverage',

	// Template entities
	PAGE = 'page',
	PAGE_INSTANCE = 'page_instance',
	QUESTION = 'question',
	ANSWER = 'answer',

	// Response entities
	QUESTION_RESPONSE = 'question_response',
	COMMENT = 'comment',

	// Configuration entities
	FEED = 'feed',
	ACTION = 'action',

	// Document entities
	DOCUMENT = 'document',
	DOC_GROUP = 'doc_group',

	// Recovery & deadline entities
	RECOVERY_EVENT = 'recovery_event',
	SETTLEMENT = 'settlement',
	CLAIM_PAYMENT = 'claim_payment',
	DEADLINE = 'deadline',

	// Party management entities
	PARTY = 'party',
	PARTY_OFFICE = 'party_office',
	PARTY_REPRESENTATIVE = 'party_representative',
	CLAIM_PARTY = 'claim_party',

	// Desk management entities (Phase 1+2)
	DESK_LOCATION_TYPE = 'desk_location_type',
	DESK_LOCATION = 'desk_location',
	USER_DESK_LOCATION = 'user_desk_location',

	// Workflow management entities (Phase 3)
	TASK = 'task',

	// Reference data management entities
	REFERENCE_LIST = 'reference_list',
	REFERENCE_OPTION = 'reference_option',
}

export interface AdminActionLogParams {
	entityId: string | number;
	entityName: EntityName;
	action: AdminAction;
	value?: any;
}

/**
 * Log an admin action to the admin_action_logs table.
 * This should be called within transactions where admins perform sensitive operations.
 *
 * @param ctx - The protected context containing user, client info, and db (with transaction if applicable)
 * @param params - The log parameters
 *
 * @example
 * // Within a transaction
 * await ctx.db.transaction().execute(async (trx) => {
 *   const newPage = await trx.insertInto('page')...
 *   await logAdminAction({ ...ctx, db: trx }, {
 *     entityId: newPage.id,
 *     entityName: EntityName.PAGE,
 *     action: AdminAction.CREATE,
 *     value: { title: newPage.title }
 *   });
 * });
 *
 * @example
 * // Standalone logging
 * await logAdminAction(ctx, {
 *   entityId: userId,
 *   entityName: EntityName.USER,
 *   action: AdminAction.DELETE,
 * });
 */
export async function logAdminAction(
	ctx: ProtectedContext,
	params: AdminActionLogParams
): Promise<void> {
	// Import and use the new activity logger for auto-routing
	const { logAction } = await import('./activityLogger');

	await logAction(ctx, {
		entityId: params.entityId,
		entityName: params.entityName as any, // Type compatibility
		action: params.action as any,
		value: params.value,
	});
}

/**
 * Helper to log multiple admin actions in bulk (useful for bulk operations)
 *
 * @param ctx - The protected context containing user, client info, and db (with transaction if applicable)
 * @param logs - Array of log parameters
 */
export async function logAdminActions(
	ctx: ProtectedContext,
	logs: AdminActionLogParams[]
): Promise<void> {
	if (logs.length === 0) return;

	// Import and use the new activity logger for auto-routing
	const { logActions } = await import('./activityLogger');

	await logActions(
		ctx,
		logs.map((params) => ({
			entityId: params.entityId,
			entityName: params.entityName as any,
			action: params.action as any,
			value: params.value,
		}))
	);
}
