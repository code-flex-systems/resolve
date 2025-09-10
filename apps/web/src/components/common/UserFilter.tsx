'use client';

import { trpc } from '@/lib/trpc';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { useCallback, useState } from 'react';
import { Autocomplete, Box, Chip, Paper, PopperProps, TextField } from '@mui/material';
import BasicPopper from './BasicPopper';
import theme from '@/styles/theme';
import { People } from '@mui/icons-material';
import useDebounce from '@/lib/utils/useDebounce';
import { StackedRow } from './StackedRow';

export default function UserFilter({
	users,
	setUsers,
	width = 500,
	padding,
	height = 30,
}: {
	users: GetUserOutput[];
	setUsers: (newRecipients: GetUserOutput[]) => void;
	width?: number | string;
	padding?: string;
	height?: number;
}) {
	const trpcUtils = trpc.useUtils();
	const [results, setResults] = useState<GetUserOutput[]>([]);
	const [searching, setSearching] = useState(false);
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>();

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

	return (
		<>
			<Box
				width={width}
				display="flex"
				justifyContent="flex-start"
				alignItems="center"
				padding={padding}
				flexWrap="wrap"
				overflow="auto"
			>
				<Chip
					label={
						users.length
							? `Filtering on ${users.length} user${users.length > 1 ? 's' : ''}`
							: 'Filter by users'
					}
					icon={<People />}
					onClick={(e) => {
						setAnchorEl(e.currentTarget);
						e.preventDefault();
						e.stopPropagation();
					}}
					onDelete={users.length ? () => setUsers([]) : undefined}
					sx={{
						height,
						'& .MuiChip-icon': {
							color: users.length ? theme.palette.primary.main : undefined,
						},
						'& .MuiChip-label': {
							color: users.length ? theme.palette.primary.main : undefined,
						},
					}}
				/>
				{users.map((u) => (
					<Chip
						key={u.id}
						label={`${u.last}, ${u.first}`}
						onDelete={() => {
							const newUsers = users.filter((s) => s.email !== u.email);
							setUsers(newUsers);
						}}
						sx={{
							...styles.chip,
							marginLeft: '5px',
							height,
							'& .MuiChip-label': {
								color: theme.palette.primary.main,
							},
						}}
					/>
				))}
			</Box>

			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={setAnchorEl} placement="bottom-start">
					<Paper sx={styles.paper}>
						<Box display="flex" justifyContent="center" alignItems="center" padding="5px">
							<Autocomplete
								multiple
								value={users}
								options={results}
								getOptionLabel={(option) => option.last}
								loading={searching}
								filterOptions={(x) => x}
								onInputChange={(_, value) => {
									if (value) {
										setSearching(true);
										debouncedSearch(value);
									}
								}}
								onChange={(_, newValue) => setUsers(newValue)}
								renderInput={(params) => (
									<TextField
										{...params}
										variant="outlined"
										placeholder="Search by name"
										type="text"
										style={styles.textField}
										sx={styles.textFieldOverrides}
									/>
								)}
								renderTags={() => <></>}
								renderOption={(props, option) => (
									<li {...props} key={option.id}>
										<StackedRow
											primary={`${option.last}, ${option.first}`}
											secondary={option.email}
										/>
									</li>
								)}
								sx={{
									width: 300,
									...styles.textFieldOverrides,
								}}
							/>
						</Box>
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
		outline: 1,
		outlineColor: 'divider',
		marginTop: '5px',
	},
	textField: {
		border: 'none',
		outline: 'none',
		padding: '2px 5px',
	},
	textFieldOverrides: {
		'& .MuiInputBase-root': {
			borderRadius: 8,
			padding: '0px 10px',
		},
		'& .MuiOutlinedInput-input': {
			fontSize: 13,
		},
	},
};
