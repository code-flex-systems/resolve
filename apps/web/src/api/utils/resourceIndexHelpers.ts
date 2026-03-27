import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { upsertResourceIndex } from '@/api/queries/resourceIndexQueries';

/** Build resource index entry for a claim (fire-and-forget, returns promise for optional batching) */
export async function indexClaim(
	db: Kysely<DB>,
	claim: { id: string; client_id: string; claim_number: string | null; insured: string | null; claim_amount: any; recovery_status: string | null }
) {
	return upsertResourceIndex(db, {
		client_id: claim.client_id,
		resource_type: 'claim',
		resource_id: claim.id,
		label: claim.claim_number ?? 'Unknown',
		secondary_label: claim.insured ?? null,
		metadata: {
			'Insured': claim.insured ?? 'N/A',
			'Amount': claim.claim_amount ? `$${claim.claim_amount}` : 'N/A',
			'Status': claim.recovery_status ?? 'N/A',
		},
		url: `/admin/claims?selected=${claim.id}`,
	}).catch((err: any) => console.error('[resource-index] Failed to index claim:', err));
}

/** Build resource index entry for a party (fire-and-forget, returns promise for optional batching) */
export async function indexParty(
	db: Kysely<DB>,
	clientId: string,
	party: { id: string; name: string | null; is_business: boolean }
) {
	return upsertResourceIndex(db, {
		client_id: clientId,
		resource_type: 'party',
		resource_id: party.id,
		label: party.name ?? '',
		secondary_label: null,
		metadata: {
			'Type': party.is_business ? 'Business' : 'Individual',
		},
		url: `/admin/party-management/parties?selected=${party.id}`,
	}).catch((err: any) => console.error('[resource-index] Failed to index party:', err));
}
