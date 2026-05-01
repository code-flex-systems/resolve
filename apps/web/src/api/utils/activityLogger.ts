import { ProtectedContext } from '@/server/trpc/trpc';
import config from '@/config/config';

/**
 * Action types that can be logged across both admin and user workflows
 */
export enum LogAction {
	// Admin CRUD actions
	CREATE = 'CREATE',
	UPDATE = 'UPDATE',
	DELETE = 'DELETE',
	BULK_UPDATE = 'BULK_UPDATE',
	BULK_DELETE = 'BULK_DELETE',

	// User workflow actions
	ASSIGN = 'ASSIGN',
	UNASSIGN = 'UNASSIGN',
	START = 'START',
	COMPLETE = 'COMPLETE',
	CANCEL = 'CANCEL',
}

/**
 * Actor type - who performed the action
 */
export enum ActorType {
	ADMIN = 'admin',
	USER = 'user',
}

/**
 * Entity types that actions can be performed on
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
	PARTY_ADDRESS = 'party_address',
	PARTY_PHONE = 'party_phone',
	PARTY_EMAIL = 'party_email',
	PARTY_REPRESENTATIVE = 'party_representative',
	CLAIM_PARTY = 'claim_party',

	// Desk management entities (Phase 1+2)
	DESK_LOCATION_TYPE = 'desk_location_type',
	DESK_LOCATION = 'desk_location',
	USER_DESK_LOCATION = 'user_desk_location',

	// Workflow management entities (Phase 3)
	TASK = 'task',
	WORKFLOW_DEFINITION = 'workflow_definition',
	WORKFLOW_THRESHOLD = 'workflow_threshold',
	WORKFLOW_RULE = 'workflow_rule',
	WORKFLOW_RULE_EXECUTION = 'workflow_rule_execution',
	CLAIM_DESK_LOCATION_TRANSITION = 'claim_desk_location_transition',

	// Reference data management entities
	REFERENCE_LIST = 'reference_list',
	REFERENCE_OPTION = 'reference_option',

	// Statute rules (global config entity)
	STATUTE_RULE = 'statute_rule',
}

/**
 * Config entities - these go to admin_config_logs
 */
const CONFIG_ENTITIES: Set<EntityName> = new Set([
	EntityName.USER,
	EntityName.CLIENT,
	EntityName.CHECKLIST,
	EntityName.PAGE,
	EntityName.QUESTION,
	EntityName.ANSWER,
	EntityName.FEED,
	EntityName.ACTION,
	EntityName.DOC_GROUP,
	EntityName.DESK_LOCATION_TYPE,
	EntityName.DESK_LOCATION,
	EntityName.USER_DESK_LOCATION,
	EntityName.PARTY,
	EntityName.PARTY_ADDRESS,
	EntityName.PARTY_PHONE,
	EntityName.PARTY_EMAIL,
	EntityName.PARTY_REPRESENTATIVE,
	EntityName.PAGE_INSTANCE,
	EntityName.STATUTE_RULE,
	EntityName.REFERENCE_LIST,
	EntityName.REFERENCE_OPTION,
	EntityName.WORKFLOW_DEFINITION,
	EntityName.WORKFLOW_THRESHOLD,
	EntityName.WORKFLOW_RULE,
]);

/**
 * Claim-related entities - these go to claim_activity_logs
 */
const CLAIM_ENTITIES: Set<EntityName> = new Set([
	EntityName.CLAIM,
	EntityName.TASK,
	EntityName.DEADLINE,
	EntityName.RECOVERY_EVENT,
	EntityName.SETTLEMENT,
	EntityName.CLAIM_COVERAGE,
	EntityName.CLAIM_PARTY,
	EntityName.CLAIM_PAYMENT,
	EntityName.DOCUMENT,
	EntityName.CHECKLIST_CLAIM,
	EntityName.COMMENT,
	EntityName.CLAIM_DESK_LOCATION_TRANSITION,
]);

/**
 * Check if an entity is a config entity
 */
function isConfigEntity(entityName: EntityName): boolean {
	return CONFIG_ENTITIES.has(entityName);
}

/**
 * Check if an entity is a claim-related entity
 */
function isClaimEntity(entityName: EntityName): boolean {
	return CLAIM_ENTITIES.has(entityName);
}

/**
 * Derive claim_id from entity
 */
