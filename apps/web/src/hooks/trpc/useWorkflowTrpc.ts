import { trpc } from '@/lib/trpc';
import type { RouterInput, RouterOutput } from '@/types/routerTypes';

type WorkflowInput = RouterInput['workflow'];
type WorkflowOutput = RouterOutput['workflow'];

/**
 * Custom hook for workflow management tRPC operations
 * Provides convenience wrappers with automatic cache invalidation
 *
 * Covers:
 * - Workflow definitions (global and location-specific)
 * - Workflow thresholds (SLA configuration)
 * - Workflow rules (automation)
 */
export function useWorkflowTrpc() {
	const utils = trpc.useUtils();

	return {
		// ====================================================================
		// WORKFLOW DEFINITION OPERATIONS
		// ====================================================================

		/**
		 * Get list of workflow definitions
		 * Can filter by desk location ID or show only active
		 */
		listDefinitions: trpc.workflow.getWorkflowDefinitions.useQuery,

		/**
		 * Get single workflow definition by ID
		 * Includes thresholds and rules
		 */
		getDefinition: trpc.workflow.getWorkflowDefinition.useQuery,

		/**
		 * Create workflow definition
		 * Can be global (no desk location) or location-specific
		 * Invalidates definition lists
		 */
		createDefinition: trpc.workflow.createWorkflowDefinition.useMutation({
			onSuccess() {
				utils.workflow.getWorkflowDefinitions.invalidate();
			},
		}),

		/**
		 * Update workflow definition
		 * Invalidates definition lists and specific definition query
		 */
		updateDefinition: trpc.workflow.updateWorkflowDefinition.useMutation({
			onSuccess({ id }) {
				utils.workflow.getWorkflowDefinitions.invalidate();
				utils.workflow.getWorkflowDefinition.invalidate({ id });
			},
		}),

		/**
		 * Archive workflow definition (soft delete)
		 * Invalidates definition lists
		 */
		archiveDefinition: trpc.workflow.archiveWorkflowDefinition.useMutation({
			onSuccess() {
				utils.workflow.getWorkflowDefinitions.invalidate();
			},
		}),

		// ====================================================================
		// WORKFLOW THRESHOLD OPERATIONS
		// ====================================================================

		/**
		 * Get thresholds for a workflow definition
		 */
		listThresholds: trpc.workflow.getWorkflowThresholds.useQuery,

		/**
		 * Create workflow threshold
		 * Defines SLA or other metric thresholds for a workflow
		 * Invalidates threshold list and parent definition
		 */
		createThreshold: trpc.workflow.createWorkflowThreshold.useMutation({
			onSuccess({ workflow_definition_id }) {
				utils.workflow.getWorkflowThresholds.invalidate({
					workflowDefinitionId: workflow_definition_id,
				});
				utils.workflow.getWorkflowDefinition.invalidate({
					id: workflow_definition_id,
				});
			},
		}),

		/**
		 * Update workflow threshold
		 * Invalidates threshold list and parent definition
		 */
		updateThreshold: trpc.workflow.updateWorkflowThreshold.useMutation({
			onSuccess({ workflow_definition_id }) {
				utils.workflow.getWorkflowThresholds.invalidate({
					workflowDefinitionId: workflow_definition_id,
				});
				utils.workflow.getWorkflowDefinition.invalidate({
					id: workflow_definition_id,
				});
			},
		}),

		/**
		 * Archive workflow threshold (soft delete)
		 * Invalidates threshold list and parent definition
		 */
		archiveThreshold: trpc.workflow.archiveWorkflowThreshold.useMutation({
			onSuccess() {
				utils.workflow.getWorkflowThresholds.invalidate();
				utils.workflow.getWorkflowDefinitions.invalidate();
			},
		}),

		// ====================================================================
		// WORKFLOW RULE OPERATIONS
		// ====================================================================

		/**
		 * Get rules for a workflow definition
		 */
		listRules: trpc.workflow.getWorkflowRules.useQuery,

		/**
		 * Create workflow rule
		 * Defines automation logic for a workflow
		 * Invalidates rule list and parent definition
		 */
		createRule: trpc.workflow.createWorkflowRule.useMutation({
			onSuccess({ workflow_definition_id }) {
				utils.workflow.getWorkflowRules.invalidate({
					workflowDefinitionId: workflow_definition_id,
				});
				utils.workflow.getWorkflowDefinition.invalidate({
					id: workflow_definition_id,
				});
			},
		}),

		/**
		 * Update workflow rule
		 * Invalidates rule list and parent definition
		 */
		updateRule: trpc.workflow.updateWorkflowRule.useMutation({
			onSuccess({ workflow_definition_id }) {
				utils.workflow.getWorkflowRules.invalidate({
					workflowDefinitionId: workflow_definition_id,
				});
				utils.workflow.getWorkflowDefinition.invalidate({
					id: workflow_definition_id,
				});
			},
		}),

		/**
		 * Archive workflow rule (soft delete)
		 * Invalidates rule list and parent definition
		 */
		archiveRule: trpc.workflow.archiveWorkflowRule.useMutation({
			onSuccess() {
				utils.workflow.getWorkflowRules.invalidate();
				utils.workflow.getWorkflowDefinitions.invalidate();
			},
		}),

		// ====================================================================
		// WORKFLOW RESOLUTION
		// ====================================================================

		/**
		 * Resolve which workflow applies to a specific desk location
		 * Returns the location-specific workflow if exists, otherwise global
		 */
		resolveForLocation: trpc.workflow.resolveWorkflowForLocation.useQuery,

		// ====================================================================
		// RULE EXECUTION OPERATIONS
		// ====================================================================

		/**
		 * Manually execute a single rule
		 * Invalidates pending executions and execution history
		 */
		executeRule: trpc.workflow.executeRule.useMutation({
			onSuccess() {
				utils.workflow.getPendingExecutions.invalidate();
				utils.workflow.getRuleExecutionHistory.invalidate();
			},
		}),

		/**
		 * Evaluate all rules for a trigger type
		 * Invalidates pending executions and execution history
		 */
		evaluateRulesByTrigger: trpc.workflow.evaluateRulesByTrigger.useMutation({
			onSuccess() {
				utils.workflow.getPendingExecutions.invalidate();
				utils.workflow.getRuleExecutionHistory.invalidate();
			},
		}),

		/**
		 * Approve a pending rule execution
		 * Invalidates pending executions and execution history
		 */
		approvePendingExecution: trpc.workflow.approvePendingExecution.useMutation({
			onSuccess() {
				utils.workflow.getPendingExecutions.invalidate();
				utils.workflow.getRuleExecutionHistory.invalidate();
			},
		}),

		/**
		 * Reject a pending rule execution
		 * Invalidates pending executions
		 */
		rejectPendingExecution: trpc.workflow.rejectPendingExecution.useMutation({
			onSuccess() {
				utils.workflow.getPendingExecutions.invalidate();
				utils.workflow.getRuleExecutionHistory.invalidate();
			},
		}),

		/**
		 * List pending rule executions for admin review
		 */
		listPendingExecutions: trpc.workflow.getPendingExecutions.useQuery,

		/**
		 * Get rule execution history with cursor pagination
		 */
		listExecutionHistory: trpc.workflow.getRuleExecutionHistory.useQuery,
	};
}

