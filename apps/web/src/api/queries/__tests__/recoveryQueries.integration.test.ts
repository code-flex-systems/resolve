/**
 * Integration tests for recoveryQueries
 *
 * These tests run against a real database to verify:
 * - Multi-tenant data isolation
 * - Recovery event CRUD operations
 * - Automatic claim.actual_recovery recalculation
 * - Various filter combinations
 * - Date range filtering
 * - Metrics aggregations (summary, time series, quarterly)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	createTestClient,
	createTestUser,
	createTestClaim,
	createTestRecoveryEvent,
	createTestChecklist,
	createTestChecklistClaim,
	createTestParty,
	createTestClaimParty,
	createTestCoverage,
	createTestSettlement,
	createTestPayment,
} from '@/__tests__/integration/fixtures';
import {
	createRecoveryEvent,
	getRecoveryEvents,
	listRecoveryEventsWithFilters,
	archiveRecoveryEvent,
	archiveRecoveryEventsForSettlement,
	exportRecoveryEvents,
	updateRecoveryEvent,
	recalculateClaimRecovery,
	getRecoverySummaryByCoverage,
	getRecoveryMetricsSummary,
	getRecoveryMetricsTimeSeries,
	getQuarterlyRecoveryStats,
} from '../recoveryQueries';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

/**
 * Helper to create the full settlement chain needed for recovery events.
 * Creates: party -> claim_party -> coverage -> settlement
 */
async function createSettlementChain(
	db: Kysely<DB>,
	{
		client_id,
		claim_id,
		created_by,
	}: {
		client_id: string;
		claim_id: number;
		created_by: string;
	}
) {
	const party = await createTestParty(db, {
		client_id,
		created_by,
		party_type: 'facilitator',
	});
	const claimParty = await createTestClaimParty(db, {
		claim_id,
		party_id: party.id,
		client_id,
		created_by,
		role: ['adverse_carrier'],
	});
	const coverage = await createTestCoverage(db, {
		client_id,
		claim_id,
		created_by,
		loss_type: 'liability',
		coverage_amount: 100000,
	});
	const settlement = await createTestSettlement(db, {
		client_id,
		claim_id,
		claim_party_id: claimParty.id,
		coverage_id: coverage.id,
		created_by,
		demand_amount: 50000,
	});
	return { party, claimParty, coverage, settlement };
}

