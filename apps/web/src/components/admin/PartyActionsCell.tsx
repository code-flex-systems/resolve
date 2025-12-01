'use client';

import Edit from '@mui/icons-material/Edit';
import Archive from '@mui/icons-material/Archive';
import Unarchive from '@mui/icons-material/Unarchive';
import { GridRenderCellParams } from '@mui/x-data-grid-pro';
import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import BasicButtonStyled from '../common/BasicButtonStyled';
import BasicDialog from '../common/BasicDialog';
import PartyDialog from './PartyDialog';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { useAlertStore } from '@/stores/useAlertStore';
import theme from '@/styles/theme';

export default function PartyActionsCell(params: GridRenderCellParams) {
	const { row } = params;
	const [editing, setEditing] = useState(false);
	const [showActionConfirm, setShowActionConfirm] = useState(false);
	const showAlert = useAlertStore((state) => state.showAlert);
	const partyTrpc = usePartyTrpc();
	const { mutateAsync: archiveParty, isPending: archiving } = partyTrpc.archive;
	const { mutateAsync: restoreParty, isPending: restoring } = partyTrpc.restore;

	const isArchived = !!row.deleted_at;
	const isPending = archiving || restoring;

	const handleAction = async () => {
		try {
			if (isArchived) {
				await restoreParty({ id: row.id as unknown as number });
				showAlert('Party restored successfully', 'success');
			} else {
				await archiveParty({ id: row.id as unknown as number });
				showAlert('Party archived successfully', 'success');
			}
			setShowActionConfirm(false);
		} catch (error: any) {
			const message = error?.message || `Failed to ${isArchived ? 'restore' : 'archive'} party`;
			showAlert(message, 'error');
			setShowActionConfirm(false);
		}
	};

	return (
		<>
			{editing && <PartyDialog party={row} onClose={() => setEditing(false)} />}

			{showActionConfirm && (
				<BasicDialog
					title={`${isArchived ? 'Restore' : 'Archive'} ${row.name}`}
					primaryAction={{
						label: 'Confirm',
						onClick: handleAction,
						color: isArchived ? 'success' : 'error',
					}}
					secondaryActions={[
						{
							label: 'Cancel',
							onClick: () => setShowActionConfirm(false),
						},
					]}
					onClose={() => setShowActionConfirm(false)}
					width={500}
				>
					<Typography fontStyle="italic" fontWeight="bold">
						Are you sure you want to {isArchived ? 'restore' : 'archive'} this party?
					</Typography>
					<Typography paddingTop="10px" fontStyle="italic">
						{isArchived
							? 'The party and all associated offices and representatives will be restored.'
							: 'The party and all associated offices and representatives will be archived.'}
					</Typography>
				</BasicDialog>
			)}

			<div style={styles.container}>
				<Box marginRight="10px">
					<BasicButtonStyled
						buttonProps={{
							onClick: () => setEditing(true),
							disabled: isArchived,
						}}
						tooltipProps={{ title: isArchived ? 'Cannot edit archived party' : 'Make changes' }}
						icon={<Edit sx={{ fontSize: 15 }} />}
					/>
				</Box>
				<BasicButtonStyled
					buttonProps={{
						onClick: () => setShowActionConfirm(true),
						disabled: isPending,
					}}
					tooltipProps={{ title: isArchived ? 'Restore party' : 'Archive party' }}
					icon={
						isArchived ? (
							<Unarchive sx={{ fontSize: 15, color: theme.palette.success.main }} />
						) : (
							<Archive sx={{ fontSize: 15, color: theme.palette.error.main }} />
						)
					}
				/>
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
