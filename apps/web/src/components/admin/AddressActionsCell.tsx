'use client';

import Edit from '@mui/icons-material/Edit';
import Archive from '@mui/icons-material/Archive';
import Unarchive from '@mui/icons-material/Unarchive';
import { GridRenderCellParams } from '@mui/x-data-grid-pro';
import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import BasicButtonStyled from '../common/BasicButtonStyled';
import BasicDialog from '../common/BasicDialog';
import AddressDialog from './AddressDialog';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { useAlertStore } from '@/stores/useAlertStore';
import theme from '@/styles/theme';

interface AddressActionsCellProps extends GridRenderCellParams {
	isAdminContext?: boolean;
}

export default function AddressActionsCell(params: AddressActionsCellProps) {
	const { isAdminContext = true } = params;
	const { row } = params;
	const [editing, setEditing] = useState(false);
	const [showActionConfirm, setShowActionConfirm] = useState(false);
	const showAlert = useAlertStore((state) => state.showAlert);
	const partyTrpc = usePartyTrpc();
	const { mutateAsync: archiveAddress, isPending: archiving } = partyTrpc.archiveAddress;
	const { mutateAsync: restoreAddress, isPending: restoring } = partyTrpc.restoreAddress;

	const isArchived = !!row.deleted_at;
	const isPartyArchived = !!row.party_deleted_at;
	const isPending = archiving || restoring;

	const handleAction = async () => {
		try {
			if (isArchived) {
				await restoreAddress({ id: row.id as unknown as number });
				showAlert('Address restored successfully', 'success');
			} else {
				await archiveAddress({ id: row.id as unknown as number });
				showAlert('Address archived successfully', 'success');
			}
			setShowActionConfirm(false);
		} catch (error: any) {
			const message = error?.message || `Failed to ${isArchived ? 'restore' : 'archive'} address`;
			showAlert(message, 'error');
			setShowActionConfirm(false);
		}
	};

	return (
		<>
			{editing && <AddressDialog address={row} onClose={() => setEditing(false)} />}

			{showActionConfirm && (
				<BasicDialog
					title={`${isArchived ? 'Restore' : 'Archive'} Address`}
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
						Are you sure you want to {isArchived ? 'restore' : 'archive'} this address?
					</Typography>
					{row.name && (
						<Typography paddingTop="10px" fontStyle="italic">
							Address: {row.name}
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
				<Box marginRight={isAdminContext ? '5px' : undefined}>
					<BasicButtonStyled
						buttonProps={{
							onClick: () => setEditing(true),
							disabled: isArchived || isPartyArchived,
						}}
						tooltipProps={{
							title: isArchived
								? 'Cannot edit archived address'
								: isPartyArchived
									? 'Cannot edit address - parent party is archived'
									: 'Make changes',
						}}
						icon={<Edit sx={{ fontSize: 15 }} />}
					/>
				</Box>
				{isAdminContext && (
					<BasicButtonStyled
						buttonProps={{
							onClick: () => setShowActionConfirm(true),
							disabled: isPending || isPartyArchived,
						}}
						tooltipProps={{
							title: isPartyArchived
								? 'Cannot modify address - parent party is archived'
								: isArchived
									? 'Restore address'
									: 'Archive address',
						}}
						icon={
							isArchived ? (
								<Unarchive sx={{ fontSize: 15, color: theme.palette.success.main }} />
							) : (
								<Archive sx={{ fontSize: 15, color: theme.palette.error.main }} />
							)
						}
					/>
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
