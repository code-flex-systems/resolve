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
import { useChecklistSlice } from '@/state/store';
import { Orbit } from 'ldrs/react';
import 'ldrs/react/Orbit.css';
import theme from '@/styles/theme';
import { trpc } from '@/lib/trpc';
import { StackedRow } from '../common/StackedRow';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { updateSelectedAssignee } from '@/state/checklist/actions';

export default function UserSearch() {
	const trpcUtils = trpc.useUtils();
	const selectedAssignee = useChecklistSlice((state) => state.selectedAssignee);
	const [query, setQuery] = useState<string>('');
	const [searching, setSearching] = useState(false);
	const [results, setResults] = useState<GetUserOutput[]>([]);
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>(null);
	const spanRef = useRef<HTMLElement | null>(null);

	const onFocus: TextFieldProps['onFocus'] = () => setAnchorEl(spanRef?.current);
	const onClose = () => setAnchorEl(null);

	const debouncedSearch = useCallback(
		useDebounce(async (query: string) => {
			trpcUtils.user.getUsers
				.fetch({ searchTerm: query })
				.then((results) => {
					if (Array.isArray(results)) setResults(results);
				})
				.catch((e) => console.error(e))
				.finally(() => setSearching(false));
		}, 500),
		[]
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
						placeholder="Start typing a user's name..."
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
						variant="outlined"
					/>

					<Popper
						open={Boolean(anchorEl)}
						sx={{ zIndex: 100000 }}
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
									<Typography fontStyle="italic">No users found</Typography>
								</MenuItem>
							)}
							<TransitionGroup>
								{!searching &&
									results.length > 0 &&
									results.map((u, i) => (
										<Collapse key={i}>
											<MenuItem
												onClick={() => {
													updateSelectedAssignee(u);
													onClose();
												}}
												selected={selectedAssignee?.email === u.email}
											>
												<StackedRow primary={`${u.last}, ${u.first}`} secondary={u.email} />
											</MenuItem>
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
		width: 'fit-content',
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
		width: 300,
		outline: '1px solid #E0E0E0',
		borderBottomLeftRadius: 2,
		borderBottomRightRadius: 2,
		marginTop: 2,
	},
	textField: {
		width: 300,
		'& .MuiInput-input': {
			fontSize: 15,
		},
		'& .MuiOutlinedInput-root': {
			borderRadius: 4,
		},
		'& .MuiOutlinedInput-input': {
			padding: '5px',
		},
	},
};
