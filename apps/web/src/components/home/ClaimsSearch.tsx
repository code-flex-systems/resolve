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
	Box,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import { TransitionGroup } from 'react-transition-group';
import useDebounce from '@/lib/utils/useDebounce';
import { Claim } from '@/types/types';
import { ClaimSearch } from '@/config/enums';
import ClaimMenuItem from './ClaimMenuItem';
import { useChecklistsStore } from '@/stores/useChecklistsStore';
import { Orbit } from 'ldrs/react';
import 'ldrs/react/Orbit.css';
import theme from '@/styles/theme';
import { trpc } from '@/lib/trpc';
import BasicButtonStyled from '../common/BasicButtonStyled';

interface ClaimsSearchProps {
	showIcon?: boolean;
	heroMode?: boolean;
	onClaimSelect?: (claimId: number) => void;
}

export default function ClaimsSearch({ showIcon = true, heroMode = false, onClaimSelect }: ClaimsSearchProps) {
	const trpcUtils = trpc.useUtils();
	const selectedClaim = useChecklistsStore((state) => state.selectedClaim);
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
				.fetch({ searchTerm: { type, value: query }, limit: 50 })
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
			setResults([]);
		}
	};

	const handleClearInput = () => {
		setQuery('');
		setResults([]);
	};

	const handleSwitchSearch = () => {
		setType(type === ClaimSearch.CLAIM_NUMBER ? ClaimSearch.INSURED : ClaimSearch.CLAIM_NUMBER);
		handleClearInput();
		setResults([]);
	};

	return (
		<div style={styles.container} className="flex-col-center">
			<ClickAwayListener onClickAway={onClose}>
				<span ref={spanRef} style={{ width: '100%' }}>
					<TextField
						placeholder={`Start typing a ${type === 'claim_number' ? 'claim number' : 'name'}...`}
						fullWidth
						value={query}
						onChange={handleInputChange}
						onFocus={onFocus}
						sx={heroMode ? styles.textFieldHero : styles.textField}
						slotProps={{
							input: {
								startAdornment: showIcon ? (
									<InputAdornment position="start">
										<SearchIcon />
									</InputAdornment>
								) : undefined,
								endAdornment: (
									<InputAdornment position="end">
										{searching ? (
											<Orbit size="30" speed="1.5" color={theme.palette.primary.main} />
										) : query ? (
											<IconButton size="small" onClick={handleClearInput}>
												<ClearIcon sx={{ fontSize: 15 }} />
											</IconButton>
										) : (
											<BasicButtonStyled
												buttonProps={{
													onClick: handleSwitchSearch,
												}}
												tooltipProps={{
													title:
														type === ClaimSearch.CLAIM_NUMBER
															? 'Search by insured'
															: 'Search by claim number',
												}}
												icon={
													type === ClaimSearch.CLAIM_NUMBER ? (
														<PersonSearchIcon />
													) : (
														<SearchIcon />
													)
												}
											/>
										)}
									</InputAdornment>
								),
							},
						}}
						variant="outlined"
						autoComplete="off"
					/>

					<Popper
						open={Boolean(anchorEl)}
						sx={{ zIndex: 100, width: spanRef.current?.offsetWidth || 'auto' }}
						anchorEl={anchorEl}
						placement="bottom-start"
						disablePortal
					>
						<Paper elevation={3} sx={styles.popper}>
							{searching && (
								<Box sx={styles.emptyState}>
									<Typography fontStyle="italic" color="text.secondary">
										Searching...
									</Typography>
								</Box>
							)}
							{!searching && results.length === 0 && !selectedClaim && (
								<Box sx={styles.emptyState}>
									<Typography fontStyle="italic" color="text.secondary">
										No claims found
									</Typography>
								</Box>
							)}
							{!searching && results.length === 0 && !!selectedClaim && (
								<ClaimMenuItem
									claim={selectedClaim}
									onClose={() => {
										onClose();
										setQuery('');
										setResults([]);
									}}
									onSelect={onClaimSelect}
									selected={true}
								/>
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
													setResults([]);
												}}
												onSelect={onClaimSelect}
												selected={selectedClaim?.id === c.id}
											/>
										</Collapse>
									))}
							</TransitionGroup>
						</Paper>
					</Popper>
				</span>
			</ClickAwayListener>
		</div>
	);
}

const styles = {
	container: {
		width: '100%',
	},
	emptyState: {
		minHeight: 80,
		padding: '16px',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
	},
	popper: {
		maxHeight: 400,
		overflowY: 'auto' as const,
		width: '100%',
		borderRadius: 2,
		marginTop: 1,
	},
	switch: {
		width: '100%',
		padding: '10px 0px 0px',
	},
	textField: {
		width: '100%',
		'& .MuiInput-input': {
			fontSize: 15,
		},
		'& .MuiOutlinedInput-root': {
			borderRadius: 2,
		},
	},
	textFieldHero: {
		width: '100%',
		'& .MuiInput-input': {
			fontSize: 18,
		},
		'& .MuiOutlinedInput-root': {
			borderRadius: 3,
			height: 64,
			fontSize: 18,
		},
	},
};
