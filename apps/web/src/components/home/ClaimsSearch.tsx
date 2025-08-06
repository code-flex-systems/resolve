'use client';
import React, { useState, useCallback, useRef } from 'react';
import {
	TextField,
	IconButton,
	MenuItem,
	Popper,
	InputAdornment,
	Collapse,
	PopperProps,
	TextFieldProps,
	ClickAwayListener,
	Typography,
	Paper,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { TransitionGroup } from 'react-transition-group';
import useDebounce from '@/lib/utils/useDebounce';
import { Claim } from '@/types/types';
import { ClaimSearch } from '@/config/enums';
import BasicSwitch from '../common/BasicSwitch';
import ClaimMenuItem from './ClaimMenuItem';
import { useChecklistsSlice } from '@/state/store';
import { Orbit } from 'ldrs/react';
import 'ldrs/react/Orbit.css';
import theme from '@/styles/theme';
import { trpc } from '@/lib/trpc';

export default function ClaimsSearch({ showIcon = true }: { showIcon?: boolean }) {
	const trpcUtils = trpc.useUtils();
	const selectedClaim = useChecklistsSlice((state) => state.selectedClaim);
	const [query, setQuery] = useState<string>('');
	const [type, setType] = useState<ClaimSearch>(ClaimSearch.CLAIM_NUMBER);
	const [searching, setSearching] = useState(false);
	const [results, setResults] = useState<Claim[]>([]);
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>(null);
	const spanRef = useRef<HTMLElement | null>(null);

	const onFocus: TextFieldProps['onFocus'] = () => setAnchorEl(spanRef?.current);
	const onClose = () => setAnchorEl(null);

	const debouncedSearch = useCallback(
		useDebounce(async (query: string) => {
			trpcUtils.claim.getClaims
				.fetch({ searchTerm: { type, value: query } })
				.then((results) => {
					if (Array.isArray(results.rows)) setResults(results.rows);
				})
				.catch((e) => console.error(e))
				.finally(() => setSearching(false));
		}, 500),
		[type]
	);

	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const { value } = event.target;
		setQuery(value);

		if (value) {
			setSearching(true);
			debouncedSearch(value);
		} else {
			onClose();
		}
	};

	const handleClearInput = () => {
		setQuery('');
	};

	return (
		<div style={styles.container} className="flex-col-center">
			<ClickAwayListener onClickAway={onClose}>
				<span ref={spanRef}>
					<TextField
						placeholder={`Start typing a ${type === 'claim_number' ? 'claim number' : 'name'}...`}
						fullWidth
						value={query}
						onChange={handleInputChange}
						onFocus={onFocus}
						sx={styles.textField}
						slotProps={{
							input: {
								startAdornment: showIcon ? (
									<InputAdornment position="start">
										<SearchIcon />
									</InputAdornment>
								) : undefined,
								endAdornment: query && (
									<InputAdornment position="end">
										{searching ? (
											<Orbit size="30" speed="1.5" color={theme.palette.primary.main} />
										) : (
											<IconButton size="small" onClick={handleClearInput}>
												<ClearIcon sx={{ fontSize: 17 }} />
											</IconButton>
										)}
									</InputAdornment>
								),
							},
						}}
						autoComplete="off"
					/>

					<Popper
						open={Boolean(anchorEl)}
						sx={{ zIndex: 100 }}
						anchorEl={anchorEl}
						placement="bottom"
						disablePortal
					>
						<Paper style={styles.popper}>
							{searching && (
								<MenuItem key="searching" disabled style={styles.menuItem}>
									<Typography fontStyle="italic">Searching...</Typography>
								</MenuItem>
							)}
							{!searching && results.length === 0 && (
								<MenuItem key="no-results" disabled style={styles.menuItem}>
									<Typography fontStyle="italic">No claims found</Typography>
								</MenuItem>
							)}
							<TransitionGroup>
								{!searching &&
									results.length > 0 &&
									results.map((c, i) => (
										<Collapse key={i}>
											<ClaimMenuItem
												claim={c}
												onClose={() => {
													onClose();
													setQuery('');
												}}
												selected={selectedClaim?.id === c.id}
											/>
										</Collapse>
									))}
							</TransitionGroup>
						</Paper>
					</Popper>
				</span>
			</ClickAwayListener>

			<div style={styles.switch} className="flex-row-left">
				<BasicSwitch
					checked={type === ClaimSearch.INSURED}
					onChange={(e, value) => {
						e.stopPropagation();
						e.preventDefault();
						setType(value ? ClaimSearch.INSURED : ClaimSearch.CLAIM_NUMBER);
						handleClearInput();
						setResults([]);
					}}
				/>
				<Typography fontSize={13} fontWeight={type === 'insured' ? 'bold' : undefined} marginLeft="10px">
					Search by Insured
				</Typography>
			</div>
		</div>
	);
}

const styles = {
	container: {
		width: 'fit-content',
		padding: 10,
	},
	horizontalDiv: {
		height: 1,
		width: '100%',
	},
	icon: {
		marginRight: '5px',
	},
	menuItem: {
		width: 300,
	},
	popper: {
		maxHeight: 300,
		overflowY: 'auto' as const,
		width: '100%',
		outline: '1px solid #E0E0E0',
		borderBottomLeftRadius: 2,
		borderBottomRightRadius: 2,
		marginTop: 2,
	},
	switch: {
		width: '100%',
		padding: '10px 0px 0px',
	},
	textField: {
		width: 300,
		'& .MuiInput-input': {
			fontSize: 17,
		},
	},
};
