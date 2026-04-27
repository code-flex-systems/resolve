'use client';

import { trpc } from '@/lib/trpc';
import { useCallback, useState } from 'react';
import Combobox, { type ComboboxOption } from '@/components/ui/Combobox';
import useDebounce from '@/lib/utils/useDebounce';
import { StackedRow } from './StackedRow';
import { ClaimSearch } from '@/config/enums';
import { Claim } from '@/hooks/trpc/useClaimTrpc';

export default function ClaimFilter({
	claim,
	setClaim,
}: {
	claim: Claim | null;
	setClaim: (newClaim: Claim | null) => void;
	width?: number | string;
	padding?: string;
	height?: number;
	zIndex?: number;
}) {
	const trpcUtils = trpc.useUtils();
	const [results, setResults] = useState<Claim[]>([]);
	const [searching, setSearching] = useState(false);

	const debouncedSearch = useCallback(
		useDebounce(async (query: string) => {
			trpcUtils.claim.getClaims
				.fetch({ searchTerm: { value: query, type: ClaimSearch.CLAIM_NUMBER } })
				.then((results) => {
					if (Array.isArray(results.rows)) setResults(results.rows);
				})
				.catch((e) => console.error(e))
				.finally(() => setSearching(false));
		}, 500),
		[]
	);

	const options: ComboboxOption[] = results.map((c) => ({
		value: c.id,
		label: c.claim_number ?? '',
		description: c.insured ?? undefined,
	}));

	const selectedOption = claim
		? options.find((o) => o.value === claim.id) ?? { value: claim.id, label: claim.claim_number ?? '', description: claim.insured ?? undefined }
		: null;

	return (
		<Combobox
			options={options}
			value={selectedOption}
			onChange={(opt) => {
				if (!opt) {
					setClaim(null);
				} else {
					const found = results.find((c) => c.id === opt.value);
					setClaim(found ?? null);
				}
			}}
			onInputChange={(value) => {
				if (value) {
					setSearching(true);
					debouncedSearch(value);
				}
			}}
			loading={searching}
			filterDisabled
			placeholder="Search by claim..."
			renderOption={(option) => (
				<StackedRow primary={option.label} secondary={option.description} fontSize={14} />
			)}
		/>
	);
}
