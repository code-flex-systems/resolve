'use client';

import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import { BASE_COLOR } from '@/styles/theme';
import { Box, Button, Typography } from '@mui/material';
import Edit from '@mui/icons-material/Edit';
import Logout from '@mui/icons-material/Logout';
import { GridRenderCellParams } from '@mui/x-data-grid-pro';
import { useClerkSession } from '@/lib/auth/use-clerk-session';
import { useState } from 'react';
import BasicDialog from '../common/BasicDialog';
import BasicButtonStyled from '../common/BasicButtonStyled';
import UpdateUserDialog from '../home/UpdateUserDialog';

export default function UserActionsCell(params: GridRenderCellParams) {
	const { row } = params;
	const { mutate, isPending } = useUserTrpc().update;
	const { data: session } = useClerkSession();
	const [onOffboarding, setOnOffboarding] = useState(false);
	const [updating, setUpdating] = useState(false);
	return (
		<>
			{onOffboarding && (
				<BasicDialog
					title={`${row.disabled ? 'Onboard' : 'Offboard'} ${row.first} ${row.last}`}
					primaryAction={{
						label: 'Confirm',
						onClick: () => mutate({ id: row.id, params: { disabled: !row.disabled } }),
						color: 'warning',
					}}
					secondaryActions={[
						{
							label: 'Cancel',
							onClick: () => setOnOffboarding(false),
						},
					]}
					onClose={() => setOnOffboarding(false)}
					width={500}
				>
					<Typography fontStyle="italic" fontWeight="bold">
						Are you sure you want to {row.disabled ? 'onboard' : 'offboard'} this user?
					</Typography>
					<Typography paddingTop="10px" fontStyle="italic">
						The user will receive an email informing them that their access to the application has been{' '}
						{row.disabled ? 'reinstated' : 'terminated'}.
					</Typography>
				</BasicDialog>
			)}
			{updating && <UpdateUserDialog user={row} onClose={() => setUpdating(false)} />}

			<div style={styles.container}>
				<BasicButtonStyled
					buttonProps={{
						onClick: () => setUpdating(true),
						disabled: isPending,
					}}
					tooltipProps={{ title: 'Make changes' }}
					icon={<Edit sx={{ fontSize: 15 }} />}
				/>
				{session?.user?.id !== row.id && (
					<Box marginLeft="10px">
						<BasicButtonStyled
							buttonProps={{
								onClick: () => setOnOffboarding(true),
								disabled: isPending,
							}}
							tooltipProps={{ title: row.disabled ? 'Onboard' : 'Offboard' }}
							icon={<Logout sx={{ fontSize: 15, transform: row.disabled ? 'scaleX(-1)' : undefined }} />}
						/>
					</Box>
				)}
			</div>
		</>
	);
}

const styles = {
	container: {
		width: '100%',
		height: '100%',
		display: 'flex',
		justifyContent: 'flex-end',
		alignItems: 'center',
	},
};
