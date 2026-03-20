'use client';

import { trpc } from '@/lib/trpc';
import { useCallback, useState } from 'react';
import { Autocomplete, Chip, Paper, PopperProps, TextField } from '@mui/material';
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
			<Chip
				label={claim ? claim.claim_number : 'Filter by claim'}
				icon={<IconFileSearch size={20} />}
				onClick={(e) => {
					setAnchorEl(e.currentTarget);
					e.preventDefault();
					e.stopPropagation();
				}}
				onDelete={claim ? () => setClaim(null) : undefined}
				sx={{
					...styles.chip,
					height,
					'& .MuiChip-icon': {
						color: claim ? 'var(--text-accent)' : undefined,
					},
					'& .MuiChip-label': {
						color: claim ? 'var(--text-accent)' : undefined,
					},
				}}
			/>
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
