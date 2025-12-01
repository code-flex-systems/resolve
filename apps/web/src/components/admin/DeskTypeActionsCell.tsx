'use client';

import Edit from '@mui/icons-material/Edit';
import Archive from '@mui/icons-material/Archive';
import Unarchive from '@mui/icons-material/Unarchive';
import { GridRenderCellParams } from '@mui/x-data-grid-pro';
import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import BasicButtonStyled from '../common/BasicButtonStyled';
import BasicDialog from '../common/BasicDialog';
import DeskLocationTypeDialog from './DeskLocationTypeDialog';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import { useAlertStore } from '@/stores/useAlertStore';
import theme from '@/styles/theme';

export default function DeskTypeActionsCell(params: GridRenderCellParams) {
	const { row } = params;
	const [editing, setEditing] = useState(false);
	const [showActionConfirm, setShowActionConfirm] = useState(false);
	const showAlert = useAlertStore((state) => state.showAlert);
	const deskTrpc = useDeskTrpc();
	const { mutateAsync: archiveType, isPending: archiving } = deskTrpc.archiveType;
	const { mutateAsync: restoreType, isPending: restoring } = deskTrpc.restoreType;

	const isArchived = !!row.deleted_at;
	const isPending = archiving || restoring;

	const handleAction = async () => {
		try {
			if (isArchived) {
				await restoreType({ id: row.id as unknown as number });
				showAlert('Desk type restored successfully', 'success');
			} else {
				await archiveType({ id: row.id as unknown as number });
				showAlert('Desk type archived successfully', 'success');
			}
			setShowActionConfirm(false);
		} catch (error: any) {
			const message = error?.message || `Failed to ${isArchived ? 'restore' : 'archive'} desk type`;
			showAlert(message, 'error');
			setShowActionConfirm(false);
		}
	};

	return (
		<>
			{editing && <DeskLocationTypeDialog deskType={row} onClose={() => setEditing(false)} />}

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
						Are you sure you want to {isArchived ? 'restore' : 'archive'} this desk type?
					</Typography>
					<Typography paddingTop="10px" fontStyle="italic">
						{isArchived
							? 'The desk type will be restored and become available for use.'
							: 'All associated desk locations must be archived first.'}
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
						tooltipProps={{ title: isArchived ? 'Cannot edit archived desk type' : 'Make changes' }}
						icon={<Edit sx={{ fontSize: 15 }} />}
					/>
				</Box>
				<BasicButtonStyled
					buttonProps={{
						onClick: () => setShowActionConfirm(true),
						disabled: isPending,
					}}
					tooltipProps={{ title: isArchived ? 'Restore desk type' : 'Archive desk type' }}
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
