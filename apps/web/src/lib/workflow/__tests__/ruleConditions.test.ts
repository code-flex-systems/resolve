import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	getFieldDefinition,
	getAllowedOperators,
	getFieldEnumOptions,
	getFieldInputType,
	getFieldSQLExpression,
	operatorRequiresValue,
	operatorRequiresArray,
	getFieldNullHelpText,
	getReferenceFields,
	getEnumFields,
	getFieldsBySource,
	validateRuleConditions,
	WORKFLOW_CONDITION_FIELDS,
	RECOVERY_STATUS_OPTIONS,
	CLAIM_SUBSTATUS_OPTIONS,
	type RuleConditions,
	type ConditionOperator,
} from '../ruleConditions';

// =============================================================================
// MOCK: referenceDataQueries
// =============================================================================

vi.mock('@/api/queries/referenceDataQueries', () => ({
	getReferenceOptions: vi.fn().mockResolvedValue([
		{ value: 'auto', label: 'Auto' },
		{ value: 'property', label: 'Property' },
	]),
}));

const mockCtx = {
	session: { user: { id: 'user-1', client_id: 'client-1' } },
	db: {},
} as any;

// =============================================================================
// HELPERS
// =============================================================================

function makeConditions(overrides: Partial<RuleConditions> = {}): RuleConditions {
	return {
		logic: 'AND',
		conditions: [{ field: 'claim.claim_amount', operator: 'gt', value: 1000 }],
		...overrides,
	};
}

// =============================================================================
// getFieldDefinition
// =============================================================================

describe('getFieldDefinition', () => {
	it('returns definition for a known field', () => {
		const def = getFieldDefinition('claim.recovery_status');
		expect(def).toBeDefined();
		expect(def!.field).toBe('claim.recovery_status');
		expect(def!.label).toBe('Recovery Status');
		expect(def!.type).toBe('string');
		expect(def!.source).toBe('enum');
	});

	it('returns definition for a derived field', () => {
		const def = getFieldDefinition('claim.hours_in_current_stage');
		expect(def).toBeDefined();
		expect(def!.source).toBe('derived');
		expect(def!.type).toBe('numeric');
	});

	it('returns undefined for an unknown field', () => {
		expect(getFieldDefinition('claim.nonexistent')).toBeUndefined();
	});

	it('returns undefined for empty string', () => {
		expect(getFieldDefinition('')).toBeUndefined();
	});
});

// =============================================================================
// getAllowedOperators
// =============================================================================

describe('getAllowedOperators', () => {
	it('includes is_null and is_not_null for nullable fields', () => {
		const ops = getAllowedOperators('claim.recovery_status');
		expect(ops).toContain('is_null');
		expect(ops).toContain('is_not_null');
	});

	it('includes the base operators for the field', () => {
		const ops = getAllowedOperators('claim.claim_amount');
		expect(ops).toContain('eq');
		expect(ops).toContain('gt');
		expect(ops).toContain('gte');
		expect(ops).toContain('lt');
		expect(ops).toContain('lte');
	});

	it('includes string operators for enum fields', () => {
		const ops = getAllowedOperators('claim.recovery_status');
		expect(ops).toContain('eq');
		expect(ops).toContain('neq');
		expect(ops).toContain('in');
		expect(ops).toContain('not_in');
	});

	it('returns empty array for unknown field', () => {
		expect(getAllowedOperators('claim.nonexistent')).toEqual([]);
	});

	it('does not duplicate is_null/is_not_null when field is nullable', () => {
		const ops = getAllowedOperators('claim.recovery_status');
		const isNullCount = ops.filter((o) => o === 'is_null').length;
		const isNotNullCount = ops.filter((o) => o === 'is_not_null').length;
		expect(isNullCount).toBe(1);
		expect(isNotNullCount).toBe(1);
	});
});

// =============================================================================
// getFieldEnumOptions
// =============================================================================

