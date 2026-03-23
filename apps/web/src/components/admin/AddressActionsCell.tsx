'use client';

import { IconArchive, IconArchiveOff, IconEdit } from '@tabler/icons-react';
import { useState } from 'react';
import BasicDialog from '../common/BasicDialog';
import AddressDialog from './AddressDialog';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { useAlertStore } from '@/stores/useAlertStore';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';

interface AddressActionsCellProps {
	row: any;
	value?: any;
	id?: string | number;
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
				await restoreAddress({ id: row.id });
				showAlert('Address restored successfully', 'success');
			} else {
				await archiveAddress({ id: row.id });
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
					<Tooltip content="isArchived
								? 'Cannot edit archived address'
								: isPartyArchived
									? 'Cannot edit address - parent party is archived'
									: 'Make changes'">
							<Button variant="icon" size="sm" color="neutral" onClick={() => setEditing(true)} disabled={isArchived || isPartyArchived}>
							<IconEdit size={15} />
						</Button>
						</Tooltip>
				</div>
				{isAdminContext && (
					<Tooltip content="isPartyArchived
								? 'Cannot modify address - parent party is archived'
								: isArchived
									? 'Restore address'
									: 'Archive address'">
							<Button variant="icon" size="sm" color="neutral" onClick={() => setShowActionConfirm(true)} disabled={isPending || isPartyArchived}>
							isArchived ? (
								<IconArchiveOff size={15} style={{ color: 'var(--status-success)' }} />
							) : (
								<IconArchive size={15} style={{ color: 'var(--status-error)' }} />
							)
						</Button>
						</Tooltip>
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
