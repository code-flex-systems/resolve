import { WorkflowTriggerType, WorkflowActionType, WorkflowExecutionMode } from './enums';

interface WorkflowOption {
	label: string;
	description: string;
}

/**
 * Workflow Trigger Type Explanations
 * Describes what each trigger type does and when it fires
 */
export const TRIGGER_CONFIG: Record<WorkflowTriggerType, WorkflowOption> = {
	[WorkflowTriggerType.MANUAL]: {
		label: 'Manual',
		description: 'User manually triggers this rule by clicking a button or selecting an action',
	},
	[WorkflowTriggerType.CLAIM_AGE]: {
		label: 'Claim Age',
		description: 'Automatically fires when a claim has existed for a specified number of days',
	},
	[WorkflowTriggerType.LOCATION_AGE]: {
		label: 'Location Age',
		description: 'Automatically fires when a claim has been at its current desk location for a specified number of hours',
	},
	[WorkflowTriggerType.FIELD_CHANGE]: {
		label: 'Field Change',
		description: 'Fires when specific claim fields are updated (e.g., status change, amount update)',
	},
	[WorkflowTriggerType.TASK_COMPLETED]: {
		label: 'Task Completed',
		description: 'Fires when a specific task type is marked as completed on the claim',
	},
};

/**
 * Workflow Action Type Explanations
 * Describes what each action type does when executed
 */
export const ACTION_CONFIG: Record<WorkflowActionType, WorkflowOption> = {
	[WorkflowActionType.MOVE_CLAIM]: {
		label: 'Move Claim to Location',
		description: 'Moves the claim to a different desk location in the workflow',
	},
	[WorkflowActionType.CREATE_TASK]: {
		label: 'Create Task',
		description: 'Creates a new task on the claim with specified details and due date',
	},
	[WorkflowActionType.NOTIFY_USER]: {
		label: 'Notify User',
		description: 'Sends a notification to specific users about the claim',
	},
	[WorkflowActionType.UPDATE_PRIORITY]: {
		label: 'Update Priority',
		description: 'Changes the priority level of the claim',
	},
};

/**
 * Workflow Execution Mode Explanations
 * Describes how the rule will be executed
 */
export const MODE_CONFIG: Record<WorkflowExecutionMode, WorkflowOption> = {
	[WorkflowExecutionMode.SUGGEST]: {
		label: 'Suggest (Manual Approval)',
		description: 'System suggests the action but requires manual approval before executing',
	},
	[WorkflowExecutionMode.AUTO]: {
		label: 'Auto (Automatic Execution)',
		description: 'System automatically executes the action without user intervention',
	},
};

// Legacy exports for backward compatibility (just descriptions)
export const TRIGGER_EXPLANATIONS: Record<WorkflowTriggerType, string> = Object.fromEntries(
	Object.entries(TRIGGER_CONFIG).map(([key, value]) => [key, value.description])
) as Record<WorkflowTriggerType, string>;

export const ACTION_EXPLANATIONS: Record<WorkflowActionType, string> = Object.fromEntries(
	Object.entries(ACTION_CONFIG).map(([key, value]) => [key, value.description])
) as Record<WorkflowActionType, string>;

export const MODE_EXPLANATIONS: Record<WorkflowExecutionMode, string> = Object.fromEntries(
	Object.entries(MODE_CONFIG).map(([key, value]) => [key, value.description])
) as Record<WorkflowExecutionMode, string>;
