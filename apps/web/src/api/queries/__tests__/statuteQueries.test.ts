/**
 * Unit tests for statute query calculation functions
 *
 * Tests the pure function calculateStatuteLimit which determines
 * applicable statute of limitations years based on:
 * - Tort type configuration
 * - Line of business (LOB) matching
 * - Date-of-loss range matching
 * - First-match-wins rule evaluation
 * - Default years fallback
 */

import { describe, it, expect } from 'vitest';
import { calculateStatuteLimit } from '../statuteQueries';
import { getBarPercentForType, getNegligenceTypeLabel } from '@/schemas/statuteSchemas';
import type { StatuteRules, NegligenceType } from '@/schemas/statuteSchemas';

describe('calculateStatuteLimit', () => {
	describe('basic scenarios', () => {
		it('should return null for empty rules object', () => {
			const rules: StatuteRules = {};
			const result = calculateStatuteLimit(rules, 'injury');
			expect(result).toBeNull();
		});

		it('should return null for unknown tort type', () => {
			const rules: StatuteRules = {
				injury: { default_years: 3, rules: [] },
			};
			const result = calculateStatuteLimit(rules, 'unknown_tort');
			expect(result).toBeNull();
		});

		it('should return default_years when no conditional rules exist', () => {
			const rules: StatuteRules = {
				injury: { default_years: 3, rules: [] },
			};
			const result = calculateStatuteLimit(rules, 'injury');
			expect(result).toBe(3);
		});

		it('should return null default_years (N/A) when configured', () => {
			const rules: StatuteRules = {
				injury: { default_years: null, rules: [] },
			};
			const result = calculateStatuteLimit(rules, 'injury');
			expect(result).toBeNull();
		});

		it('should handle multiple tort types independently', () => {
			const rules: StatuteRules = {
				injury: { default_years: 2, rules: [] },
				personal_property: { default_years: 4, rules: [] },
				real_property: { default_years: 6, rules: [] },
			};
			expect(calculateStatuteLimit(rules, 'injury')).toBe(2);
			expect(calculateStatuteLimit(rules, 'personal_property')).toBe(4);
			expect(calculateStatuteLimit(rules, 'real_property')).toBe(6);
		});
	});

	describe('LOB-based rules', () => {
		it('should match LOB condition and return rule years', () => {
			const rules: StatuteRules = {
				injury: {
					default_years: 3,
					rules: [{ lob: 'auto', years: 2 }],
				},
			};
			const result = calculateStatuteLimit(rules, 'injury', 'auto');
			expect(result).toBe(2);
		});

		it('should fall back to default when LOB does not match', () => {
			const rules: StatuteRules = {
				injury: {
					default_years: 3,
					rules: [{ lob: 'auto', years: 2 }],
				},
			};
			const result = calculateStatuteLimit(rules, 'injury', 'homeowners');
			expect(result).toBe(3);
		});

		it('should fall back to default when no LOB provided but rule requires it', () => {
			const rules: StatuteRules = {
				injury: {
					default_years: 3,
					rules: [{ lob: 'auto', years: 2 }],
				},
			};
			const result = calculateStatuteLimit(rules, 'injury');
			expect(result).toBe(3);
		});

		it('should match first LOB rule when multiple exist (first-match-wins)', () => {
			const rules: StatuteRules = {
				injury: {
					default_years: 3,
					rules: [
						{ lob: 'auto', years: 2 },
						{ lob: 'auto', years: 5 }, // Should not be reached
					],
				},
			};
			const result = calculateStatuteLimit(rules, 'injury', 'auto');
			expect(result).toBe(2);
		});
	});

	describe('date-based rules', () => {
		it('should match date_from condition (date of loss >= date_from)', () => {
			const rules: StatuteRules = {
				injury: {
					default_years: 3,
					rules: [{ date_from: '2020-01-01', years: 4 }],
				},
			};
			// Date after date_from
			expect(calculateStatuteLimit(rules, 'injury', undefined, '2020-06-15')).toBe(4);
			// Date exactly on date_from
			expect(calculateStatuteLimit(rules, 'injury', undefined, '2020-01-01')).toBe(4);
		});

		it('should not match date_from when date of loss is before', () => {
			const rules: StatuteRules = {
				injury: {
					default_years: 3,
					rules: [{ date_from: '2020-01-01', years: 4 }],
				},
			};
			const result = calculateStatuteLimit(rules, 'injury', undefined, '2019-12-31');
			expect(result).toBe(3);
		});

		it('should match date_to condition (date of loss <= date_to)', () => {
			const rules: StatuteRules = {
				injury: {
					default_years: 3,
					rules: [{ date_to: '2020-12-31', years: 2 }],
				},
			};
			// Date before date_to
			expect(calculateStatuteLimit(rules, 'injury', undefined, '2020-06-15')).toBe(2);
			// Date exactly on date_to
			expect(calculateStatuteLimit(rules, 'injury', undefined, '2020-12-31')).toBe(2);
		});

		it('should not match date_to when date of loss is after', () => {
			const rules: StatuteRules = {
				injury: {
					default_years: 3,
					rules: [{ date_to: '2020-12-31', years: 2 }],
				},
			};
			const result = calculateStatuteLimit(rules, 'injury', undefined, '2021-01-01');
			expect(result).toBe(3);
		});

		it('should match date range (both date_from and date_to)', () => {
			const rules: StatuteRules = {
				injury: {
					default_years: 3,
					rules: [{ date_from: '2020-01-01', date_to: '2020-12-31', years: 2 }],
				},
			};
			// Within range
			expect(calculateStatuteLimit(rules, 'injury', undefined, '2020-06-15')).toBe(2);
			// Before range
			expect(calculateStatuteLimit(rules, 'injury', undefined, '2019-06-15')).toBe(3);
			// After range
			expect(calculateStatuteLimit(rules, 'injury', undefined, '2021-06-15')).toBe(3);
		});

		it('should match rule when no date provided but rule has date conditions (lenient matching)', () => {
			const rules: StatuteRules = {
				injury: {
					default_years: 3,
					rules: [{ date_from: '2020-01-01', years: 4 }],
				},
			};
			// When no dateOfLoss is provided, date conditions are skipped but rule still matches
			// because hasConditions is true (date_from exists) and matches stays true.
			// This is lenient behavior - date conditions are only evaluated when dateOfLoss is provided.
			const result = calculateStatuteLimit(rules, 'injury');
			expect(result).toBe(4);
		});
	});

	describe('ISO timestamp normalization', () => {
		it('should handle ISO timestamp strings with time component', () => {
			const rules: StatuteRules = {
				injury: {
					default_years: 3,
					rules: [{ date_from: '2020-01-01', date_to: '2020-12-31', years: 2 }],
				},
			};
			// ISO timestamp with time - should normalize to 2020-03-24
			const result = calculateStatuteLimit(rules, 'injury', undefined, '2020-03-24T12:00:00Z');
			expect(result).toBe(2);
		});

		it('should handle ISO timestamp with timezone', () => {
			const rules: StatuteRules = {
				injury: {
					default_years: 3,
					rules: [{ date_from: '2020-01-01', years: 4 }],
				},
			};
			const result = calculateStatuteLimit(rules, 'injury', undefined, '2020-06-15T08:30:00-05:00');
			expect(result).toBe(4);
		});

		it('should handle Date objects', () => {
			const rules: StatuteRules = {
				injury: {
					default_years: 3,
					rules: [{ date_from: '2020-01-01', date_to: '2020-12-31', years: 2 }],
				},
			};
			const result = calculateStatuteLimit(rules, 'injury', undefined, new Date('2020-06-15'));
			expect(result).toBe(2);
		});
	});

	describe('combined LOB and date rules', () => {
		it('should match rule with both LOB and date conditions', () => {
			const rules: StatuteRules = {
				injury: {
					default_years: 3,
					rules: [{ lob: 'auto', date_from: '2020-01-01', years: 1 }],
				},
			};
			// Both conditions match
			const result = calculateStatuteLimit(rules, 'injury', 'auto', '2020-06-15');
			expect(result).toBe(1);
		});

		it('should not match when LOB matches but date does not', () => {
			const rules: StatuteRules = {
				injury: {
					default_years: 3,
					rules: [{ lob: 'auto', date_from: '2020-01-01', years: 1 }],
				},
			};
			const result = calculateStatuteLimit(rules, 'injury', 'auto', '2019-06-15');
			expect(result).toBe(3);
		});

		it('should not match when date matches but LOB does not', () => {
			const rules: StatuteRules = {
				injury: {
					default_years: 3,
					rules: [{ lob: 'auto', date_from: '2020-01-01', years: 1 }],
				},
			};
			const result = calculateStatuteLimit(rules, 'injury', 'homeowners', '2020-06-15');
			expect(result).toBe(3);
		});
	});

	describe('first-match-wins rule ordering', () => {
		it('should return years from first matching rule', () => {
			const rules: StatuteRules = {
				injury: {
					default_years: 3,
					rules: [
						{ lob: 'auto', years: 1 },
						{ date_from: '2020-01-01', years: 2 }, // Also matches but comes second
					],
				},
			};
			const result = calculateStatuteLimit(rules, 'injury', 'auto', '2020-06-15');
			expect(result).toBe(1); // First rule matches LOB
		});

		it('should skip to next rule when first does not match', () => {
			const rules: StatuteRules = {
				injury: {
					default_years: 3,
					rules: [
						{ lob: 'commercial', years: 1 }, // Does not match
						{ lob: 'auto', years: 2 }, // Matches
					],
				},
			};
			const result = calculateStatuteLimit(rules, 'injury', 'auto');
			expect(result).toBe(2);
		});

		it('should fall back to default when no rules match', () => {
			const rules: StatuteRules = {
				injury: {
					default_years: 5,
					rules: [
						{ lob: 'commercial', years: 1 },
						{ lob: 'umbrella', years: 2 },
					],
				},
			};
			const result = calculateStatuteLimit(rules, 'injury', 'auto');
			expect(result).toBe(5);
		});
	});

	describe('edge cases', () => {
		it('should handle rules with years = 0', () => {
			const rules: StatuteRules = {
				injury: {
					default_years: 3,
					rules: [{ lob: 'auto', years: 0 }],
				},
			};
			const result = calculateStatuteLimit(rules, 'injury', 'auto');
			expect(result).toBe(0);
		});

		it('should handle empty rules array', () => {
			const rules: StatuteRules = {
				injury: { default_years: 4, rules: [] },
			};
			const result = calculateStatuteLimit(rules, 'injury', 'auto', '2020-01-01');
			expect(result).toBe(4);
		});

		it('should handle rule with no conditions (only years) - should not match', () => {
			// A rule with only years and no lob/date_from/date_to has no conditions
			// The code checks: const hasConditions = rule.lob || rule.date_from || rule.date_to;
			// If hasConditions is false, the rule doesn't match
			const rules: StatuteRules = {
				injury: {
					default_years: 3,
					rules: [{ years: 5 }], // No conditions
				},
			};
			const result = calculateStatuteLimit(rules, 'injury', 'auto');
			expect(result).toBe(3); // Falls to default because rule has no conditions
		});

		it('should handle boundary dates correctly', () => {
			const rules: StatuteRules = {
				injury: {
					default_years: 3,
					rules: [{ date_from: '2020-06-15', date_to: '2020-06-15', years: 1 }],
				},
			};
			// Exactly on the single-day range
			expect(calculateStatuteLimit(rules, 'injury', undefined, '2020-06-15')).toBe(1);
			// Day before
			expect(calculateStatuteLimit(rules, 'injury', undefined, '2020-06-14')).toBe(3);
			// Day after
			expect(calculateStatuteLimit(rules, 'injury', undefined, '2020-06-16')).toBe(3);
		});
	});
});

