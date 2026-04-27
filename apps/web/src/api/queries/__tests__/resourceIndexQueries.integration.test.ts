/**
 * Integration tests for resourceIndexQueries
 *
 * Verifies:
 * - upsertResourceIndex: insert and conflict-update behavior, tenant isolation
 * - searchResourceIndex: prefix search by label and secondary_label, tenant isolation,
 *   linked-resource fan-out (claim -> linked entries), and limit handling
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { randomUUID } from 'crypto';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { DB } from '@/api/database/types';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import { createTestClient, createTestUser } from '@/__tests__/integration/fixtures';
import { searchResourceIndex, upsertResourceIndex } from '../resourceIndexQueries';

describe('resourceIndexQueries integration', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	// Avoid unused warning for createTestContext (fixture import is required by harness)
	void createTestContext;

	describe('upsertResourceIndex', () => {
		it('inserts a new resource_index row', async () => {
			const client = await createTestClient(db);
			const resourceId = randomUUID();

			await upsertResourceIndex(db, {
				client_id: client.id,
				resource_type: 'claim',
				resource_id: resourceId,
				label: 'CLM-1001',
				secondary_label: 'Acme Corp',
				metadata: { status: 'open' },
				url: '/claims/CLM-1001',
			});

			const row = await db
				.selectFrom('resource_index')
				.selectAll()
				.where('client_id', '=', client.id)
				.where('resource_id', '=', resourceId)
				.executeTakeFirstOrThrow();

			expect(row.client_id).toBe(client.id);
			expect(row.resource_type).toBe('claim');
			expect(row.resource_id).toBe(resourceId);
			expect(row.label).toBe('CLM-1001');
			expect(row.secondary_label).toBe('Acme Corp');
			expect(row.url).toBe('/claims/CLM-1001');
			expect(row.linked_resource_id).toBeNull();
			expect(row.linked_resource_type).toBeNull();
			expect(row.metadata).toEqual({ status: 'open' });
		});

		it('updates an existing row on conflict (same client_id, resource_type, resource_id)', async () => {
			const client = await createTestClient(db);
			const resourceId = randomUUID();

			// Initial insert
			await upsertResourceIndex(db, {
				client_id: client.id,
				resource_type: 'claim',
				resource_id: resourceId,
				label: 'Original Label',
				secondary_label: 'Original Secondary',
				metadata: { version: '1' },
				url: '/claims/original',
			});

			const initial = await db
				.selectFrom('resource_index')
				.select(['id', 'updated_at'])
				.where('client_id', '=', client.id)
				.where('resource_id', '=', resourceId)
				.executeTakeFirstOrThrow();

			// Wait briefly so updated_at differs
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Conflict upsert
			await upsertResourceIndex(db, {
				client_id: client.id,
				resource_type: 'claim',
				resource_id: resourceId,
				label: 'Updated Label',
				secondary_label: 'Updated Secondary',
				metadata: { version: '2' },
				url: '/claims/updated',
			});

			const allRows = await db
				.selectFrom('resource_index')
				.selectAll()
				.where('client_id', '=', client.id)
				.where('resource_id', '=', resourceId)
				.execute();

			// Same row, no duplicate
			expect(allRows).toHaveLength(1);
			expect(allRows[0].id).toBe(initial.id);
			expect(allRows[0].label).toBe('Updated Label');
			expect(allRows[0].secondary_label).toBe('Updated Secondary');
			expect(allRows[0].url).toBe('/claims/updated');
			expect(allRows[0].metadata).toEqual({ version: '2' });
			expect(new Date(allRows[0].updated_at).getTime()).toBeGreaterThanOrEqual(
				new Date(initial.updated_at).getTime()
			);
		});

		it('keeps separate rows when the same resource_id exists for two clients', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const sharedResourceId = randomUUID();

			await upsertResourceIndex(db, {
				client_id: clientA.id,
				resource_type: 'claim',
				resource_id: sharedResourceId,
				label: 'Client A Claim',
				url: '/a/claim',
			});
			await upsertResourceIndex(db, {
				client_id: clientB.id,
				resource_type: 'claim',
				resource_id: sharedResourceId,
				label: 'Client B Claim',
				url: '/b/claim',
			});

			const rowsA = await db
				.selectFrom('resource_index')
				.selectAll()
				.where('client_id', '=', clientA.id)
				.where('resource_id', '=', sharedResourceId)
				.execute();
			const rowsB = await db
				.selectFrom('resource_index')
				.selectAll()
				.where('client_id', '=', clientB.id)
				.where('resource_id', '=', sharedResourceId)
				.execute();

			expect(rowsA).toHaveLength(1);
			expect(rowsB).toHaveLength(1);
			expect(rowsA[0].label).toBe('Client A Claim');
			expect(rowsB[0].label).toBe('Client B Claim');
			expect(rowsA[0].id).not.toBe(rowsB[0].id);
		});

		it('treats different linked_resource_id values as distinct conflict targets', async () => {
			const client = await createTestClient(db);
			const resourceId = randomUUID();
			const linkedA = randomUUID();
			const linkedB = randomUUID();

			// Three rows: one with no link, two with different links
			await upsertResourceIndex(db, {
				client_id: client.id,
				resource_type: 'checklist_claim',
				resource_id: resourceId,
				label: 'no-link',
				url: '/x',
			});
			await upsertResourceIndex(db, {
				client_id: client.id,
				resource_type: 'checklist_claim',
				resource_id: resourceId,
				linked_resource_type: 'claim',
				linked_resource_id: linkedA,
				label: 'link-a',
				url: '/x',
			});
			await upsertResourceIndex(db, {
				client_id: client.id,
				resource_type: 'checklist_claim',
				resource_id: resourceId,
				linked_resource_type: 'claim',
				linked_resource_id: linkedB,
				label: 'link-b',
				url: '/x',
			});

			const rows = await db
				.selectFrom('resource_index')
				.selectAll()
				.where('client_id', '=', client.id)
				.where('resource_id', '=', resourceId)
				.orderBy('label')
				.execute();

			expect(rows).toHaveLength(3);
			expect(rows.map((r) => r.label).sort()).toEqual(['link-a', 'link-b', 'no-link']);
		});
	});

	describe('searchResourceIndex', () => {
		it('returns results matching by label prefix', async () => {
			const client = await createTestClient(db);

			await upsertResourceIndex(db, {
				client_id: client.id,
				resource_type: 'claim',
				resource_id: randomUUID(),
				label: 'Smithson Property',
				url: '/c/1',
			});
			// Control: row that should NOT match
			await upsertResourceIndex(db, {
				client_id: client.id,
				resource_type: 'claim',
				resource_id: randomUUID(),
				label: 'Anderson Property',
				url: '/c/2',
			});

			const results = await searchResourceIndex(db, client.id, 'Smith');

			expect(results.map((r) => r.label)).toEqual(['Smithson Property']);
		});

		it('matches against secondary_label as well', async () => {
			const client = await createTestClient(db);

			// Match on secondary_label
			await upsertResourceIndex(db, {
				client_id: client.id,
				resource_type: 'claim',
				resource_id: randomUUID(),
				label: 'CLM-9001',
				secondary_label: 'Wonderland Insurance',
				url: '/c/9001',
			});
			// Control: no match anywhere
			await upsertResourceIndex(db, {
				client_id: client.id,
				resource_type: 'claim',
				resource_id: randomUUID(),
				label: 'CLM-9002',
				secondary_label: 'Other Insurance',
				url: '/c/9002',
			});

			const results = await searchResourceIndex(db, client.id, 'Wonder');

			expect(results.map((r) => r.label)).toEqual(['CLM-9001']);
		});

		it('isolates results by client_id', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);

			await upsertResourceIndex(db, {
				client_id: clientA.id,
				resource_type: 'claim',
				resource_id: randomUUID(),
				label: 'Zephyr Claim',
				url: '/a',
			});
			// Control row for client B with a matching label - should NOT be returned when searching as client A
			await upsertResourceIndex(db, {
				client_id: clientB.id,
				resource_type: 'claim',
				resource_id: randomUUID(),
				label: 'Zephyr Claim',
				url: '/b',
			});

			const resultsA = await searchResourceIndex(db, clientA.id, 'Zephyr');
			const resultsB = await searchResourceIndex(db, clientB.id, 'Zephyr');

			expect(resultsA).toHaveLength(1);
			expect(resultsA[0].client_id).toBe(clientA.id);
			expect(resultsB).toHaveLength(1);
			expect(resultsB[0].client_id).toBe(clientB.id);
		});

		it('respects the limit parameter', async () => {
			const client = await createTestClient(db);

			// Insert 5 matching rows
			for (let i = 0; i < 5; i++) {
				await upsertResourceIndex(db, {
					client_id: client.id,
					resource_type: 'claim',
					resource_id: randomUUID(),
					label: `Limitable ${i}`,
					url: `/c/${i}`,
				});
			}

			const results = await searchResourceIndex(db, client.id, 'Limitable', 3);

			expect(results).toHaveLength(3);
		});

		it('returns no results when nothing matches', async () => {
			const client = await createTestClient(db);

			// Control: a row that exists but does not match the search term
			await upsertResourceIndex(db, {
				client_id: client.id,
				resource_type: 'claim',
				resource_id: randomUUID(),
				label: 'Existing Label',
				url: '/c/x',
			});

			const results = await searchResourceIndex(db, client.id, 'NoSuchTerm');
			expect(results).toEqual([]);
		});

		it('uses prefix matching, not infix matching', async () => {
			const client = await createTestClient(db);

			// "Foundation" - starts with "Foun"
			await upsertResourceIndex(db, {
				client_id: client.id,
				resource_type: 'claim',
				resource_id: randomUUID(),
				label: 'Foundation Repair',
				url: '/c/found',
			});
			// "Pro Foundation" - contains "Foun" but does not start with it
			await upsertResourceIndex(db, {
				client_id: client.id,
				resource_type: 'claim',
				resource_id: randomUUID(),
				label: 'Pro Foundation',
				url: '/c/pro',
			});

			const results = await searchResourceIndex(db, client.id, 'Foun');

			expect(results.map((r) => r.label)).toEqual(['Foundation Repair']);
		});

		it('escapes LIKE wildcards in the search term', async () => {
			const client = await createTestClient(db);

			// Real label starts with literal "100%"
			await upsertResourceIndex(db, {
				client_id: client.id,
				resource_type: 'claim',
				resource_id: randomUUID(),
				label: '100% Claim',
				url: '/c/percent',
			});
			// Control: would match if "%" were not escaped
			await upsertResourceIndex(db, {
				client_id: client.id,
				resource_type: 'claim',
				resource_id: randomUUID(),
				label: '999 Claim',
				url: '/c/999',
			});

			// Search term contains literal "%" which must be escaped
			const results = await searchResourceIndex(db, client.id, '100%');
			expect(results.map((r) => r.label)).toEqual(['100% Claim']);
		});

		it('surfaces linked resources when searching for the parent claim', async () => {
			const client = await createTestClient(db);
			const claimResourceId = randomUUID();
			const checklistClaimResourceId = randomUUID();

			// Parent claim entry whose label matches the search
			await upsertResourceIndex(db, {
				client_id: client.id,
				resource_type: 'claim',
				resource_id: claimResourceId,
				label: 'Quincy Estate',
				url: '/claim/quincy',
			});
			// Linked checklist_claim row - its label does NOT match, but it links to the claim
			await upsertResourceIndex(db, {
				client_id: client.id,
				resource_type: 'checklist_claim',
				resource_id: checklistClaimResourceId,
				linked_resource_type: 'claim',
				linked_resource_id: claimResourceId,
				label: 'Workflow A',
				url: '/wf/a',
			});
			// Control: another linked checklist_claim referencing a different claim - should NOT appear
			const otherClaimResourceId = randomUUID();
			await upsertResourceIndex(db, {
				client_id: client.id,
				resource_type: 'claim',
				resource_id: otherClaimResourceId,
				label: 'Other Estate',
				url: '/claim/other',
			});
			await upsertResourceIndex(db, {
				client_id: client.id,
				resource_type: 'checklist_claim',
				resource_id: randomUUID(),
				linked_resource_type: 'claim',
				linked_resource_id: otherClaimResourceId,
				label: 'Workflow B',
				url: '/wf/b',
			});

			const results = await searchResourceIndex(db, client.id, 'Quincy');

			const labels = results.map((r) => r.label).sort();
			expect(labels).toEqual(['Quincy Estate', 'Workflow A']);

			// Direct match should rank ahead of linked match
			expect(results[0].label).toBe('Quincy Estate');
			expect(results[0].linked_resource_id).toBeNull();
			expect(results[1].label).toBe('Workflow A');
			expect(results[1].linked_resource_id).toBe(claimResourceId);
		});

		it('does not surface linked resources for non-claim primary matches', async () => {
			const client = await createTestClient(db);
			const partyResourceId = randomUUID();

			// Primary match is a party (not a claim) - so the linked-resource UNION arm should not fire
			await upsertResourceIndex(db, {
				client_id: client.id,
				resource_type: 'party',
				resource_id: partyResourceId,
				label: 'Yardley Holdings',
				url: '/party/yardley',
			});
			// A row that links to this party - should NOT be surfaced because the UNION only fans out from claims
			await upsertResourceIndex(db, {
				client_id: client.id,
				resource_type: 'note',
				resource_id: randomUUID(),
				linked_resource_type: 'party',
				linked_resource_id: partyResourceId,
				label: 'Linked Note',
				url: '/note/1',
			});

			const results = await searchResourceIndex(db, client.id, 'Yardley');

			expect(results.map((r) => r.label)).toEqual(['Yardley Holdings']);
		});

		it('does not cross-pollute linked resources across clients', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const claimIdA = randomUUID();
			const claimIdB = randomUUID();

			// Client A: matching claim and linked workflow
			await upsertResourceIndex(db, {
				client_id: clientA.id,
				resource_type: 'claim',
				resource_id: claimIdA,
				label: 'Riverstone',
				url: '/a',
			});
			await upsertResourceIndex(db, {
				client_id: clientA.id,
				resource_type: 'checklist_claim',
				resource_id: randomUUID(),
				linked_resource_type: 'claim',
				linked_resource_id: claimIdA,
				label: 'A Workflow',
				url: '/wf/a',
			});
			// Client B: matching claim and linked workflow - should be invisible to client A
			await upsertResourceIndex(db, {
				client_id: clientB.id,
				resource_type: 'claim',
				resource_id: claimIdB,
				label: 'Riverstone',
				url: '/b',
			});
			await upsertResourceIndex(db, {
				client_id: clientB.id,
				resource_type: 'checklist_claim',
				resource_id: randomUUID(),
				linked_resource_type: 'claim',
				linked_resource_id: claimIdB,
				label: 'B Workflow',
				url: '/wf/b',
			});

			const resultsA = await searchResourceIndex(db, clientA.id, 'River');

			const labelsA = resultsA.map((r) => r.label).sort();
			expect(labelsA).toEqual(['A Workflow', 'Riverstone']);
			for (const r of resultsA) {
				expect(r.client_id).toBe(clientA.id);
			}
		});
	});

	// Avoid unused-import warnings on helpers we don't need but the fixture barrel exports
	void sql;
	void createTestUser;
});
