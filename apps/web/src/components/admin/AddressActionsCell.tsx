'use client';

import { IconArchive, IconArchiveOff, IconEdit } from '@tabler/icons-react';
import { GridRenderCellParams } from '@mui/x-data-grid-pro';
import { useState } from 'react';
import BasicButtonStyled from '../common/BasicButtonStyled';
import BasicDialog from '../common/BasicDialog';
import AddressDialog from './AddressDialog';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { useAlertStore } from '@/stores/useAlertStore';

interface AddressActionsCellProps extends GridRenderCellParams {
	isAdminContext?: boolean;
	isManageMode?: boolean;
}

export default function AddressActionsCell(params: AddressActionsCellProps) {
	const { isAdminContext = true, isManageMode = true } = params;
	if (!isManageMode) return null;
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
					<span style={{  fontStyle: 'italic' ,  fontWeight: 'bold'  }}>
						Are you sure you want to {isArchived ? 'restore' : 'archive'} this address?
					</span>
					{row.name && (
						<span style={{ paddingTop: '10px', fontStyle: 'italic' }}>
							Address: {row.name}
						</span>
					)}
					{row.party_name && (
						<span style={{ fontStyle: 'italic' }}>
							Party: {row.party_name}
						</span>
					)}
				</BasicDialog>
			)}

			<div style={styles.container}>
				<div style={{ marginRight: isAdminContext ? '5px' : undefined }}>
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
						icon={<IconEdit size={15} />}
					/>
				</div>
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
								<IconArchiveOff size={15} style={{ color: 'var(--status-success)' }} />
							) : (
								<IconArchive size={15} style={{ color: 'var(--status-error)' }} />
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
