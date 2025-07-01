import config from '@/config/config';
import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import { BASE_COLOR } from '@/styles/theme';
import { Button, Typography } from '@mui/material';
import { GridRenderCellParams } from '@mui/x-data-grid';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import BasicDialog from '../common/BasicDialog';

export default function UserActionsCell(params: GridRenderCellParams) {
	const { row } = params;
	const { mutate, isPending } = useUserTrpc().update;
	const { data: session } = useSession();
	const [updating, setUpdating] = useState(false);
	return (
		<>
			{updating && (
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
							onClick: () => setUpdating(false),
						},
					]}
					onClose={() => setUpdating(false)}
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
			{session?.user?.email === row.email ? (
				<></>
			) : (
				<div style={{ width: '100%', height: '100%' }} className="flex-row-center">
					<Button
						onClick={() => setUpdating(true)}
						sx={{ bgcolor: BASE_COLOR, height: 25 }}
						variant="contained"
						disabled={isPending}
					>
						{row.disabled ? 'Onboard' : 'Offboard'}
					</Button>
				</div>
			)}
		</>
	);
}