/**
 * Export types for use in components
 * These are derived from the tRPC router output types
 */
export type WorkflowDefinition = NonNullable<WorkflowOutput['getWorkflowDefinition']>;
export type WorkflowDefinitionList = WorkflowOutput['getWorkflowDefinitions'];
export type WorkflowThreshold = NonNullable<WorkflowOutput['getWorkflowThresholds']>[number];
export type WorkflowThresholdList = WorkflowOutput['getWorkflowThresholds'];
export type WorkflowRule = NonNullable<WorkflowOutput['getWorkflowRules']>[number];
export type WorkflowRuleList = WorkflowOutput['getWorkflowRules'];
export type ResolvedWorkflow = WorkflowOutput['resolveWorkflowForLocation'];

// Input types for components that need them
export type CreateWorkflowDefinitionInput = WorkflowInput['createWorkflowDefinition'];
export type UpdateWorkflowDefinitionInput = WorkflowInput['updateWorkflowDefinition'];
export type CreateWorkflowThresholdInput = WorkflowInput['createWorkflowThreshold'];
export type UpdateWorkflowThresholdInput = WorkflowInput['updateWorkflowThreshold'];
export type CreateWorkflowRuleInput = WorkflowInput['createWorkflowRule'];
export type UpdateWorkflowRuleInput = WorkflowInput['updateWorkflowRule'];

// Execution types
export type RuleExecutionSummary = WorkflowOutput['executeRule'];
export type PendingExecutionList = WorkflowOutput['getPendingExecutions'];
export type RuleExecutionHistory = WorkflowOutput['getRuleExecutionHistory'];
