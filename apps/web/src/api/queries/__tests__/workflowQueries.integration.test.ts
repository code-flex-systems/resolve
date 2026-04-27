/**
 * Integration tests for workflowQueries
 *
 * Tests cover:
 * - resolveWorkflowForLocation: Workflow resolution with location-specific vs global preference
 * - getApplicableRules: Rule matching by trigger type, location, priority, and status
 * - validateDeskLocationBelongsToClient / validateWorkflowDefinitionBelongsToClient: Tenant validation
 * - createRuleExecution / updateRuleExecution: Execution lifecycle
 *
 * @vitest-environment node
 * Setup: apps/web/src/__tests__/integration/setup.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	createTestClient,
	createTestUser,
	createTestClaim,
	createTestDeskLocationType,
	createTestDeskLocation,
} from '@/__tests__/integration/fixtures';
import {
	resolveWorkflowForLocation,
	getApplicableRules,
	validateDeskLocationBelongsToClient,
	validateWorkflowDefinitionBelongsToClient,
	createRuleExecution,
	updateRuleExecution,
} from '../workflowQueries';
import { WorkflowTriggerType, WorkflowActionType, WorkflowExecutionMode, RuleExecutionStatus } from '@/config/enums';

// ============================================================================
// HELPERS
// ============================================================================

async function createWorkflowDefinition(
	db: Kysely<DB>,
	params: {
		client_id: string;
		created_by: string;
		name?: string;
		desk_location_id?: string | null;
		is_active?: boolean;
		deleted_at?: Date | null;
		deleted_by?: string | null;
	}
) {
	return db
		.insertInto('workflow_definition')
		.values({
			client_id: params.client_id,
			name: params.name || `Test Workflow ${Date.now()}`,
			desk_location_id: params.desk_location_id ?? null,
			is_active: params.is_active ?? true,
			created_by: params.created_by,
			deleted_at: params.deleted_at ?? null,
			deleted_by: params.deleted_by ?? null,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

async function createWorkflowRule(
	db: Kysely<DB>,
	params: {
		client_id: string;
		workflow_definition_id: string;
		created_by: string;
		name?: string;
		trigger_type?: string;
		action_type?: string;
		execution_mode?: string;
		priority?: number;
		is_active?: boolean;
		deleted_at?: Date | null;
		deleted_by?: string | null;
	}
) {
	return db
		.insertInto('workflow_rule')
		.values({
			client_id: params.client_id,
			workflow_definition_id: params.workflow_definition_id,
			name: params.name || `Test Rule ${Date.now()}`,
			trigger_type: params.trigger_type || WorkflowTriggerType.CLAIM_AGE,
			action_type: params.action_type || WorkflowActionType.MOVE_CLAIM,
			execution_mode: params.execution_mode || WorkflowExecutionMode.SUGGEST,
			priority: params.priority ?? 10,
			is_active: params.is_active ?? true,
			created_by: params.created_by,
			deleted_at: params.deleted_at ?? null,
			deleted_by: params.deleted_by ?? null,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

describe('workflowQueries integration tests', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	// ============================================================================
	// resolveWorkflowForLocation
	// ============================================================================

	describe('resolveWorkflowForLocation', () => {
		it('should return location-specific workflow when one exists', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const deskLocation = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const workflow = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: deskLocation.id,
				is_active: true,
			});

			const result = await resolveWorkflowForLocation(ctx, deskLocation.id);

			expect(result).toBeDefined();
			expect(result!.id).toBe(workflow.id);
			expect(result!.desk_location_id).toBe(deskLocation.id);
		});

		it('should return global workflow when no location-specific one exists', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const deskLocation = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const globalWorkflow = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: null,
				is_active: true,
			});

			const result = await resolveWorkflowForLocation(ctx, deskLocation.id);

			expect(result).toBeDefined();
			expect(result!.id).toBe(globalWorkflow.id);
			expect(result!.desk_location_id).toBeNull();
		});

		it('should prefer location-specific over global when both exist', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const deskLocation = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// Create global workflow
			await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: null,
				is_active: true,
				name: 'Global Workflow',
			});

			// Create location-specific workflow
			const specificWorkflow = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: deskLocation.id,
				is_active: true,
				name: 'Specific Workflow',
			});

			const result = await resolveWorkflowForLocation(ctx, deskLocation.id);

			expect(result).toBeDefined();
			expect(result!.id).toBe(specificWorkflow.id);
			expect(result!.desk_location_id).toBe(deskLocation.id);
		});

		it('should return undefined when no active workflows exist', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const deskLocation = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const result = await resolveWorkflowForLocation(ctx, deskLocation.id);

			expect(result).toBeUndefined();
		});

		it('should not return inactive workflows', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const deskLocation = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: deskLocation.id,
				is_active: false,
			});

			const result = await resolveWorkflowForLocation(ctx, deskLocation.id);

			expect(result).toBeUndefined();
		});

		it('should not return deleted workflows', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const deskLocation = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: deskLocation.id,
				is_active: true,
				deleted_at: new Date(),
				deleted_by: user.id,
			});

			const result = await resolveWorkflowForLocation(ctx, deskLocation.id);

			expect(result).toBeUndefined();
		});

		it('should enforce tenant isolation', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const deskTypeA = await createTestDeskLocationType(db, { client_id: clientA.id });
			const deskLocationA = await createTestDeskLocation(db, {
				client_id: clientA.id,
				desk_location_type_id: deskTypeA.id,
			});

			// Create workflow for clientA
			await createWorkflowDefinition(db, {
				client_id: clientA.id,
				created_by: userA.id,
				desk_location_id: deskLocationA.id,
				is_active: true,
			});

			// clientB should not see clientA's workflow
			const ctxB = createTestContext(db, {
				id: userB.id,
				client_id: clientB.id,
				email: userB.email,
				role: 'Admin',
			});

			const result = await resolveWorkflowForLocation(ctxB, deskLocationA.id);

			expect(result).toBeUndefined();
		});
	});

	// ============================================================================
	// getApplicableRules
	// ============================================================================

	describe('getApplicableRules', () => {
		it('should return rules matching the trigger type', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const workflow = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				is_active: true,
			});

			await createWorkflowRule(db, {
				client_id: client.id,
				workflow_definition_id: workflow.id,
				created_by: user.id,
				trigger_type: WorkflowTriggerType.CLAIM_AGE,
				name: 'Age Rule',
			});

			const results = await getApplicableRules(ctx, {
				triggerType: WorkflowTriggerType.CLAIM_AGE,
			});

			expect(results.length).toBeGreaterThanOrEqual(1);
			expect(results.some((r) => r.name === 'Age Rule')).toBe(true);
		});

		it('should not return rules with wrong trigger type', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const workflow = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				is_active: true,
			});

			// Control: this rule SHOULD be returned
			await createWorkflowRule(db, {
				client_id: client.id,
				workflow_definition_id: workflow.id,
				created_by: user.id,
				trigger_type: WorkflowTriggerType.CLAIM_AGE,
				name: 'Matching Rule',
			});
			// This rule should NOT be returned (wrong trigger type)
			await createWorkflowRule(db, {
				client_id: client.id,
				workflow_definition_id: workflow.id,
				created_by: user.id,
				trigger_type: WorkflowTriggerType.FIELD_CHANGE,
				name: 'Field Change Rule',
			});

			const results = await getApplicableRules(ctx, {
				triggerType: WorkflowTriggerType.CLAIM_AGE,
			});

			expect(results.some((r) => r.name === 'Matching Rule')).toBe(true);
			expect(results.every((r) => r.name !== 'Field Change Rule')).toBe(true);
		});

		it('should not return inactive rules', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const workflow = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				is_active: true,
			});

			// Control: active rule SHOULD be returned
			await createWorkflowRule(db, {
				client_id: client.id,
				workflow_definition_id: workflow.id,
				created_by: user.id,
				trigger_type: WorkflowTriggerType.CLAIM_AGE,
				is_active: true,
				name: 'Active Rule',
			});
			await createWorkflowRule(db, {
				client_id: client.id,
				workflow_definition_id: workflow.id,
				created_by: user.id,
				trigger_type: WorkflowTriggerType.CLAIM_AGE,
				is_active: false,
				name: 'Inactive Rule',
			});

			const results = await getApplicableRules(ctx, {
				triggerType: WorkflowTriggerType.CLAIM_AGE,
			});

			expect(results.some((r) => r.name === 'Active Rule')).toBe(true);
			expect(results.every((r) => r.name !== 'Inactive Rule')).toBe(true);
		});

		it('should not return rules from deleted workflows', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// Control: rule in active workflow
			const activeWorkflow = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				is_active: true,
			});
			await createWorkflowRule(db, {
				client_id: client.id,
				workflow_definition_id: activeWorkflow.id,
				created_by: user.id,
				trigger_type: WorkflowTriggerType.CLAIM_AGE,
				name: 'Surviving Rule',
			});

			const deletedWorkflow = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				is_active: true,
				deleted_at: new Date(),
				deleted_by: user.id,
			});
			await createWorkflowRule(db, {
				client_id: client.id,
				workflow_definition_id: deletedWorkflow.id,
				created_by: user.id,
				trigger_type: WorkflowTriggerType.CLAIM_AGE,
				name: 'Orphan Rule',
			});

			const results = await getApplicableRules(ctx, {
				triggerType: WorkflowTriggerType.CLAIM_AGE,
			});

			expect(results.some((r) => r.name === 'Surviving Rule')).toBe(true);
			expect(results.every((r) => r.name !== 'Orphan Rule')).toBe(true);
		});

		it('should not return rules from inactive workflows', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// Control: rule in active workflow
			const activeWorkflow = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				is_active: true,
			});
			await createWorkflowRule(db, {
				client_id: client.id,
				workflow_definition_id: activeWorkflow.id,
				created_by: user.id,
				trigger_type: WorkflowTriggerType.CLAIM_AGE,
				name: 'Active Workflow Rule',
			});

			const inactiveWorkflow = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				is_active: false,
			});
			await createWorkflowRule(db, {
				client_id: client.id,
				workflow_definition_id: inactiveWorkflow.id,
				created_by: user.id,
				trigger_type: WorkflowTriggerType.CLAIM_AGE,
				name: 'Rule In Inactive Workflow',
			});

			const results = await getApplicableRules(ctx, {
				triggerType: WorkflowTriggerType.CLAIM_AGE,
			});

			expect(results.some((r) => r.name === 'Active Workflow Rule')).toBe(true);
			expect(results.every((r) => r.name !== 'Rule In Inactive Workflow')).toBe(true);
		});

		it('should return location-specific and global rules when deskLocationId is provided', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const deskLocation = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const globalWorkflow = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: null,
				is_active: true,
			});
			const specificWorkflow = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: deskLocation.id,
				is_active: true,
			});

			await createWorkflowRule(db, {
				client_id: client.id,
				workflow_definition_id: globalWorkflow.id,
				created_by: user.id,
				trigger_type: WorkflowTriggerType.CLAIM_AGE,
				name: 'Global Rule',
			});
			await createWorkflowRule(db, {
				client_id: client.id,
				workflow_definition_id: specificWorkflow.id,
				created_by: user.id,
				trigger_type: WorkflowTriggerType.CLAIM_AGE,
				name: 'Location Rule',
			});

			const results = await getApplicableRules(ctx, {
				triggerType: WorkflowTriggerType.CLAIM_AGE,
				deskLocationId: deskLocation.id,
			});

			const ruleNames = results.map((r) => r.name);
			expect(ruleNames).toContain('Global Rule');
			expect(ruleNames).toContain('Location Rule');
		});

		it('should order rules by priority ascending (lower priority first)', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const workflow = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				is_active: true,
			});

			await createWorkflowRule(db, {
				client_id: client.id,
				workflow_definition_id: workflow.id,
				created_by: user.id,
				trigger_type: WorkflowTriggerType.CLAIM_AGE,
				priority: 50,
				name: 'Low Priority',
			});
			await createWorkflowRule(db, {
				client_id: client.id,
				workflow_definition_id: workflow.id,
				created_by: user.id,
				trigger_type: WorkflowTriggerType.CLAIM_AGE,
				priority: 5,
				name: 'High Priority',
			});

			const results = await getApplicableRules(ctx, {
				triggerType: WorkflowTriggerType.CLAIM_AGE,
			});

			// Filter to our rules only
			const ourRules = results.filter((r) => r.name === 'High Priority' || r.name === 'Low Priority');
			expect(ourRules.length).toBe(2);
			expect(ourRules[0].name).toBe('High Priority');
			expect(ourRules[1].name).toBe('Low Priority');
		});

		it('should bypass trigger_type filter when ruleId is provided', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const workflow = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				is_active: true,
			});

			const rule = await createWorkflowRule(db, {
				client_id: client.id,
				workflow_definition_id: workflow.id,
				created_by: user.id,
				trigger_type: WorkflowTriggerType.FIELD_CHANGE,
				name: 'Manual Target Rule',
			});

			// Pass a different trigger type but also pass ruleId - should still find the rule
			const results = await getApplicableRules(ctx, {
				triggerType: WorkflowTriggerType.CLAIM_AGE,
				ruleId: rule.id,
			});

			expect(results.length).toBe(1);
			expect(results[0].id).toBe(rule.id);
			expect(results[0].trigger_type).toBe(WorkflowTriggerType.FIELD_CHANGE);
		});

		it('should enforce tenant isolation', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });

			const workflowA = await createWorkflowDefinition(db, {
				client_id: clientA.id,
				created_by: userA.id,
				is_active: true,
			});
			await createWorkflowRule(db, {
				client_id: clientA.id,
				workflow_definition_id: workflowA.id,
				created_by: userA.id,
				trigger_type: WorkflowTriggerType.CLAIM_AGE,
				name: 'Client A Rule',
			});

			// clientB should not see clientA's rules
			const ctxB = createTestContext(db, {
				id: userB.id,
				client_id: clientB.id,
				email: userB.email,
				role: 'Admin',
			});

			const results = await getApplicableRules(ctxB, {
				triggerType: WorkflowTriggerType.CLAIM_AGE,
			});

			expect(results.every((r) => r.name !== 'Client A Rule')).toBe(true);
		});
	});

	// ============================================================================
	// validateDeskLocationBelongsToClient
	// ============================================================================

	describe('validateDeskLocationBelongsToClient', () => {
		it('should not throw for a valid desk location belonging to the client', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const deskLocation = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			await expect(validateDeskLocationBelongsToClient(ctx, deskLocation.id)).resolves.toBeUndefined();
		});

		it('should throw FORBIDDEN for desk location belonging to another client', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userB = await createTestUser(db, { client_id: clientB.id });
			const deskTypeA = await createTestDeskLocationType(db, { client_id: clientA.id });
			const deskLocationA = await createTestDeskLocation(db, {
				client_id: clientA.id,
				desk_location_type_id: deskTypeA.id,
			});
			const ctxB = createTestContext(db, {
				id: userB.id,
				client_id: clientB.id,
				email: userB.email,
				role: 'Admin',
			});

			await expect(validateDeskLocationBelongsToClient(ctxB, deskLocationA.id)).rejects.toThrow(
				'not found or does not belong'
			);
		});

		it('should throw FORBIDDEN for a deleted desk location', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const deskLocation = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// Soft-delete the desk location
			await db
				.updateTable('desk_location')
				.set({ deleted_at: new Date() })
				.where('id', '=', deskLocation.id)
				.execute();

			await expect(validateDeskLocationBelongsToClient(ctx, deskLocation.id)).rejects.toThrow(
				'not found or does not belong'
			);
		});

		it('should throw FORBIDDEN for a non-existent desk location', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			await expect(
				validateDeskLocationBelongsToClient(ctx, '00000000-0000-0000-0000-000000000000')
			).rejects.toThrow('not found or does not belong');
		});
	});

	// ============================================================================
	// validateWorkflowDefinitionBelongsToClient
	// ============================================================================

	describe('validateWorkflowDefinitionBelongsToClient', () => {
		it('should not throw for a valid workflow belonging to the client', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const workflow = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
			});

			await expect(validateWorkflowDefinitionBelongsToClient(ctx, workflow.id)).resolves.toBeUndefined();
		});

		it('should throw FORBIDDEN for workflow belonging to another client', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const ctx = createTestContext(db, {
				id: userB.id,
				client_id: clientB.id,
				email: userB.email,
				role: 'Admin',
			});

			const workflow = await createWorkflowDefinition(db, {
				client_id: clientA.id,
				created_by: userA.id,
			});

			await expect(validateWorkflowDefinitionBelongsToClient(ctx, workflow.id)).rejects.toThrow(
				'not found or does not belong'
			);
		});

		it('should throw FORBIDDEN for a deleted workflow', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const workflow = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				deleted_at: new Date(),
				deleted_by: user.id,
			});

			await expect(validateWorkflowDefinitionBelongsToClient(ctx, workflow.id)).rejects.toThrow(
				'not found or does not belong'
			);
		});

		it('should throw FORBIDDEN for a non-existent workflow', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			await expect(
				validateWorkflowDefinitionBelongsToClient(ctx, '00000000-0000-0000-0000-000000000000')
			).rejects.toThrow('not found or does not belong');
		});
	});

	// ============================================================================
	// createRuleExecution + updateRuleExecution
	// ============================================================================

	describe('createRuleExecution', () => {
		it('should create execution with PENDING status and null executed_at', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const workflow = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				is_active: true,
			});
			const rule = await createWorkflowRule(db, {
				client_id: client.id,
				workflow_definition_id: workflow.id,
				created_by: user.id,
			});

			const execution = await createRuleExecution(ctx, {
				workflowRuleId: rule.id,
				claimId: claim.id,
				triggerType: WorkflowTriggerType.CLAIM_AGE,
				actionType: WorkflowActionType.MOVE_CLAIM,
				actionConfig: { target_desk_location_id: 'some-id' },
				executionMode: WorkflowExecutionMode.SUGGEST,
				status: RuleExecutionStatus.PENDING,
			});

			expect(execution).toBeDefined();
			expect(execution.status).toBe(RuleExecutionStatus.PENDING);
			expect(execution.executed_at).toBeNull();
			expect(execution.executed_by).toBeNull();
			expect(execution.client_id).toBe(client.id);
			expect(execution.workflow_rule_id).toBe(rule.id);
			expect(execution.claim_id).toBe(claim.id);
			expect(execution.created_by).toBe(user.id);
		});

		it('should create execution with EXECUTED status and set executed_at and executed_by', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const workflow = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				is_active: true,
			});
			const rule = await createWorkflowRule(db, {
				client_id: client.id,
				workflow_definition_id: workflow.id,
				created_by: user.id,
			});

			const execution = await createRuleExecution(ctx, {
				workflowRuleId: rule.id,
				claimId: claim.id,
				triggerType: WorkflowTriggerType.MANUAL,
				actionType: WorkflowActionType.CREATE_TASK,
				actionConfig: { task_name: 'Follow up' },
				executionMode: WorkflowExecutionMode.AUTO,
				status: RuleExecutionStatus.EXECUTED,
				resultData: { taskId: '123' },
			});

			expect(execution).toBeDefined();
			expect(execution.status).toBe(RuleExecutionStatus.EXECUTED);
			expect(execution.executed_at).not.toBeNull();
			expect(execution.executed_by).toBe(user.id);
		});
	});

	describe('updateRuleExecution', () => {
		it('should update PENDING execution to EXECUTED with executed_at and executed_by', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const workflow = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				is_active: true,
			});
			const rule = await createWorkflowRule(db, {
				client_id: client.id,
				workflow_definition_id: workflow.id,
				created_by: user.id,
			});

			// Create as PENDING
			const execution = await createRuleExecution(ctx, {
				workflowRuleId: rule.id,
				claimId: claim.id,
				triggerType: WorkflowTriggerType.CLAIM_AGE,
				actionType: WorkflowActionType.MOVE_CLAIM,
				actionConfig: {},
				executionMode: WorkflowExecutionMode.SUGGEST,
				status: RuleExecutionStatus.PENDING,
			});

			expect(execution.executed_at).toBeNull();
			expect(execution.executed_by).toBeNull();

			// Update to EXECUTED
			const updated = await updateRuleExecution(ctx, execution.id, {
				status: RuleExecutionStatus.EXECUTED,
				resultData: { moved: true },
			});

			expect(updated.status).toBe(RuleExecutionStatus.EXECUTED);
			expect(updated.executed_at).not.toBeNull();
			expect(updated.executed_by).toBe(user.id);
		});

		it('should update to FAILED status with error message', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const workflow = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				is_active: true,
			});
			const rule = await createWorkflowRule(db, {
				client_id: client.id,
				workflow_definition_id: workflow.id,
				created_by: user.id,
			});

			const execution = await createRuleExecution(ctx, {
				workflowRuleId: rule.id,
				claimId: claim.id,
				triggerType: WorkflowTriggerType.CLAIM_AGE,
				actionType: WorkflowActionType.MOVE_CLAIM,
				actionConfig: {},
				executionMode: WorkflowExecutionMode.SUGGEST,
				status: RuleExecutionStatus.PENDING,
			});

			const updated = await updateRuleExecution(ctx, execution.id, {
				status: RuleExecutionStatus.FAILED,
				errorMessage: 'Target desk location not found',
			});

			expect(updated.status).toBe(RuleExecutionStatus.FAILED);
			expect(updated.error_message).toBe('Target desk location not found');
			// FAILED status should not set executed_at/executed_by
			expect(updated.executed_at).toBeNull();
			expect(updated.executed_by).toBeNull();
		});

		it('should enforce tenant isolation on update', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const claim = await createTestClaim(db, { client_id: clientA.id, created_by: userA.id });
			const ctxA = createTestContext(db, {
				id: userA.id,
				client_id: clientA.id,
				email: userA.email,
				role: 'Admin',
			});

			const workflow = await createWorkflowDefinition(db, {
				client_id: clientA.id,
				created_by: userA.id,
				is_active: true,
			});
			const rule = await createWorkflowRule(db, {
				client_id: clientA.id,
				workflow_definition_id: workflow.id,
				created_by: userA.id,
			});

			const execution = await createRuleExecution(ctxA, {
				workflowRuleId: rule.id,
				claimId: claim.id,
				triggerType: WorkflowTriggerType.CLAIM_AGE,
				actionType: WorkflowActionType.MOVE_CLAIM,
				actionConfig: {},
				executionMode: WorkflowExecutionMode.SUGGEST,
				status: RuleExecutionStatus.PENDING,
			});

			// clientB should not be able to update clientA's execution
			const ctxB = createTestContext(db, {
				id: userB.id,
				client_id: clientB.id,
				email: userB.email,
				role: 'Admin',
			});

			await expect(
				updateRuleExecution(ctxB, execution.id, {
					status: RuleExecutionStatus.EXECUTED,
				})
			).rejects.toThrow();
		});
	});
});
