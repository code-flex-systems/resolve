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
import { Checklist } from '@/types/types';
import { useChecklistsStore } from '@/stores/useChecklistsStore';;
import ChecklistMenuItem from './ChecklistMenuItem';
import { Orbit } from 'ldrs/react';
import 'ldrs/react/Orbit.css';
import theme from '@/styles/theme';
import { trpc } from '@/lib/trpc';

export default function ChecklistsSearch({ showIcon = true }: { showIcon?: boolean }) {
	const trpcUtils = trpc.useUtils();
	const selectedChecklist = useChecklistsStore((state) => state.selectedChecklist);
	const [query, setQuery] = useState<string>('');
	const [searching, setSearching] = useState(false);
	const [results, setResults] = useState<Checklist[]>([]);
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>(null);
	const spanRef = useRef<HTMLElement | null>(null);

	const onFocus: TextFieldProps['onFocus'] = () => setAnchorEl(spanRef?.current);
	const onClose = () => setAnchorEl(null);

	const debouncedSearch = useCallback(
		useDebounce(async (query: string) => {
			trpcUtils.checklist.getChecklists
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
			setResults([]);
		}
	};

	const handleClearInput = () => {
		setQuery('');
		setResults([]);
	};

	return (
		<div style={styles.container} className="flex-row-left">
			<ClickAwayListener onClickAway={onClose}>
				<span ref={spanRef}>
					<TextField
						placeholder="Start typing a checklist name..."
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
										<InputAdornment position="end">
											{searching ? (
												<Orbit size="30" speed="1.5" color={theme.palette.primary.main} />
											) : (
												<IconButton size="small" onClick={handleClearInput}>
													<ClearIcon sx={{ fontSize: 17 }} />
												</IconButton>
											)}
										</InputAdornment>
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
									<Typography fontStyle="italic">No checklists found</Typography>
								</MenuItem>
							)}
							<TransitionGroup>
								{!searching &&
									results.length > 0 &&
									results.map((c, i) => (
										<Collapse key={i}>
											<ChecklistMenuItem
												checklist={c}
												onClose={() => {
													onClose();
													setQuery('');
													setResults([]);
												}}
												selected={selectedChecklist?.id === c.id}
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
		width: 'fit-content',
		padding: 5,
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
	textField: {
		width: 300,
		'& .MuiInput-input': {
			fontSize: 17,
		},
	},
};
