'use client';

import Edit from '@mui/icons-material/Edit';
import Archive from '@mui/icons-material/Archive';
import Unarchive from '@mui/icons-material/Unarchive';
import { GridRenderCellParams } from '@mui/x-data-grid-pro';
import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import BasicButtonStyled from '../common/BasicButtonStyled';
import BasicDialog from '../common/BasicDialog';
import DeskLocationDialog from './DeskLocationDialog';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import { useAlertStore } from '@/stores/useAlertStore';
import theme from '@/styles/theme';

interface DeskLocationActionsCellProps extends GridRenderCellParams {
	isManageMode?: boolean;
}

export default function DeskLocationActionsCell(params: DeskLocationActionsCellProps) {
	const { isManageMode = true } = params;
	if (!isManageMode) return null;
	const { row } = params;
	const [editing, setEditing] = useState(false);
	const [showActionConfirm, setShowActionConfirm] = useState(false);
	const showAlert = useAlertStore((state) => state.showAlert);
	const deskTrpc = useDeskTrpc();
	const { mutateAsync: archiveLocation, isPending: archiving } = deskTrpc.archiveLocation;
	const { mutateAsync: restoreLocation, isPending: restoring } = deskTrpc.restoreLocation;

	const isArchived = !!row.deleted_at;
	const isPending = archiving || restoring;

	const handleAction = async () => {
		try {
			if (isArchived) {
				await restoreLocation({ id: row.id as unknown as number });
				showAlert('Desk location restored successfully', 'success');
			} else {
				await archiveLocation({ id: row.id as unknown as number });
				showAlert('Desk location archived successfully', 'success');
			}
			setShowActionConfirm(false);
		} catch (error: any) {
			const message = error?.message || `Failed to ${isArchived ? 'restore' : 'archive'} desk location`;
			showAlert(message, 'error');
			setShowActionConfirm(false);
		}
	};

	return (
		<>
			{editing && <DeskLocationDialog deskLocation={row} onClose={() => setEditing(false)} />}

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
						Are you sure you want to {isArchived ? 'restore' : 'archive'} this desk location?
					</Typography>
					<Typography paddingTop="10px" fontStyle="italic">
						{isArchived
							? 'The desk location will be restored and become available for use.'
							: 'This desk location cannot be archived if it has assigned claims.'}
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
						tooltipProps={{ title: isArchived ? 'Cannot edit archived desk location' : 'Make changes' }}
						icon={<Edit sx={{ fontSize: 15 }} />}
					/>
				</Box>
				<BasicButtonStyled
					buttonProps={{
						onClick: () => setShowActionConfirm(true),
						disabled: isPending,
					}}
					tooltipProps={{ title: isArchived ? 'Restore desk location' : 'Archive desk location' }}
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
