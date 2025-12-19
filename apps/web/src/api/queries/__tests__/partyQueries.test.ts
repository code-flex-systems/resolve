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
					parent_claim_party_id: null,
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
					office_street_address: null,
					office_city: null,
					office_state: null,
					office_postal_code: null,
					office_country: null,
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
					parent_claim_party_id: null,
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
					office_street_address: null,
					office_city: null,
					office_state: null,
					office_postal_code: null,
					office_country: null,
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
					parent_claim_party_id: null,
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
					office_street_address: '123 Main St',
					office_city: 'Springfield',
					office_state: 'IL',
					office_postal_code: '62701',
					office_country: 'US',
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
				street_address: '123 Main St',
				city: 'Springfield',
				state: 'IL',
				postal_code: '62701',
				country: 'US',
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
					parent_claim_party_id: null,
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
					office_street_address: null,
					office_city: null,
					office_state: null,
					office_postal_code: null,
					office_country: null,
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
					parent_claim_party_id: null,
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
					office_street_address: null,
					office_city: null,
					office_state: null,
					office_postal_code: null,
					office_country: null,
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
