'use client';

import { trpc } from '@/lib/trpc';
import { useCallback, useState } from 'react';
import Combobox, { type ComboboxOption } from '@/components/ui/Combobox';
import CustomChip from '@/components/ui/Chip';
import BasicPopper from './BasicPopper';
import { IconFileSearch } from '@tabler/icons-react';
import useDebounce from '@/lib/utils/useDebounce';
import { StackedRow } from './StackedRow';
import { ClaimSearch } from '@/config/enums';
import { Claim } from '@/hooks/trpc/useClaimTrpc';

export default function ClaimFilter({
	claim,
	setClaim,
	height = 30,
	zIndex,
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
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

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

	// Map Claim objects to ComboboxOption
	const options: ComboboxOption[] = results.map((c) => ({
		value: c.id,
		label: c.claim_number ?? '',
		description: c.insured ?? undefined,
	}));

	// Find selected option
	const selectedOption = claim ? options.find((o) => o.value === claim.id) ?? { value: claim.id, label: claim.claim_number ?? '', description: claim.insured ?? undefined } : null;

	return (
		<>
			<span
				onClick={(e) => {
					setAnchorEl(e.currentTarget);
					e.preventDefault();
					e.stopPropagation();
				}}
				style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', margin: '5px 0px', height }}
			>
				<CustomChip color={claim ? 'info' : 'neutral'} size="sm">
					<IconFileSearch size={16} style={{ color: claim ? 'var(--text-accent)' : undefined }} />
					<span style={{ color: claim ? 'var(--text-accent)' : undefined }}>{claim ? claim.claim_number : 'Filter by claim'}</span>
				</CustomChip>
				{claim && (
					<button onClick={(e) => { e.stopPropagation(); setClaim(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14 }}>x</button>
				)}
			</span>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={setAnchorEl} placement="bottom-start" zIndex={zIndex}>
					<div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: 8, marginTop: 5 }}>
						<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 5, width: 300 }}>
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
								placeholder="Search by claim number"
								renderOption={(option) => (
									<StackedRow
										primary={option.label}
										secondary={option.description}
										fontSize={14}
									/>
								)}
								fullWidth
							/>
						</div>
					</div>
				</BasicPopper>
			)}
		</>
	);
}