describe('getFieldEnumOptions', () => {
	it('returns options for an enum field', () => {
		const options = getFieldEnumOptions('claim.recovery_status');
		expect(options.length).toBeGreaterThan(0);
		expect(options).toEqual(RECOVERY_STATUS_OPTIONS);
		// Each option should have value and label
		options.forEach((opt) => {
			expect(opt).toHaveProperty('value');
			expect(opt).toHaveProperty('label');
			expect(typeof opt.value).toBe('string');
			expect(typeof opt.label).toBe('string');
		});
	});

	it('returns substatus options for claim.substatus', () => {
		const options = getFieldEnumOptions('claim.substatus');
		expect(options).toEqual(CLAIM_SUBSTATUS_OPTIONS);
		expect(options.length).toBeGreaterThan(0);
	});

	it('returns empty array for a non-enum field', () => {
		expect(getFieldEnumOptions('claim.claim_amount')).toEqual([]);
	});

	it('returns empty array for a reference field', () => {
		expect(getFieldEnumOptions('claim.line_of_business')).toEqual([]);
	});

	it('returns empty array for unknown field', () => {
		expect(getFieldEnumOptions('claim.nonexistent')).toEqual([]);
	});
});

// =============================================================================
// getFieldInputType
// =============================================================================

describe('getFieldInputType', () => {
	it('returns "select" for enum field', () => {
		expect(getFieldInputType('claim.recovery_status')).toBe('select');
	});

	it('returns "select" for reference field', () => {
		expect(getFieldInputType('claim.line_of_business')).toBe('select');
	});

	it('returns "number" for numeric column field', () => {
		expect(getFieldInputType('claim.claim_amount')).toBe('number');
	});

	it('returns "number" for derived numeric field', () => {
		expect(getFieldInputType('claim.hours_in_current_stage')).toBe('number');
	});

	it('returns "select" for desk_location_id (special ID field)', () => {
		expect(getFieldInputType('claim.desk_location_id')).toBe('select');
	});

	it('returns "select" for previous_desk_location_id', () => {
		expect(getFieldInputType('claim.previous_desk_location_id')).toBe('select');
	});

	it('returns "select" for desk_location_type_id', () => {
		expect(getFieldInputType('claim.desk_location_type_id')).toBe('select');
	});

	it('returns null for unknown field', () => {
		expect(getFieldInputType('claim.nonexistent')).toBeNull();
	});
});

// =============================================================================
// getFieldSQLExpression
// =============================================================================

describe('getFieldSQLExpression', () => {
	it('returns column reference for a column field', () => {
		expect(getFieldSQLExpression('claim.recovery_status')).toBe('c.recovery_status');
	});

	it('returns column reference for claim_amount', () => {
		expect(getFieldSQLExpression('claim.claim_amount')).toBe('c.claim_amount');
	});

	it('returns EXTRACT expression for hours_in_current_stage', () => {
		const sql = getFieldSQLExpression('claim.hours_in_current_stage');
		expect(sql).toContain('EXTRACT');
		expect(sql).toContain('3600');
	});

	it('returns expression for days_since_date_of_loss', () => {
		const sql = getFieldSQLExpression('claim.days_since_date_of_loss');
		expect(sql).toContain('EXTRACT');
		expect(sql).toContain('date_of_loss');
	});

	it('returns column reference for reference field (line_of_business)', () => {
		expect(getFieldSQLExpression('claim.line_of_business')).toBe('c.line_of_business');
	});

	it('returns null for unknown field', () => {
		expect(getFieldSQLExpression('claim.nonexistent')).toBeNull();
	});

	it('returns expression for derived ID fields', () => {
		expect(getFieldSQLExpression('claim.previous_desk_location_id')).toBe(
			'cdlt.previous_desk_location_id'
		);
		expect(getFieldSQLExpression('claim.desk_location_type_id')).toBe('dl.desk_location_type_id');
	});
});

