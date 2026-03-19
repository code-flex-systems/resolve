import { describe, it, expect } from 'vitest';
import {
	Kysely,
	DummyDriver,
	PostgresAdapter,
	PostgresIntrospector,
	PostgresQueryCompiler,
} from 'kysely';
import { buildConditionSQL } from '../conditionEvaluator';
import type { RuleConditions } from '../ruleConditions';

// =============================================================================
// HELPER: Compile condition SQL using a dummy Kysely instance
// =============================================================================

const dummyDb = new Kysely<any>({
	dialect: {
		createAdapter: () => new PostgresAdapter(),
		createDriver: () => new DummyDriver(),
		createIntrospector: (db: any) => new PostgresIntrospector(db),
		createQueryCompiler: () => new PostgresQueryCompiler(),
	},
});

function compileCondition(conditions: RuleConditions) {
	const builder = buildConditionSQL(conditions);
	return builder.compile(dummyDb);
}

/** Normalize whitespace for easier comparison */
function normalizeSql(sql: string): string {
	return sql.replace(/\s+/g, ' ').trim();
}

// =============================================================================
// SCALAR OPERATORS
// =============================================================================

describe('buildConditionSQL', () => {
	describe('scalar operators', () => {
		it('eq on string field produces null guard and = operator', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [{ field: 'claim.recovery_status', operator: 'eq', value: 'open' }],
			});
			const sql = normalizeSql(compiled.sql);
			expect(sql).toContain('c.recovery_status IS NOT NULL AND c.recovery_status = $1');
			expect(compiled.parameters).toEqual(['open']);
		});

		it('gt on numeric field produces null guard and > operator', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [{ field: 'claim.claim_amount', operator: 'gt', value: 5000 }],
			});
			const sql = normalizeSql(compiled.sql);
			expect(sql).toContain('c.claim_amount IS NOT NULL AND c.claim_amount > $1');
			expect(compiled.parameters).toEqual([5000]);
		});

		it('neq operator produces != comparison', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [{ field: 'claim.substatus', operator: 'neq', value: 'closed' }],
			});
			const sql = normalizeSql(compiled.sql);
			expect(sql).toContain('c.substatus IS NOT NULL AND c.substatus != $1');
			expect(compiled.parameters).toEqual(['closed']);
		});

		it('gte operator produces >= comparison', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [{ field: 'claim.expected_recovery', operator: 'gte', value: 100 }],
			});
			const sql = normalizeSql(compiled.sql);
			expect(sql).toContain('c.expected_recovery IS NOT NULL AND c.expected_recovery >= $1');
			expect(compiled.parameters).toEqual([100]);
		});

		it('lt operator produces < comparison', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [{ field: 'claim.actual_recovery', operator: 'lt', value: 200 }],
			});
			const sql = normalizeSql(compiled.sql);
			expect(sql).toContain('c.actual_recovery IS NOT NULL AND c.actual_recovery < $1');
			expect(compiled.parameters).toEqual([200]);
		});

		it('lte operator produces <= comparison', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [{ field: 'claim.claim_amount', operator: 'lte', value: 9999 }],
			});
			const sql = normalizeSql(compiled.sql);
			expect(sql).toContain('c.claim_amount IS NOT NULL AND c.claim_amount <= $1');
			expect(compiled.parameters).toEqual([9999]);
		});

		it('eq on integer field (desk_location_id) works correctly', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [{ field: 'claim.desk_location_id', operator: 'eq', value: 42 }],
			});
			const sql = normalizeSql(compiled.sql);
			expect(sql).toContain('c.desk_location_id IS NOT NULL AND c.desk_location_id = $1');
			expect(compiled.parameters).toEqual([42]);
		});
	});

	// =============================================================================
	// ARRAY OPERATORS
	// =============================================================================

	describe('array operators', () => {
		it('in operator produces = ANY with array param', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [{ field: 'claim.recovery_status', operator: 'in', value: ['open', 'pending'] }],
			});
			const sql = normalizeSql(compiled.sql);
			expect(sql).toContain('c.recovery_status IS NOT NULL AND c.recovery_status = ANY($1)');
			expect(compiled.parameters).toEqual([['open', 'pending']]);
		});

		it('not_in operator produces != ALL with array param', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [{ field: 'claim.substatus', operator: 'not_in', value: ['closed', 'denied'] }],
			});
			const sql = normalizeSql(compiled.sql);
			expect(sql).toContain('c.substatus IS NOT NULL AND c.substatus != ALL($1)');
			expect(compiled.parameters).toEqual([['closed', 'denied']]);
		});

		it('in operator wraps non-array value in array', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [{ field: 'claim.desk_location_id', operator: 'in', value: 7 }],
			});
			const sql = normalizeSql(compiled.sql);
			expect(sql).toContain('= ANY($1)');
			expect(compiled.parameters).toEqual([[7]]);
		});

		it('not_in operator wraps non-array value in array', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [{ field: 'claim.desk_location_id', operator: 'not_in', value: 3 }],
			});
			const sql = normalizeSql(compiled.sql);
			expect(sql).toContain('!= ALL($1)');
			expect(compiled.parameters).toEqual([[3]]);
		});
	});

	// =============================================================================
	// NULL OPERATORS
	// =============================================================================

	describe('null operators', () => {
		it('is_null produces IS NULL with no parameters', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [{ field: 'claim.recovery_status', operator: 'is_null' }],
			});
			const sql = normalizeSql(compiled.sql);
			expect(sql).toContain('c.recovery_status IS NULL');
			// Should NOT contain "IS NOT NULL" (the null guard)
			expect(sql).not.toContain('IS NOT NULL');
			expect(compiled.parameters).toEqual([]);
		});

		it('is_not_null produces IS NOT NULL with no parameters', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [{ field: 'claim.claim_amount', operator: 'is_not_null' }],
			});
			const sql = normalizeSql(compiled.sql);
			expect(sql).toContain('c.claim_amount IS NOT NULL');
			expect(compiled.parameters).toEqual([]);
		});

		it('is_null on derived field uses derived SQL expression', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [{ field: 'claim.hours_in_current_stage', operator: 'is_null' }],
			});
			const sql = normalizeSql(compiled.sql);
			expect(sql).toContain('EXTRACT(EPOCH FROM (NOW() - cdlt.entered_at)) / 3600 IS NULL');
			expect(compiled.parameters).toEqual([]);
		});
	});

	// =============================================================================
	// LOGIC COMBINATORS
	// =============================================================================

	describe('logic combinators', () => {
		it('AND with 2 conditions joins clauses with AND', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [
					{ field: 'claim.claim_amount', operator: 'gt', value: 1000 },
					{ field: 'claim.recovery_status', operator: 'eq', value: 'open' },
				],
			});
			const sql = normalizeSql(compiled.sql);
			expect(sql).toContain(') AND (');
			expect(sql).toContain('c.claim_amount');
			expect(sql).toContain('c.recovery_status');
			expect(compiled.parameters).toEqual([1000, 'open']);
		});

		it('OR with 2 conditions joins clauses with OR', () => {
			const compiled = compileCondition({
				logic: 'OR',
				conditions: [
					{ field: 'claim.claim_amount', operator: 'gt', value: 5000 },
					{ field: 'claim.actual_recovery', operator: 'lt', value: 100 },
				],
			});
			const sql = normalizeSql(compiled.sql);
			expect(sql).toContain(') OR (');
			expect(sql).toContain('c.claim_amount');
			expect(sql).toContain('c.actual_recovery');
			expect(compiled.parameters).toEqual([5000, 100]);
		});

		it('single condition has no AND/OR combinator wrapping', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [{ field: 'claim.claim_amount', operator: 'gt', value: 100 }],
			});
			const sql = normalizeSql(compiled.sql);
			// Single clause is returned directly without parenthesized combinator wrappers
			// The "AND" inside the null guard is part of the single clause, not a combinator
			expect(sql).not.toContain(') AND (');
			expect(sql).not.toContain(') OR (');
			expect(sql).toContain('c.claim_amount IS NOT NULL AND c.claim_amount > $1');
		});

		it('AND with 3 conditions chains correctly', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [
					{ field: 'claim.claim_amount', operator: 'gt', value: 100 },
					{ field: 'claim.recovery_status', operator: 'eq', value: 'open' },
					{ field: 'claim.desk_location_id', operator: 'eq', value: 5 },
				],
			});
			const sql = normalizeSql(compiled.sql);
			// Should have two AND connectors between three wrapped clauses
			const andCount = (sql.match(/\) AND \(/g) || []).length;
			expect(andCount).toBe(2);
			expect(compiled.parameters).toEqual([100, 'open', 5]);
		});
	});

	// =============================================================================
	// EDGE CASES
	// =============================================================================

	describe('edge cases', () => {
		it('empty conditions array returns TRUE', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [],
			});
			const sql = normalizeSql(compiled.sql);
			expect(sql).toBe('TRUE');
			expect(compiled.parameters).toEqual([]);
		});

		it('unknown field in conditions is skipped, other conditions still work', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [
					{ field: 'claim.nonexistent_field', operator: 'eq', value: 'foo' },
					{ field: 'claim.claim_amount', operator: 'gt', value: 500 },
				],
			});
			const sql = normalizeSql(compiled.sql);
			// The unknown field is skipped, only claim_amount remains (single clause, no wrapper)
			expect(sql).toContain('c.claim_amount');
			expect(sql).not.toContain('nonexistent_field');
			expect(compiled.parameters).toEqual([500]);
		});

		it('all unknown fields falls back to TRUE', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [
					{ field: 'claim.bogus', operator: 'eq', value: 1 },
					{ field: 'claim.also_bogus', operator: 'gt', value: 2 },
				],
			});
			const sql = normalizeSql(compiled.sql);
			expect(sql).toBe('TRUE');
			expect(compiled.parameters).toEqual([]);
		});

		it('single unknown field among multiple valid ones does not break logic', () => {
			const compiled = compileCondition({
				logic: 'OR',
				conditions: [
					{ field: 'claim.claim_amount', operator: 'gt', value: 100 },
					{ field: 'claim.unknown', operator: 'eq', value: 'x' },
					{ field: 'claim.actual_recovery', operator: 'lt', value: 50 },
				],
			});
			const sql = normalizeSql(compiled.sql);
			expect(sql).toContain(') OR (');
			expect(sql).toContain('c.claim_amount');
			expect(sql).toContain('c.actual_recovery');
			expect(sql).not.toContain('unknown');
			expect(compiled.parameters).toEqual([100, 50]);
		});
	});

	// =============================================================================
	// DERIVED FIELDS
	// =============================================================================

	describe('derived fields', () => {
		it('hours_in_current_stage uses EXTRACT expression', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [{ field: 'claim.hours_in_current_stage', operator: 'gt', value: 24 }],
			});
			const sql = normalizeSql(compiled.sql);
			expect(sql).toContain('EXTRACT(EPOCH FROM (NOW() - cdlt.entered_at)) / 3600 IS NOT NULL');
			expect(sql).toContain('EXTRACT(EPOCH FROM (NOW() - cdlt.entered_at)) / 3600 > $1');
			expect(compiled.parameters).toEqual([24]);
		});

		it('desk_location_type_id uses dl.desk_location_type_id expression', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [{ field: 'claim.desk_location_type_id', operator: 'eq', value: 10 }],
			});
			const sql = normalizeSql(compiled.sql);
			expect(sql).toContain('dl.desk_location_type_id IS NOT NULL AND dl.desk_location_type_id = $1');
			expect(compiled.parameters).toEqual([10]);
		});

		it('previous_desk_location_id uses cdlt.previous_desk_location_id', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [{ field: 'claim.previous_desk_location_id', operator: 'eq', value: 3 }],
			});
			const sql = normalizeSql(compiled.sql);
			expect(sql).toContain('cdlt.previous_desk_location_id IS NOT NULL AND cdlt.previous_desk_location_id = $1');
			expect(compiled.parameters).toEqual([3]);
		});

		it('days_since_date_of_loss uses EXTRACT(DAY) expression', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [{ field: 'claim.days_since_date_of_loss', operator: 'gte', value: 30 }],
			});
			const sql = normalizeSql(compiled.sql);
			expect(sql).toContain('EXTRACT(DAY FROM (NOW() - c.date_of_loss))');
			expect(sql).toContain('>= $1');
			expect(compiled.parameters).toEqual([30]);
		});

		it('derived field with in operator uses = ANY', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [{ field: 'claim.desk_location_type_id', operator: 'in', value: [1, 2, 3] }],
			});
			const sql = normalizeSql(compiled.sql);
			expect(sql).toContain('dl.desk_location_type_id IS NOT NULL AND dl.desk_location_type_id = ANY($1)');
			expect(compiled.parameters).toEqual([[1, 2, 3]]);
		});

		it('derived field with is_null operator has no null guard', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [{ field: 'claim.previous_desk_location_id', operator: 'is_null' }],
			});
			const sql = normalizeSql(compiled.sql);
			expect(sql).toContain('cdlt.previous_desk_location_id IS NULL');
			expect(sql).not.toContain('IS NOT NULL');
		});
	});

	// =============================================================================
	// PARAMETER SAFETY
	// =============================================================================

	describe('parameter safety', () => {
		it('values are parameterized, not interpolated', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [{ field: 'claim.recovery_status', operator: 'eq', value: "'; DROP TABLE claim; --" }],
			});
			const sql = normalizeSql(compiled.sql);
			// The malicious string should be in parameters, not in SQL
			expect(sql).not.toContain('DROP TABLE');
			expect(sql).toContain('$1');
			expect(compiled.parameters).toEqual(["'; DROP TABLE claim; --"]);
		});

		it('field names are raw SQL from registry, not parameterized', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [{ field: 'claim.claim_amount', operator: 'gt', value: 100 }],
			});
			const sql = normalizeSql(compiled.sql);
			// Field name appears directly in SQL (from closed registry)
			expect(sql).toContain('c.claim_amount');
			// Value is parameterized
			expect(sql).toContain('$1');
		});

		it('multiple conditions produce sequential parameter placeholders', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [
					{ field: 'claim.claim_amount', operator: 'gt', value: 1000 },
					{ field: 'claim.recovery_status', operator: 'eq', value: 'open' },
					{ field: 'claim.actual_recovery', operator: 'lte', value: 500 },
				],
			});
			const sql = normalizeSql(compiled.sql);
			expect(sql).toContain('$1');
			expect(sql).toContain('$2');
			expect(sql).toContain('$3');
			expect(compiled.parameters).toEqual([1000, 'open', 500]);
		});

		it('is_null and is_not_null do not consume parameter slots', () => {
			const compiled = compileCondition({
				logic: 'AND',
				conditions: [
					{ field: 'claim.recovery_status', operator: 'is_null' },
					{ field: 'claim.claim_amount', operator: 'gt', value: 100 },
				],
			});
			// is_null has no parameter, so claim_amount's value should be $1
			expect(compiled.parameters).toEqual([100]);
			const sql = normalizeSql(compiled.sql);
			expect(sql).toContain('$1');
			expect(sql).not.toContain('$2');
		});

		it('mixed null and value operators in OR produce correct parameter ordering', () => {
			const compiled = compileCondition({
				logic: 'OR',
				conditions: [
					{ field: 'claim.desk_location_id', operator: 'is_not_null' },
					{ field: 'claim.claim_amount', operator: 'gte', value: 250 },
					{ field: 'claim.recovery_status', operator: 'in', value: ['a', 'b'] },
				],
			});
			expect(compiled.parameters).toEqual([250, ['a', 'b']]);
			const sql = normalizeSql(compiled.sql);
			expect(sql).toContain('$1');
			expect(sql).toContain('$2');
		});
	});
});
