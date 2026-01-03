import { z } from 'zod';
import { US_JURISDICTIONS } from '@/config/usJurisdictions';

// Valid state codes from the US jurisdictions list
const stateCodeEnum = z.enum(US_JURISDICTIONS.map((j) => j.code) as [string, ...string[]]);

// ============================================================================
// NEGLIGENCE LAW SCHEMAS
// ============================================================================

/**
 * Negligence law types with their corresponding bar percentages.
 * - contributory: 1% bars (any fault bars recovery)
 * - pure_comparative: 100% bars (never barred by percentage)
 * - comparative_49: 50% bars (barred if 50%+ at fault)
 * - comparative_50: 51% bars (barred if 51%+ at fault)
 * - slight: varies (South Dakota's unique rule, ~30%)
 */
export const negligenceTypeEnum = z.enum([
	'contributory',
	'pure_comparative',
	'comparative_49',
	'comparative_50',
	'slight',
]);
export type NegligenceType = z.infer<typeof negligenceTypeEnum>;

/**
 * Get the bar percentage for a negligence type.
 * Returns null for 'slight' since it has no fixed percentage.
 */
export function getBarPercentForType(type: NegligenceType | null): number | null {
	if (!type) return null;
	switch (type) {
		case 'contributory':
			return 1;
		case 'pure_comparative':
			return 100;
		case 'comparative_49':
			return 50;
		case 'comparative_50':
			return 51;
		case 'slight':
			return null;
	}
}

/**
 * Get a display label for a negligence type.
 */
export function getNegligenceTypeLabel(type: NegligenceType | null): string {
	if (!type) return '';
	switch (type) {
		case 'contributory':
			return 'Contributory';
		case 'pure_comparative':
			return 'Pure Comparative';
		case 'comparative_49':
			return 'Comparative (49%)';
		case 'comparative_50':
			return 'Comparative (50%)';
		case 'slight':
			return 'Slight';
	}
}

// ============================================================================
// RULE STRUCTURE SCHEMAS
// ============================================================================

/**
 * A single conditional rule within a tort type configuration.
 * Rules can filter by LOB (line of business) and/or date range.
 */
export const conditionalRuleSchema = z.object({
	lob: z.string().optional(), // Line of business value (e.g., "auto")
	date_from: z.string().optional(), // ISO date string (e.g., "2023-03-24")
	date_to: z.string().optional(), // ISO date string
	years: z.number().int().min(0),
});
export type ConditionalRule = z.infer<typeof conditionalRuleSchema>;

/**
 * Configuration for a single tort type.
 * Contains a default years value and optional conditional rules.
 */
export const tortTypeConfigSchema = z.object({
	default_years: z.number().int().min(0).nullable(), // null = N/A (no limit)
	rules: z.array(conditionalRuleSchema).default([]),
});
export type TortTypeConfig = z.infer<typeof tortTypeConfigSchema>;

/**
 * The complete rules JSONB structure.
 * Maps tort type values (e.g., "injury", "personal_property") to their configs.
 */
export const statuteRulesSchema = z.record(z.string(), tortTypeConfigSchema);
export type StatuteRules = z.infer<typeof statuteRulesSchema>;

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

/**
 * Get all statute rules (no input needed - returns all 54 jurisdictions)
 */
export const getStatuteRulesInput = z.object({}).optional();
export type GetStatuteRulesInput = z.infer<typeof getStatuteRulesInput>;

/**
 * Get single statute rule by state code
 */
export const getStatuteRuleInput = z.object({
	stateCode: stateCodeEnum,
});
export type GetStatuteRuleInput = z.infer<typeof getStatuteRuleInput>;

/**
 * Update statute rule for a state
 */
export const updateStatuteRuleInput = z.object({
	stateCode: stateCodeEnum,
	rules: statuteRulesSchema,
	negligenceType: negligenceTypeEnum.nullable().optional(),
	negligenceNotes: z.string().nullable().optional(),
});
export type UpdateStatuteRuleInput = z.infer<typeof updateStatuteRuleInput>;

/**
 * Calculate applicable statute years for a specific scenario.
 * Used by claim workflows to determine statute dates.
 */
export const calculateStatuteLimitInput = z.object({
	stateCode: stateCodeEnum,
	tortType: z.string(),
	lob: z.string().optional(), // Line of business for LOB-based rules
	dateOfLoss: z.string().optional(), // ISO date string for date-based rules
});
export type CalculateStatuteLimitInput = z.infer<typeof calculateStatuteLimitInput>;
