'use client';

import Edit from '@mui/icons-material/Edit';
import Archive from '@mui/icons-material/Archive';
import Unarchive from '@mui/icons-material/Unarchive';
import { GridRenderCellParams } from '@mui/x-data-grid-pro';
import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import BasicButtonStyled from '../common/BasicButtonStyled';
import BasicDialog from '../common/BasicDialog';
import OfficeDialog from './OfficeDialog';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { useAlertStore } from '@/stores/useAlertStore';
import theme from '@/styles/theme';

export default function OfficeActionsCell(params: GridRenderCellParams) {
	const { row } = params;
	const [editing, setEditing] = useState(false);
	const [showActionConfirm, setShowActionConfirm] = useState(false);
	const showAlert = useAlertStore((state) => state.showAlert);
	const partyTrpc = usePartyTrpc();
	const { mutateAsync: archiveOffice, isPending: archiving } = partyTrpc.archiveOffice;
	const { mutateAsync: restoreOffice, isPending: restoring } = partyTrpc.restoreOffice;

	const isArchived = !!row.deleted_at;
	const isPartyArchived = !!row.party_deleted_at;
	const isPending = archiving || restoring;

	const handleAction = async () => {
		try {
			if (isArchived) {
				await restoreOffice({ id: row.id as unknown as number });
				showAlert('Office restored successfully', 'success');
			} else {
				await archiveOffice({ id: row.id as unknown as number });
				showAlert('Office archived successfully', 'success');
			}
			setShowActionConfirm(false);
		} catch (error: any) {
			const message = error?.message || `Failed to ${isArchived ? 'restore' : 'archive'} office`;
			showAlert(message, 'error');
			setShowActionConfirm(false);
		}
	};

	return (
		<>
			{editing && <OfficeDialog office={row} onClose={() => setEditing(false)} />}

			{showActionConfirm && (
				<BasicDialog
					title={`${isArchived ? 'Restore' : 'Archive'} Office`}
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
						Are you sure you want to {isArchived ? 'restore' : 'archive'} this office?
					</Typography>
					{row.office_name && (
						<Typography paddingTop="10px" fontStyle="italic">
							Office: {row.office_name}
						</Typography>
					)}
					{row.party_name && (
						<Typography fontStyle="italic">
							Party: {row.party_name}
						</Typography>
					)}
				</BasicDialog>
			)}

			<div style={styles.container}>
				<Box marginRight="5px">
					<BasicButtonStyled
						buttonProps={{
							onClick: () => setEditing(true),
							disabled: isArchived || isPartyArchived,
						}}
						tooltipProps={{
							title: isArchived
								? 'Cannot edit archived office'
								: isPartyArchived
									? 'Cannot edit office - parent party is archived'
									: 'Make changes',
						}}
						icon={<Edit sx={{ fontSize: 15 }} />}
					/>
				</Box>
				<BasicButtonStyled
					buttonProps={{
						onClick: () => setShowActionConfirm(true),
						disabled: isPending || isPartyArchived,
					}}
					tooltipProps={{
						title: isPartyArchived
							? 'Cannot modify office - parent party is archived'
							: isArchived
								? 'Restore office'
								: 'Archive office',
					}}
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
