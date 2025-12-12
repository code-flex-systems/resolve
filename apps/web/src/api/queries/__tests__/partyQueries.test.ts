import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getClaimParties } from '../partyQueries';
import { db } from '@/api/database/kysely';
import type { ProtectedContext } from '@/server/trpc/trpc';

/**
 * Tests for getClaimParties - Liability Grouping & Data Transformation
 *
 * This function has meaningful transformation logic:
 * 1. Groups liabilities by claim_party_id using reduce
 * 2. Transforms flat DB results into nested objects with party, representative, office, liabilities
 * 3. Returns empty array for parties with no liabilities
 * 4. Handles null representative/office gracefully
 */

vi.mock('@/api/database/kysely', () => ({
	db: {
		selectFrom: vi.fn(),
	},
}));

const createMockContext = (clientId = 'client-abc'): ProtectedContext =>
	({
		session: {
			user: {
				id: 'user-123',
				clerkId: 'clerk_user_123',
				name: 'Test User',
				email: 'test@example.com',
				phone: null,
				role: 'admin',
				client_id: clientId,
			},
		},
		db,
	}) as ProtectedContext;

describe('getClaimParties', () => {
	let mockContext: ProtectedContext;

	beforeEach(() => {
		mockContext = createMockContext();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Liability Grouping', () => {
		it('should group liabilities correctly by claim_party_id', async () => {
			// First query returns claim parties
			const mockClaimParties = [
				{
					id: 1,
					claim_id: 100,
					party_id: 10,
					role: 'Defendant',
					is_primary: true,
					notes: null,
					external_reference: null,
					liability_percentage: '50',
					created_at: new Date(),
					created_by: 'user-1',
					party_name: 'Party A',
					party_type: 'Individual',
					party_category: 'Defendant',
					party_organization: null,
					party_email: 'a@test.com',
					party_phone: '555-0001',
					representative_id: null,
					representative_first_name: null,
					representative_last_name: null,
					representative_email: null,
					representative_phone: null,
					representative_title: null,
					office_id: null,
					office_name: null,
					office_address: null,
					office_phone: null,
				},
				{
					id: 2,
					claim_id: 100,
					party_id: 20,
					role: 'Witness',
					is_primary: false,
					notes: null,
					external_reference: null,
					liability_percentage: '30',
					created_at: new Date(),
					created_by: 'user-1',
					party_name: 'Party B',
					party_type: 'Organization',
					party_category: 'Witness',
					party_organization: 'Org B',
					party_email: 'b@test.com',
					party_phone: '555-0002',
					representative_id: null,
					representative_first_name: null,
					representative_last_name: null,
					representative_email: null,
					representative_phone: null,
					representative_title: null,
					office_id: null,
					office_name: null,
					office_address: null,
					office_phone: null,
				},
			];

			// Second query returns liabilities - 2 for party 1, 1 for party 2
			const mockLiabilities = [
				{
					id: 101,
					claim_party_id: 1,
					amount: '5000.00',
					liability_type: 'Property Damage',
					deleted_at: null,
					created_at: new Date('2025-01-01'),
				},
				{
					id: 102,
					claim_party_id: 1,
					amount: '3000.00',
					liability_type: 'Medical',
					deleted_at: null,
					created_at: new Date('2025-01-02'),
				},
				{
					id: 103,
					claim_party_id: 2,
					amount: '1000.00',
					liability_type: 'Property Damage',
					deleted_at: null,
					created_at: new Date('2025-01-03'),
				},
			];

			let selectFromCallCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				selectFromCallCount++;
				if (selectFromCallCount === 1) {
					// First call: claim parties
					return {
						innerJoin: vi.fn().mockReturnThis(),
						leftJoin: vi.fn().mockReturnThis(),
						selectAll: vi.fn().mockReturnThis(),
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue(mockClaimParties),
					} as any;
				}
				// Second call: liabilities
				return {
					selectAll: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue(mockLiabilities),
				} as any;
			});

			const result = await getClaimParties(mockContext, 100);

			// Party 1 should have 2 liabilities
			expect(result[0].liabilities).toHaveLength(2);
			expect(result[0].liabilities[0].id).toBe(101);
			expect(result[0].liabilities[1].id).toBe(102);

			// Party 2 should have 1 liability
			expect(result[1].liabilities).toHaveLength(1);
			expect(result[1].liabilities[0].id).toBe(103);
		});

		it('should return empty array for parties with no liabilities', async () => {
			const mockClaimParties = [
				{
					id: 1,
					claim_id: 100,
					party_id: 10,
					role: 'Defendant',
					is_primary: true,
					notes: null,
					external_reference: null,
					liability_percentage: '50',
					created_at: new Date(),
					created_by: 'user-1',
					party_name: 'Party A',
					party_type: 'Individual',
					party_category: 'Defendant',
					party_organization: null,
					party_email: 'a@test.com',
					party_phone: '555-0001',
					representative_id: null,
					representative_first_name: null,
					representative_last_name: null,
					representative_email: null,
					representative_phone: null,
					representative_title: null,
					office_id: null,
					office_name: null,
					office_address: null,
					office_phone: null,
				},
			];

			let selectFromCallCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				selectFromCallCount++;
				if (selectFromCallCount === 1) {
					return {
						innerJoin: vi.fn().mockReturnThis(),
						leftJoin: vi.fn().mockReturnThis(),
						selectAll: vi.fn().mockReturnThis(),
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue(mockClaimParties),
					} as any;
				}
				// No liabilities
				return {
					selectAll: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([]),
				} as any;
			});

			const result = await getClaimParties(mockContext, 100);

			expect(result[0].liabilities).toEqual([]);
		});
	});

	describe('Data Transformation', () => {
		it('should transform representative data correctly when present', async () => {
			const mockClaimParties = [
				{
					id: 1,
					claim_id: 100,
					party_id: 10,
					role: 'Defendant',
					is_primary: true,
					notes: 'Test notes',
					external_reference: 'REF-123',
					liability_percentage: '75',
					created_at: new Date(),
					created_by: 'user-1',
					party_name: 'Party A',
					party_type: 'Individual',
					party_category: 'Defendant',
					party_organization: null,
					party_email: 'a@test.com',
					party_phone: '555-0001',
					representative_id: 50,
					representative_first_name: 'John',
					representative_last_name: 'Smith',
					representative_email: 'john@test.com',
					representative_phone: '555-1234',
					representative_title: 'Attorney',
					office_id: null,
					office_name: null,
					office_address: null,
					office_phone: null,
				},
			];

			let selectFromCallCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				selectFromCallCount++;
				if (selectFromCallCount === 1) {
					return {
						innerJoin: vi.fn().mockReturnThis(),
						leftJoin: vi.fn().mockReturnThis(),
						selectAll: vi.fn().mockReturnThis(),
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue(mockClaimParties),
					} as any;
				}
				return {
					selectAll: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([]),
				} as any;
			});

			const result = await getClaimParties(mockContext, 100);

			expect(result[0].representative).toEqual({
				id: 50,
				first_name: 'John',
				last_name: 'Smith',
				email: 'john@test.com',
				phone: '555-1234',
				title: 'Attorney',
			});
		});

		it('should return null for representative when not present', async () => {
			const mockClaimParties = [
				{
					id: 1,
					claim_id: 100,
					party_id: 10,
					role: 'Defendant',
					is_primary: true,
					notes: null,
					external_reference: null,
					liability_percentage: '50',
					created_at: new Date(),
					created_by: 'user-1',
					party_name: 'Party A',
					party_type: 'Individual',
					party_category: 'Defendant',
					party_organization: null,
					party_email: 'a@test.com',
					party_phone: '555-0001',
					representative_id: null,
					representative_first_name: null,
					representative_last_name: null,
					representative_email: null,
					representative_phone: null,
					representative_title: null,
					office_id: null,
					office_name: null,
					office_address: null,
					office_phone: null,
				},
			];

			let selectFromCallCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				selectFromCallCount++;
				if (selectFromCallCount === 1) {
					return {
						innerJoin: vi.fn().mockReturnThis(),
						leftJoin: vi.fn().mockReturnThis(),
						selectAll: vi.fn().mockReturnThis(),
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue(mockClaimParties),
					} as any;
				}
				return {
					selectAll: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([]),
				} as any;
			});

			const result = await getClaimParties(mockContext, 100);

			expect(result[0].representative).toBeNull();
		});

		it('should transform office data correctly when present', async () => {
			const mockClaimParties = [
				{
					id: 1,
					claim_id: 100,
					party_id: 10,
					role: 'Defendant',
					is_primary: true,
					notes: null,
					external_reference: null,
					liability_percentage: '50',
					created_at: new Date(),
					created_by: 'user-1',
					party_name: 'Party A',
					party_type: 'Organization',
					party_category: 'Defendant',
					party_organization: 'Org A',
					party_email: 'a@test.com',
					party_phone: '555-0001',
					representative_id: null,
					representative_first_name: null,
					representative_last_name: null,
					representative_email: null,
					representative_phone: null,
					representative_title: null,
					office_id: 60,
					office_name: 'Main Office',
					office_address: '123 Main St',
					office_phone: '555-MAIN',
				},
			];

			let selectFromCallCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				selectFromCallCount++;
				if (selectFromCallCount === 1) {
					return {
						innerJoin: vi.fn().mockReturnThis(),
						leftJoin: vi.fn().mockReturnThis(),
						selectAll: vi.fn().mockReturnThis(),
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue(mockClaimParties),
					} as any;
				}
				return {
					selectAll: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([]),
				} as any;
			});

			const result = await getClaimParties(mockContext, 100);

			expect(result[0].office).toEqual({
				id: 60,
				office_name: 'Main Office',
				address: '123 Main St',
				phone: '555-MAIN',
			});
		});

		it('should return null for office when not present', async () => {
			const mockClaimParties = [
				{
					id: 1,
					claim_id: 100,
					party_id: 10,
					role: 'Defendant',
					is_primary: true,
					notes: null,
					external_reference: null,
					liability_percentage: '50',
					created_at: new Date(),
					created_by: 'user-1',
					party_name: 'Party A',
					party_type: 'Individual',
					party_category: 'Defendant',
					party_organization: null,
					party_email: 'a@test.com',
					party_phone: '555-0001',
					representative_id: null,
					representative_first_name: null,
					representative_last_name: null,
					representative_email: null,
					representative_phone: null,
					representative_title: null,
					office_id: null,
					office_name: null,
					office_address: null,
					office_phone: null,
				},
			];

			let selectFromCallCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				selectFromCallCount++;
				if (selectFromCallCount === 1) {
					return {
						innerJoin: vi.fn().mockReturnThis(),
						leftJoin: vi.fn().mockReturnThis(),
						selectAll: vi.fn().mockReturnThis(),
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue(mockClaimParties),
					} as any;
				}
				return {
					selectAll: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([]),
				} as any;
			});

			const result = await getClaimParties(mockContext, 100);

			expect(result[0].office).toBeNull();
		});
	});

	describe('Edge Cases', () => {
		it('should return empty array when no claim parties exist', async () => {
			vi.spyOn(db, 'selectFrom').mockReturnValue({
				innerJoin: vi.fn().mockReturnThis(),
				leftJoin: vi.fn().mockReturnThis(),
				selectAll: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([]),
			} as any);

			const result = await getClaimParties(mockContext, 999);

			expect(result).toEqual([]);
		});

		it('should nest party data correctly', async () => {
			const mockClaimParties = [
				{
					id: 1,
					claim_id: 100,
					party_id: 10,
					role: 'Defendant',
					is_primary: true,
					notes: null,
					external_reference: null,
					liability_percentage: '50',
					created_at: new Date(),
					created_by: 'user-1',
					party_name: 'Test Party',
					party_type: 'Individual',
					party_category: 'Defendant',
					party_organization: 'Test Org',
					party_email: 'test@test.com',
					party_phone: '555-TEST',
					representative_id: null,
					representative_first_name: null,
					representative_last_name: null,
					representative_email: null,
					representative_phone: null,
					representative_title: null,
					office_id: null,
					office_name: null,
					office_address: null,
					office_phone: null,
				},
			];

			let selectFromCallCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				selectFromCallCount++;
				if (selectFromCallCount === 1) {
					return {
						innerJoin: vi.fn().mockReturnThis(),
						leftJoin: vi.fn().mockReturnThis(),
						selectAll: vi.fn().mockReturnThis(),
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue(mockClaimParties),
					} as any;
				}
				return {
					selectAll: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([]),
				} as any;
			});

			const result = await getClaimParties(mockContext, 100);

			expect(result[0].party).toEqual({
				id: 10,
				name: 'Test Party',
				party_type: 'Individual',
				party_category: 'Defendant',
				organization: 'Test Org',
				email: 'test@test.com',
				phone: '555-TEST',
			});
		});
	});
});
