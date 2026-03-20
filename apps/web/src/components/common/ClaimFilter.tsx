'use client';

import { trpc } from '@/lib/trpc';
import { useCallback, useState } from 'react';
import { Autocomplete, Paper, PopperProps, TextField } from '@mui/material';
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
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>();

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
					<Paper sx={styles.paper}>
						<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 5 }}>
							<Autocomplete
								value={claim}
								options={results}
								getOptionLabel={(option) => option.claim_number ?? ''}
								loading={searching}
								filterOptions={(x) => x}
								onInputChange={(_, value) => {
									if (value) {
										setSearching(true);
										debouncedSearch(value);
									}
								}}
								onChange={(_, newValue) => setClaim(newValue)}
								renderInput={(params) => (
									<TextField
										{...params}
										variant="outlined"
										placeholder="Search by claim number"
										type="text"
										style={styles.textField}
										sx={styles.textFieldOverrides}
									/>
								)}
								renderTags={() => <></>}
								renderOption={(props, option) => (
									<li {...props} key={option.id}>
										<StackedRow
											primary={option.claim_number}
											secondary={option.insured}
											fontSize={14}
										/>
									</li>
								)}
								sx={{
									width: 300,
									...styles.textFieldOverrides,
								}}
							/>
						</div>
					</Paper>
				</BasicPopper>
			)}
		</>
	);
}

const styles = {
	chip: {
		margin: '5px 0px',
	},
	paper: {
		mt: 0.625,
	},
	textField: {
		border: 'none',
		outline: 'none',
		padding: '2px 5px',
	},
	textFieldOverrides: {
		'& .MuiInputBase-root': {
			padding: '0px 10px',
		},
		'& .MuiOutlinedInput-input': {
			fontSize: 13,
		},
	},
};
