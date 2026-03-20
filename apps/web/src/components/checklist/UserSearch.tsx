'use client';
import React, { useState, useRef } from 'react';
import {
	TextField,
	IconButton,
	MenuItem,
	Popper,
	InputAdornment,
	PopperProps,
	TextFieldProps,
	ClickAwayListener,
	Typography,
	Paper, Collapse } from '@mui/material';
import { TransitionGroup } from 'react-transition-group';
import useDebounce from '@/lib/utils/useDebounce';
import { Orbit } from 'ldrs/react';
import 'ldrs/react/Orbit.css';
import { trpc } from '@/lib/trpc';
import { StackedRow } from '../common/StackedRow';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { IconSearch, IconX } from '@tabler/icons-react';

export default function UserSearch({
	selectedUser,
	setSelectedUser,
	disabled = false,
	fontSize = 15,
}: {
	selectedUser: GetUserOutput | null;
	setSelectedUser: (newUser: GetUserOutput | null) => void;
	disabled?: boolean;
	fontSize?: number;
}) {
	const trpcUtils = trpc.useUtils();
	const [query, setQuery] = useState<string>('');
	const [searching, setSearching] = useState(false);
	const [results, setResults] = useState<GetUserOutput[]>([]);
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>(null);
	const spanRef = useRef<HTMLElement | null>(null);

	const onFocus: TextFieldProps['onFocus'] = () => setAnchorEl(spanRef?.current);
	const onClose = () => setAnchorEl(null);

	const debouncedSearch = useDebounce(async (query: string) => {
		trpcUtils.user.getUsers
			.fetch({ searchTerm: query })
			.then((results) => {
				if (Array.isArray(results)) setResults(results);
			})
			.catch((e) => console.error(e))
			.finally(() => setSearching(false));
	}, 500);

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
						sx={{
							...styles.textField,
							'& .MuiOutlinedInput-input': {
								padding: '5px',
								fontSize,
							},
						}}
						slotProps={{
							input: {
								startAdornment: (
									<InputAdornment position="start">
										<IconSearch style={{ fontSize: fontSize + 2 }} />
									</InputAdornment>
								),
								endAdornment: query && (
									<InputAdornment position="end">
										{searching ? (
											<Orbit size="30" speed="1.5" color={'var(--text-accent)'} />
										) : (
											<IconButton size="small" onClick={handleClearInput}>
												<IconX style={{ fontSize: fontSize + 2 }} />
											</IconButton>
										)}
									</InputAdornment>
								),
							},
						}}
						autoComplete="off"
						variant="outlined"
						disabled={disabled}
					/>

					<Popper open={Boolean(anchorEl)} sx={{ zIndex: 100000 }} anchorEl={anchorEl} placement="bottom">
						<Paper sx={styles.popper}>
							{searching && (
								<MenuItem key="searching" disabled style={styles.menuItem}>
									<Typography fontSize={fontSize} fontStyle="italic">
										Searching...
									</Typography>
								</MenuItem>
							)}
							{!searching && results.length === 0 && (
								<MenuItem key="no-results" disabled style={styles.menuItem}>
									<Typography fontSize={fontSize} fontStyle="italic">
										No users found
									</Typography>
								</MenuItem>
							)}
							<TransitionGroup>
								{!searching &&
									results.length > 0 &&
									results.map((u, i) => (
										<Collapse key={i}>
											<MenuItem
												onClick={() => {
													setSelectedUser(u);
													onClose();
												}}
												selected={selectedUser?.email === u.email}
											>
												<StackedRow
													primary={`${u.first} ${u.last}`}
													secondary={u.email}
													fontSize={fontSize}
												/>
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
		mt: 0.625,
	},
	textField: {
		width: 300,
	},
};
