import { RecoveryStatus, ClaimSubstatus } from '@/config/enums';
import type { ProtectedContext } from '@/server/trpc/trpc';
import * as referenceDataQueries from '@/api/queries/referenceDataQueries';

/**
 * Workflow Rule Conditions
 *
 * This file contains the type definitions, field registry, and validation logic
 * for workflow rule conditions. Rules use conditions to determine which claims
 * they apply to.
 *
 * Condition Structure:
 * - A rule has a single `logic` combinator ('AND' or 'OR') that applies to all conditions
 * - Each condition specifies a field, operator, and value
 * - No nested conditions - create multiple rules for complex boolean logic
 *
 * Null Handling:
 * - Claims with NULL values for a field are SKIPPED when evaluating that condition
 * - Use 'is_null' or 'is_not_null' operators to explicitly check for empty values
 * - Frontend should communicate this to users
 *
 * Field Sources:
 * - 'column': Direct database column on the claim table
 * - 'derived': Calculated at evaluation time (e.g., hours_in_current_stage)
 * - 'reference': String field with options from reference_option table
 * - 'enum': String field with options from a TypeScript enum
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * How a field's value/options are obtained
 * - 'column': Direct database column, no predefined options
 * - 'derived': Calculated at evaluation time (e.g., hours_in_current_stage)
 * - 'reference': String field with options from reference_option table
 * - 'enum': String field with options from a TypeScript enum
 */
export type FieldSource = 'column' | 'derived' | 'reference' | 'enum';

/**
 * Data type of the field value
 */
export type FieldType = 'string' | 'numeric' | 'integer' | 'boolean' | 'date';

/**
 * All valid condition operators as a const array
 * Used as the source of truth for both the type and Zod schemas
 */
export const CONDITION_OPERATORS = [
	'eq',
	'neq',
	'gt',
	'gte',
	'lt',
	'lte',
	'in',
	'not_in',
	'is_null',
	'is_not_null',
] as const;

/**
 * Supported comparison operators
 *
 * Comparison operators:
 * - eq: equals
 * - neq: does not equal
 * - gt: greater than
 * - gte: greater than or equal to
 * - lt: less than
 * - lte: less than or equal to
 *
 * Set operators (require array values):
 * - in: value is one of the provided values
 * - not_in: value is not one of the provided values
 *
 * Null operators (no value required):
 * - is_null: field is empty/null
 * - is_not_null: field has a value
 */
export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];

/**
 * Option for enum fields (value/label pair)
 */
export interface EnumOption {
	value: string;
	label: string;
}

/**
 * Definition of a field that can be used in conditions
 */
export interface FieldDefinition {
	/** Unique identifier for the field (e.g., 'claim.recovery_status') */
	field: string;

	/** Human-readable label for UI display */
	label: string;

	/** Data type of the field value */
	type: FieldType;

	/** How the field value/options are obtained */
	source: FieldSource;

	/** Operators that can be used with this field */
	allowedOperators: ConditionOperator[];

	/** Whether the field can have NULL values */
	nullable: boolean;

	/**
	 * For 'reference' source fields, the reference_list.entity value
	 * Used with getReferenceOptions(ctx, referenceEntity) to load options
	 */
	referenceEntity?: string;

	/**
	 * For 'enum' source fields, the available options
	 * Pre-populated from TypeScript enums
	 */
	enumOptions?: EnumOption[];
}

/**
 * A single condition in a rule
 */
export interface RuleCondition {
	/** Field to evaluate (must be in WORKFLOW_CONDITION_FIELDS) */
	field: string;

	/** Comparison operator */
	operator: ConditionOperator;

	/**
	 * Value to compare against
	 * - Required for all operators except 'is_null' and 'is_not_null'
	 * - Must be an array for 'in' and 'not_in' operators
	 * - Type must match the field's type
	 */
	value?: unknown;
}

/**
 * Complete conditions configuration for a workflow rule
 * Stored in workflow_rule.conditions as JSONB
 */
export interface RuleConditions {
	/**
	 * How to combine conditions
	 * - 'AND': All conditions must match
	 * - 'OR': At least one condition must match
	 */
	logic: 'AND' | 'OR';

	/** List of conditions to evaluate */
	conditions: RuleCondition[];
}

// =============================================================================
// ENUM OPTIONS
// =============================================================================

