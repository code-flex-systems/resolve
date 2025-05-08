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
import useDebounce from '../../utils/useDebounce';
import * as axiosRoutes from '../../api/axios-routes';
import { Claim, ClaimSearchType } from '../../types';
import BasicSwitch from '../common/BasicSwitch';
import ClaimMenuItem from './ClaimMenuItem';
import { useChecklistsSlice } from '../../state/store';
import { Orbit } from 'ldrs/react';
import 'ldrs/react/Orbit.css';
import theme from '../../styles/theme';

export default function ClaimsSearch() {
	const selectedClaim = useChecklistsSlice((state) => state.selectedClaim);
	const [query, setQuery] = useState<string>('');
	const [type, setType] = useState<ClaimSearchType>('claim_number');
	const [searching, setSearching] = useState(false);
	const [results, setResults] = useState<Claim[]>([]);
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>(null);

	const onFocus: TextFieldProps['onFocus'] = (e) => setAnchorEl(e.currentTarget);
	const onClose = () => setAnchorEl(null);

	const debouncedSearch = useCallback(
		useDebounce(async (query: string) => {
			axiosRoutes
				.getClaims({ type, value: query })
				.then((results) => {
					if (results.data) setResults(results.data);
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
		}
	};

	const handleClearInput = () => {
		setQuery('');
	};

	return (
		<div style={styles.container} className="flex-col-center">
			<ClickAwayListener onClickAway={onClose}>
				<span>
					<TextField
						placeholder={`Start typing a ${type === 'claim_number' ? 'claim number' : 'name'}...`}
						fullWidth
						value={query}
						onChange={handleInputChange}
						onFocus={onFocus}
						sx={styles.textField}
						slotProps={{
							input: {
								startAdornment: (
									<InputAdornment position="start">
										<SearchIcon />
									</InputAdornment>
								),
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
						placement="bottom-start"
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
												showDiv={i < results.length}
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
					checked={type === 'insured'}
					onChange={(e, value) => {
						e.stopPropagation();
						e.preventDefault();
						setType(value ? 'insured' : 'claim_number');
						handleClearInput();
						setResults([]);
					}}
				/>
				<Typography fontSize={13} fontWeight={type === 'insured' ? 'bold' : undefined} marginLeft="10px">
					Search by insured
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
		transform: 'translate(-26px, 0px)',
		borderBottomLeftRadius: 2,
		borderBottomRightRadius: 2,
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