// =============================================================================
// operatorRequiresValue
// =============================================================================

describe('operatorRequiresValue', () => {
	it('returns false for is_null', () => {
		expect(operatorRequiresValue('is_null')).toBe(false);
	});

	it('returns false for is_not_null', () => {
		expect(operatorRequiresValue('is_not_null')).toBe(false);
	});

	const valueOperators: ConditionOperator[] = [
		'eq',
		'neq',
		'gt',
		'gte',
		'lt',
		'lte',
		'in',
		'not_in',
	];
	valueOperators.forEach((op) => {
		it(`returns true for ${op}`, () => {
			expect(operatorRequiresValue(op)).toBe(true);
		});
	});
});

// =============================================================================
// operatorRequiresArray
// =============================================================================

describe('operatorRequiresArray', () => {
	it('returns true for "in"', () => {
		expect(operatorRequiresArray('in')).toBe(true);
	});

	it('returns true for "not_in"', () => {
		expect(operatorRequiresArray('not_in')).toBe(true);
	});

	const nonArrayOperators: ConditionOperator[] = [
		'eq',
		'neq',
		'gt',
		'gte',
		'lt',
		'lte',
		'is_null',
		'is_not_null',
	];
	nonArrayOperators.forEach((op) => {
		it(`returns false for ${op}`, () => {
			expect(operatorRequiresArray(op)).toBe(false);
		});
	});
});

// =============================================================================
// getFieldNullHelpText
// =============================================================================

describe('getFieldNullHelpText', () => {
	it('returns help text for a nullable field', () => {
		const text = getFieldNullHelpText('claim.recovery_status');
		expect(text).not.toBeNull();
		expect(text).toContain('Recovery Status');
		expect(text).toContain('is empty');
	});

	it('returns help text for nullable derived field', () => {
		const text = getFieldNullHelpText('claim.hours_in_current_stage');
		expect(text).not.toBeNull();
		expect(text).toContain('Hours in Current Stage');
	});

	it('returns null for unknown field', () => {
		expect(getFieldNullHelpText('claim.nonexistent')).toBeNull();
	});

	it('returns null for empty string field', () => {
		expect(getFieldNullHelpText('')).toBeNull();
	});
});

// =============================================================================
// getReferenceFields
// =============================================================================

describe('getReferenceFields', () => {
	it('includes line_of_business', () => {
		const fields = getReferenceFields();
		const fieldNames = fields.map((f) => f.field);
		expect(fieldNames).toContain('claim.line_of_business');
	});

	it('does not include enum fields', () => {
		const fields = getReferenceFields();
		const fieldNames = fields.map((f) => f.field);
		expect(fieldNames).not.toContain('claim.recovery_status');
		expect(fieldNames).not.toContain('claim.substatus');
	});

	it('does not include column fields', () => {
		const fields = getReferenceFields();
		const fieldNames = fields.map((f) => f.field);
		expect(fieldNames).not.toContain('claim.claim_amount');
	});

	it('all returned fields have source=reference', () => {
		const fields = getReferenceFields();
		fields.forEach((f) => expect(f.source).toBe('reference'));
	});

	it('all returned fields have referenceEntity defined', () => {
		const fields = getReferenceFields();
		fields.forEach((f) => expect(f.referenceEntity).toBeDefined());
	});
});

// =============================================================================
// getEnumFields
// =============================================================================

describe('getEnumFields', () => {
	it('includes recovery_status and substatus', () => {
		const fields = getEnumFields();
		const fieldNames = fields.map((f) => f.field);
		expect(fieldNames).toContain('claim.recovery_status');
		expect(fieldNames).toContain('claim.substatus');
	});

	it('does not include reference fields', () => {
		const fields = getEnumFields();
		const fieldNames = fields.map((f) => f.field);
		expect(fieldNames).not.toContain('claim.line_of_business');
	});

	it('all returned fields have source=enum', () => {
		const fields = getEnumFields();
		fields.forEach((f) => expect(f.source).toBe('enum'));
	});

	it('all returned fields have enumOptions', () => {
		const fields = getEnumFields();
		fields.forEach((f) => {
			expect(f.enumOptions).toBeDefined();
			expect(f.enumOptions!.length).toBeGreaterThan(0);
		});
	});
});

