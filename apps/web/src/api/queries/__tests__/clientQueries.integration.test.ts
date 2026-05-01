/**
 * Integration tests for clientQueries
 *
 * Tests cover:
 * - getClientByClerkOrgId: Look up client by Clerk organization ID
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { getTestDb } from '@/__tests__/integration/testDb';
import { getClientByClerkOrgId } from '../clientQueries';
import { createTestClient } from '@/__tests__/integration/fixtures';

describe('clientQueries integration tests', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	describe('getClientByClerkOrgId', () => {
		it('should return client when clerk_org_id matches', async () => {
			const clerkOrgId = `org_test_${Date.now()}`;
			const client = await createTestClient(db, { clerk_org_id: clerkOrgId });

			const result = await getClientByClerkOrgId(db, clerkOrgId);

			expect(result).toBeDefined();
			expect(result!.id).toBe(client.id);
			expect(result!.clerk_org_id).toBe(clerkOrgId);
		});

		it('should return undefined when clerk_org_id does not exist', async () => {
			const result = await getClientByClerkOrgId(db, 'nonexistent_org_id');

			expect(result).toBeUndefined();
		});

		it('should return correct client when multiple clients exist', async () => {
			const clerkOrgId1 = `org_multi_1_${Date.now()}`;
			const clerkOrgId2 = `org_multi_2_${Date.now()}`;
			const client1 = await createTestClient(db, { name: 'Client 1', clerk_org_id: clerkOrgId1 });
			const client2 = await createTestClient(db, { name: 'Client 2', clerk_org_id: clerkOrgId2 });

			const result1 = await getClientByClerkOrgId(db, clerkOrgId1);
			const result2 = await getClientByClerkOrgId(db, clerkOrgId2);

			expect(result1!.id).toBe(client1.id);
			expect(result2!.id).toBe(client2.id);
		});

		it('should return all client fields', async () => {
			const clerkOrgId = `org_fields_${Date.now()}`;
			const client = await createTestClient(db, {
				name: 'Fields Test Client',
				clerk_org_id: clerkOrgId,
			});

			const result = await getClientByClerkOrgId(db, clerkOrgId);

			expect(result).toBeDefined();
			expect(result!.id).toBe(client.id);
			expect(result!.name).toBe('Fields Test Client');
			expect(result!.clerk_org_id).toBe(clerkOrgId);
		});
	});
});
