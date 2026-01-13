/**
 * Integration tests for statuteQueries
 *
 * These tests run against a real database to verify:
 * - Statute rule retrieval (all jurisdictions and single)
 * - Statute rule updates
 * - Statute limit calculations with database data
 *
 * Note: The statute_rule table is GLOBAL (not client-scoped).
 * Tests use specific state codes and reset them after each test.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import { createTestClient, createTestUser, resetTestStatuteRule, updateTestStatuteRule } from '@/__tests__/integration/fixtures';
import {
	getStatuteRules,
	getStatuteRule,
	updateStatuteRule,
	getStatuteLimitForScenario,
} from '../statuteQueries';
import type { StatuteRules } from '@/schemas/statuteSchemas';

// Use specific state codes for testing to avoid conflicts
const TEST_STATE_CODE = 'AK'; // Alaska - less likely to be modified by other tests

// Seed data for statute_rule table (subset of jurisdictions for testing)
const SEED_JURISDICTIONS = [
	{ state_code: 'AK', negligence_type: 'pure_comparative', negligence_bar_percent: 100 },
	{ state_code: 'AL', negligence_type: 'contributory', negligence_bar_percent: 1 },
	{ state_code: 'CA', negligence_type: 'pure_comparative', negligence_bar_percent: 100 },
	{ state_code: 'TX', negligence_type: 'comparative_50', negligence_bar_percent: 51 },
	{ state_code: 'NY', negligence_type: 'pure_comparative', negligence_bar_percent: 100 },
];

/**
 * Seed the statute_rule table with test data.
 * Called before each test to ensure consistent baseline state.
 * Uses doUpdateSet() to restore baseline values if rows were modified by previous tests.
 */
async function seedStatuteData(db: Kysely<DB>) {
	await db
		.insertInto('statute_rule')
		.values(
			SEED_JURISDICTIONS.map((j) => ({
				state_code: j.state_code,
				rules: JSON.stringify({}),
				negligence_type: j.negligence_type,
				negligence_bar_percent: j.negligence_bar_percent,
			}))
		)
		.onConflict((oc) =>
			oc.column('state_code').doUpdateSet((eb) => ({
				rules: eb.ref('excluded.rules'),
				negligence_type: eb.ref('excluded.negligence_type'),
				negligence_bar_percent: eb.ref('excluded.negligence_bar_percent'),
				negligence_notes: null,
			}))
		)
		.execute();
}