/**
 * Tests for statute schema helper functions
 */
describe('getBarPercentForType', () => {
	it('should return 1 for contributory negligence', () => {
		expect(getBarPercentForType('contributory')).toBe(1);
	});

	it('should return 100 for pure comparative negligence', () => {
		expect(getBarPercentForType('pure_comparative')).toBe(100);
	});

	it('should return 50 for comparative 49% negligence', () => {
		expect(getBarPercentForType('comparative_49')).toBe(50);
	});

	it('should return 51 for comparative 50% negligence', () => {
		expect(getBarPercentForType('comparative_50')).toBe(51);
	});

	it('should return null for slight negligence (varies)', () => {
		expect(getBarPercentForType('slight')).toBeNull();
	});

	it('should return null for null input', () => {
		expect(getBarPercentForType(null)).toBeNull();
	});
});

describe('getNegligenceTypeLabel', () => {
	it('should return Contributory for contributory type', () => {
		expect(getNegligenceTypeLabel('contributory')).toBe('Contributory');
	});

	it('should return Pure Comparative for pure_comparative type', () => {
		expect(getNegligenceTypeLabel('pure_comparative')).toBe('Pure Comparative');
	});

	it('should return Comparative (49%) for comparative_49 type', () => {
		expect(getNegligenceTypeLabel('comparative_49')).toBe('Comparative (49%)');
	});

	it('should return Comparative (50%) for comparative_50 type', () => {
		expect(getNegligenceTypeLabel('comparative_50')).toBe('Comparative (50%)');
	});

	it('should return Slight for slight type', () => {
		expect(getNegligenceTypeLabel('slight')).toBe('Slight');
	});

	it('should return empty string for null input', () => {
		expect(getNegligenceTypeLabel(null)).toBe('');
	});
});
