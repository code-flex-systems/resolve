'use client';

import { trpc } from '@/lib/trpc';
import BasicAutocomplete from './BasicAutocomplete';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { useState } from 'react';
import { Box, Chip, Paper, PopperProps } from '@mui/material';
import BasicPopper from './BasicPopper';
import { BASE_COLOR } from '@/styles/theme';
import { Add, People, Person } from '@mui/icons-material';
import BasicButton from './BasicButton';

export default function UserFilter({
	users,
	setUsers,
	width = 500,
	padding,
}: {
	users: GetUserOutput[];
	setUsers: (newRecipients: GetUserOutput[]) => void;
	width?: number | string;
	padding?: string;
}) {
	const trpcUtils = trpc.useUtils();
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>();
	const [selectedUsers, setSelectedUsers] = useState<GetUserOutput[]>(users);

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
					label={users.length ? `Filtering on (${users.length}) users` : 'Select users'}
					icon={<People />}
					onClick={(e) => {
						setAnchorEl(e.currentTarget);
						e.preventDefault();
						e.stopPropagation();
					}}
					onDelete={users.length ? () => setUsers([]) : undefined}
					sx={{
						...styles.chip,
						'& .MuiChip-icon': {
							color: BASE_COLOR,
						},
						'& .MuiChip-label': {
							color: BASE_COLOR,
							fontStyle: 'italic',
						},
					}}
				/>
				{users.map((u) => (
					<Chip
						label={`${u.last}, ${u.first}`}
						icon={<Person />}
						color="success"
						onDelete={() => {
							const newUsers = users.filter((s) => s.email !== u.email);
							setUsers(newUsers);
							setSelectedUsers(newUsers);
						}}
						sx={styles.chip}
					/>
				))}
			</Box>

			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={setAnchorEl} placement="bottom-start">
					<Paper sx={styles.paper}>
						<Box display="flex" justifyContent="center" alignItems="center" padding="5px">
							<BasicAutocomplete
								currentSelected={selectedUsers}
								entity="users"
								onSearch={trpcUtils.user.getUsers.fetch}
								onSelect={(newSelection) =>
									setSelectedUsers(
										newSelection.map((s) =>
											typeof s === 'string' ? { email: s, first: '', last: '' } : s
										)
									)
								}
								placeholder="Search by name..."
								renderOption={(result) =>
									typeof result === 'string'
										? result
										: `${result.first} ${result.last} <${result.email}>`
								}
								renderOptionLabel={(result) => (typeof result === 'string' ? result : result.email)}
								renderSelection={(result) =>
									typeof result === 'string' ? result : `${result.last}, ${result.first}`
								}
								variant="standard"
								freeSolo={false}
								width={225}
							/>
							<BasicButton
								buttonProps={{
									onClick: () => {
										setUsers(selectedUsers);
										setAnchorEl(null);
									},
									variant: 'contained',
									sx: { width: 30, height: 30, marginLeft: '10px' },
								}}
								icon={<Add />}
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
		margin: '5px',
	},
	paper: {
		outline: 1,
		outlineColor: 'divider',
		marginTop: '5px',
	},
};