async function deriveClaimId(
	ctx: ProtectedContext,
	entityName: EntityName,
	entityId: string | number
): Promise<string | null> {
	const id = entityId.toString();

	// Direct claim reference
	if (entityName === EntityName.CLAIM) {
		return id;
	}

	// For comment, check if it has a claim_id column
	if (entityName === EntityName.COMMENT) {
		const comment = await ctx.db
			.selectFrom('comment')
			.select('claim_id')
			.where('id', '=', id)
			.executeTakeFirst();
		return comment?.claim_id ?? null;
	}

	// Task -> claim_id
	if (entityName === EntityName.TASK) {
		const task = await ctx.db
			.selectFrom('task')
			.select('claim_id')
			.where('id', '=', id)
			.executeTakeFirst();
		return task?.claim_id ?? null;
	}

	// Deadline -> claim_id
	if (entityName === EntityName.DEADLINE) {
		const deadline = await ctx.db
			.selectFrom('deadline')
			.select('claim_id')
			.where('id', '=', id)
			.executeTakeFirst();
		return deadline?.claim_id ?? null;
	}

	// Recovery event -> claim_id
	if (entityName === EntityName.RECOVERY_EVENT) {
		const recoveryEvent = await ctx.db
			.selectFrom('recovery_event')
			.select('claim_id')
			.where('id', '=', id)
			.executeTakeFirst();
		return recoveryEvent?.claim_id ?? null;
	}

	// Settlement -> claim_id
	if (entityName === EntityName.SETTLEMENT) {
		const settlement = await ctx.db
			.selectFrom('settlement')
			.select('claim_id')
			.where('id', '=', id)
			.executeTakeFirst();
		return settlement?.claim_id ?? null;
	}

	// Claim payment -> claim_id
	if (entityName === EntityName.CLAIM_PAYMENT) {
		const payment = await ctx.db
			.selectFrom('claim_payment')
			.select('claim_id')
			.where('id', '=', id)
			.executeTakeFirst();
		return payment?.claim_id ?? null;
	}

	// Claim coverage -> claim_id
	if (entityName === EntityName.CLAIM_COVERAGE) {
		const claimCoverage = await ctx.db
			.selectFrom('claim_coverage')
			.select('claim_id')
			.where('id', '=', id)
			.executeTakeFirst();
		return claimCoverage?.claim_id ?? null;
	}

	// Claim party -> claim_id
	if (entityName === EntityName.CLAIM_PARTY) {
		const claimParty = await ctx.db
			.selectFrom('claim_party')
			.select('claim_id')
			.where('id', '=', id)
			.executeTakeFirst();
		return claimParty?.claim_id ?? null;
	}

	// Document -> claim_id
	if (entityName === EntityName.DOCUMENT) {
		const doc = await ctx.db
			.selectFrom('doc')
			.select('claim_id')
			.where('id', '=', id)
			.executeTakeFirst();
		return doc?.claim_id ?? null;
	}

	// Checklist claim - extract from value
	if (entityName === EntityName.CHECKLIST_CLAIM) {
		// This will be handled by the caller passing claim_id explicitly
		return null;
	}

	return null;
}

/**
 * Detect actor type based on user's role
 * Admin and Super Admin users are logged as 'admin', all others as 'user'
 */
function detectActorType(ctx: ProtectedContext): ActorType {
	const role = ctx.session.user.role;
	const isAdmin = role === config.ROLES.ADMIN || role === config.ROLES.SUPER_ADMIN;
	return isAdmin ? ActorType.ADMIN : ActorType.USER;
}

export interface LogActionParams {
	entityId: string | number;
	entityName: EntityName;
	action: LogAction;
	value?: any;
	actorType?: ActorType; // Auto-detected if not provided
	claimId?: string; // Auto-derived for claim entities if not provided
}

/**
 * Main logging function - auto-routes to correct table based on entity type
 *
 * This replaces logAdminAction and handles both admin and user activity logging.
 *
 * @param ctx - The protected context containing user, client info, and db (with transaction if applicable)
 * @param params - The log parameters
 *
 * @example
 * // Admin config action
 * await logAction(ctx, {
 *   entityId: userId,
 *   entityName: EntityName.USER,
 *   action: LogAction.UPDATE,
 *   value: { email: newEmail }
 * });
 *
 * @example
 * // User workflow action (within transaction)
 * await ctx.db.transaction().execute(async (trx) => {
 *   const task = await startTask({ ...ctx, db: trx }, taskId);
 *   await logAction({ ...ctx, db: trx }, {
 *     entityId: taskId,
 *     entityName: EntityName.TASK,
 *     action: LogAction.START,
 *     claimId: task.claim_id // Optional, will be auto-derived
 *   });
 * });
 */