/**
 * Helper to convert a TypeScript enum to EnumOption array
 * Converts SCREAMING_CASE to Title Case for labels
 */
function enumToOptions<T extends Record<string, string>>(enumObj: T): EnumOption[] {
	return Object.entries(enumObj).map(([key, value]) => ({
		value,
		label: key
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join(' '),
	}));
}

/**
 * Options for RecoveryStatus enum
 */
export const RECOVERY_STATUS_OPTIONS: EnumOption[] = enumToOptions(RecoveryStatus);

/**
 * Options for ClaimSubstatus enum
 */
export const CLAIM_SUBSTATUS_OPTIONS: EnumOption[] = enumToOptions(ClaimSubstatus);

// =============================================================================
// OPERATOR CONSTANTS
// =============================================================================

/** Operators for numeric comparisons */
const NUMERIC_OPERATORS: ConditionOperator[] = ['eq', 'gt', 'gte', 'lt', 'lte'];

/** Operators for string equality/set membership */
const STRING_OPERATORS: ConditionOperator[] = ['eq', 'neq', 'in', 'not_in'];

/** Operators for ID fields (integers used as foreign keys) */
const ID_OPERATORS: ConditionOperator[] = ['eq', 'neq', 'in', 'not_in'];

/** Operators that don't require a value */
export const VALUE_LESS_OPERATORS: ConditionOperator[] = ['is_null', 'is_not_null'];

/** Operators that require array values */
export const ARRAY_OPERATORS: ConditionOperator[] = ['in', 'not_in'];

/**
 * Human-readable labels for operators (for UI display)
 */
export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
	eq: 'equals',
	neq: 'does not equal',
	gt: 'is greater than',
	gte: 'is at least',
	lt: 'is less than',
	lte: 'is at most',
	in: 'is one of',
	not_in: 'is not one of',
	is_null: 'is empty',
	is_not_null: 'is not empty',
};

// =============================================================================
// FIELD REGISTRY
// =============================================================================

/**
 * All fields available for use in workflow rule conditions
 *
 * Adding a new field:
 * 1. Add the FieldDefinition to this array
 * 2. If source='derived', add SQL generation logic in the condition evaluator
 * 3. If source='reference', ensure the referenceEntity exists in reference_list
 * 4. If source='enum', add enumOptions from the appropriate TypeScript enum
 */
export const WORKFLOW_CONDITION_FIELDS: FieldDefinition[] = [
	// =========================================================================
	// CLAIM FIELDS (Direct Columns)
	// =========================================================================

	{
		field: 'claim.recovery_status',
		label: 'Recovery Status',
		type: 'string',
		source: 'enum',
		allowedOperators: STRING_OPERATORS,
		nullable: true,
		enumOptions: RECOVERY_STATUS_OPTIONS,
	},
	{
		field: 'claim.substatus',
		label: 'Substatus',
		type: 'string',
		source: 'enum',
		allowedOperators: STRING_OPERATORS,
		nullable: true,
		enumOptions: CLAIM_SUBSTATUS_OPTIONS,
	},
	{
		field: 'claim.line_of_business',
		label: 'Line of Business',
		type: 'string',
		source: 'reference',
		allowedOperators: STRING_OPERATORS,
		nullable: true,
		referenceEntity: 'line_of_business',
	},
	{
		field: 'claim.claim_amount',
		label: 'Claim Amount',
		type: 'numeric',
		source: 'column',
		allowedOperators: NUMERIC_OPERATORS,
		nullable: true,
	},
	{
		field: 'claim.expected_recovery',
		label: 'Expected Recovery',
		type: 'numeric',
		source: 'column',
		allowedOperators: NUMERIC_OPERATORS,
		nullable: true,
	},
	{
		field: 'claim.actual_recovery',
		label: 'Actual Recovery',
		type: 'numeric',
		source: 'column',
		allowedOperators: NUMERIC_OPERATORS,
		nullable: true,
	},
	{
		field: 'claim.desk_location_id',
		label: 'Current Desk Location',
		type: 'integer',
		source: 'column',
		allowedOperators: ID_OPERATORS,
		nullable: true,
	},

	// =========================================================================
	// DERIVED FIELDS (Calculated at Evaluation Time)
	// =========================================================================

	{
		field: 'claim.hours_in_current_stage',
		label: 'Hours in Current Stage',
		type: 'numeric',
		source: 'derived',
		allowedOperators: NUMERIC_OPERATORS,
		nullable: true, // NULL if claim has no transition records
	},
	{
		field: 'claim.days_since_date_of_loss',
		label: 'Days Since Date of Loss',
		type: 'numeric',
		source: 'derived',
		allowedOperators: NUMERIC_OPERATORS,
		nullable: true, // date_of_loss can be null
	},
	{
		field: 'claim.previous_desk_location_id',
		label: 'Previous Desk Location',
		type: 'integer',
		source: 'derived',
		allowedOperators: ID_OPERATORS,
		nullable: true, // Null if claim hasn't moved (first location)
	},
	{
		field: 'claim.desk_location_type_id',
		label: 'Current Phase',
		type: 'integer',
		source: 'derived',
		allowedOperators: ID_OPERATORS,
		nullable: true, // Null if desk_location_id is null
	},
];

