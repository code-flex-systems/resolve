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
import { Checklist } from '../../types';
import { useChecklistsSlice } from '../../state/store';
import * as actions from '../../state/checklists/actions';
import { CheckCircle } from '@mui/icons-material';
import ChecklistMenuItem from './ChecklistMenuItem';

export default function ChecklistsSearch() {
	const selectedChecklist = useChecklistsSlice((state) => state.selectedChecklist);
	const [query, setQuery] = useState<string>('');
	const [searching, setSearching] = useState(false);
	const [results, setResults] = useState<Checklist[]>([]);
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>(null);

	const onFocus: TextFieldProps['onFocus'] = (e) => setAnchorEl(e.currentTarget);
	const onClose = () => setAnchorEl(null);

	const debouncedSearch = useCallback(
		useDebounce(async (query: string) => {
			axiosRoutes
				.getChecklists(query)
				.then((results) => {
					if (results.data) setResults(results.data);
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
		}
	};

	const handleClearInput = () => {
		setQuery('');
	};

	return (
		<div style={styles.container} className="flex-row-left">
			<ClickAwayListener onClickAway={onClose}>
				<span>
					<TextField
						placeholder="Start typing a checklist name..."
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
										<IconButton onClick={handleClearInput}>
											<ClearIcon />
										</IconButton>
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
											<ChecklistMenuItem
												checklist={c}
												onClose={() => {
													onClose();
													setQuery('');
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
		transform: 'translate(-25px, 5px)',
	},
	textField: {
		width: 300,
		'& .MuiInput-input': {
			fontSize: 17,
		},
	},
};