export async function logAction(ctx: ProtectedContext, params: LogActionParams): Promise<void> {
	const { entityId, entityName, action, value } = params;

	// Auto-detect actor type if not provided (based on user's role)
	const actorType = params.actorType ?? detectActorType(ctx);

	// Route to appropriate table
	if (isConfigEntity(entityName)) {
		// Log to admin_config_logs
		await ctx.db
			.insertInto('admin_config_logs')
			.values({
				client_id: ctx.session.user.client_id as string,
				user_id: ctx.session.user.id,
				entity_id: entityId.toString(),
				entity_name: entityName,
				action,
				value: value ? JSON.parse(JSON.stringify(value)) : null,
			})
			.execute();
	} else if (isClaimEntity(entityName)) {
		// Derive claim_id if not provided
		const claimId = params.claimId ?? (await deriveClaimId(ctx, entityName, entityId));

		if (claimId === null) {
			console.warn(`Could not derive claim_id for ${entityName} ${entityId}. Skipping log.`);
			return;
		}

		// Log to claim_activity_logs
		await ctx.db
			.insertInto('claim_activity_logs')
			.values({
				client_id: ctx.session.user.client_id as string,
				user_id: ctx.session.user.id,
				claim_id: claimId,
				entity_id: entityId.toString(),
				entity_name: entityName,
				action,
				actor_type: actorType,
				value: value ? JSON.parse(JSON.stringify(value)) : null,
			})
			.execute();
	} else {
		console.warn(`Unknown entity type: ${entityName}. Skipping log.`);
	}
}

/**
 * Convenience wrapper for user workflow actions
 *
 * @param ctx - The protected context
 * @param params - Workflow action parameters
 *
 * @example
 * await logUserWorkflowAction(ctx, {
 *   claimId: 123,
 *   action: 'task_assign',
 *   entityId: taskId,
 * });
 */
export async function logUserWorkflowAction(
	ctx: ProtectedContext,
	params: {
		claimId: string;
		action:
			| 'task_assign'
			| 'task_unassign'
			| 'task_start'
			| 'task_complete'
			| 'deadline_complete'
			| 'comment_create';
		entityId: string;
		value?: any;
	}
): Promise<void> {
	const actionMap: Record<typeof params.action, { entityName: EntityName; logAction: LogAction }> =
		{
			task_assign: { entityName: EntityName.TASK, logAction: LogAction.ASSIGN },
			task_unassign: { entityName: EntityName.TASK, logAction: LogAction.UNASSIGN },
			task_start: { entityName: EntityName.TASK, logAction: LogAction.START },
			task_complete: { entityName: EntityName.TASK, logAction: LogAction.COMPLETE },
			deadline_complete: { entityName: EntityName.DEADLINE, logAction: LogAction.COMPLETE },
			comment_create: { entityName: EntityName.COMMENT, logAction: LogAction.CREATE },
		};

	const { entityName, logAction: action } = actionMap[params.action];

	await logAction(ctx, {
		entityId: params.entityId,
		entityName,
		action,
		claimId: params.claimId,
		value: params.value,
	});
}

/**
 * Helper to log multiple actions in bulk (useful for bulk operations)
 *
 * @param ctx - The protected context containing user, client info, and db (with transaction if applicable)
 * @param logs - Array of log parameters
 */
export async function logActions(ctx: ProtectedContext, logs: LogActionParams[]): Promise<void> {
	if (logs.length === 0) return;

	const allConfig = logs.every((log) => isConfigEntity(log.entityName));
	const allClaim = logs.every((log) => isClaimEntity(log.entityName));

	// If logs contain mixed entity types, fall back to sequential logging
	if (!allConfig && !allClaim) {
		for (const log of logs) {
			await logAction(ctx, log);
		}
		return;
	}

	if (allConfig) {
		await ctx.db
			.insertInto('admin_config_logs')
			.values(
				logs.map((log) => ({
					client_id: ctx.session.user.client_id as string,
					user_id: ctx.session.user.id,
					entity_id: log.entityId.toString(),
					entity_name: log.entityName,
					action: log.action,
					value: log.value ? JSON.parse(JSON.stringify(log.value)) : null,
				}))
			)
			.execute();
		return;
	}

	// Claim entity logs
	const rows = await Promise.all(
		logs.map(async (log) => {
			const claimId = log.claimId ?? (await deriveClaimId(ctx, log.entityName, log.entityId));
			if (claimId === null) {
				console.warn(
					`Could not derive claim_id for ${log.entityName} ${log.entityId}. Skipping log.`
				);
				return null;
			}

			const actorType = log.actorType ?? detectActorType(ctx);
			return {
				client_id: ctx.session.user.client_id as string,
				user_id: ctx.session.user.id,
				claim_id: claimId,
				entity_id: log.entityId.toString(),
				entity_name: log.entityName,
				action: log.action,
				actor_type: actorType,
				value: log.value ? JSON.parse(JSON.stringify(log.value)) : null,
			};
		})
	);

	const validRows = rows.filter((row): row is NonNullable<typeof row> => row !== null);
	if (validRows.length === 0) return;

	await ctx.db.insertInto('claim_activity_logs').values(validRows).execute();
}

// Re-export for backwards compatibility
export { EntityName as AdminEntityName, LogAction as AdminAction };
export type AdminActionLogParams = LogActionParams;
export const logAdminAction = logAction;
export const logAdminActions = logActions;