// =============================================================================
// FIELD REGISTRY HELPERS
// =============================================================================

/**
 * Get a field definition by field name
 *
 * @param field - The field identifier (e.g., 'claim.recovery_status')
 * @returns The field definition, or undefined if not found
 */
export function getFieldDefinition(field: string): FieldDefinition | undefined {
	return WORKFLOW_CONDITION_FIELDS.find((f) => f.field === field);
}

/**
 * Get all fields that use reference options (from reference_option table)
 * These fields need their options loaded via getReferenceOptions()
 *
 * @returns Array of field definitions with source='reference'
 */
export function getReferenceFields(): FieldDefinition[] {
	return WORKFLOW_CONDITION_FIELDS.filter((f) => f.source === 'reference');
}

/**
 * Get all fields that use enum options
 * These fields have options available directly via enumOptions property
 *
 * @returns Array of field definitions with source='enum'
 */
export function getEnumFields(): FieldDefinition[] {
	return WORKFLOW_CONDITION_FIELDS.filter((f) => f.source === 'enum');
}

/**
 * Get all fields grouped by source type
 * Useful for organizing fields in the UI
 *
 * @returns Object with arrays of fields by source
 */
export function getFieldsBySource(): Record<FieldSource, FieldDefinition[]> {
	return {
		column: WORKFLOW_CONDITION_FIELDS.filter((f) => f.source === 'column'),
		derived: WORKFLOW_CONDITION_FIELDS.filter((f) => f.source === 'derived'),
		reference: WORKFLOW_CONDITION_FIELDS.filter((f) => f.source === 'reference'),
		enum: WORKFLOW_CONDITION_FIELDS.filter((f) => f.source === 'enum'),
	};
}

/**
 * Get allowed operators for a field
 *
 * @param field - The field identifier
 * @returns Array of allowed operators, or empty array if field not found
 */
export function getAllowedOperators(field: string): ConditionOperator[] {
	const fieldDef = getFieldDefinition(field);
	if (!fieldDef) return [];

	// Add null operators if field is nullable
	if (fieldDef.nullable) {
		return [...fieldDef.allowedOperators, 'is_null', 'is_not_null'];
	}

	return fieldDef.allowedOperators;
}

/**
 * Get options for a field (enum fields only)
 * For reference fields, use getReferenceOptions() from the API instead
 *
 * @param field - The field identifier
 * @returns Array of options, or empty array if not an enum field
 */
