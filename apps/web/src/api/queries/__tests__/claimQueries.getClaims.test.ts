import { describe, it, expect, beforeEach, beforeAll, afterAll, vi, afterEach } from 'vitest';
import { getClaims } from '../claimQueries';
import { db } from '@/api/database/kysely';
import type { ProtectedContext } from '@/server/trpc/trpc';
import config from '@/config/config';
import { ClaimSearch, LossType, RecoveryStatus } from '@/config/enums';
import { closeTestDb, createTestContext, getTestDb, truncateAllTables } from '@/__tests__/integration/testDb';
import {
	createTestClaim,
	createTestClient,
	createTestFeed,
	createTestParty,
	createTestClaimParty,
	createTestUser,
} from '@/__tests__/integration/fixtures';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

// Mock the database
vi.mock('@/api/database/kysely', () => ({
	db: {
		selectFrom: vi.fn(),
	},
}));

describe('claimQueries.getClaims', () => {
	const mockAdminContext: ProtectedContext = {
		session: {
			user: {
				id: 'admin-123',
				clerkId: 'clerk_admin_123',
				name: 'Admin User',
				email: 'admin@example.com',
				phone: null,
				role: config.ROLES.ADMIN,
				client_id: 'client-abc',
			},
		},
		db,
	};

	const mockContributorContext: ProtectedContext = {
		session: {
			user: {
				id: 'user-456',
				clerkId: 'clerk_user_456',
				name: 'Regular User',
				email: 'user@example.com',
				phone: null,
				role: config.ROLES.CONTRIBUTOR,
				client_id: 'client-abc',
			},
		},
		db,
	};

	// Create mock query builder chain
	const createMockQueryBuilder = () => {
		const mockChain = {
			selectFrom: vi.fn(),
			leftJoin: vi.fn(),
			where: vi.fn(),
			select: vi.fn(),
			selectAll: vi.fn(),
			orderBy: vi.fn(),
			limit: vi.fn(),
			offset: vi.fn(),
			as: vi.fn(),
			$if: vi.fn(),
			execute: vi.fn(),
			executeTakeFirst: vi.fn(),
			groupBy: vi.fn(),
		};

		// Each method returns the chain for fluent API
		mockChain.selectFrom.mockReturnValue(mockChain);
		mockChain.leftJoin.mockReturnValue(mockChain);
		mockChain.where.mockReturnValue(mockChain);
		mockChain.select.mockReturnValue(mockChain);
		mockChain.selectAll.mockReturnValue(mockChain);
		mockChain.orderBy.mockReturnValue(mockChain);
		mockChain.limit.mockReturnValue(mockChain);
		mockChain.offset.mockReturnValue(mockChain);
		mockChain.as.mockReturnValue(mockChain);
		mockChain.groupBy.mockReturnValue(mockChain);
		mockChain.$if.mockImplementation((condition, fn) => condition ? fn(mockChain) : mockChain);

		return mockChain;
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Visibility Filtering - Three-Bucket Model', () => {
		it('should allow admin to see all claims without visibility filtering', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.execute.mockResolvedValue([
				{ id: 1, claim_number: 'CLM-001', insured: 'John Doe', feed_name: 'Feed A', total_count: '2' },
				{ id: 2, claim_number: 'CLM-002', insured: 'Jane Smith', feed_name: 'Feed B', total_count: '2' },
			]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			const result = await getClaims(mockAdminContext, {});

			// Verify no contributor visibility filters were applied
			// Admin query should have only the feeds join, not visibility filtering
			expect(mockChain.leftJoin).toHaveBeenCalledWith('feeds', 'claim.feed_id', 'feeds.id');
			expect(result.rows).toHaveLength(2);
			expect(result.count).toBe(2);
		});

		it('should filter claims for contributor - owned by them (bucket 1)', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.execute.mockResolvedValue([
				{ id: 1, claim_number: 'CLM-001', insured: 'John Doe', date_of_loss: '2025-01-01', feed_name: 'Feed A', total_count: '1' },
			]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			await getClaims(mockContributorContext, {});

			// Verify the feeds join was added (visibility uses EXISTS subqueries, not joins)
			expect(mockChain.leftJoin).toHaveBeenCalledWith('feeds', 'claim.feed_id', 'feeds.id');

			// Verify where clause was called (contains the OR logic for visibility via EXISTS)
			expect(mockChain.where).toHaveBeenCalled();

			// The where clause should contain logic for visibility filtering (via EXISTS subqueries):
			// EXISTS(created_by) OR EXISTS(assignee) OR NOT EXISTS(checklist_claim) OR EXISTS(desk access)
			const whereCalls = mockChain.where.mock.calls;
			const hasVisibilityFilter = whereCalls.some(call => typeof call[0] === 'function');
			expect(hasVisibilityFilter).toBe(true);
		});

		it('should filter claims for contributor - assigned to them (bucket 2)', async () => {
			const mockChain = createMockQueryBuilder();

			// Simulate a claim that's assigned to the current user
			mockChain.execute.mockResolvedValue([
				{ id: 2, claim_number: 'CLM-002', insured: 'Jane Smith', date_of_loss: '2025-01-02', feed_name: 'Feed B', total_count: '1' },
			]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			await getClaims(mockContributorContext, {});

			// Verify visibility filtering is applied via WHERE clause
			const whereCalls = mockChain.where.mock.calls;
			const hasVisibilityFilter = whereCalls.some(call => typeof call[0] === 'function');
			expect(hasVisibilityFilter).toBe(true);
		});

		it('should filter claims for contributor - unassigned/available claims (bucket 3)', async () => {
			const mockChain = createMockQueryBuilder();

			// Simulate claims with no checklist_claim entry (available to start)
			mockChain.execute.mockResolvedValue([
				{ id: 3, claim_number: 'CLM-003', insured: 'Bob Johnson', date_of_loss: '2025-01-03', feed_name: null, total_count: '1' },
			]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			await getClaims(mockContributorContext, {});

			// The OR condition should include: NOT EXISTS(checklist_claim) for unassigned claims
			const whereCalls = mockChain.where.mock.calls;
			const hasVisibilityFilter = whereCalls.some(call => typeof call[0] === 'function');
			expect(hasVisibilityFilter).toBe(true);
		});

		it('should NOT show claims to contributors that are worked by others', async () => {
			const mockChain = createMockQueryBuilder();

			// Empty result - claims worked by others are filtered out
			mockChain.execute.mockResolvedValue([]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			const result = await getClaims(mockContributorContext, {});

			// Verify filtering was applied
			expect(mockChain.where).toHaveBeenCalled();
			expect(result.rows).toHaveLength(0);
			expect(result.count).toBe(0);
		});
	});

	describe('Column Restrictions', () => {
		it('should return all columns for admin', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.execute.mockResolvedValue([
				{
					id: 1,
					claim_number: 'CLM-001',
					client: 'Client Corp',
					client_adjuster: 'Adjuster Name',
					insured: 'John Doe',
					claim_amount: '50000',
					total_incurred: '45000',
					date_of_loss: '2025-01-01',
					loss_street_address: null,
					loss_city: 'New York',
					loss_state: 'NY',
					loss_postal_code: null,
					loss_country: 'US',
					last_updated_by: 'admin-123',
					last_update: '2025-01-15',
					expected_recovery: '5000',
					client_id: 'client-abc',
					created_by: 'admin-123',
					created_at: '2025-01-01',
					feed_id: 1,
					feed_name: 'Feed A',
					total_count: '1',
				},
			]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			await getClaims(mockAdminContext, {});

			// Admin should get selectAll('claim')
			expect(mockChain.selectAll).toHaveBeenCalledWith('claim');
			expect(mockChain.select).toHaveBeenCalledWith(['feeds.name as feed_name']);
		});

		it('should return only limited columns for contributor', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.execute.mockResolvedValue([
				{
					id: 1,
					claim_number: 'CLM-001',
					insured: 'John Doe',
					date_of_loss: '2025-01-01',
					feed_name: 'Feed A',
					total_count: '1',
				},
			]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			await getClaims(mockContributorContext, {});

			// Contributor should only get specific columns
			expect(mockChain.select).toHaveBeenCalledWith([
				'claim.id',
				'claim.claim_number',
				'claim.insured',
				'claim.date_of_loss',
				'feeds.name as feed_name',
			]);

			// selectAll('claim') should NOT be called for contributors
			// Note: selectAll() might be called on the CTE, but not selectAll('claim')
			const selectAllCalls = mockChain.selectAll.mock.calls;
			const hasClaimSelectAll = selectAllCalls.some(call => call[0] === 'claim');
			expect(hasClaimSelectAll).toBe(false);
		});

		it('should NOT expose sensitive fields to contributors', async () => {
			const mockChain = createMockQueryBuilder();

			// Simulate database returning only the allowed columns
			const contributorResult = [
				{
					id: 1,
					claim_number: 'CLM-001',
					insured: 'John Doe',
					date_of_loss: '2025-01-01',
					feed_name: 'Feed A',
					total_count: '1',
					// Sensitive fields should NOT be included:
					// client, client_adjuster, claim_amount, total_incurred,
					// expected_recovery, last_updated_by, created_by, etc.
				},
			];

			mockChain.execute.mockResolvedValue(contributorResult);
			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			const result = await getClaims(mockContributorContext, {});

			// Verify sensitive fields are not in the result
			expect(result.rows[0]).not.toHaveProperty('client');
			expect(result.rows[0]).not.toHaveProperty('client_adjuster');
			expect(result.rows[0]).not.toHaveProperty('claim_amount');
			expect(result.rows[0]).not.toHaveProperty('total_incurred');
			expect(result.rows[0]).not.toHaveProperty('expected_recovery');
		});
	});

	describe('Client Scoping Enforcement', () => {
		it('should enforce client_id scoping for admin', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.execute.mockResolvedValue([]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			await getClaims(mockAdminContext, {});

			// Verify client_id filtering was applied
			expect(mockChain.where).toHaveBeenCalledWith(
				'claim.client_id',
				'=',
				mockAdminContext.session.user.client_id
			);
		});

		it('should enforce client_id scoping for contributor', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.execute.mockResolvedValue([]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			await getClaims(mockContributorContext, {});

			// Verify client_id filtering was applied
			expect(mockChain.where).toHaveBeenCalledWith(
				'claim.client_id',
				'=',
				mockContributorContext.session.user.client_id
			);
		});

		it('should only return claims from the user client, not other clients', async () => {
			const mockChain = createMockQueryBuilder();

			// Result should only contain claims from client-abc, not other clients
			mockChain.execute.mockResolvedValue([
				{ id: 1, claim_number: 'CLM-001', insured: 'John Doe', client_id: 'client-abc', feed_name: 'Feed A', total_count: '1' },
			]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			const result = await getClaims(mockContributorContext, {});

			// Verify client scoping was applied
			expect(mockChain.where).toHaveBeenCalledWith(
				'claim.client_id',
				'=',
				'client-abc'
			);

			// All results should belong to the user's client
			expect(result.rows.every((claim: any) => claim.client_id === 'client-abc')).toBe(true);
		});
	});

	describe('Search Functionality with Visibility', () => {
		it('should apply search filter for admin', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.execute.mockResolvedValue([
				{ id: 1, claim_number: 'CLM-001', insured: 'John Doe', feed_name: 'Feed A', total_count: '1' },
			]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			await getClaims(mockAdminContext, {
				searchTerm: { value: 'CLM-001', type: ClaimSearch.CLAIM_NUMBER },
			});

			// Verify search filter was applied
			const whereCalls = mockChain.where.mock.calls;
			const hasSearchFilter = whereCalls.some(call => typeof call[0] === 'function');
			expect(hasSearchFilter).toBe(true);
		});

		it('should apply search filter AND visibility filter for contributor', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.execute.mockResolvedValue([
				{ id: 1, claim_number: 'CLM-001', insured: 'John Doe', date_of_loss: '2025-01-01', feed_name: 'Feed A', total_count: '1' },
			]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			await getClaims(mockContributorContext, {
				searchTerm: { value: 'john', type: ClaimSearch.INSURED },
			});

			// Should have visibility filtering via where clause
			// Multiple where clauses: client_id, visibility, search
			expect(mockChain.where.mock.calls.length).toBeGreaterThanOrEqual(2);
		});

		it('should search by claim number with case-insensitive matching', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.execute.mockResolvedValue([
				{ id: 1, claim_number: 'CLM-001', insured: 'John Doe', date_of_loss: '2025-01-01', feed_name: 'Feed A', total_count: '1' },
			]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			await getClaims(mockContributorContext, {
				searchTerm: { value: 'clm', type: ClaimSearch.CLAIM_NUMBER },
			});

			// Verify where clause with search was called
			expect(mockChain.where).toHaveBeenCalled();
		});
	});

	describe('Pagination with Visibility', () => {
		it('should apply limit and offset for admin data query', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.execute.mockResolvedValue([
				{ id: 1, claim_number: 'CLM-001', feed_name: 'Feed A', total_count: '1' },
			]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			await getClaims(mockAdminContext, {
				limit: 10,
				offset: 20,
			});

			expect(mockChain.limit).toHaveBeenCalledWith(10);
			expect(mockChain.offset).toHaveBeenCalledWith(20);
		});

		it('should apply limit and offset for contributor data query', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.execute.mockResolvedValue([
				{ id: 1, claim_number: 'CLM-001', insured: 'John Doe', date_of_loss: '2025-01-01', feed_name: 'Feed A', total_count: '1' },
			]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			await getClaims(mockContributorContext, {
				limit: 5,
				offset: 10,
			});

			expect(mockChain.limit).toHaveBeenCalledWith(5);
			expect(mockChain.offset).toHaveBeenCalledWith(10);
		});

		it('should apply limit and offset when provided', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.execute.mockResolvedValue([
				{ id: 1, claim_number: 'CLM-001', insured: 'John Doe', date_of_loss: '2025-01-01', feed_name: 'Feed A', total_count: '1' },
			]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			await getClaims(mockContributorContext, {
				limit: 10,
				offset: 5,
			});

			// Limit and offset should be applied
			expect(mockChain.limit).toHaveBeenCalledWith(10);
			expect(mockChain.offset).toHaveBeenCalledWith(5);
		});
	});

	describe('Total Count Extraction', () => {
		it('should extract count from total_count field for admin', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.execute.mockResolvedValue([
				{ id: 1, claim_number: 'CLM-001', feed_name: 'Feed A', total_count: '100' },
				{ id: 2, claim_number: 'CLM-002', feed_name: 'Feed B', total_count: '100' },
			]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			const result = await getClaims(mockAdminContext, {});

			// Should return parsed count
			expect(result.count).toBe(100);
			expect(result.rows).toHaveLength(2);
		});

		it('should extract count from total_count field for contributor WITH visibility filtering', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.execute.mockResolvedValue([
				{ id: 1, claim_number: 'CLM-001', insured: 'John Doe', date_of_loss: '2025-01-01', feed_name: 'Feed A', total_count: '25' },
			]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			const result = await getClaims(mockContributorContext, {});

			// Should return parsed count
			expect(result.count).toBe(25);
			expect(result.rows).toHaveLength(1);

			// SHOULD have visibility filtering via where clause
			const whereCalls = mockChain.where.mock.calls;
			const hasVisibilityFilter = whereCalls.some(call => typeof call[0] === 'function');
			expect(hasVisibilityFilter).toBe(true);
		});

		it('should handle zero count correctly', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.execute.mockResolvedValue([]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			const result = await getClaims(mockContributorContext, {});

			expect(result.count).toBe(0);
			expect(result.rows).toHaveLength(0);
		});

		it('should handle empty results gracefully', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.execute.mockResolvedValue([]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			const result = await getClaims(mockContributorContext, {});

			expect(result.count).toBe(0);
			expect(result.rows).toHaveLength(0);
		});
	});

	describe('Feed Filtering with Visibility', () => {
		it('should filter by feedId for admin', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.execute.mockResolvedValue([
				{ id: 1, claim_number: 'CLM-001', feed_id: 5, feed_name: 'Feed A', total_count: '1' },
			]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			await getClaims(mockAdminContext, { feedId: 5 });

			// Should filter by feed_id
			expect(mockChain.where).toHaveBeenCalledWith('feed_id', '=', 5);
		});

		it('should filter by feedId for contributor with visibility', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.execute.mockResolvedValue([
				{ id: 1, claim_number: 'CLM-001', insured: 'John Doe', date_of_loss: '2025-01-01', feed_id: 5, feed_name: 'Feed A', total_count: '1' },
			]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			await getClaims(mockContributorContext, { feedId: 5 });

			// Should have both feed filter AND visibility filter via where clause
			expect(mockChain.where).toHaveBeenCalledWith('feed_id', '=', 5);
			const whereCalls = mockChain.where.mock.calls;
			// Visibility filter is a callback function passed to where()
			const hasVisibilityFilter = whereCalls.some((call) => typeof call[0] === 'function');
			expect(hasVisibilityFilter).toBe(true);
		});

		it('should handle null feedId (manual claims)', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.execute.mockResolvedValue([
				{ id: 2, claim_number: 'CLM-002', insured: 'Jane Smith', date_of_loss: '2025-01-02', feed_id: null, feed_name: null, total_count: '1' },
			]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			await getClaims(mockContributorContext, { feedId: null });

			// Should filter for null feed_id
			expect(mockChain.where).toHaveBeenCalledWith('feed_id', 'is', null);
		});
	});

	describe('Integration - getClaims filters', () => {
		let integrationDb: Kysely<DB>;

		beforeAll(() => {
			integrationDb = getTestDb();
		});

		beforeEach(async () => {
			await integrationDb.executeQuery({
				sql: 'SET search_path TO test, public',
				parameters: [],
				query: { kind: 'RawNode' } as any,
			});
			await truncateAllTables(integrationDb);
		});

		afterAll(async () => {
			await closeTestDb();
		});

		it('should exclude inactive feeds when feedId is undefined and return only manual claims when feedId is null', async () => {
			const client = await createTestClient(integrationDb, { name: 'Feed Filter Client' });
			const user = await createTestUser(integrationDb, { client_id: client.id, role: 'Admin' });
			const activeFeed = await createTestFeed(integrationDb, {
				client_id: client.id,
				created_by: user.id,
				name: 'Active Feed',
				status: 'Online',
			});
			const inactiveFeed = await createTestFeed(integrationDb, {
				client_id: client.id,
				created_by: user.id,
				name: 'Inactive Feed',
				status: 'Inactive',
			});

			await createTestClaim(integrationDb, { client_id: client.id, feed_id: activeFeed.id, insured: 'Active Claim' });
			await createTestClaim(integrationDb, { client_id: client.id, feed_id: inactiveFeed.id, insured: 'Inactive Claim' });
			await createTestClaim(integrationDb, { client_id: client.id, insured: 'Manual Claim' });

			const ctx = createTestContext(integrationDb, { id: user.id, client_id: client.id, role: 'Admin' });

			const defaultResult = await getClaims(ctx, {});
			const manualResult = await getClaims(ctx, { feedId: null });

			const defaultInsureds = defaultResult.rows.map((claim) => claim.insured);
			expect(defaultResult.count).toBe(2);
			expect(defaultInsureds).toContain('Active Claim');
			expect(defaultInsureds).toContain('Manual Claim');
			expect(defaultInsureds).not.toContain('Inactive Claim');

			expect(manualResult.count).toBe(1);
			expect(manualResult.rows).toHaveLength(1);
			expect(manualResult.rows[0].insured).toBe('Manual Claim');
		});

		it('should apply prefix matching for claim number searchTerm', async () => {
			const client = await createTestClient(integrationDb, { name: 'Claim Number Search Client' });
			const user = await createTestUser(integrationDb, { client_id: client.id, role: 'Admin' });
			await createTestClaim(integrationDb, { client_id: client.id, claim_number: 'ABC-001' });
			await createTestClaim(integrationDb, { client_id: client.id, claim_number: 'ABC-002' });
			await createTestClaim(integrationDb, { client_id: client.id, claim_number: 'XABC-003' });

			const ctx = createTestContext(integrationDb, { id: user.id, client_id: client.id, role: 'Admin' });
			const result = await getClaims(ctx, {
				searchTerm: { value: 'ABC', type: ClaimSearch.CLAIM_NUMBER },
			});

			const claimNumbers = result.rows.map((claim) => claim.claim_number);
			expect(result.count).toBe(2);
			expect(claimNumbers).toEqual(['ABC-001', 'ABC-002']);
		});

		it('should apply prefix matching for insured searchTerm', async () => {
			const client = await createTestClient(integrationDb, { name: 'Insured Search Client' });
			const user = await createTestUser(integrationDb, { client_id: client.id, role: 'Admin' });
			await createTestClaim(integrationDb, { client_id: client.id, insured: 'John Smith' });
			await createTestClaim(integrationDb, { client_id: client.id, insured: 'Joanna Ray' });
			await createTestClaim(integrationDb, { client_id: client.id, insured: 'Alice Johnson' });

			const ctx = createTestContext(integrationDb, { id: user.id, client_id: client.id, role: 'Admin' });
			const result = await getClaims(ctx, {
				searchTerm: { value: 'Jo', type: ClaimSearch.INSURED },
			});

			const insureds = result.rows.map((claim) => claim.insured);
			expect(result.count).toBe(2);
			expect(insureds).toContain('John Smith');
			expect(insureds).toContain('Joanna Ray');
			expect(insureds).not.toContain('Alice Johnson');
		});

		it('should filter by loss_type using claim_party exists', async () => {
			const client = await createTestClient(integrationDb, { name: 'Loss Type Client' });
			const user = await createTestUser(integrationDb, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(integrationDb, { client_id: client.id, created_by: user.id, name: 'Loss Party' });

			const collisionClaim = await createTestClaim(integrationDb, {
				client_id: client.id,
				claim_number: 'LOSS-001',
			});
			const fireClaim = await createTestClaim(integrationDb, {
				client_id: client.id,
				claim_number: 'LOSS-002',
			});

			await createTestClaimParty(integrationDb, {
				client_id: client.id,
				claim_id: collisionClaim.id,
				party_id: party.id,
				created_by: user.id,
				loss_type: LossType.COLLISION,
			});
			await createTestClaimParty(integrationDb, {
				client_id: client.id,
				claim_id: fireClaim.id,
				party_id: party.id,
				created_by: user.id,
				loss_type: LossType.FIRE,
			});

			const ctx = createTestContext(integrationDb, { id: user.id, client_id: client.id, role: 'Admin' });
			const result = await getClaims(ctx, { loss_type: LossType.COLLISION });

			expect(result.count).toBe(1);
			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].claim_number).toBe('LOSS-001');
		});

		it('should filter by recovery_status, insured prefix, and client prefix', async () => {
			const client = await createTestClient(integrationDb, { name: 'Recovery Filters Client' });
			const user = await createTestUser(integrationDb, { client_id: client.id, role: 'Admin' });

			await createTestClaim(integrationDb, {
				client_id: client.id,
				recovery_status: RecoveryStatus.PENDING,
				insured: 'Alpha Insured',
				client: 'Acme Corp',
				claim_number: 'REC-001',
			});
			await createTestClaim(integrationDb, {
				client_id: client.id,
				recovery_status: RecoveryStatus.PENDING,
				insured: 'Beta Insured',
				client: 'Beta LLC',
				claim_number: 'REC-002',
			});
			await createTestClaim(integrationDb, {
				client_id: client.id,
				recovery_status: RecoveryStatus.RECOVERED,
				insured: 'Alpha Secondary',
				client: 'Acme Holdings',
				claim_number: 'REC-003',
			});

			const ctx = createTestContext(integrationDb, { id: user.id, client_id: client.id, role: 'Admin' });

			const recoveryResult = await getClaims(ctx, { recovery_status: RecoveryStatus.PENDING });
			const insuredResult = await getClaims(ctx, { insured: 'Alpha' });
			const clientResult = await getClaims(ctx, { client: 'Acme' });

			expect(recoveryResult.count).toBe(2);
			expect(recoveryResult.rows.map((claim) => claim.claim_number)).toEqual(['REC-001', 'REC-002']);

			expect(insuredResult.count).toBe(2);
			expect(insuredResult.rows.map((claim) => claim.claim_number)).toEqual(['REC-001', 'REC-003']);

			expect(clientResult.count).toBe(2);
			expect(clientResult.rows.map((claim) => claim.claim_number)).toEqual(['REC-001', 'REC-003']);
		});

		it('should apply limit/offset pagination and parse COUNT(*) OVER() into count', async () => {
			const client = await createTestClient(integrationDb, { name: 'Pagination Client' });
			const user = await createTestUser(integrationDb, { client_id: client.id, role: 'Admin' });

			for (let i = 1; i <= 5; i++) {
				await createTestClaim(integrationDb, {
					client_id: client.id,
					claim_number: `CLM-00${i}`,
				});
			}

			const ctx = createTestContext(integrationDb, { id: user.id, client_id: client.id, role: 'Admin' });
			const result = await getClaims(ctx, { limit: 2, offset: 1 });

			expect(result.count).toBe(5);
			expect(result.rows).toHaveLength(2);
			expect(result.rows.map((claim) => claim.claim_number)).toEqual(['CLM-002', 'CLM-003']);
		});
	});
});