// =============================================================================
// getFieldsBySource
// =============================================================================

describe('getFieldsBySource', () => {
	it('returns object with all source keys', () => {
		const grouped = getFieldsBySource();
		expect(grouped).toHaveProperty('column');
		expect(grouped).toHaveProperty('derived');
		expect(grouped).toHaveProperty('reference');
		expect(grouped).toHaveProperty('enum');
	});

	it('column group contains only column-sourced fields', () => {
		const grouped = getFieldsBySource();
		grouped.column.forEach((f) => expect(f.source).toBe('column'));
	});

	it('derived group contains only derived fields', () => {
		const grouped = getFieldsBySource();
		grouped.derived.forEach((f) => expect(f.source).toBe('derived'));
	});

	it('reference group contains only reference fields', () => {
		const grouped = getFieldsBySource();
		grouped.reference.forEach((f) => expect(f.source).toBe('reference'));
	});

	it('enum group contains only enum fields', () => {
		const grouped = getFieldsBySource();
		grouped.enum.forEach((f) => expect(f.source).toBe('enum'));
	});

	it('total count across all groups equals WORKFLOW_CONDITION_FIELDS length', () => {
		const grouped = getFieldsBySource();
		const total =
			grouped.column.length +
			grouped.derived.length +
			grouped.reference.length +
			grouped.enum.length;
		expect(total).toBe(WORKFLOW_CONDITION_FIELDS.length);
	});
});

// =============================================================================
// validateRuleConditions
// =============================================================================

