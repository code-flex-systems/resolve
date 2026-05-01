import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../ruleExecutionEngine', () => ({
	evaluateRules: vi.fn().mockResolvedValue({
		rulesEvaluated: 1,
		claimsMatched: 0,
		actionsExecuted: 0,
		actionsSuggested: 0,
		errors: [],
	}),
}));

import { onClaimFieldChange, onTaskCompleted } from '../ruleEventHooks';
import { evaluateRules } from '../ruleExecutionEngine';
import { WorkflowTriggerType } from '@/config/enums';

// =============================================================================
// HELPERS
// =============================================================================

function makeMockCtx() {
	return {
		session: { user: { id: 'user-1', client_id: 'client-1' } },
		db: {},
	} as any;
}

// =============================================================================
// TESTS
// =============================================================================

beforeEach(() => {
	vi.clearAllMocks();
});

describe('onClaimFieldChange', () => {
	it('calls evaluateRules when a relevant field changes (recovery_status)', async () => {
		const ctx = makeMockCtx();
		await onClaimFieldChange(ctx, 'claim-10', ['recovery_status']);

		expect(evaluateRules).toHaveBeenCalledWith(ctx, {
			triggerType: WorkflowTriggerType.FIELD_CHANGE,
			claimIds: ['claim-10'],
		});
	});

	it('calls evaluateRules when substatus changes', async () => {
		const ctx = makeMockCtx();
		await onClaimFieldChange(ctx, 'claim-10', ['substatus']);

		expect(evaluateRules).toHaveBeenCalledOnce();
	});

	it('calls evaluateRules when line_of_business changes', async () => {
		const ctx = makeMockCtx();
		await onClaimFieldChange(ctx, 'claim-10', ['line_of_business']);

		expect(evaluateRules).toHaveBeenCalledOnce();
	});

	it('calls evaluateRules when claim_amount changes', async () => {
		const ctx = makeMockCtx();
		await onClaimFieldChange(ctx, 'claim-10', ['claim_amount']);

		expect(evaluateRules).toHaveBeenCalledOnce();
	});

	it('calls evaluateRules when expected_recovery changes', async () => {
		const ctx = makeMockCtx();
		await onClaimFieldChange(ctx, 'claim-10', ['expected_recovery']);

		expect(evaluateRules).toHaveBeenCalledOnce();
	});

	it('calls evaluateRules when actual_recovery changes', async () => {
		const ctx = makeMockCtx();
		await onClaimFieldChange(ctx, 'claim-10', ['actual_recovery']);

		expect(evaluateRules).toHaveBeenCalledOnce();
	});

	it('calls evaluateRules when desk_location_id changes', async () => {
		const ctx = makeMockCtx();
		await onClaimFieldChange(ctx, 'claim-10', ['desk_location_id']);

		expect(evaluateRules).toHaveBeenCalledOnce();
	});

	it('does NOT call evaluateRules for non-relevant field (claim_number)', async () => {
		const ctx = makeMockCtx();
		await onClaimFieldChange(ctx, 'claim-10', ['claim_number']);

		expect(evaluateRules).not.toHaveBeenCalled();
	});

	it('does NOT call evaluateRules for non-relevant fields only', async () => {
		const ctx = makeMockCtx();
		await onClaimFieldChange(ctx, 'claim-10', ['claim_number', 'insured_name']);

		expect(evaluateRules).not.toHaveBeenCalled();
	});

	it('calls evaluateRules when mixed fields include a relevant one', async () => {
		const ctx = makeMockCtx();
		await onClaimFieldChange(ctx, 'claim-10', ['claim_number', 'substatus']);

		expect(evaluateRules).toHaveBeenCalledWith(ctx, {
			triggerType: WorkflowTriggerType.FIELD_CHANGE,
			claimIds: ['claim-10'],
		});
	});

	it('does NOT call evaluateRules for empty changedFields array', async () => {
		const ctx = makeMockCtx();
		await onClaimFieldChange(ctx, 'claim-10', []);

		expect(evaluateRules).not.toHaveBeenCalled();
	});

	it('calls evaluateRules exactly once even with multiple relevant fields', async () => {
		const ctx = makeMockCtx();
		await onClaimFieldChange(ctx, 'claim-1', ['recovery_status', 'substatus', 'claim_amount']);

		expect(evaluateRules).toHaveBeenCalledTimes(1);
	});

	it('does not propagate errors from evaluateRules', async () => {
		const ctx = makeMockCtx();
		vi.mocked(evaluateRules).mockRejectedValueOnce(new Error('DB connection lost'));

		// Should resolve without throwing
		await expect(onClaimFieldChange(ctx, 'claim-10', ['recovery_status'])).resolves.toBeUndefined();
	});

	it('logs error to console when evaluateRules fails', async () => {
		const ctx = makeMockCtx();
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.mocked(evaluateRules).mockRejectedValueOnce(new Error('DB fail'));

		await onClaimFieldChange(ctx, 'claim-10', ['recovery_status']);

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining('onClaimFieldChange failed for claim claim-10'),
			expect.any(Error)
		);
		consoleSpy.mockRestore();
	});
});

describe('onTaskCompleted', () => {
	it('calls evaluateRules with TASK_COMPLETED trigger and correct claimIds', async () => {
		const ctx = makeMockCtx();
		await onTaskCompleted(ctx, 'task-50', 'claim-10');

		expect(evaluateRules).toHaveBeenCalledWith(ctx, {
			triggerType: WorkflowTriggerType.TASK_COMPLETED,
			claimIds: ['claim-10'],
		});
	});

	it('does not propagate errors from evaluateRules', async () => {
		const ctx = makeMockCtx();
		vi.mocked(evaluateRules).mockRejectedValueOnce(new Error('Workflow engine down'));

		await expect(onTaskCompleted(ctx, 'task-50', 'claim-10')).resolves.toBeUndefined();
	});

	it('logs error to console when evaluateRules fails', async () => {
		const ctx = makeMockCtx();
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.mocked(evaluateRules).mockRejectedValueOnce(new Error('Engine fail'));

		await onTaskCompleted(ctx, 'task-50', 'claim-10');

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining('onTaskCompleted failed for task task-50, claim claim-10'),
			expect.any(Error)
		);
		consoleSpy.mockRestore();
	});
});
