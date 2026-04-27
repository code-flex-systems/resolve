import type { ProtectedContext } from '@/server/trpc/trpc';
import { WorkflowActionType, type TaskType } from '@/config/enums';
import * as deskQueries from '@/api/queries/deskQueries';
import * as taskQueries from '@/api/queries/taskQueries';

// =============================================================================
// TYPES
// =============================================================================

export interface ActionExecutorInput {
	/** Protected context — must be within a transaction for atomicity */
	ctx: ProtectedContext;
	/** The claim being acted on */
	claimId: string;
	/** The claim's current desk location (may be null) */
	currentDeskLocationId: string | null;
	/** Action-specific configuration from the workflow rule */
	actionConfig: Record<string, unknown>;
	/** The rule that triggered this action */
	ruleId: string;
	/** The rule name (for logging/templates) */
	ruleName: string;
	/** Pre-fetched claim number to avoid redundant DB lookups. If omitted, executors that need it will fetch. */
	claimNumber?: string | null;
}

export interface ActionExecutorResult {
	success: boolean;
	data?: Record<string, unknown>;
	error?: string;
}

// =============================================================================
// MAIN DISPATCHER
// =============================================================================

/**
 * Execute a workflow action based on the action type.
 * Dispatches to the appropriate executor.
 *
 * @param actionType - The type of action to execute
 * @param input - The executor input containing context, claim, and config
 * @returns The result of the action execution
 */
