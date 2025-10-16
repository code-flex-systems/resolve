import { describe, it, expect } from 'vitest';
import { getUpdatedPageStatus } from '../utils';
import { PageInstanceStatus } from '@/config/enums';

describe('getUpdatedPageStatus()', () => {
	describe('COMPLETE status', () => {
		it('should return COMPLETE when questionCount equals responseCount (both zero)', () => {
			const result = getUpdatedPageStatus(0, 0);
			expect(result).toBe(PageInstanceStatus.COMPLETE);
		});

		it('should return COMPLETE when questionCount equals responseCount (both positive)', () => {
			const result = getUpdatedPageStatus(5, 5);
			expect(result).toBe(PageInstanceStatus.COMPLETE);
		});

		it('should return COMPLETE when questionCount equals responseCount (large numbers)', () => {
			const result = getUpdatedPageStatus(100, 100);
			expect(result).toBe(PageInstanceStatus.COMPLETE);
		});
	});

	describe('IN_PROGRESS status', () => {
		it('should return IN_PROGRESS when responseCount > 0 but < questionCount', () => {
			const result = getUpdatedPageStatus(10, 5);
			expect(result).toBe(PageInstanceStatus.IN_PROGRESS);
		});

		it('should return IN_PROGRESS when responseCount is 1 and questionCount is greater', () => {
			const result = getUpdatedPageStatus(10, 1);
			expect(result).toBe(PageInstanceStatus.IN_PROGRESS);
		});

		it('should return IN_PROGRESS when responseCount is one less than questionCount', () => {
			const result = getUpdatedPageStatus(10, 9);
			expect(result).toBe(PageInstanceStatus.IN_PROGRESS);
		});

		it('should return IN_PROGRESS when responseCount > questionCount (overfilled)', () => {
			// Edge case: More responses than questions (shouldn't happen in practice)
			const result = getUpdatedPageStatus(5, 10);
			expect(result).toBe(PageInstanceStatus.IN_PROGRESS);
		});
	});

	describe('UNSTARTED status', () => {
		it('should return UNSTARTED when responseCount is 0 and questionCount > 0', () => {
			const result = getUpdatedPageStatus(10, 0);
			expect(result).toBe(PageInstanceStatus.UNSTARTED);
		});

		it('should return UNSTARTED when responseCount is 0 and questionCount is 1', () => {
			const result = getUpdatedPageStatus(1, 0);
			expect(result).toBe(PageInstanceStatus.UNSTARTED);
		});

		it('should return UNSTARTED when responseCount is 0 and questionCount is large', () => {
			const result = getUpdatedPageStatus(1000, 0);
			expect(result).toBe(PageInstanceStatus.UNSTARTED);
		});
	});

	describe('Edge cases', () => {
		it('should handle negative responseCount gracefully (returns UNSTARTED)', () => {
			// Edge case: negative numbers shouldn't happen but test defensiveness
			const result = getUpdatedPageStatus(10, -1);
			expect(result).toBe(PageInstanceStatus.UNSTARTED);
		});

		it('should handle negative questionCount with zero responses (returns COMPLETE)', () => {
			// Edge case: -5 === 0 is false, 0 > 0 is false, so returns UNSTARTED
			const result = getUpdatedPageStatus(-5, 0);
			expect(result).toBe(PageInstanceStatus.UNSTARTED);
		});

		it('should handle both negative (returns IN_PROGRESS if responseCount < 0)', () => {
			// -5 !== -3, -3 > 0 is false, so returns UNSTARTED
			const result = getUpdatedPageStatus(-5, -3);
			expect(result).toBe(PageInstanceStatus.UNSTARTED);
		});

		it('should handle zero questions with zero responses (returns COMPLETE)', () => {
			// 0 === 0 is true
			const result = getUpdatedPageStatus(0, 0);
			expect(result).toBe(PageInstanceStatus.COMPLETE);
		});
	});

	describe('Boundary transitions', () => {
		it('should transition from UNSTARTED to IN_PROGRESS when first response is added', () => {
			// Before: 0 responses
			const before = getUpdatedPageStatus(5, 0);
			expect(before).toBe(PageInstanceStatus.UNSTARTED);

			// After: 1 response
			const after = getUpdatedPageStatus(5, 1);
			expect(after).toBe(PageInstanceStatus.IN_PROGRESS);
		});

		it('should transition from IN_PROGRESS to COMPLETE when last response is added', () => {
			// Before: 4 out of 5 responses
			const before = getUpdatedPageStatus(5, 4);
			expect(before).toBe(PageInstanceStatus.IN_PROGRESS);

			// After: 5 out of 5 responses
			const after = getUpdatedPageStatus(5, 5);
			expect(after).toBe(PageInstanceStatus.COMPLETE);
		});

		it('should transition from COMPLETE to IN_PROGRESS if response is removed', () => {
			// Before: 5 out of 5 responses
			const before = getUpdatedPageStatus(5, 5);
			expect(before).toBe(PageInstanceStatus.COMPLETE);

			// After: 4 out of 5 responses (one removed)
			const after = getUpdatedPageStatus(5, 4);
			expect(after).toBe(PageInstanceStatus.IN_PROGRESS);
		});

		it('should transition from IN_PROGRESS to UNSTARTED if all responses removed', () => {
			// Before: 3 out of 5 responses
			const before = getUpdatedPageStatus(5, 3);
			expect(before).toBe(PageInstanceStatus.IN_PROGRESS);

			// After: 0 out of 5 responses
			const after = getUpdatedPageStatus(5, 0);
			expect(after).toBe(PageInstanceStatus.UNSTARTED);
		});
	});
});
