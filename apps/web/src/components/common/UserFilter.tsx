'use client';

import { trpc } from '@/lib/trpc';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { useCallback, useState } from 'react';
import { Autocomplete, Paper, PopperProps, TextField } from '@mui/material';
import CustomChip from '@/components/ui/Chip';
import BasicPopper from './BasicPopper';
import { IconUsers } from '@tabler/icons-react';
import useDebounce from '@/lib/utils/useDebounce';
import { StackedRow } from './StackedRow';

export default function UserFilter({
	users,
	setUsers,
	width = 500,
	padding,
	height = 30,
	text = 'Filter by users',
	multi = true,
}: {
	users: GetUserOutput[];
	setUsers: (newRecipients: GetUserOutput[]) => void;
	width?: number | string;
	padding?: string;
	height?: number;
	text?: string;
	multi?: boolean;
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
			<div
				style={{
					width,
					display: 'flex',
					justifyContent: 'flex-start',
					alignItems: 'center',
					padding,
					flexWrap: 'wrap',
					overflow: 'auto',
				}}
			>
				<span
					onClick={(e) => {
						setAnchorEl(e.currentTarget);
						e.preventDefault();
						e.stopPropagation();
					}}
					style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', minWidth: 135, height }}
				>
					<CustomChip color={users.length ? 'info' : 'neutral'} size="sm">
						<IconUsers size={16} style={{ color: users.length ? 'var(--text-accent)' : undefined }} />
						<span style={{ color: users.length ? 'var(--text-accent)' : undefined }}>{users.length ? `Filtering on ${users.length} user${users.length > 1 ? 's' : ''}` : text}</span>
					</CustomChip>
					{!!users.length && (
						<button onClick={(e) => { e.stopPropagation(); setUsers([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14 }}>x</button>
					)}
				</span>
				{users.map((u) => (
					<span key={u.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, margin: '5px 0px', marginLeft: '5px' }}>
						<CustomChip color="info" size="sm">{`${u.first} ${u.last}`}</CustomChip>
						<button onClick={() => { const newUsers = users.filter((s) => s.email !== u.email); setUsers(newUsers); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14 }}>x</button>
					</span>
				))}
			</div>

			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={setAnchorEl} placement="bottom-start">
					<Paper sx={styles.paper}>
						<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 5 }}>
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
								onChange={(_, newValue) =>
									setUsers(multi ? newValue : newValue.length ? [newValue[newValue.length - 1]] : [])
								}
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
											primary={`${option.first} ${option.last}`}
											secondary={option.email}
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
