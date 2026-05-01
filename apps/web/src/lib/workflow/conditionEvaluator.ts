import { sql, type RawBuilder } from 'kysely';
import type { ProtectedContext } from '@/server/trpc/trpc';
import {
	type RuleConditions,
	type RuleCondition,
	type ConditionOperator,
	getFieldDefinition,
	getFieldSQLExpression,
	SQL_OPERATORS,
	VALUE_LESS_OPERATORS,
	ARRAY_OPERATORS,
} from './ruleConditions';

/**
 * Result of condition evaluation — a matching claim with its current desk location
 */
export interface ConditionMatch {
	claimId: string;
	deskLocationId: string | null;
}

/**
 * Optional filters to narrow the scope of condition evaluation
 */
export interface ConditionScopeFilter {
	/** Only evaluate claims at this desk location */
	deskLocationId?: string;
	/** Only evaluate these specific claims */
	claimIds?: string[];
}

// =============================================================================
// SQL CONDITION BUILDER
// =============================================================================

/**
 * Build a Kysely RawBuilder representing the WHERE clause from a RuleConditions object.
 *
 * Security: Field names come from the closed WORKFLOW_CONDITION_FIELDS registry
 * (not user input). All values are parameterized via Kysely's sql tagged template.
 *
 * @param conditions - The rule's conditions JSONB
 * @returns A RawBuilder<boolean> that can be embedded in a Kysely query
 */
export function buildConditionSQL(conditions: RuleConditions): RawBuilder<boolean> {
	const clauses: RawBuilder<boolean>[] = [];

	for (const condition of conditions.conditions) {
		const clause = buildSingleConditionSQL(condition);
		if (clause) {
			clauses.push(clause);
		}
	}

	if (clauses.length === 0) {
		return sql<boolean>`TRUE`;
	}

	if (conditions.logic === 'OR') {
		return joinClauses(clauses, 'OR');
	}

	return joinClauses(clauses, 'AND');
}

/**
 * Join multiple RawBuilder clauses with AND or OR.
 */
function joinClauses(clauses: RawBuilder<boolean>[], logic: 'AND' | 'OR'): RawBuilder<boolean> {
	if (clauses.length === 1) {
		return clauses[0];
	}

	// Build: (clause1) AND/OR (clause2) AND/OR ...
	let result = sql<boolean>`(${clauses[0]})`;
	for (let i = 1; i < clauses.length; i++) {
		if (logic === 'OR') {
			result = sql<boolean>`${result} OR (${clauses[i]})`;
		} else {
			result = sql<boolean>`${result} AND (${clauses[i]})`;
		}
	}
	return result;
}

/**
 * Build a Kysely RawBuilder for a single condition.
 * Returns null if the field is unrecognized (defensive).
 */
function buildSingleConditionSQL(condition: RuleCondition): RawBuilder<boolean> | null {
	const fieldDef = getFieldDefinition(condition.field);
	if (!fieldDef) return null;

	const fieldExpr = getFieldSQLExpression(condition.field);
	if (!fieldExpr) return null;

	// sql.raw() for trusted field expressions (from closed registry, not user input)
	const fieldSQL = sql.raw(fieldExpr);
	const operator = condition.operator;

	// Null operators — no value needed
	if (VALUE_LESS_OPERATORS.includes(operator)) {
		if (operator === 'is_null') {
			return sql<boolean>`${fieldSQL} IS NULL`;
		}
		return sql<boolean>`${fieldSQL} IS NOT NULL`;
	}

	// For non-null operators on nullable fields: skip claims where field IS NULL
	// This matches the documented behavior: "Claims with NULL values are SKIPPED"

	// Array operators (in, not_in)
	if (ARRAY_OPERATORS.includes(operator)) {
		const values = Array.isArray(condition.value) ? condition.value : [condition.value];

		if (operator === 'in') {
			if (fieldDef.nullable) {
				return sql<boolean>`${fieldSQL} IS NOT NULL AND ${fieldSQL} = ANY(${sql.val(values)})`;
			}
			return sql<boolean>`${fieldSQL} = ANY(${sql.val(values)})`;
		} else {
			if (fieldDef.nullable) {
				return sql<boolean>`${fieldSQL} IS NOT NULL AND ${fieldSQL} != ALL(${sql.val(values)})`;
			}
			return sql<boolean>`${fieldSQL} != ALL(${sql.val(values)})`;
		}
	}

	// Scalar comparison operators (eq, neq, gt, gte, lt, lte)
	const sqlOp = sql.raw(SQL_OPERATORS[operator as ConditionOperator]);
	const value = sql.val(condition.value);

	if (fieldDef.nullable) {
		return sql<boolean>`${fieldSQL} IS NOT NULL AND ${fieldSQL} ${sqlOp} ${value}`;
	}
	return sql<boolean>`${fieldSQL} ${sqlOp} ${value}`;
}

// =============================================================================
// CONDITION EVALUATOR
// =============================================================================

/**
 * Find all claims matching a rule's conditions.
 *
 * Joins claim → claim_desk_location_transition (most recent via LATERAL) → desk_location
 * to support both column and derived fields.
 *
 * @param ctx - Protected context with client scoping
 * @param conditions - The rule's conditions JSONB
 * @param scopeFilter - Optional additional filters
 * @returns Array of matching claims with their current desk location
 */
export async function evaluateConditions(
	ctx: ProtectedContext,
	conditions: RuleConditions,
	scopeFilter?: ConditionScopeFilter
): Promise<ConditionMatch[]> {
	const clientId = ctx.session.user.client_id;
	const conditionClause = buildConditionSQL(conditions);

	// Build optional scope filters as RawBuilder fragments
	let scopeClause = sql<boolean>`TRUE`;

	if (scopeFilter?.deskLocationId != null) {
		scopeClause = sql<boolean>`${scopeClause} AND c.desk_location_id = ${sql.val(scopeFilter.deskLocationId)}`;
	}

	if (scopeFilter?.claimIds && scopeFilter.claimIds.length > 0) {
		scopeClause = sql<boolean>`${scopeClause} AND c.id = ANY(${sql.val(scopeFilter.claimIds)})`;
	}

	// The query uses a LATERAL join to get the most recent transition per claim,
	// which provides derived fields like hours_in_current_stage and previous_desk_location_id.
	// The idx_cdlt_latest index on (client_id, claim_id, entered_at DESC) optimizes this.
	const result = await sql<{ claim_id: string; desk_location_id: string | null }>`
		SELECT c.id AS claim_id, c.desk_location_id
		FROM claim c
		LEFT JOIN LATERAL (
			SELECT cdlt_inner.entered_at, cdlt_inner.previous_desk_location_id
			FROM claim_desk_location_transition cdlt_inner
			WHERE cdlt_inner.claim_id = c.id
				AND cdlt_inner.client_id = ${sql.val(clientId)}
				AND cdlt_inner.deleted_at IS NULL
			ORDER BY cdlt_inner.entered_at DESC
			LIMIT 1
		) cdlt ON true
		LEFT JOIN desk_location dl ON dl.id = c.desk_location_id AND dl.deleted_at IS NULL
		WHERE c.client_id = ${sql.val(clientId)}
			AND ${scopeClause}
			AND (${conditionClause})
	`.execute(ctx.db);

	return result.rows.map((row) => ({
		claimId: row.claim_id,
		deskLocationId: row.desk_location_id,
	}));
}