export function getFieldEnumOptions(field: string): EnumOption[] {
	const fieldDef = getFieldDefinition(field);
	if (!fieldDef || fieldDef.source !== 'enum' || !fieldDef.enumOptions) {
		return [];
	}
	return fieldDef.enumOptions;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validation error with context
 */
export interface ValidationError {
	/** Index of the condition in the array (if applicable) */
	index?: number;

	/** Field that caused the error (if applicable) */
	field?: string;

	/** Human-readable error message */
	message: string;
}

/**
 * Result of validation
 */
export interface ValidationResult {
	/** Whether the conditions are valid */
	valid: boolean;

	/** List of validation errors (empty if valid) */
	errors: ValidationError[];
}

/**
 * Validate reference field values against the reference_option table.
 * Called internally by validateRuleConditions for conditions with reference source fields.
 *
 * @param ctx - Protected context for database access
 * @param conditions - The conditions to validate
 * @returns Array of validation errors for invalid reference values
 */
async function validateReferenceFieldValues(
	ctx: ProtectedContext,
	conditions: RuleConditions
): Promise<ValidationError[]> {
	const errors: ValidationError[] = [];

	// Collect reference fields and their values from conditions
	const referenceValidations: Array<{
		field: string;
		label: string;
		referenceEntity: string;
		values: unknown[];
		conditionIndex: number;
	}> = [];

	conditions.conditions.forEach((condition, index) => {
		const fieldDef = getFieldDefinition(condition.field);
		if (!fieldDef || fieldDef.source !== 'reference' || !fieldDef.referenceEntity) {
			return;
		}

		// Skip null operators - they don't have values to validate
		if (condition.operator === 'is_null' || condition.operator === 'is_not_null') {
			return;
		}

		// Collect values (handle both single values and arrays)
		const values = Array.isArray(condition.value)
			? condition.value
			: condition.value !== undefined
				? [condition.value]
				: [];

		if (values.length > 0) {
			referenceValidations.push({
				field: condition.field,
				label: fieldDef.label,
				referenceEntity: fieldDef.referenceEntity,
				values,
				conditionIndex: index,
			});
		}
	});

	if (referenceValidations.length === 0) {
		return errors; // No reference fields to validate
	}

	// Get unique reference entities to query
	const uniqueEntities = [...new Set(referenceValidations.map((v) => v.referenceEntity))];

	// Load valid options for each reference entity in parallel
	const optionsByEntity = new Map<string, Set<string>>();
	await Promise.all(
		uniqueEntities.map(async (entity) => {
			const options = await referenceDataQueries.getReferenceOptions(ctx, entity);
			const validValues = new Set(options.map((o) => o.value));
			optionsByEntity.set(entity, validValues);
		})
	);

	// Validate each reference field's values
	for (const validation of referenceValidations) {
		const validValues = optionsByEntity.get(validation.referenceEntity);
		if (!validValues) {
			// Reference entity doesn't exist - this is a configuration error
			errors.push({
				index: validation.conditionIndex,
				field: validation.field,
				message: `Reference entity '${validation.referenceEntity}' not found for field '${validation.label}'`,
			});
			continue;
		}

		const invalidValues = validation.values.filter(
			(v) => typeof v === 'string' && !validValues.has(v)
		);

		if (invalidValues.length > 0) {
			errors.push({
				index: validation.conditionIndex,
				field: validation.field,
				message: `Invalid value(s) for '${validation.label}': ${invalidValues.join(', ')}`,
			});
		}
	}

	return errors;
}

/**
 * Validate a complete RuleConditions object
 *
 * @param ctx - Protected context for database access (needed for reference field validation)
 * @param conditions - The conditions to validate
 * @returns Validation result with any errors
 */
export async function validateRuleConditions(
	ctx: ProtectedContext,
	conditions: RuleConditions
): Promise<ValidationResult> {
	const errors: ValidationError[] = [];

	// Validate logic combinator
	if (!conditions.logic || !['AND', 'OR'].includes(conditions.logic)) {
		errors.push({ message: "Logic must be 'AND' or 'OR'" });
	}

	// Validate conditions array exists and is not empty
	if (!conditions.conditions || !Array.isArray(conditions.conditions)) {
		errors.push({ message: 'Conditions must be an array' });
		return { valid: false, errors };
	}

	if (conditions.conditions.length === 0) {
		errors.push({ message: 'At least one condition is required' });
	}

	// Validate each condition (structural validation)
	conditions.conditions.forEach((condition, index) => {
		const conditionErrors = validateCondition(condition);
		conditionErrors.forEach((errMessage) => {
			errors.push({
				index,
				field: condition.field,
				message: errMessage,
			});
		});
	});

	// If structural validation failed, don't bother with reference validation
	if (errors.length > 0) {
		return { valid: false, errors };
	}

	// Validate reference field values (async - requires DB queries)
	const referenceErrors = await validateReferenceFieldValues(ctx, conditions);
	errors.push(...referenceErrors);

	return { valid: errors.length === 0, errors };
}

/**
 * Validate a single condition
 *
 * @param condition - The condition to validate
 * @returns Array of error messages (empty if valid)
 */
function validateCondition(condition: RuleCondition): string[] {
	const errors: string[] = [];

	// Check condition has required properties
	if (!condition.field) {
		errors.push('Field is required');
		return errors;
	}

	if (!condition.operator) {
		errors.push('Operator is required');
		return errors;
	}

	// Check field exists in registry
	const fieldDef = getFieldDefinition(condition.field);
	if (!fieldDef) {
		errors.push(`Unknown field: ${condition.field}`);
		return errors; // Can't validate further without field definition
	}

	// Check operator is valid
	const allowedOps = getAllowedOperators(condition.field);
	if (!allowedOps.includes(condition.operator)) {
		errors.push(
			`Operator '${OPERATOR_LABELS[condition.operator] || condition.operator}' is not allowed for '${
				fieldDef.label
			}'`
		);
	}

	// Null operators don't require a value
	if (VALUE_LESS_OPERATORS.includes(condition.operator)) {
		if (!fieldDef.nullable) {
			errors.push(
				`'${fieldDef.label}' cannot use '${OPERATOR_LABELS[condition.operator]}' because it is never empty`
			);
		}
		// Value is ignored for null operators
		return errors;
	}

	// Value is required for all other operators
	if (condition.value === undefined || condition.value === null) {
		errors.push('A value is required');
		return errors;
	}

	// Array operators require array value
	if (ARRAY_OPERATORS.includes(condition.operator)) {
		if (!Array.isArray(condition.value)) {
			errors.push(`'${OPERATOR_LABELS[condition.operator]}' requires multiple values`);
			return errors;
		}
		if (condition.value.length === 0) {
			errors.push('At least one value must be selected');
			return errors;
		}
		// Validate each value in array
		const invalidValues: number[] = [];
		condition.value.forEach((v, i) => {
			if (!isValidValueType(v, fieldDef.type)) {
				invalidValues.push(i + 1);
			}
		});
		if (invalidValues.length > 0) {
			errors.push(`Invalid value(s) at position(s): ${invalidValues.join(', ')}`);
		}
		// For enum fields, validate values are in the allowed options
		if (fieldDef.source === 'enum' && fieldDef.enumOptions) {
			const validValues = fieldDef.enumOptions.map((o) => o.value);
			const invalidEnumValues = (condition.value as string[]).filter((v) => !validValues.includes(v));
			if (invalidEnumValues.length > 0) {
				errors.push(`Invalid value(s) for '${fieldDef.label}': ${invalidEnumValues.join(', ')}`);
			}
		}
	} else {
		// Single value operators
		if (Array.isArray(condition.value)) {
			errors.push(`'${OPERATOR_LABELS[condition.operator]}' requires a single value, not multiple`);
		} else if (!isValidValueType(condition.value, fieldDef.type)) {
			errors.push(`Invalid value type for '${fieldDef.label}'`);
		} else if (fieldDef.source === 'enum' && fieldDef.enumOptions) {
			// For enum fields, validate value is in the allowed options
			const validValues = fieldDef.enumOptions.map((o) => o.value);
			if (!validValues.includes(condition.value as string)) {
				errors.push(`Invalid value for '${fieldDef.label}': ${condition.value}`);
			}
		}
	}

	return errors;
}

/**
 * Check if a value matches the expected type
 *
 * @param value - The value to check
 * @param type - The expected field type
 * @returns True if the value is valid for the type
 */
function isValidValueType(value: unknown, type: FieldType): boolean {
	switch (type) {
		case 'string':
			return typeof value === 'string';
		case 'numeric':
			return typeof value === 'number' && !isNaN(value);
		case 'integer':
			return typeof value === 'number' && Number.isInteger(value);
		case 'boolean':
			return typeof value === 'boolean';
		case 'date':
			return typeof value === 'string' && !isNaN(Date.parse(value));
		default:
			return false;
	}
}

// =============================================================================
// UI HELPERS
// =============================================================================

/**
 * Message to display to users about null handling
 */
export const NULL_HANDLING_MESSAGE =
	'Note: Claims with empty values for a field will be skipped when evaluating that condition. ' +
	'Use "is empty" or "is not empty" to explicitly check for empty values.';

/**
 * Get help text for a specific field regarding null handling
 *
 * @param field - The field identifier
 * @returns Help text string, or null if no special handling needed
 */
export function getFieldNullHelpText(field: string): string | null {
	const fieldDef = getFieldDefinition(field);
	if (!fieldDef) return null;

	if (fieldDef.nullable) {
		return (
			`Claims where '${fieldDef.label}' is empty will not match this condition. ` +
			`Use "is empty" or "is not empty" to explicitly check for empty values.`
		);
	}

	return null;
}

/**
 * Check if an operator requires a value input
 *
 * @param operator - The operator to check
 * @returns True if the operator needs a value
 */
export function operatorRequiresValue(operator: ConditionOperator): boolean {
	return !VALUE_LESS_OPERATORS.includes(operator);
}

/**
 * Check if an operator requires multiple values (array)
 *
 * @param operator - The operator to check
 * @returns True if the operator needs an array of values
 */
export function operatorRequiresArray(operator: ConditionOperator): boolean {
	return ARRAY_OPERATORS.includes(operator);
}

/**
 * Determine what kind of input a field needs based on its source
 *
 * @param field - The field identifier
 * @returns Input type hint for UI rendering
 */
export function getFieldInputType(field: string): 'select' | 'multiselect' | 'number' | 'text' | 'date' | null {
	const fieldDef = getFieldDefinition(field);
	if (!fieldDef) return null;

	// Enum and reference fields use select/multiselect
	if (fieldDef.source === 'enum' || fieldDef.source === 'reference') {
		return 'select'; // Use 'multiselect' when operator is 'in' or 'not_in'
	}

	// ID fields (integers referencing other tables) use select for desk locations
	if (
		fieldDef.field === 'claim.desk_location_id' ||
		fieldDef.field === 'claim.previous_desk_location_id' ||
		fieldDef.field === 'claim.desk_location_type_id'
	) {
		return 'select';
	}

	// Type-based defaults
	switch (fieldDef.type) {
		case 'numeric':
		case 'integer':
			return 'number';
		case 'date':
			return 'date';
		case 'string':
			return 'text';
		default:
			return 'text';
	}
}

// =============================================================================
// SQL GENERATION HELPERS (for condition evaluation)
// =============================================================================

/**
 * Mapping of derived fields to their SQL expressions
 *
 * These are used when building the SQL query to evaluate conditions.
 * The expressions assume the following table aliases:
 * - c: claim
 * - cdlt: claim_desk_location_transition (current/most recent)
 * - dl: desk_location
 *
 * Note: The actual SQL generation should be implemented in the backend
 * condition evaluator. This mapping is provided as a reference.
 */
export const DERIVED_FIELD_SQL: Record<string, string> = {
	'claim.hours_in_current_stage': 'EXTRACT(EPOCH FROM (NOW() - cdlt.entered_at)) / 3600',
	'claim.days_since_date_of_loss': 'EXTRACT(DAY FROM (NOW() - c.date_of_loss))',
	'claim.previous_desk_location_id': 'cdlt.previous_desk_location_id',
	'claim.desk_location_type_id': 'dl.desk_location_type_id',
};

/**
 * Mapping of column fields to their SQL column references
 *
 * Assumes table alias 'c' for claim table.
 */
export const COLUMN_FIELD_SQL: Record<string, string> = {
	'claim.recovery_status': 'c.recovery_status',
	'claim.substatus': 'c.substatus',
	'claim.line_of_business': 'c.line_of_business',
	'claim.claim_amount': 'c.claim_amount',
	'claim.expected_recovery': 'c.expected_recovery',
	'claim.actual_recovery': 'c.actual_recovery',
	'claim.desk_location_id': 'c.desk_location_id',
};

/**
 * Get the SQL expression for a field
 *
 * @param field - The field identifier
 * @returns SQL expression string, or null if field not found
 */
export function getFieldSQLExpression(field: string): string | null {
	const fieldDef = getFieldDefinition(field);
	if (!fieldDef) return null;

	if (fieldDef.source === 'derived') {
		return DERIVED_FIELD_SQL[field] || null;
	}

	// Column, reference, and enum fields all map to column references
	return COLUMN_FIELD_SQL[field] || null;
}

/**
 * SQL operator mapping
 */
export const SQL_OPERATORS: Record<ConditionOperator, string> = {
	eq: '=',
	neq: '!=',
	gt: '>',
	gte: '>=',
	lt: '<',
	lte: '<=',
	in: '= ANY',
	not_in: '!= ALL',
	is_null: 'IS NULL',
	is_not_null: 'IS NOT NULL',
};