describe('recoveryQueries integration', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	describe('createRecoveryEvent', () => {
		it('should create a recovery event', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });
			const recoveryDate = new Date();

			// Act
			const result = await createRecoveryEvent(ctx, claim.id, {
				settlement_id: settlement.id,
				recovery_date: recoveryDate,
				recovery_amount: 5000,
				recovery_source: 'Insurance Payment',
				notes: 'Initial recovery payment',
			});

			// Assert
			expect(result).toBeDefined();
			expect(result.claim_id).toBe(claim.id);
			expect(result.client_id).toBe(client.id);
			expect(result.settlement_id).toBe(settlement.id);
			expect(result.recovery_amount).toBe('5000');
			expect(result.recovery_source).toBe('Insurance Payment');
			expect(result.notes).toBe('Initial recovery payment');
			expect(result.created_by).toBe(user.id);
		});

		it('should update claim actual_recovery after creating event', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });
			const recoveryDate = new Date();

			// Act - create two recovery events
			await createRecoveryEvent(ctx, claim.id, {
				settlement_id: settlement.id,
				recovery_date: recoveryDate,
				recovery_amount: 3000,
			});
			await createRecoveryEvent(ctx, claim.id, {
				settlement_id: settlement.id,
				recovery_date: recoveryDate,
				recovery_amount: 2000,
			});

			// Assert - claim should have sum of recovery amounts
			const updatedClaim = await db
				.selectFrom('claim')
				.select(['actual_recovery'])
				.where('id', '=', claim.id)
				.executeTakeFirst();

			expect(updatedClaim?.actual_recovery).toBe('5000');
		});

		it('should set client_id from context session', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await createRecoveryEvent(ctx, claim.id, {
				settlement_id: settlement.id,
				recovery_date: new Date(),
				recovery_amount: 1000,
			});

			// Assert
			expect(result.client_id).toBe(client.id);
			expect(result.created_by).toBe(user.id);
		});
	});

	describe('getRecoveryEvents', () => {
		it('should return recovery events for a claim', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_amount: '1000',
				recovery_source: 'Source A',
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_amount: '2000',
				recovery_source: 'Source B',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getRecoveryEvents(ctx, claim.id);

			// Assert
			expect(result).toHaveLength(2);
			expect(result.map((r) => r.recovery_source)).toContain('Source A');
			expect(result.map((r) => r.recovery_source)).toContain('Source B');
		});

		it('should order by recovery_date and created_at ascending', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const today = new Date();
			const yesterday = new Date(today);
			yesterday.setDate(today.getDate() - 1);
			const tomorrow = new Date(today);
			tomorrow.setDate(today.getDate() + 1);

			// Create in non-sorted order
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: tomorrow,
				notes: 'Third',
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: yesterday,
				notes: 'First',
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: today,
				notes: 'Second',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getRecoveryEvents(ctx, claim.id);

			// Assert - should be ordered by recovery_date ascending
			expect(result).toHaveLength(3);
			expect(result[0].notes).toBe('First');
			expect(result[1].notes).toBe('Second');
			expect(result[2].notes).toBe('Third');
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client1.id,
				claim_id: claim.id,
				created_by: user1.id,
			});

			await createTestRecoveryEvent(db, {
				client_id: client1.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act
			const result = await getRecoveryEvents(ctx2, claim.id);

			// Assert - Other client should not see recovery events
			expect(result).toHaveLength(0);
		});

		it('should only return events for specified claim', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim1 = await createTestClaim(db, { client_id: client.id });
			const claim2 = await createTestClaim(db, { client_id: client.id });
			const { settlement: settlement1 } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim1.id,
				created_by: user.id,
			});
			const { settlement: settlement2 } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim2.id,
				created_by: user.id,
			});

			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim1.id,
				settlement_id: settlement1.id,
				created_by: user.id,
				notes: 'Claim 1 Event',
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim2.id,
				settlement_id: settlement2.id,
				created_by: user.id,
				notes: 'Claim 2 Event',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getRecoveryEvents(ctx, claim1.id);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0].notes).toBe('Claim 1 Event');
		});

		it('should exclude soft-deleted recovery events from results', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const activeEvent = await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				notes: 'Active Event',
			});
			const deletedEvent = await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				notes: 'Deleted Event',
			});

			// Soft-delete one recovery event
			await db
				.updateTable('recovery_event')
				.set({
					deleted_at: new Date(),
					deleted_by: user.id,
				})
				.where('id', '=', deletedEvent.id)
				.execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getRecoveryEvents(ctx, claim.id);

			// Assert - only the non-deleted recovery event should be returned
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe(activeEvent.id);
			expect(result[0].notes).toBe('Active Event');
		});
	});

	describe('listRecoveryEventsWithFilters', () => {
		it('should support combined filters', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const inProgressClaim = await createTestClaim(db, {
				client_id: client.id,
				recovery_status: 'in_progress',
			});
			const closedClaim = await createTestClaim(db, {
				client_id: client.id,
				recovery_status: 'closed_no_recovery',
			});
			const { settlement: settlement1 } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: inProgressClaim.id,
				created_by: user.id,
			});
			const { settlement: settlement2 } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: closedClaim.id,
				created_by: user.id,
			});

			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: inProgressClaim.id,
				created_by: user.id,
			});

			const today = new Date();
			const lastMonth = new Date(today);
			lastMonth.setMonth(today.getMonth() - 1);

			// Target: in_progress claim, matching checklist, today's date, Insurance source
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: inProgressClaim.id,
				settlement_id: settlement1.id,
				created_by: user.id,
				recovery_date: today,
				recovery_source: 'Insurance Payment',
				notes: 'Target Event',
			});

			// Wrong status
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: closedClaim.id,
				settlement_id: settlement2.id,
				created_by: user.id,
				recovery_date: today,
				recovery_source: 'Insurance Payment',
				notes: 'Wrong Status',
			});

			// Wrong date
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: inProgressClaim.id,
				settlement_id: settlement1.id,
				created_by: user.id,
				recovery_date: lastMonth,
				recovery_source: 'Insurance Payment',
				notes: 'Wrong Date',
			});

			// Wrong source
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: inProgressClaim.id,
				settlement_id: settlement1.id,
				created_by: user.id,
				recovery_date: today,
				recovery_source: 'Legal Settlement',
				notes: 'Wrong Source',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const rangeStart = new Date(today);
			rangeStart.setDate(today.getDate() - 1);
			const rangeEnd = new Date(today);
			rangeEnd.setDate(today.getDate() + 1);

			// Act - combine all filters
			const result = await listRecoveryEventsWithFilters(ctx, {
				range: [rangeStart, rangeEnd],
				recoveryStatus: 'in_progress',
				checklistId: checklist.id,
				recoverySource: 'Insurance',
			});

			// Assert - only target event should match all filters
			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].notes).toBe('Target Event');
		});

		it('should return recovery events with claim details', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, {
				client_id: client.id,
				claim_number: 'CLM-RECOVERY-001',
				insured: 'Test Insured',
			});
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_amount: '5000',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await listRecoveryEventsWithFilters(ctx, {});

			// Assert
			expect(result.rows.length).toBeGreaterThanOrEqual(1);
			const event = result.rows.find((r) => r.claim_number === 'CLM-RECOVERY-001');
			expect(event).toBeDefined();
			expect(event?.insured).toBe('Test Insured');
			expect(event?.recovery_amount).toBe('5000');
		});

		it('should filter by date range', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const today = new Date();
			const lastMonth = new Date(today);
			lastMonth.setMonth(today.getMonth() - 1);
			const nextMonth = new Date(today);
			nextMonth.setMonth(today.getMonth() + 1);

			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: lastMonth,
				notes: 'Last Month',
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: today,
				notes: 'Today',
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: nextMonth,
				notes: 'Next Month',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Filter to only include "today"
			const rangeStart = new Date(today);
			rangeStart.setDate(today.getDate() - 1);
			const rangeEnd = new Date(today);
			rangeEnd.setDate(today.getDate() + 1);

			// Act
			const result = await listRecoveryEventsWithFilters(ctx, {
				range: [rangeStart, rangeEnd],
			});

			// Assert
			const notes = result.rows.map((r) => r.notes);
			expect(notes).toContain('Today');
			expect(notes).not.toContain('Last Month');
			expect(notes).not.toContain('Next Month');
		});

		it('should filter by recovery source (case-insensitive partial match)', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_source: 'Insurance Payment',
				notes: 'Insurance',
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_source: 'Legal Settlement',
				notes: 'Legal',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act - search for "insurance" (lowercase)
			const result = await listRecoveryEventsWithFilters(ctx, {
				recoverySource: 'insurance',
			});

			// Assert
			expect(result.rows.length).toBeGreaterThanOrEqual(1);
			const notes = result.rows.map((r) => r.notes);
			expect(notes).toContain('Insurance');
			expect(notes).not.toContain('Legal');
		});

		it('should filter by recovery status on claim', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const inProgressClaim = await createTestClaim(db, {
				client_id: client.id,
				recovery_status: 'in_progress',
			});
			const closedClaim = await createTestClaim(db, {
				client_id: client.id,
				recovery_status: 'closed_no_recovery',
			});
			const { settlement: settlement1 } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: inProgressClaim.id,
				created_by: user.id,
			});
			const { settlement: settlement2 } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: closedClaim.id,
				created_by: user.id,
			});

			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: inProgressClaim.id,
				settlement_id: settlement1.id,
				created_by: user.id,
				notes: 'In Progress Claim Event',
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: closedClaim.id,
				settlement_id: settlement2.id,
				created_by: user.id,
				notes: 'Closed Claim Event',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await listRecoveryEventsWithFilters(ctx, {
				recoveryStatus: 'in_progress',
			});

			// Assert
			const notes = result.rows.map((r) => r.notes);
			expect(notes).toContain('In Progress Claim Event');
			expect(notes).not.toContain('Closed Claim Event');
		});

		it('should filter by checklist', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim1 = await createTestClaim(db, { client_id: client.id });
			const claim2 = await createTestClaim(db, { client_id: client.id });
			const { settlement: settlement1 } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim1.id,
				created_by: user.id,
			});
			const { settlement: settlement2 } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim2.id,
				created_by: user.id,
			});

			const checklist1 = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Checklist 1',
			});
			const checklist2 = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Checklist 2',
			});

			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist1.id,
				claim_id: claim1.id,
				created_by: user.id,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist2.id,
				claim_id: claim2.id,
				created_by: user.id,
			});

			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim1.id,
				settlement_id: settlement1.id,
				created_by: user.id,
				notes: 'Checklist 1 Event',
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim2.id,
				settlement_id: settlement2.id,
				created_by: user.id,
				notes: 'Checklist 2 Event',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await listRecoveryEventsWithFilters(ctx, {
				checklistId: checklist1.id,
			});

			// Assert
			const notes = result.rows.map((r) => r.notes);
			expect(notes).toContain('Checklist 1 Event');
			expect(notes).not.toContain('Checklist 2 Event');
		});

		it('should filter by user who created the event', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user1.id,
			});

			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user1.id,
				notes: 'User 1 Event',
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user2.id,
				notes: 'User 2 Event',
			});

			const ctx = createTestContext(db, { id: user1.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await listRecoveryEventsWithFilters(ctx, {
				userId: user1.id,
			});

			// Assert
			const notes = result.rows.map((r) => r.notes);
			expect(notes).toContain('User 1 Event');
			expect(notes).not.toContain('User 2 Event');
		});

		it('should handle pagination', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			// Create 10 recovery events
			for (let i = 0; i < 10; i++) {
				const date = new Date();
				date.setDate(date.getDate() - i);
				await createTestRecoveryEvent(db, {
					client_id: client.id,
					claim_id: claim.id,
					settlement_id: settlement.id,
					created_by: user.id,
					recovery_date: date,
					notes: `Event ${i}`,
				});
			}

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const page1 = await listRecoveryEventsWithFilters(ctx, {}, 3, 0);
			const page2 = await listRecoveryEventsWithFilters(ctx, {}, 3, 3);

			// Assert
			expect(page1.count).toBe(10);
			expect(page1.rows).toHaveLength(3);
			expect(page2.rows).toHaveLength(3);

			// Verify different events on each page
			const page1Notes = page1.rows.map((r) => r.notes);
			const page2Notes = page2.rows.map((r) => r.notes);
			expect(page1Notes.some((n) => page2Notes.includes(n))).toBe(false);
		});

		it('should order by recovery_date and created_at descending', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const today = new Date();
			const yesterday = new Date(today);
			yesterday.setDate(today.getDate() - 1);

			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: yesterday,
				notes: 'Yesterday',
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: today,
				notes: 'Today',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await listRecoveryEventsWithFilters(ctx, {});

			// Assert - Today should come first (descending)
			const todayIdx = result.rows.findIndex((r) => r.notes === 'Today');
			const yesterdayIdx = result.rows.findIndex((r) => r.notes === 'Yesterday');
			expect(todayIdx).toBeLessThan(yesterdayIdx);
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim1 = await createTestClaim(db, { client_id: client1.id });
			const claim2 = await createTestClaim(db, { client_id: client2.id });
			const { settlement: settlement1 } = await createSettlementChain(db, {
				client_id: client1.id,
				claim_id: claim1.id,
				created_by: user1.id,
			});
			const { settlement: settlement2 } = await createSettlementChain(db, {
				client_id: client2.id,
				claim_id: claim2.id,
				created_by: user2.id,
			});

			await createTestRecoveryEvent(db, {
				client_id: client1.id,
				claim_id: claim1.id,
				settlement_id: settlement1.id,
				created_by: user1.id,
				notes: 'Client 1 Event',
			});
			await createTestRecoveryEvent(db, {
				client_id: client2.id,
				claim_id: claim2.id,
				settlement_id: settlement2.id,
				created_by: user2.id,
				notes: 'Client 2 Event',
			});

			const ctx1 = createTestContext(db, { id: user1.id, client_id: client1.id, role: 'Admin' });
			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act
			const result1 = await listRecoveryEventsWithFilters(ctx1, {});
			const result2 = await listRecoveryEventsWithFilters(ctx2, {});

			// Assert
			const notes1 = result1.rows.map((r) => r.notes);
			const notes2 = result2.rows.map((r) => r.notes);

			expect(notes1).toContain('Client 1 Event');
			expect(notes1).not.toContain('Client 2 Event');
			expect(notes2).toContain('Client 2 Event');
			expect(notes2).not.toContain('Client 1 Event');
		});
	});

	describe('archiveRecoveryEvent', () => {
		it('should delete a recovery event', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const event = await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await archiveRecoveryEvent(ctx, event.id, claim.id);

			// Assert
			expect(result.id).toBe(event.id);

			// Verify it's deleted
			const deleted = await db
				.selectFrom('recovery_event')
				.selectAll()
				.where('id', '=', event.id)
				.executeTakeFirst();
			expect(deleted).toBeUndefined();
		});

		it('should recalculate claim actual_recovery after deletion', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const event1 = await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_amount: '3000',
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_amount: '2000',
			});

			// Manually update claim actual_recovery to simulate creation
			await db
				.updateTable('claim')
				.set({ actual_recovery: '5000' })
				.where('id', '=', claim.id)
				.execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act - delete the first event
			await archiveRecoveryEvent(ctx, event1.id, claim.id);

			// Assert - claim should now have only 2000
			const updatedClaim = await db
				.selectFrom('claim')
				.select(['actual_recovery'])
				.where('id', '=', claim.id)
				.executeTakeFirst();

			expect(updatedClaim?.actual_recovery).toBe('2000');
		});

		it('should throw error for non-existent event', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act & Assert
			await expect(archiveRecoveryEvent(ctx, 999999, claim.id)).rejects.toThrow(
				'Recovery event not found'
			);
		});

		it('should throw error when claim ID does not match event', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim1 = await createTestClaim(db, { client_id: client.id });
			const claim2 = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim1.id,
				created_by: user.id,
			});

			const event = await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim1.id,
				settlement_id: settlement.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act & Assert - Wrong claim ID should fail
			await expect(archiveRecoveryEvent(ctx, event.id, claim2.id)).rejects.toThrow(
				'Recovery event not found'
			);

			// Verify event still exists
			const stillExists = await db
				.selectFrom('recovery_event')
				.selectAll()
				.where('id', '=', event.id)
				.executeTakeFirst();
			expect(stillExists).toBeDefined();
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client1.id,
				claim_id: claim.id,
				created_by: user1.id,
			});

			const event = await createTestRecoveryEvent(db, {
				client_id: client1.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act & Assert - Other client should not be able to delete
			await expect(archiveRecoveryEvent(ctx2, event.id, claim.id)).rejects.toThrow(
				'Recovery event not found'
			);
		});
	});

	describe('updateRecoveryEvent', () => {
		it('should update the recovery amount and recalculate claim totals', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });
			const recoveryDate = new Date();

			const event1 = await createRecoveryEvent(ctx, claim.id, {
				settlement_id: settlement.id,
				recovery_date: recoveryDate,
				recovery_amount: 1000,
			});
			await createRecoveryEvent(ctx, claim.id, {
				settlement_id: settlement.id,
				recovery_date: recoveryDate,
				recovery_amount: 2000,
			});

			// Act
			const updated = await updateRecoveryEvent(ctx, event1.id, {
				recovery_amount: 1500,
				notes: 'Adjusted',
			});

			// Assert - updated event and recalculated claim totals
			expect(updated.recovery_amount).toBe('1500');
			expect(updated.notes).toBe('Adjusted');

			const updatedClaim = await db
				.selectFrom('claim')
				.select(['actual_recovery'])
				.where('id', '=', claim.id)
				.executeTakeFirst();

			expect(updatedClaim?.actual_recovery).toBe('3500');
		});
	});

	describe('recalculateClaimRecovery', () => {
		it('should use recovery_event sums to update claim actual_recovery', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_amount: '1000',
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_amount: '2500',
			});

			await db
				.updateTable('claim')
				.set({ actual_recovery: '0' })
				.where('id', '=', claim.id)
				.execute();

			// Act
			await db.transaction().execute(async (trx) => {
				await recalculateClaimRecovery(trx, claim.id, client.id);
			});

			// Assert
			const updatedClaim = await db
				.selectFrom('claim')
				.select(['actual_recovery'])
				.where('id', '=', claim.id)
				.executeTakeFirst();

			expect(updatedClaim?.actual_recovery).toBe('3500');
		});
	});

	describe('getRecoverySummaryByCoverage', () => {
		it('should return per-coverage aggregates', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				party_type: 'facilitator',
			});
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				client_id: client.id,
				created_by: user.id,
				role: ['adverse_carrier'],
			});

			const coverage1 = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				loss_type: 'dwelling',
			});
			const coverage2 = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				loss_type: 'personal_property',
			});

			const settlement1 = await createTestSettlement(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				coverage_id: coverage1.id,
				created_by: user.id,
				demand_amount: 10000,
			});
			const settlement2 = await createTestSettlement(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				coverage_id: coverage2.id,
				created_by: user.id,
				demand_amount: 20000,
			});

			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage1.id,
				created_by: user.id,
				payment_amount: 3000,
				is_subrogable: true,
			});
			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage1.id,
				created_by: user.id,
				payment_amount: 1200,
				is_subrogable: false,
			});
			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage2.id,
				created_by: user.id,
				payment_amount: 1500,
				is_subrogable: true,
			});

			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement1.id,
				created_by: user.id,
				recovery_amount: '1000',
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement1.id,
				created_by: user.id,
				recovery_amount: '500',
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement2.id,
				created_by: user.id,
				recovery_amount: '2000',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getRecoverySummaryByCoverage(ctx, claim.id);

			// Assert
			expect(result).toHaveLength(2);
			const byCoverage = new Map(result.map((item) => [item.coverage_id, item]));

			const coverage1Summary = byCoverage.get(coverage1.id);
			const coverage2Summary = byCoverage.get(coverage2.id);

			expect(coverage1Summary?.loss_type).toBe('dwelling');
			expect(coverage1Summary?.subrogable_amount).toBe('3000');
			expect(coverage1Summary?.actual_recovery).toBe('1500');

			expect(coverage2Summary?.loss_type).toBe('personal_property');
			expect(coverage2Summary?.subrogable_amount).toBe('1500');
			expect(coverage2Summary?.actual_recovery).toBe('2000');
		});
	});

	describe('exportRecoveryEvents', () => {
		it('should return all matching events without pagination', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, {
				client_id: client.id,
				claim_number: 'CLM-EXPORT-001',
			});
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			// Create multiple events
			for (let i = 0; i < 5; i++) {
				await createTestRecoveryEvent(db, {
					client_id: client.id,
					claim_id: claim.id,
					settlement_id: settlement.id,
					created_by: user.id,
					notes: `Export Event ${i}`,
				});
			}

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await exportRecoveryEvents(ctx, {});

			// Assert - should return all (not paginated)
			const exportEvents = result.filter((r) => r.notes?.startsWith('Export Event'));
			expect(exportEvents.length).toBe(5);
		});

		it('should include claim details', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, {
				client_id: client.id,
				claim_number: 'CLM-EXPORT-DETAILS',
				insured: 'Export Insured',
				recovery_status: 'in_progress',
			});
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await exportRecoveryEvents(ctx, {});

			// Assert
			const event = result.find((r) => r.claim_number === 'CLM-EXPORT-DETAILS');
			expect(event).toBeDefined();
			expect(event?.insured).toBe('Export Insured');
			expect(event?.recovery_status).toBe('in_progress');
		});

		it('should apply filters', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const inProgressClaim = await createTestClaim(db, {
				client_id: client.id,
				recovery_status: 'in_progress',
			});
			const closedClaim = await createTestClaim(db, {
				client_id: client.id,
				recovery_status: 'closed_no_recovery',
			});
			const { settlement: settlement1 } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: inProgressClaim.id,
				created_by: user.id,
			});
			const { settlement: settlement2 } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: closedClaim.id,
				created_by: user.id,
			});

			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: inProgressClaim.id,
				settlement_id: settlement1.id,
				created_by: user.id,
				notes: 'In Progress Export',
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: closedClaim.id,
				settlement_id: settlement2.id,
				created_by: user.id,
				notes: 'Closed Export',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await exportRecoveryEvents(ctx, { recoveryStatus: 'in_progress' });

			// Assert
			const notes = result.map((r) => r.notes);
			expect(notes).toContain('In Progress Export');
			expect(notes).not.toContain('Closed Export');
		});

		it('should filter by user who created the event', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user1.id,
			});

			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user1.id,
				notes: 'User 1 Export Event',
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user2.id,
				notes: 'User 2 Export Event',
			});

			const ctx = createTestContext(db, { id: user1.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await exportRecoveryEvents(ctx, { userId: user1.id });

			// Assert
			const notes = result.map((r) => r.notes);
			expect(notes).toContain('User 1 Export Event');
			expect(notes).not.toContain('User 2 Export Event');
		});

		it('should order by recovery_date descending', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const today = new Date();
			const yesterday = new Date(today);
			yesterday.setDate(today.getDate() - 1);

			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: yesterday,
				notes: 'Yesterday Export',
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: today,
				notes: 'Today Export',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await exportRecoveryEvents(ctx, {});

			// Assert
			const todayIdx = result.findIndex((r) => r.notes === 'Today Export');
			const yesterdayIdx = result.findIndex((r) => r.notes === 'Yesterday Export');
			expect(todayIdx).toBeLessThan(yesterdayIdx);
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim1 = await createTestClaim(db, { client_id: client1.id });
			const claim2 = await createTestClaim(db, { client_id: client2.id });
			const { settlement: settlement1 } = await createSettlementChain(db, {
				client_id: client1.id,
				claim_id: claim1.id,
				created_by: user1.id,
			});
			const { settlement: settlement2 } = await createSettlementChain(db, {
				client_id: client2.id,
				claim_id: claim2.id,
				created_by: user2.id,
			});

			await createTestRecoveryEvent(db, {
				client_id: client1.id,
				claim_id: claim1.id,
				settlement_id: settlement1.id,
				created_by: user1.id,
				notes: 'Client 1 Export',
			});
			await createTestRecoveryEvent(db, {
				client_id: client2.id,
				claim_id: claim2.id,
				settlement_id: settlement2.id,
				created_by: user2.id,
				notes: 'Client 2 Export',
			});

			const ctx1 = createTestContext(db, { id: user1.id, client_id: client1.id, role: 'Admin' });

			// Act
			const result = await exportRecoveryEvents(ctx1, {});

			// Assert
			const notes = result.map((r) => r.notes);
			expect(notes).toContain('Client 1 Export');
			expect(notes).not.toContain('Client 2 Export');
		});
	});

	describe('getRecoveryMetricsSummary', () => {
		it('should return total actual recovery within date range', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const today = new Date();
			const lastMonth = new Date(today);
			lastMonth.setMonth(today.getMonth() - 1);

			// In range
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: today,
				recovery_amount: '1000',
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: today,
				recovery_amount: '2000',
			});
			// Out of range
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: lastMonth,
				recovery_amount: '5000',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const rangeStart = new Date(today);
			rangeStart.setDate(today.getDate() - 1);
			const rangeEnd = new Date(today);
			rangeEnd.setDate(today.getDate() + 1);

			// Act
			const result = await getRecoveryMetricsSummary(ctx, [rangeStart, rangeEnd]);

			// Assert
			expect(result.total_actual).toBe(3000); // 1000 + 2000, not including 5000
			expect(result.total_expected).toBe(0); // Currently returns 0 as per TODO
			expect(result.variance).toBe(3000);
			expect(result.recovery_rate).toBe(0); // 0 because expected is 0
		});

		it('should apply recovery source filter', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const today = new Date();

			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: today,
				recovery_amount: '1000',
				recovery_source: 'Insurance Payment',
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: today,
				recovery_amount: '2000',
				recovery_source: 'Legal Settlement',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const rangeStart = new Date(today);
			rangeStart.setDate(today.getDate() - 1);
			const rangeEnd = new Date(today);
			rangeEnd.setDate(today.getDate() + 1);

			// Act
			const result = await getRecoveryMetricsSummary(
				ctx,
				[rangeStart, rangeEnd],
				{ recoverySource: 'insurance' }
			);

			// Assert - only Insurance Payment (1000)
			expect(result.total_actual).toBe(1000);
		});

		it('should apply recovery status filter', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const inProgressClaim = await createTestClaim(db, {
				client_id: client.id,
				recovery_status: 'in_progress',
			});
			const closedClaim = await createTestClaim(db, {
				client_id: client.id,
				recovery_status: 'closed_no_recovery',
			});
			const { settlement: settlement1 } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: inProgressClaim.id,
				created_by: user.id,
			});
			const { settlement: settlement2 } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: closedClaim.id,
				created_by: user.id,
			});

			const today = new Date();

			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: inProgressClaim.id,
				settlement_id: settlement1.id,
				created_by: user.id,
				recovery_date: today,
				recovery_amount: '1000',
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: closedClaim.id,
				settlement_id: settlement2.id,
				created_by: user.id,
				recovery_date: today,
				recovery_amount: '5000',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const rangeStart = new Date(today);
			rangeStart.setDate(today.getDate() - 1);
			const rangeEnd = new Date(today);
			rangeEnd.setDate(today.getDate() + 1);

			// Act
			const result = await getRecoveryMetricsSummary(
				ctx,
				[rangeStart, rangeEnd],
				{ recoveryStatus: 'in_progress' }
			);

			// Assert - only in_progress claim (1000)
			expect(result.total_actual).toBe(1000);
		});

		it('should apply checklist filter', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim1 = await createTestClaim(db, { client_id: client.id });
			const claim2 = await createTestClaim(db, { client_id: client.id });
			const { settlement: settlement1 } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim1.id,
				created_by: user.id,
			});
			const { settlement: settlement2 } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim2.id,
				created_by: user.id,
			});

			const checklist1 = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist1.id,
				claim_id: claim1.id,
				created_by: user.id,
			});

			const today = new Date();

			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim1.id,
				settlement_id: settlement1.id,
				created_by: user.id,
				recovery_date: today,
				recovery_amount: '1000',
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim2.id,
				settlement_id: settlement2.id,
				created_by: user.id,
				recovery_date: today,
				recovery_amount: '5000',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const rangeStart = new Date(today);
			rangeStart.setDate(today.getDate() - 1);
			const rangeEnd = new Date(today);
			rangeEnd.setDate(today.getDate() + 1);

			// Act
			const result = await getRecoveryMetricsSummary(
				ctx,
				[rangeStart, rangeEnd],
				{ checklistId: checklist1.id }
			);

			// Assert - only checklist1's claim (1000)
			expect(result.total_actual).toBe(1000);
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim1 = await createTestClaim(db, { client_id: client1.id });
			const claim2 = await createTestClaim(db, { client_id: client2.id });
			const { settlement: settlement1 } = await createSettlementChain(db, {
				client_id: client1.id,
				claim_id: claim1.id,
				created_by: user1.id,
			});
			const { settlement: settlement2 } = await createSettlementChain(db, {
				client_id: client2.id,
				claim_id: claim2.id,
				created_by: user2.id,
			});

			const today = new Date();

			await createTestRecoveryEvent(db, {
				client_id: client1.id,
				claim_id: claim1.id,
				settlement_id: settlement1.id,
				created_by: user1.id,
				recovery_date: today,
				recovery_amount: '1000',
			});
			await createTestRecoveryEvent(db, {
				client_id: client2.id,
				claim_id: claim2.id,
				settlement_id: settlement2.id,
				created_by: user2.id,
				recovery_date: today,
				recovery_amount: '5000',
			});

			const ctx1 = createTestContext(db, { id: user1.id, client_id: client1.id, role: 'Admin' });
			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const rangeStart = new Date(today);
			rangeStart.setDate(today.getDate() - 1);
			const rangeEnd = new Date(today);
			rangeEnd.setDate(today.getDate() + 1);

			// Act
			const result1 = await getRecoveryMetricsSummary(ctx1, [rangeStart, rangeEnd]);
			const result2 = await getRecoveryMetricsSummary(ctx2, [rangeStart, rangeEnd]);

			// Assert
			expect(result1.total_actual).toBe(1000);
			expect(result2.total_actual).toBe(5000);
		});
	});

	// NOTE: getRecoveryMetricsTimeSeries tests are skipped because the function uses raw SQL
	// that doesn't respect the test schema prefix. The query would need to be refactored to use
	// Kysely's query builder instead of raw SQL to work with the integration test infrastructure.
	describe.skip('getRecoveryMetricsTimeSeries', () => {
		it('should return monthly time series data', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			// Create events in different months
			const jan = new Date('2024-01-15');
			const feb = new Date('2024-02-15');
			const mar = new Date('2024-03-15');

			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: jan,
				recovery_amount: '1000',
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: feb,
				recovery_amount: '2000',
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: mar,
				recovery_amount: '3000',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getRecoveryMetricsTimeSeries(ctx, [new Date('2024-01-01'), new Date('2024-03-31')]);

			// Assert - should have 3 months
			expect(result.length).toBe(3);

			const janData = result.find((r) => r.month_start === '2024-01-01');
			const febData = result.find((r) => r.month_start === '2024-02-01');
			const marData = result.find((r) => r.month_start === '2024-03-01');

			expect(janData?.actual_recovery).toBe(1000);
			expect(febData?.actual_recovery).toBe(2000);
			expect(marData?.actual_recovery).toBe(3000);
		});

		it('should return 0 for months with no events', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			// Only create event in January
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: new Date('2024-01-15'),
				recovery_amount: '1000',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getRecoveryMetricsTimeSeries(ctx, [new Date('2024-01-01'), new Date('2024-03-31')]);

			// Assert
			const febData = result.find((r) => r.month_start === '2024-02-01');
			const marData = result.find((r) => r.month_start === '2024-03-01');

			expect(febData?.actual_recovery).toBe(0);
			expect(marData?.actual_recovery).toBe(0);
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim1 = await createTestClaim(db, { client_id: client1.id });
			const claim2 = await createTestClaim(db, { client_id: client2.id });
			const { settlement: settlement1 } = await createSettlementChain(db, {
				client_id: client1.id,
				claim_id: claim1.id,
				created_by: user1.id,
			});
			const { settlement: settlement2 } = await createSettlementChain(db, {
				client_id: client2.id,
				claim_id: claim2.id,
				created_by: user2.id,
			});

			await createTestRecoveryEvent(db, {
				client_id: client1.id,
				claim_id: claim1.id,
				settlement_id: settlement1.id,
				created_by: user1.id,
				recovery_date: new Date('2024-01-15'),
				recovery_amount: '1000',
			});
			await createTestRecoveryEvent(db, {
				client_id: client2.id,
				claim_id: claim2.id,
				settlement_id: settlement2.id,
				created_by: user2.id,
				recovery_date: new Date('2024-01-15'),
				recovery_amount: '5000',
			});

			const ctx1 = createTestContext(db, { id: user1.id, client_id: client1.id, role: 'Admin' });
			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act
			const result1 = await getRecoveryMetricsTimeSeries(ctx1, [new Date('2024-01-01'), new Date('2024-01-31')]);
			const result2 = await getRecoveryMetricsTimeSeries(ctx2, [new Date('2024-01-01'), new Date('2024-01-31')]);

			// Assert
			expect(result1[0]?.actual_recovery).toBe(1000);
			expect(result2[0]?.actual_recovery).toBe(5000);
		});
	});

	describe('getQuarterlyRecoveryStats', () => {
		it('should return recovery totals for each quarter', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			// Using a fiscal year starting Jan 1, 2024
			const fiscalYearStart = new Date('2024-01-01');

			// Q1: Jan-Mar
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: new Date('2024-02-15'),
				recovery_amount: '1000',
			});

			// Q2: Apr-Jun
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: new Date('2024-05-15'),
				recovery_amount: '2000',
			});

			// Q3: Jul-Sep
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: new Date('2024-08-15'),
				recovery_amount: '3000',
			});

			// Q4: Oct-Dec
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: new Date('2024-11-15'),
				recovery_amount: '4000',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getQuarterlyRecoveryStats(ctx, { fiscalYearStart });

			// Assert
			expect(result.q1).toBe('1000');
			expect(result.q2).toBe('2000');
			expect(result.q3).toBe('3000');
			expect(result.q4).toBe('4000');
		});

		it('should return 0 for quarters with no events', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const fiscalYearStart = new Date('2024-01-01');

			// Only create event in Q1
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: new Date('2024-02-15'),
				recovery_amount: '1000',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getQuarterlyRecoveryStats(ctx, { fiscalYearStart });

			// Assert
			expect(result.q1).toBe('1000');
			expect(result.q2).toBe('0');
			expect(result.q3).toBe('0');
			expect(result.q4).toBe('0');
		});

		it('should filter by user if provided', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user1.id,
			});

			const fiscalYearStart = new Date('2024-01-01');

			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user1.id,
				recovery_date: new Date('2024-02-15'),
				recovery_amount: '1000',
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user2.id,
				recovery_date: new Date('2024-02-15'),
				recovery_amount: '5000',
			});

			const ctx = createTestContext(db, { id: user1.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getQuarterlyRecoveryStats(ctx, {
				fiscalYearStart,
				userId: user1.id,
			});

			// Assert - only user1's events
			expect(result.q1).toBe('1000');
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim1 = await createTestClaim(db, { client_id: client1.id });
			const claim2 = await createTestClaim(db, { client_id: client2.id });
			const { settlement: settlement1 } = await createSettlementChain(db, {
				client_id: client1.id,
				claim_id: claim1.id,
				created_by: user1.id,
			});
			const { settlement: settlement2 } = await createSettlementChain(db, {
				client_id: client2.id,
				claim_id: claim2.id,
				created_by: user2.id,
			});

			const fiscalYearStart = new Date('2024-01-01');

			await createTestRecoveryEvent(db, {
				client_id: client1.id,
				claim_id: claim1.id,
				settlement_id: settlement1.id,
				created_by: user1.id,
				recovery_date: new Date('2024-02-15'),
				recovery_amount: '1000',
			});
			await createTestRecoveryEvent(db, {
				client_id: client2.id,
				claim_id: claim2.id,
				settlement_id: settlement2.id,
				created_by: user2.id,
				recovery_date: new Date('2024-02-15'),
				recovery_amount: '5000',
			});

			const ctx1 = createTestContext(db, { id: user1.id, client_id: client1.id, role: 'Admin' });
			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act
			const result1 = await getQuarterlyRecoveryStats(ctx1, { fiscalYearStart });
			const result2 = await getQuarterlyRecoveryStats(ctx2, { fiscalYearStart });

			// Assert
			expect(result1.q1).toBe('1000');
			expect(result2.q1).toBe('5000');
		});
	});
});
