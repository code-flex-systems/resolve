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
	DOCUMENT = 'document',

	// Recovery & deadline entities
	RECOVERY_EVENT = 'recovery_event',
	DEADLINE = 'deadline',
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
	const { entityId, entityName, action, value } = params;

	const logData = {
		client_id: ctx.session.user.client_id as string,
		user_id: ctx.session.user.id,
		entity_id: entityId.toString(),
		entity_name: entityName,
		action,
		value: value ? JSON.parse(JSON.stringify(value)) : null,
	};

	await ctx.db.insertInto('admin_action_logs').values(logData).execute();
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

	const logData = logs.map((params) => ({
		client_id: ctx.session.user.client_id as string,
		user_id: ctx.session.user.id,
		entity_id: params.entityId.toString(),
		entity_name: params.entityName,
		action: params.action,
		value: params.value ? JSON.parse(JSON.stringify(params.value)) : null,
	}));

	await ctx.db.insertInto('admin_action_logs').values(logData).execute();
}