describe('statuteQueries integration', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	// Seed statute data before each test (global beforeEach truncates tables)
	beforeEach(async () => {
		await seedStatuteData(db);
	});

	// =====================================================================
	// GET ALL STATUTE RULES
	// =====================================================================

	describe('getStatuteRules', () => {
		it('should return all seeded jurisdictions', async () => {
			const rules = await getStatuteRules(db);

			// Should have all seeded jurisdictions from SEED_JURISDICTIONS
			expect(rules.length).toBe(SEED_JURISDICTIONS.length);
		});

		it('should return rules sorted by state_code ascending', async () => {
			const rules = await getStatuteRules(db);

			// First should be AK (Alaska), last should be WY (Wyoming) or a territory
			expect(rules[0].state_code).toBe('AK');

			// Verify ordering
			for (let i = 1; i < rules.length; i++) {
				expect(rules[i].state_code > rules[i - 1].state_code).toBe(true);
			}
		});

		it('should include negligence columns', async () => {
			const rules = await getStatuteRules(db);
			const firstRule = rules[0];

			expect(firstRule).toHaveProperty('negligence_type');
			expect(firstRule).toHaveProperty('negligence_bar_percent');
			expect(firstRule).toHaveProperty('negligence_notes');
		});

		it('should include timestamp columns', async () => {
			const rules = await getStatuteRules(db);
			const firstRule = rules[0];

			expect(firstRule).toHaveProperty('created_at');
			expect(firstRule).toHaveProperty('updated_at');
		});
	});

	// =====================================================================
	// GET SINGLE STATUTE RULE
	// =====================================================================

	describe('getStatuteRule', () => {
		it('should return rule for valid state code', async () => {
			const rule = await getStatuteRule(db, 'CA');

			expect(rule).toBeDefined();
			expect(rule?.state_code).toBe('CA');
		});

		it('should return undefined for non-existent state code', async () => {
			const rule = await getStatuteRule(db, 'XX');

			expect(rule).toBeUndefined();
		});

		it('should include all rule columns', async () => {
			const rule = await getStatuteRule(db, 'CA');

			expect(rule).toHaveProperty('id');
			expect(rule).toHaveProperty('state_code');
			expect(rule).toHaveProperty('rules');
			expect(rule).toHaveProperty('negligence_type');
			expect(rule).toHaveProperty('negligence_bar_percent');
			expect(rule).toHaveProperty('negligence_notes');
			expect(rule).toHaveProperty('created_at');
			expect(rule).toHaveProperty('created_by');
			expect(rule).toHaveProperty('updated_at');
			expect(rule).toHaveProperty('updated_by');
		});
	});

	// =====================================================================
	// UPDATE STATUTE RULE
	// =====================================================================

	describe('updateStatuteRule', () => {
		it('should update rules JSON', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const newRules: StatuteRules = {
				injury: { default_years: 2, rules: [] },
				personal_property: { default_years: 4, rules: [] },
			};

			const updated = await updateStatuteRule(ctx, TEST_STATE_CODE, newRules);

			expect(updated.state_code).toBe(TEST_STATE_CODE);
			expect(updated.rules).toEqual(newRules);
			expect(updated.updated_by).toBe(user.id);
		});

		it('should update negligence type and auto-calculate bar percent', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const updated = await updateStatuteRule(ctx, TEST_STATE_CODE, {}, 'pure_comparative');

			expect(updated.negligence_type).toBe('pure_comparative');
			expect(updated.negligence_bar_percent).toBe(100); // Auto-calculated
		});

		it('should update negligence notes', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const updated = await updateStatuteRule(
				ctx,
				TEST_STATE_CODE,
				{},
				'comparative_49',
				'Special rules for auto claims'
			);

			expect(updated.negligence_notes).toBe('Special rules for auto claims');
			expect(updated.negligence_bar_percent).toBe(50);
		});

		it('should set negligence bar percent to null for slight type', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const updated = await updateStatuteRule(ctx, TEST_STATE_CODE, {}, 'slight');

			expect(updated.negligence_type).toBe('slight');
			expect(updated.negligence_bar_percent).toBeNull();
		});

		it('should clear negligence fields when set to null', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// First set values
			await updateStatuteRule(ctx, TEST_STATE_CODE, {}, 'contributory', 'Some notes');

			// Then clear them
			const updated = await updateStatuteRule(ctx, TEST_STATE_CODE, {}, null, null);

			expect(updated.negligence_type).toBeNull();
			expect(updated.negligence_bar_percent).toBeNull();
			expect(updated.negligence_notes).toBeNull();
		});

		it('should throw error for non-existent state code', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(updateStatuteRule(ctx, 'XX', {})).rejects.toThrow();
		});

		it('should update rules with conditional rules', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const rulesWithConditionals: StatuteRules = {
				injury: {
					default_years: 3,
					rules: [
						{ lob: 'auto', years: 2 },
						{ date_from: '2020-01-01', date_to: '2025-12-31', years: 4 },
					],
				},
			};

			const updated = await updateStatuteRule(ctx, TEST_STATE_CODE, rulesWithConditionals);

			expect(updated.rules).toEqual(rulesWithConditionals);
		});
	});

	// =====================================================================
	// GET STATUTE LIMIT FOR SCENARIO
	// =====================================================================

	describe('getStatuteLimitForScenario', () => {
		it('should return years from database rule', async () => {
			// First set up a rule
			await updateTestStatuteRule(db, TEST_STATE_CODE, {
				rules: {
					injury: { default_years: 5, rules: [] },
				},
			});

			const result = await getStatuteLimitForScenario(db, TEST_STATE_CODE, 'injury');

			expect(result.years).toBe(5);
			expect(result.stateCode).toBe(TEST_STATE_CODE);
			expect(result.tortType).toBe('injury');
		});

		it('should return null for non-existent state', async () => {
			const result = await getStatuteLimitForScenario(db, 'XX', 'injury');

			expect(result.years).toBeNull();
			expect(result.stateCode).toBe('XX');
		});

		it('should return null for unconfigured tort type', async () => {
			// Reset to empty rules
			await resetTestStatuteRule(db, TEST_STATE_CODE);

			const result = await getStatuteLimitForScenario(db, TEST_STATE_CODE, 'injury');

			expect(result.years).toBeNull();
		});

		it('should apply LOB-based rules', async () => {
			await updateTestStatuteRule(db, TEST_STATE_CODE, {
				rules: {
					injury: {
						default_years: 3,
						rules: [{ lob: 'auto', years: 2 }],
					},
				},
			});

			const withAuto = await getStatuteLimitForScenario(db, TEST_STATE_CODE, 'injury', 'auto');
			const withHomeowners = await getStatuteLimitForScenario(db, TEST_STATE_CODE, 'injury', 'homeowners');

			expect(withAuto.years).toBe(2);
			expect(withHomeowners.years).toBe(3);
		});

		it('should apply date-based rules', async () => {
			await updateTestStatuteRule(db, TEST_STATE_CODE, {
				rules: {
					injury: {
						default_years: 3,
						rules: [{ date_from: '2020-01-01', date_to: '2025-12-31', years: 4 }],
					},
				},
			});

			const withinRange = await getStatuteLimitForScenario(
				db,
				TEST_STATE_CODE,
				'injury',
				undefined,
				'2022-06-15'
			);
			const outsideRange = await getStatuteLimitForScenario(
				db,
				TEST_STATE_CODE,
				'injury',
				undefined,
				'2019-06-15'
			);

			expect(withinRange.years).toBe(4);
			expect(outsideRange.years).toBe(3);
		});
	});
});
