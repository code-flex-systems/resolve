import * as workflowController from '@/api/controllers/workflowController';
import { requireRole } from '@/lib/auth/requireRole';
import config from '@/config/config';
import { protectedProcedure, router } from '../trpc';
import {
	getWorkflowDefinitionsInput,
	getWorkflowDefinitionInput,
	createWorkflowDefinitionInput,
	updateWorkflowDefinitionInput,
	deleteWorkflowDefinitionInput,
	getWorkflowThresholdsInput,
	createWorkflowThresholdInput,
	updateWorkflowThresholdInput,
	deleteWorkflowThresholdInput,
	getWorkflowRulesInput,
	createWorkflowRuleInput,
	updateWorkflowRuleInput,
	deleteWorkflowRuleInput,
	resolveWorkflowForLocationInput,
} from '@/schemas/workflowSchemas';

export const workflowRouter = router({
	// ========================================================================
	// WORKFLOW DEFINITION ENDPOINTS
	// ========================================================================

	getWorkflowDefinitions: protectedProcedure
		.input(getWorkflowDefinitionsInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return workflowController.getWorkflowDefinitions(ctx, input);
		}),

	getWorkflowDefinition: protectedProcedure
		.input(getWorkflowDefinitionInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return workflowController.getWorkflowDefinition(ctx, input);
		}),

	createWorkflowDefinition: protectedProcedure
		.input(createWorkflowDefinitionInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return workflowController.createWorkflowDefinition(ctx, input);
		}),

	updateWorkflowDefinition: protectedProcedure
		.input(updateWorkflowDefinitionInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return workflowController.updateWorkflowDefinition(ctx, input);
		}),

	archiveWorkflowDefinition: protectedProcedure
		.input(deleteWorkflowDefinitionInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return workflowController.archiveWorkflowDefinition(ctx, input);
		}),

	// ========================================================================
	// WORKFLOW THRESHOLD ENDPOINTS
	// ========================================================================

	getWorkflowThresholds: protectedProcedure
		.input(getWorkflowThresholdsInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return workflowController.getWorkflowThresholds(ctx, input);
		}),

	createWorkflowThreshold: protectedProcedure
		.input(createWorkflowThresholdInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return workflowController.createWorkflowThreshold(ctx, input);
		}),

	updateWorkflowThreshold: protectedProcedure
		.input(updateWorkflowThresholdInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return workflowController.updateWorkflowThreshold(ctx, input);
		}),

	archiveWorkflowThreshold: protectedProcedure
		.input(deleteWorkflowThresholdInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return workflowController.archiveWorkflowThreshold(ctx, input);
		}),

	// ========================================================================
	// WORKFLOW RULE ENDPOINTS
	// ========================================================================

	getWorkflowRules: protectedProcedure
		.input(getWorkflowRulesInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return workflowController.getWorkflowRules(ctx, input);
		}),

	createWorkflowRule: protectedProcedure
		.input(createWorkflowRuleInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return workflowController.createWorkflowRule(ctx, input);
		}),

	updateWorkflowRule: protectedProcedure
		.input(updateWorkflowRuleInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return workflowController.updateWorkflowRule(ctx, input);
		}),

	archiveWorkflowRule: protectedProcedure
		.input(deleteWorkflowRuleInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return workflowController.archiveWorkflowRule(ctx, input);
		}),

	// ========================================================================
	// WORKFLOW RESOLUTION ENDPOINTS
	// ========================================================================

	resolveWorkflowForLocation: protectedProcedure
		.input(resolveWorkflowForLocationInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return workflowController.resolveWorkflowForLocation(ctx, input);
		}),
});
