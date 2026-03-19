import { z } from 'zod';
import {
	WorkflowThresholdType,
	WorkflowTriggerType,
	WorkflowActionType,
	WorkflowExecutionMode,
	RuleExecutionStatus,
} from '@/config/enums';
import {
	WORKFLOW_CONDITION_FIELDS,
	CONDITION_OPERATORS,
} from '@/lib/workflow/ruleConditions';

// ============================================================================
// CONDITION SCHEMAS
// ============================================================================

/**
 * Valid condition operators - uses the canonical list from ruleConditions.ts
 */
const conditionOperatorSchema = z.enum(CONDITION_OPERATORS);

/**
 * Valid field names from the field registry
 */
const validFieldNames = WORKFLOW_CONDITION_FIELDS.map((f) => f.field) as [string, ...string[]];
const conditionFieldSchema = z.enum(validFieldNames);

/**
 * A single condition in a rule
 */
export const ruleConditionSchema = z.object({
	field: conditionFieldSchema,
	operator: conditionOperatorSchema,
	value: z.unknown().optional(),
});
export type RuleConditionInput = z.infer<typeof ruleConditionSchema>;

/**
 * Complete conditions configuration for a workflow rule
 */
export const ruleConditionsSchema = z.object({
	logic: z.enum(['AND', 'OR']),
	conditions: z.array(ruleConditionSchema).min(1),
});
export type RuleConditionsInput = z.infer<typeof ruleConditionsSchema>;

// ============================================================================
// WORKFLOW DEFINITION SCHEMAS
// ============================================================================

export const getWorkflowDefinitionsInput = z.object({
	isActive: z.boolean().optional(),
});
export type GetWorkflowDefinitionsInput = z.infer<typeof getWorkflowDefinitionsInput>;

export const getWorkflowDefinitionInput = z.object({
	id: z.number().int().positive(),
});
export type GetWorkflowDefinitionInput = z.infer<typeof getWorkflowDefinitionInput>;

export const createWorkflowDefinitionInput = z.object({
	name: z.string().min(1).max(255),
	description: z.string().optional(),
	deskLocationId: z.number().int().positive().optional(),
});
export type CreateWorkflowDefinitionInput = z.infer<typeof createWorkflowDefinitionInput>;

export const updateWorkflowDefinitionInput = z.object({
	id: z.number().int().positive(),
	params: z.object({
		name: z.string().min(1).max(255).optional(),
		description: z.string().optional(),
		deskLocationId: z.number().int().positive().nullable().optional(),
		isActive: z.boolean().optional(),
	}),
});
export type UpdateWorkflowDefinitionInput = z.infer<typeof updateWorkflowDefinitionInput>;

export const deleteWorkflowDefinitionInput = z.object({
	id: z.number().int().positive(),
});
export type DeleteWorkflowDefinitionInput = z.infer<typeof deleteWorkflowDefinitionInput>;

// ============================================================================
// WORKFLOW THRESHOLD SCHEMAS
// ============================================================================

export const getWorkflowThresholdsInput = z.object({
	workflowDefinitionId: z.number().int().positive(),
});
export type GetWorkflowThresholdsInput = z.infer<typeof getWorkflowThresholdsInput>;

export const createWorkflowThresholdInput = z.object({
	workflowDefinitionId: z.number().int().positive(),
	thresholdType: z.nativeEnum(WorkflowThresholdType),
	thresholdValue: z.number().int().positive(),
});
export type CreateWorkflowThresholdInput = z.infer<typeof createWorkflowThresholdInput>;

export const updateWorkflowThresholdInput = z.object({
	id: z.number().int().positive(),
	params: z.object({
		thresholdValue: z.number().int().positive().optional(),
		isActive: z.boolean().optional(),
	}),
});
export type UpdateWorkflowThresholdInput = z.infer<typeof updateWorkflowThresholdInput>;

export const deleteWorkflowThresholdInput = z.object({
	id: z.number().int().positive(),
});
export type DeleteWorkflowThresholdInput = z.infer<typeof deleteWorkflowThresholdInput>;

