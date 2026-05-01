import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the query modules before importing the module under test
vi.mock('@/api/queries/deskQueries', () => ({
	createClaimTransition: vi.fn().mockResolvedValue({ id: 100 }),
	updateClaimDeskLocation: vi
		.fn()
		.mockResolvedValue({ id: 'claim-1', desk_location_id: 'desk-5', claim_number: 'CLM-001' }),
}));

vi.mock('@/api/queries/taskQueries', () => ({
	createTask: vi.fn().mockResolvedValue({ id: 200, title: 'Test Task' }),
}));

import { executeAction } from '../actionExecutors';
import { WorkflowActionType } from '@/config/enums';
import * as deskQueries from '@/api/queries/deskQueries';
import * as taskQueries from '@/api/queries/taskQueries';

// =============================================================================
// HELPERS
// =============================================================================

function createMockCtx(overrides: Record<string, unknown> = {}) {
	const mockExecuteTakeFirst = vi
		.fn()
		.mockResolvedValue({ claim_number: 'CLM-001', priority: 3 });
	const mockExecute = vi.fn().mockResolvedValue([]);
	const mockChain = {
		selectFrom: vi.fn().mockReturnThis(),
		updateTable: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		executeTakeFirst: mockExecuteTakeFirst,
		execute: mockExecute,
	};
	return {
		ctx: {
			session: { user: { id: 'user-1', client_id: 'client-1' } },
			db: mockChain,
			...overrides,
		} as any,
		mockExecuteTakeFirst,
		mockExecute,
	};
}

function makeInput(overrides: Record<string, unknown> = {}) {
	const { ctx, mockExecuteTakeFirst, mockExecute } = createMockCtx();
	return {
		input: {
			ctx,
			claimId: 'claim-1',
			currentDeskLocationId: 'desk-10' as string | null,
			actionConfig: {} as Record<string, unknown>,
			ruleId: 'rule-42',
			ruleName: 'Test Rule',
			...overrides,
		},
		mockExecuteTakeFirst,
		mockExecute,
	};
}

// =============================================================================
// TESTS
// =============================================================================

beforeEach(() => {
	vi.clearAllMocks();
});

