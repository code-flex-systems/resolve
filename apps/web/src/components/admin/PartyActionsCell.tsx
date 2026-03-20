'use client';

import { IconArchive, IconArchiveOff, IconEdit } from '@tabler/icons-react';
import { GridRenderCellParams } from '@mui/x-data-grid-pro';
import { useState } from 'react';
import BasicButtonStyled from '../common/BasicButtonStyled';
import BasicDialog from '../common/BasicDialog';
import PartyDialog from './PartyDialog';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { useAlertStore } from '@/stores/useAlertStore';
import { Dialog } from '@mui/material';

interface PartyActionsCellProps extends GridRenderCellParams {
	isAdminContext?: boolean;
	isManageMode?: boolean;
}

export default function PartyActionsCell(params: PartyActionsCellProps) {
	const { isAdminContext = true, isManageMode = true } = params;
	if (!isManageMode) return null;
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
					<span style={{  fontStyle: 'italic' ,  fontWeight: 'bold'  }}>
						Are you sure you want to {isArchived ? 'restore' : 'archive'} this party?
					</span>
					<span style={{ paddingTop: '10px', fontStyle: 'italic' }}>
						{isArchived
							? 'The party and all associated addresses and representatives will be restored.'
							: 'The party and all associated addresses and representatives will be archived.'}
					</span>
				</BasicDialog>
			)}

			<div style={styles.container}>
				<div style={{ marginRight: isAdminContext ? '10px' : undefined }}>
					<BasicButtonStyled
						buttonProps={{
							onClick: () => setEditing(true),
							disabled: isArchived,
						}}
						tooltipProps={{ title: isArchived ? 'Cannot edit archived party' : 'Make changes' }}
						icon={<IconEdit size={15} />}
					/>
				</div>
				{isAdminContext && (
					<BasicButtonStyled
						buttonProps={{
							onClick: () => setShowActionConfirm(true),
							disabled: isPending,
						}}
						tooltipProps={{ title: isArchived ? 'Restore party' : 'Archive party' }}
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