// ============================================================================
// WORKFLOW RULE SCHEMAS
// ============================================================================

export const getWorkflowRulesInput = z.object({
	workflowDefinitionId: z.number().int().positive(),
});
export type GetWorkflowRulesInput = z.infer<typeof getWorkflowRulesInput>;

export const createWorkflowRuleInput = z.object({
	workflowDefinitionId: z.number().int().positive(),
	name: z.string().min(1).max(255),
	description: z.string().optional(),
	triggerType: z.nativeEnum(WorkflowTriggerType),
	actionType: z.nativeEnum(WorkflowActionType),
	actionConfig: z.record(z.unknown()).optional(),
	conditions: ruleConditionsSchema.optional(),
	executionMode: z.nativeEnum(WorkflowExecutionMode).default(WorkflowExecutionMode.SUGGEST),
	priority: z.number().int().min(1).max(1000).optional(),
});
export type CreateWorkflowRuleInput = z.infer<typeof createWorkflowRuleInput>;

export const updateWorkflowRuleInput = z.object({
	id: z.number().int().positive(),
	params: z.object({
		name: z.string().min(1).max(255).optional(),
		description: z.string().optional(),
		triggerType: z.nativeEnum(WorkflowTriggerType).optional(),
		actionType: z.nativeEnum(WorkflowActionType).optional(),
		actionConfig: z.record(z.unknown()).optional(),
		conditions: ruleConditionsSchema.optional(),
		executionMode: z.nativeEnum(WorkflowExecutionMode).optional(),
		priority: z.number().int().min(1).max(1000).optional(),
		isActive: z.boolean().optional(),
	}),
});
export type UpdateWorkflowRuleInput = z.infer<typeof updateWorkflowRuleInput>;

export const deleteWorkflowRuleInput = z.object({
	id: z.number().int().positive(),
});
export type DeleteWorkflowRuleInput = z.infer<typeof deleteWorkflowRuleInput>;

// ============================================================================
// WORKFLOW RESOLUTION SCHEMAS
// ============================================================================

export const resolveWorkflowForLocationInput = z.object({
	deskLocationId: z.number().int().positive(),
});
export type ResolveWorkflowForLocationInput = z.infer<typeof resolveWorkflowForLocationInput>;

// ============================================================================
// RULE EXECUTION SCHEMAS
// ============================================================================

export const executeRuleInput = z.object({
	ruleId: z.number().int().positive(),
	deskLocationId: z.number().int().positive().optional(),
});
export type ExecuteRuleInput = z.infer<typeof executeRuleInput>;

export const evaluateRulesByTriggerInput = z.object({
	triggerType: z.nativeEnum(WorkflowTriggerType),
	deskLocationId: z.number().int().positive().optional(),
});
export type EvaluateRulesByTriggerInput = z.infer<typeof evaluateRulesByTriggerInput>;

export const approvePendingExecutionInput = z.object({
	executionId: z.number().int().positive(),
});
export type ApprovePendingExecutionInput = z.infer<typeof approvePendingExecutionInput>;

export const rejectPendingExecutionInput = z.object({
	executionId: z.number().int().positive(),
});
export type RejectPendingExecutionInput = z.infer<typeof rejectPendingExecutionInput>;

export const getPendingExecutionsInput = z.object({
	ruleId: z.number().int().positive().optional(),
	limit: z.number().int().min(1).max(100).default(25),
	offset: z.number().int().min(0).default(0),
});
export type GetPendingExecutionsInput = z.infer<typeof getPendingExecutionsInput>;

export const getRuleExecutionHistoryInput = z.object({
	ruleId: z.number().int().positive().optional(),
	claimId: z.number().int().positive().optional(),
	status: z.nativeEnum(RuleExecutionStatus).optional(),
	limit: z.number().int().min(1).max(100).default(25),
	cursor: z
		.object({
			createdAt: z.string(),
			id: z.number().int(),
		})
		.optional(),
});
export type GetRuleExecutionHistoryInput = z.infer<typeof getRuleExecutionHistoryInput>;