export async function executeAction(
	actionType: WorkflowActionType,
	input: ActionExecutorInput
): Promise<ActionExecutorResult> {
	switch (actionType) {
		case WorkflowActionType.MOVE_CLAIM:
			return executeMoveClaim(input);
		case WorkflowActionType.CREATE_TASK:
			return executeCreateTask(input);
		case WorkflowActionType.NOTIFY_USER:
			return executeNotifyUser(input);
		case WorkflowActionType.UPDATE_PRIORITY:
			return executeUpdatePriority(input);
		default:
			return { success: false, error: `Unsupported action type: ${actionType}` };
	}
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Resolve the claim number, using the pre-fetched value if available.
 */
async function resolveClaimNumber(input: ActionExecutorInput): Promise<string> {
	if (input.claimNumber != null) {
		return input.claimNumber || `#${input.claimId}`;
	}

	const claim = await input.ctx.db
		.selectFrom('claim')
		.select(['claim_number'])
		.where('id', '=', input.claimId)
		.where('client_id', '=', input.ctx.session.user.client_id)
		.executeTakeFirst();

	return claim?.claim_number ?? `#${input.claimId}`;
}

// =============================================================================
// MOVE_CLAIM
// =============================================================================

interface MoveClaimConfig {
	destination_location_id: string;
}

/**
 * Move a claim to a different desk location.
 * Updates claim.desk_location_id and records the transition.
 * Idempotent: skips if claim is already at the destination.
 */
async function executeMoveClaim(input: ActionExecutorInput): Promise<ActionExecutorResult> {
	const config = input.actionConfig as unknown as MoveClaimConfig;

	if (!config.destination_location_id) {
		return { success: false, error: 'Missing destination_location_id in action config' };
	}

	// Idempotent: skip if already at destination
	if (input.currentDeskLocationId === config.destination_location_id) {
		return {
			success: true,
			data: {
				skipped: true,
				reason: 'Claim already at destination',
				currentLocationId: input.currentDeskLocationId,
			},
		};
	}

	// Record the transition
	const transition = await deskQueries.createClaimTransition(input.ctx, {
		claimId: input.claimId,
		deskLocationId: config.destination_location_id,
		previousDeskLocationId: input.currentDeskLocationId ?? undefined,
		enteredReason: `rule:${input.ruleId}`,
	});

	// Update the claim's current desk location
	await deskQueries.updateClaimDeskLocation(input.ctx, input.claimId, config.destination_location_id);

	return {
		success: true,
		data: {
			previousLocationId: input.currentDeskLocationId,
			newLocationId: config.destination_location_id,
			transitionId: transition.id,
		},
	};
}

// =============================================================================
// CREATE_TASK
// =============================================================================

interface CreateTaskConfig {
	task_type?: string;
	target_location_id: string;
	work_units?: number;
	title_template: string;
	description?: string;
	deadline_date?: string;
	deadline_description?: string;
}

/**
 * Create a task at a target desk location for the claim.
 * Supports {claim_number} placeholder in title_template.
 * Optionally creates a linked deadline if deadline_date is provided.
 */
async function executeCreateTask(input: ActionExecutorInput): Promise<ActionExecutorResult> {
	const config = input.actionConfig as unknown as CreateTaskConfig;

	if (!config.title_template) {
		return { success: false, error: 'Missing title_template in action config' };
	}

	if (!config.target_location_id) {
		return { success: false, error: 'Missing target_location_id in action config' };
	}

	const claimNumber = await resolveClaimNumber(input);
	const title = config.title_template.replace(/\{claim_number\}/g, claimNumber);

	const task = await taskQueries.createTask(input.ctx, {
		claimId: input.claimId,
		deskLocationId: config.target_location_id,
		taskType: (config.task_type as TaskType) ?? undefined,
		title,
		description: config.description,
		workUnits: config.work_units,
		deadlineDate: config.deadline_date,
		deadlineDescription: config.deadline_description,
	});

	return {
		success: true,
		data: { taskId: task.id, title },
	};
}

// =============================================================================
// NOTIFY_USER
// =============================================================================

interface NotifyUserConfig {
	user_id: string;
	message_template: string;
}

/**
 * Store notification intent for a user.
 * Actual delivery is deferred until notification infrastructure is built.
 * For now, the intent is recorded in result_data of the execution log.
 */
async function executeNotifyUser(input: ActionExecutorInput): Promise<ActionExecutorResult> {
	const config = input.actionConfig as unknown as NotifyUserConfig;

	if (!config.user_id || !config.message_template) {
		return { success: false, error: 'Missing user_id or message_template in action config' };
	}

	const claimNumber = await resolveClaimNumber(input);
	const message = config.message_template.replace(/\{claim_number\}/g, claimNumber);

	return {
		success: true,
		data: {
			userId: config.user_id,
			message,
			deliveryStatus: 'stored',
		},
	};
}

// =============================================================================
// UPDATE_PRIORITY
// =============================================================================

interface UpdatePriorityConfig {
	user_id: string;
	desk_location_id: string;
	new_priority: number;
}

/**
 * Update a user's priority at a desk location.
 * Follows the same pattern as suggestion execution in workflowAnalyticsController.
 */
async function executeUpdatePriority(input: ActionExecutorInput): Promise<ActionExecutorResult> {
	const config = input.actionConfig as unknown as UpdatePriorityConfig;

	if (!config.user_id || !config.desk_location_id || config.new_priority == null) {
		return {
			success: false,
			error: 'Missing user_id, desk_location_id, or new_priority in action config',
		};
	}

	// Get current priority for audit trail
	const current = await input.ctx.db
		.selectFrom('user_desk_location')
		.select(['priority'])
		.where('user_id', '=', config.user_id)
		.where('desk_location_id', '=', config.desk_location_id)
		.where('removed_at', 'is', null)
		.executeTakeFirst();

	if (!current) {
		return {
			success: false,
			error: `User ${config.user_id} not assigned to desk location ${config.desk_location_id}`,
		};
	}

	// Idempotent: skip if already at the target priority
	if (current.priority === config.new_priority) {
		return {
			success: true,
			data: {
				skipped: true,
				reason: 'User already at target priority',
				userId: config.user_id,
				deskLocationId: config.desk_location_id,
				currentPriority: current.priority,
			},
		};
	}

	await input.ctx.db
		.updateTable('user_desk_location')
		.set({ priority: config.new_priority })
		.where('user_id', '=', config.user_id)
		.where('desk_location_id', '=', config.desk_location_id)
		.where('removed_at', 'is', null)
		.execute();

	return {
		success: true,
		data: {
			userId: config.user_id,
			deskLocationId: config.desk_location_id,
			oldPriority: current.priority,
			newPriority: config.new_priority,
		},
	};
}