describe('validateRuleConditions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// -------------------------------------------------------------------------
	// Valid conditions
	// -------------------------------------------------------------------------

	it('returns valid for a simple AND condition on numeric field', async () => {
		const result = await validateRuleConditions(mockCtx, makeConditions());
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it('returns valid for OR logic with multiple conditions', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				logic: 'OR',
				conditions: [
					{ field: 'claim.claim_amount', operator: 'gt', value: 5000 },
					{ field: 'claim.actual_recovery', operator: 'lt', value: 100 },
				],
			})
		);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it('returns valid for is_null operator with no value', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [{ field: 'claim.recovery_status', operator: 'is_null' }],
			})
		);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it('returns valid for is_not_null operator with no value', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [{ field: 'claim.claim_amount', operator: 'is_not_null' }],
			})
		);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it('returns valid for "in" operator with array of enum values', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [
					{
						field: 'claim.recovery_status',
						operator: 'in',
						value: ['pending', 'in_progress'],
					},
				],
			})
		);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	// -------------------------------------------------------------------------
	// Invalid logic
	// -------------------------------------------------------------------------

	it('rejects invalid logic combinator', async () => {
		const result = await validateRuleConditions(mockCtx, {
			logic: 'XOR' as any,
			conditions: [{ field: 'claim.claim_amount', operator: 'gt', value: 1000 }],
		});
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.includes('Logic'))).toBe(true);
	});

	// -------------------------------------------------------------------------
	// Empty / missing conditions
	// -------------------------------------------------------------------------

	it('rejects empty conditions array', async () => {
		const result = await validateRuleConditions(mockCtx, makeConditions({ conditions: [] }));
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.includes('At least one condition'))).toBe(true);
	});

	it('rejects missing conditions property', async () => {
		const result = await validateRuleConditions(mockCtx, {
			logic: 'AND',
			conditions: undefined as any,
		});
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.includes('array'))).toBe(true);
	});

	it('rejects non-array conditions', async () => {
		const result = await validateRuleConditions(mockCtx, {
			logic: 'AND',
			conditions: 'not-an-array' as any,
		});
		expect(result.valid).toBe(false);
	});

	// -------------------------------------------------------------------------
	// Unknown field
	// -------------------------------------------------------------------------

	it('rejects unknown field name', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [{ field: 'claim.nonexistent', operator: 'eq', value: 'test' }],
			})
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.includes('Unknown field'))).toBe(true);
	});

	// -------------------------------------------------------------------------
	// Invalid operator for field
	// -------------------------------------------------------------------------

	it('rejects gt operator on string enum field', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [{ field: 'claim.recovery_status', operator: 'gt', value: 'pending' }],
			})
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.includes('not allowed'))).toBe(true);
	});

	it('rejects lt operator on ID field', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [{ field: 'claim.desk_location_id', operator: 'lt', value: 5 }],
			})
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.includes('not allowed'))).toBe(true);
	});

	// -------------------------------------------------------------------------
	// Array operator with non-array value
	// -------------------------------------------------------------------------

	it('rejects "in" operator with single string value', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [{ field: 'claim.recovery_status', operator: 'in', value: 'pending' }],
			})
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.includes('multiple values'))).toBe(true);
	});

	it('rejects "in" operator with empty array', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [{ field: 'claim.recovery_status', operator: 'in', value: [] }],
			})
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.includes('At least one value'))).toBe(true);
	});

	// -------------------------------------------------------------------------
	// Single operator with array value
	// -------------------------------------------------------------------------

	it('rejects eq operator with array value', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [
					{ field: 'claim.recovery_status', operator: 'eq', value: ['pending', 'in_progress'] },
				],
			})
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.includes('single value'))).toBe(true);
	});

	// -------------------------------------------------------------------------
	// Value type mismatch
	// -------------------------------------------------------------------------

	it('rejects string value for numeric field', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [{ field: 'claim.claim_amount', operator: 'gt', value: 'not-a-number' }],
			})
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.includes('Invalid value type'))).toBe(true);
	});

	it('rejects NaN for numeric field', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [{ field: 'claim.claim_amount', operator: 'eq', value: NaN }],
			})
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.includes('Invalid value type'))).toBe(true);
	});

	it('rejects non-integer for integer field', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [{ field: 'claim.desk_location_id', operator: 'eq', value: 3.5 }],
			})
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.includes('Invalid value type'))).toBe(true);
	});

	it('rejects numeric value for string enum field', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [{ field: 'claim.recovery_status', operator: 'eq', value: 123 }],
			})
		);
		expect(result.valid).toBe(false);
	});

	// -------------------------------------------------------------------------
	// Missing value for non-null operator
	// -------------------------------------------------------------------------

	it('rejects undefined value for eq operator', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [{ field: 'claim.claim_amount', operator: 'eq', value: undefined }],
			})
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.includes('value is required'))).toBe(true);
	});

	it('rejects null value for eq operator', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [{ field: 'claim.claim_amount', operator: 'eq', value: null }],
			})
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.includes('value is required'))).toBe(true);
	});

	// -------------------------------------------------------------------------
	// Missing field / operator
	// -------------------------------------------------------------------------

	it('rejects condition with missing field', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [{ field: '', operator: 'eq', value: 1 }],
			})
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.includes('Field is required'))).toBe(true);
	});

	it('rejects condition with missing operator', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [{ field: 'claim.claim_amount', operator: '' as any, value: 1 }],
			})
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.includes('Operator is required'))).toBe(true);
	});

	// -------------------------------------------------------------------------
	// Enum validation
	// -------------------------------------------------------------------------

	it('rejects invalid enum value for single operator', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [{ field: 'claim.recovery_status', operator: 'eq', value: 'totally_invalid' }],
			})
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.includes('Invalid value'))).toBe(true);
	});

	it('rejects invalid enum value in array for "in" operator', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [
					{
						field: 'claim.recovery_status',
						operator: 'in',
						value: ['pending', 'invalid_status'],
					},
				],
			})
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.includes('Invalid value'))).toBe(true);
	});

	it('accepts valid enum value', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [{ field: 'claim.recovery_status', operator: 'eq', value: 'pending' }],
			})
		);
		expect(result.valid).toBe(true);
	});

	it('accepts valid substatus enum value', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [{ field: 'claim.substatus', operator: 'eq', value: 'investigation' }],
			})
		);
		expect(result.valid).toBe(true);
	});

	// -------------------------------------------------------------------------
	// Reference field validation
	// -------------------------------------------------------------------------

	it('accepts valid reference field value', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [{ field: 'claim.line_of_business', operator: 'eq', value: 'auto' }],
			})
		);
		expect(result.valid).toBe(true);
	});

	it('rejects invalid reference field value', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [{ field: 'claim.line_of_business', operator: 'eq', value: 'spaceflight' }],
			})
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.includes('Invalid value'))).toBe(true);
	});

	it('rejects invalid reference field value in array', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [
					{
						field: 'claim.line_of_business',
						operator: 'in',
						value: ['auto', 'spaceflight'],
					},
				],
			})
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.includes('Invalid value'))).toBe(true);
	});

	it('accepts valid reference field value in array', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [
					{
						field: 'claim.line_of_business',
						operator: 'in',
						value: ['auto', 'property'],
					},
				],
			})
		);
		expect(result.valid).toBe(true);
	});

	it('skips reference validation for is_null on reference field', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [{ field: 'claim.line_of_business', operator: 'is_null' }],
			})
		);
		expect(result.valid).toBe(true);
	});

	// -------------------------------------------------------------------------
	// Array value type validation
	// -------------------------------------------------------------------------

	it('rejects array with invalid value types for "in" operator', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [
					{
						field: 'claim.recovery_status',
						operator: 'in',
						value: ['pending', 123], // 123 is not a string
					},
				],
			})
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.includes('Invalid value'))).toBe(true);
	});

	// -------------------------------------------------------------------------
	// Multiple conditions with mixed errors
	// -------------------------------------------------------------------------

	it('reports errors with correct condition index', async () => {
		const result = await validateRuleConditions(mockCtx, {
			logic: 'AND',
			conditions: [
				{ field: 'claim.claim_amount', operator: 'gt', value: 1000 }, // valid
				{ field: 'claim.nonexistent', operator: 'eq', value: 'x' }, // invalid
			],
		});
		expect(result.valid).toBe(false);
		const error = result.errors.find((e) => e.message.includes('Unknown field'));
		expect(error).toBeDefined();
		expect(error!.index).toBe(1);
	});

	// -------------------------------------------------------------------------
	// Integer field with valid value
	// -------------------------------------------------------------------------

	it('accepts integer value for integer field', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [{ field: 'claim.desk_location_id', operator: 'eq', value: 5 }],
			})
		);
		expect(result.valid).toBe(true);
	});

	it('accepts "in" with integer array for ID field', async () => {
		const result = await validateRuleConditions(
			mockCtx,
			makeConditions({
				conditions: [{ field: 'claim.desk_location_id', operator: 'in', value: [1, 2, 3] }],
			})
		);
		expect(result.valid).toBe(true);
	});

	// -------------------------------------------------------------------------
	// Reference entity returns no valid options
	// -------------------------------------------------------------------------

	it('rejects when reference entity has no valid options configured', async () => {
		const { getReferenceOptions } = await import('@/api/queries/referenceDataQueries');
		(getReferenceOptions as any).mockResolvedValueOnce([]);

		const result = await validateRuleConditions(mockCtx, {
			logic: 'AND',
			conditions: [{ field: 'claim.line_of_business', operator: 'eq', value: 'auto' }],
		});
		expect(result.valid).toBe(false);
		expect(result.errors[0].message).toContain('Invalid value');
	});
});
