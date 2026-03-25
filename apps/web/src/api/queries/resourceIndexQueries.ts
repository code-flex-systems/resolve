import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { DB } from '@/api/database/types';

/**
 * Search the resource index for records matching a prefix term.
 * Uses ILIKE with prefix matching to leverage B-tree indexes with varchar_pattern_ops.
 * Results where label matches are ranked above secondary_label-only matches.
 *
 * Also returns linked resources (e.g., checklist+claim entries linked to matching claims)
 * via a UNION query so that searching for a claim surfaces related checklist work items.
 */
export async function searchResourceIndex(
	db: Kysely<DB>,
	clientId: string,
	term: string,
	limit: number = 10
) {
	// Escape LIKE wildcards in the search term to prevent unintended pattern matching
	const escapedTerm = term.replace(/[%_\\]/g, '\\$&');
	const pattern = `${escapedTerm}%`;

	const results = await sql<{
		id: string;
		client_id: string;
		resource_type: string;
		resource_id: string;
		linked_resource_type: string | null;
		linked_resource_id: string | null;
		label: string;
		secondary_label: string | null;
		metadata: Record<string, string>;
		url: string;
		updated_at: Date;
	}>`
		SELECT * FROM (
			SELECT * FROM resource_index
			WHERE client_id = ${clientId}
			  AND (label ILIKE ${pattern} OR secondary_label ILIKE ${pattern})
			UNION
			SELECT ri2.* FROM resource_index ri2
			  JOIN resource_index ri1 ON ri1.client_id = ri2.client_id AND ri2.linked_resource_id = ri1.resource_id
			WHERE ri1.client_id = ${clientId}
			  AND ri1.resource_type = 'claim'
			  AND (ri1.label ILIKE ${pattern} OR ri1.secondary_label ILIKE ${pattern})
		) combined
		ORDER BY
			CASE WHEN combined.linked_resource_id IS NULL THEN 0 ELSE 1 END,
			CASE WHEN combined.label ILIKE ${pattern} THEN 0 ELSE 1 END,
			combined.label
		LIMIT ${limit}
	`.execute(db);

	return results.rows;
}

/**
 * Upsert a resource index entry.
 * On conflict (client_id, resource_type, resource_id, COALESCE(linked_resource_id, ...)),
 * updates label, secondary_label, metadata, url, and updated_at.
 *
 * Uses raw SQL because the unique index uses COALESCE which Kysely's onConflict cannot express.
 */
export async function upsertResourceIndex(
	db: Kysely<DB>,
	entry: {
		client_id: string;
		resource_type: string;
		resource_id: string;
		linked_resource_type?: string | null;
		linked_resource_id?: string | null;
		label: string;
		secondary_label?: string | null;
		metadata?: Record<string, string>;
		url: string;
	}
) {
	await sql`
		INSERT INTO resource_index (client_id, resource_type, resource_id, linked_resource_type, linked_resource_id, label, secondary_label, metadata, url, updated_at)
		VALUES (${entry.client_id}, ${entry.resource_type}, ${entry.resource_id}, ${entry.linked_resource_type ?? null}, ${entry.linked_resource_id ?? null}, ${entry.label}, ${entry.secondary_label ?? null}, ${JSON.stringify(entry.metadata ?? {})}::jsonb, ${entry.url}, now())
		ON CONFLICT (client_id, resource_type, resource_id, COALESCE(linked_resource_id, '00000000-0000-0000-0000-000000000000'))
		DO UPDATE SET label = EXCLUDED.label, secondary_label = EXCLUDED.secondary_label, metadata = EXCLUDED.metadata, url = EXCLUDED.url, updated_at = now()
	`.execute(db);
}
