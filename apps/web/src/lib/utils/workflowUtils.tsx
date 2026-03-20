import { WorkflowThresholdType, WorkflowTriggerType, WorkflowActionType, RuleExecutionStatus } from '@/config/enums';

export const formatThresholdType = (type: WorkflowThresholdType): string => {
	const map: Record<WorkflowThresholdType, string> = {
		[WorkflowThresholdType.USER_CAPACITY]: 'User Capacity',
		[WorkflowThresholdType.LOCATION_AGE]: 'Location Age',
		[WorkflowThresholdType.TASK_DUE]: 'Task Due Warning',
	};
	return map[type] || type;
};

export const formatTriggerType = (type: WorkflowTriggerType): string => {
	const map: Record<WorkflowTriggerType, string> = {
		[WorkflowTriggerType.MANUAL]: 'Manual',
		[WorkflowTriggerType.CLAIM_AGE]: 'Claim Age',
		[WorkflowTriggerType.LOCATION_AGE]: 'Location Age',
		[WorkflowTriggerType.FIELD_CHANGE]: 'Field Change',
		[WorkflowTriggerType.TASK_COMPLETED]: 'Task Completed',
	};
	return map[type] || type;
};

export const formatActionType = (type: WorkflowActionType): string => {
	const map: Record<WorkflowActionType, string> = {
		[WorkflowActionType.MOVE_CLAIM]: 'Move Claim',
		[WorkflowActionType.CREATE_TASK]: 'Create Task',
		[WorkflowActionType.NOTIFY_USER]: 'Notify User',
		[WorkflowActionType.UPDATE_PRIORITY]: 'Update Priority',
	};
	return map[type] || type;
};

export const EXECUTION_STATUS_CONFIG: Record<RuleExecutionStatus, { label: string; color: 'info' | 'success' | 'error' | 'neutral' }> = {
	[RuleExecutionStatus.PENDING]: { label: 'Pending', color: 'info' },
	[RuleExecutionStatus.EXECUTED]: { label: 'Executed', color: 'success' },
	[RuleExecutionStatus.FAILED]: { label: 'Failed', color: 'error' },
	[RuleExecutionStatus.SKIPPED]: { label: 'Skipped', color: 'neutral' },
};

export const getThresholdUnit = (type: WorkflowThresholdType): string => {
	const units: Record<WorkflowThresholdType, string> = {
		[WorkflowThresholdType.USER_CAPACITY]: 'claims',
		[WorkflowThresholdType.LOCATION_AGE]: 'hours',
		[WorkflowThresholdType.TASK_DUE]: 'days',
	};
	return units[type] || '';
};