describe('executeAction', () => {
	// =========================================================================
	// DISPATCH — unknown action type
	// =========================================================================

	describe('dispatch', () => {
		it('returns error for unknown action type', async () => {
			const { input } = makeInput();
			const result = await executeAction('unknown_type' as WorkflowActionType, input);
			expect(result).toEqual({
				success: false,
				error: 'Unsupported action type: unknown_type',
			});
		});
	});

	// =========================================================================
	// MOVE_CLAIM
	// =========================================================================

	describe('MOVE_CLAIM', () => {
		it('returns error when destination_location_id is missing', async () => {
			const { input } = makeInput({ actionConfig: {} });
			const result = await executeAction(WorkflowActionType.MOVE_CLAIM, input);
			expect(result).toEqual({
				success: false,
				error: 'Missing destination_location_id in action config',
			});
		});

		it('skips when claim is already at destination', async () => {
			const { input } = makeInput({
				currentDeskLocationId: 'desk-5',
				actionConfig: { destination_location_id: 'desk-5' },
			});
			const result = await executeAction(WorkflowActionType.MOVE_CLAIM, input);
			expect(result).toEqual({
				success: true,
				data: {
					skipped: true,
					reason: 'Claim already at destination',
					currentLocationId: 'desk-5',
				},
			});
			expect(deskQueries.createClaimTransition).not.toHaveBeenCalled();
			expect(deskQueries.updateClaimDeskLocation).not.toHaveBeenCalled();
		});

		it('moves claim successfully and records transition', async () => {
			const { input } = makeInput({
				currentDeskLocationId: 'desk-10',
				actionConfig: { destination_location_id: 'desk-20' },
			});

			const result = await executeAction(WorkflowActionType.MOVE_CLAIM, input);

			expect(result).toEqual({
				success: true,
				data: {
					previousLocationId: 'desk-10',
					newLocationId: 'desk-20',
					transitionId: 100,
				},
			});

			expect(deskQueries.createClaimTransition).toHaveBeenCalledWith(input.ctx, {
				claimId: 'claim-1',
				deskLocationId: 'desk-20',
				previousDeskLocationId: 'desk-10',
				enteredReason: 'rule:rule-42',
			});

			expect(deskQueries.updateClaimDeskLocation).toHaveBeenCalledWith(
				input.ctx,
				'claim-1',
				'desk-20'
			);
		});

		it('returns error when destination_location_id is 0 (falsy)', async () => {
			const { input } = makeInput({
				actionConfig: { destination_location_id: 0 },
			});
			const result = await executeAction(WorkflowActionType.MOVE_CLAIM, input);
			expect(result).toEqual({
				success: false,
				error: 'Missing destination_location_id in action config',
			});
		});

		it('passes undefined for previousDeskLocationId when currentDeskLocationId is null', async () => {
			const { input } = makeInput({
				currentDeskLocationId: null,
				actionConfig: { destination_location_id: 'desk-20' },
			});

			await executeAction(WorkflowActionType.MOVE_CLAIM, input);

			expect(deskQueries.createClaimTransition).toHaveBeenCalledWith(input.ctx, {
				claimId: 'claim-1',
				deskLocationId: 'desk-20',
				previousDeskLocationId: undefined,
				enteredReason: 'rule:rule-42',
			});
		});
	});

	// =========================================================================
	// CREATE_TASK
	// =========================================================================

	describe('CREATE_TASK', () => {
		it('returns error when title_template is missing', async () => {
			const { input } = makeInput({
				actionConfig: { target_location_id: 'desk-5' },
			});
			const result = await executeAction(WorkflowActionType.CREATE_TASK, input);
			expect(result).toEqual({
				success: false,
				error: 'Missing title_template in action config',
			});
		});

		it('returns error when target_location_id is missing', async () => {
			const { input } = makeInput({
				actionConfig: { title_template: 'Review {claim_number}' },
			});
			const result = await executeAction(WorkflowActionType.CREATE_TASK, input);
			expect(result).toEqual({
				success: false,
				error: 'Missing target_location_id in action config',
			});
		});

		it('returns error when title_template is empty string (falsy)', async () => {
			const { input } = makeInput({
				actionConfig: { title_template: '', target_location_id: 'desk-5' },
			});
			const result = await executeAction(WorkflowActionType.CREATE_TASK, input);
			expect(result).toEqual({
				success: false,
				error: 'Missing title_template in action config',
			});
		});

		it('returns error when target_location_id is 0 (falsy)', async () => {
			const { input } = makeInput({
				actionConfig: { title_template: 'Review claim', target_location_id: 0 },
			});
			const result = await executeAction(WorkflowActionType.CREATE_TASK, input);
			expect(result).toEqual({
				success: false,
				error: 'Missing target_location_id in action config',
			});
		});

		it('substitutes {claim_number} in title from DB lookup', async () => {
			const { input, mockExecuteTakeFirst } = makeInput({
				actionConfig: {
					title_template: 'Review {claim_number} urgently',
					target_location_id: 'desk-5',
				},
			});
			mockExecuteTakeFirst.mockResolvedValue({ claim_number: 'CLM-999' });

			const result = await executeAction(WorkflowActionType.CREATE_TASK, input);

			expect(result.success).toBe(true);
			expect(result.data?.title).toBe('Review CLM-999 urgently');
			expect(mockExecuteTakeFirst).toHaveBeenCalled();
		});

		it('uses pre-fetched claimNumber and skips DB query', async () => {
			const { input, mockExecuteTakeFirst } = makeInput({
				claimNumber: 'CLM-PRE',
				actionConfig: {
					title_template: 'Review {claim_number}',
					target_location_id: 'desk-5',
				},
			});

			const result = await executeAction(WorkflowActionType.CREATE_TASK, input);

			expect(result.success).toBe(true);
			expect(result.data?.title).toBe('Review CLM-PRE');
			expect(mockExecuteTakeFirst).not.toHaveBeenCalled();
		});

		it('fetches from DB when claimNumber is explicitly null', async () => {
			const { input, mockExecuteTakeFirst } = makeInput({
				claimNumber: null,
				actionConfig: {
					title_template: 'Review {claim_number}',
					target_location_id: 'desk-5',
				},
			});
			// null means "not pre-fetched", so it should query the DB
			mockExecuteTakeFirst.mockResolvedValue({ claim_number: 'CLM-FROM-DB' });

			const result = await executeAction(WorkflowActionType.CREATE_TASK, input);

			expect(result.success).toBe(true);
			expect(result.data?.title).toBe('Review CLM-FROM-DB');
			expect(mockExecuteTakeFirst).toHaveBeenCalled();
		});

		it('uses fallback #<claimId> when claimNumber is null and DB returns nothing', async () => {
			const { input, mockExecuteTakeFirst } = makeInput({
				claimNumber: null,
				actionConfig: {
					title_template: 'Review {claim_number}',
					target_location_id: 'desk-5',
				},
			});
			mockExecuteTakeFirst.mockResolvedValue(undefined);

			const result = await executeAction(WorkflowActionType.CREATE_TASK, input);

			expect(result.success).toBe(true);
			expect(result.data?.title).toBe('Review #claim-1');
		});

		it('uses fallback #<claimId> when claimNumber is empty string', async () => {
			const { input, mockExecuteTakeFirst } = makeInput({
				claimNumber: '',
				actionConfig: {
					title_template: 'Review {claim_number}',
					target_location_id: 'desk-5',
				},
			});

			const result = await executeAction(WorkflowActionType.CREATE_TASK, input);

			expect(result.success).toBe(true);
			expect(result.data?.title).toBe('Review #claim-1');
			expect(mockExecuteTakeFirst).not.toHaveBeenCalled();
		});

		it('passes all optional config fields through to createTask', async () => {
			const { input } = makeInput({
				claimNumber: 'CLM-001',
				actionConfig: {
					title_template: 'Task for {claim_number}',
					target_location_id: 'desk-7',
					task_type: 'review',
					description: 'Do the thing',
					deadline_date: '2026-04-01',
					deadline_description: 'Must complete by April',
					work_units: 3,
				},
			});

			await executeAction(WorkflowActionType.CREATE_TASK, input);

			expect(taskQueries.createTask).toHaveBeenCalledWith(input.ctx, {
				claimId: 'claim-1',
				deskLocationId: 'desk-7',
				taskType: 'review',
				title: 'Task for CLM-001',
				description: 'Do the thing',
				workUnits: 3,
				deadlineDate: '2026-04-01',
				deadlineDescription: 'Must complete by April',
			});
		});

		it('returns taskId and resolved title on success', async () => {
			const { input } = makeInput({
				claimNumber: 'CLM-001',
				actionConfig: {
					title_template: 'Simple task',
					target_location_id: 'desk-5',
				},
			});

			const result = await executeAction(WorkflowActionType.CREATE_TASK, input);

			expect(result).toEqual({
				success: true,
				data: { taskId: 200, title: 'Simple task' },
			});
		});
	});

	// =========================================================================
	// NOTIFY_USER
	// =========================================================================

	describe('NOTIFY_USER', () => {
		it('returns error when user_id is missing', async () => {
			const { input } = makeInput({
				actionConfig: { message_template: 'Hello' },
			});
			const result = await executeAction(WorkflowActionType.NOTIFY_USER, input);
			expect(result).toEqual({
				success: false,
				error: 'Missing user_id or message_template in action config',
			});
		});

		it('returns error when message_template is missing', async () => {
			const { input } = makeInput({
				actionConfig: { user_id: 'user-2' },
			});
			const result = await executeAction(WorkflowActionType.NOTIFY_USER, input);
			expect(result).toEqual({
				success: false,
				error: 'Missing user_id or message_template in action config',
			});
		});

		it('substitutes {claim_number} in message and returns stored status', async () => {
			const { input } = makeInput({
				claimNumber: 'CLM-555',
				actionConfig: {
					user_id: 'user-2',
					message_template: 'Claim {claim_number} needs review',
				},
			});

			const result = await executeAction(WorkflowActionType.NOTIFY_USER, input);

			expect(result).toEqual({
				success: true,
				data: {
					userId: 'user-2',
					message: 'Claim CLM-555 needs review',
					deliveryStatus: 'stored',
				},
			});
		});

		it('fetches claim_number from DB when not pre-fetched', async () => {
			const { input, mockExecuteTakeFirst } = makeInput({
				actionConfig: {
					user_id: 'user-2',
					message_template: 'Check {claim_number}',
				},
			});
			mockExecuteTakeFirst.mockResolvedValue({ claim_number: 'CLM-DB' });

			const result = await executeAction(WorkflowActionType.NOTIFY_USER, input);

			expect(result.data?.message).toBe('Check CLM-DB');
			expect(mockExecuteTakeFirst).toHaveBeenCalled();
		});
	});

	// =========================================================================
	// UPDATE_PRIORITY
	// =========================================================================

	describe('UPDATE_PRIORITY', () => {
		it('returns error when user_id is missing', async () => {
			const { input } = makeInput({
				actionConfig: { desk_location_id: 'desk-5', new_priority: 1 },
			});
			const result = await executeAction(WorkflowActionType.UPDATE_PRIORITY, input);
			expect(result).toEqual({
				success: false,
				error: 'Missing user_id, desk_location_id, or new_priority in action config',
			});
		});

		it('returns error when desk_location_id is missing', async () => {
			const { input } = makeInput({
				actionConfig: { user_id: 'user-2', new_priority: 1 },
			});
			const result = await executeAction(WorkflowActionType.UPDATE_PRIORITY, input);
			expect(result).toEqual({
				success: false,
				error: 'Missing user_id, desk_location_id, or new_priority in action config',
			});
		});

		it('returns error when new_priority is missing', async () => {
			const { input } = makeInput({
				actionConfig: { user_id: 'user-2', desk_location_id: 'desk-5' },
			});
			const result = await executeAction(WorkflowActionType.UPDATE_PRIORITY, input);
			expect(result).toEqual({
				success: false,
				error: 'Missing user_id, desk_location_id, or new_priority in action config',
			});
		});

		it('returns error when user not found at desk location', async () => {
			const { input, mockExecuteTakeFirst } = makeInput({
				actionConfig: { user_id: 'user-2', desk_location_id: 'desk-5', new_priority: 1 },
			});
			mockExecuteTakeFirst.mockResolvedValue(undefined);

			const result = await executeAction(WorkflowActionType.UPDATE_PRIORITY, input);

			expect(result).toEqual({
				success: false,
				error: 'User user-2 not assigned to desk location desk-5',
			});
		});

		it('skips when user is already at target priority', async () => {
			const { input, mockExecuteTakeFirst } = makeInput({
				actionConfig: { user_id: 'user-2', desk_location_id: 'desk-5', new_priority: 3 },
			});
			mockExecuteTakeFirst.mockResolvedValue({ priority: 3 });

			const result = await executeAction(WorkflowActionType.UPDATE_PRIORITY, input);

			expect(result).toEqual({
				success: true,
				data: {
					skipped: true,
					reason: 'User already at target priority',
					userId: 'user-2',
					deskLocationId: 'desk-5',
					currentPriority: 3,
				},
			});
		});

		it('updates priority and returns old and new values', async () => {
			const { input, mockExecuteTakeFirst, mockExecute } = makeInput({
				actionConfig: { user_id: 'user-2', desk_location_id: 'desk-5', new_priority: 1 },
			});
			mockExecuteTakeFirst.mockResolvedValue({ priority: 3 });
			mockExecute.mockResolvedValue([]);

			const result = await executeAction(WorkflowActionType.UPDATE_PRIORITY, input);

			expect(result).toEqual({
				success: true,
				data: {
					userId: 'user-2',
					deskLocationId: 'desk-5',
					oldPriority: 3,
					newPriority: 1,
				},
			});
		});

		it('allows new_priority of 0', async () => {
			const { input, mockExecuteTakeFirst } = makeInput({
				actionConfig: { user_id: 'user-2', desk_location_id: 'desk-5', new_priority: 0 },
			});
			mockExecuteTakeFirst.mockResolvedValue({ priority: 3 });

			const result = await executeAction(WorkflowActionType.UPDATE_PRIORITY, input);

			expect(result.success).toBe(true);
			expect(result.data?.newPriority).toBe(0);
		});
	});
});
