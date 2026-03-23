'use client';

import { IconArchive, IconArchiveOff, IconEdit } from '@tabler/icons-react';
import { useState } from 'react';
import BasicDialog from '../common/BasicDialog';
import DeskLocationTypeDialog from './DeskLocationTypeDialog';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import { useAlertStore } from '@/stores/useAlertStore';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';

interface DeskTypeActionsCellProps {
	row: any;
	value?: any;
	id?: string | number;
	isManageMode?: boolean;
}

export default function DeskTypeActionsCell(params: DeskTypeActionsCellProps) {
	const { isManageMode = true } = params;
	if (!isManageMode) return null;
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
				await restoreType({ id: row.id });
				showAlert('Desk type restored successfully', 'success');
			} else {
				await archiveType({ id: row.id });
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
					<span style={{  fontStyle: 'italic' ,  fontWeight: 'bold'  }}>
						Are you sure you want to {isArchived ? 'restore' : 'archive'} this desk type?
					</span>
					<span style={{ paddingTop: '10px', fontStyle: 'italic' }}>
						{isArchived
							? 'The desk type will be restored and become available for use.'
							: 'All associated desk locations must be archived first.'}
					</span>
				</BasicDialog>
			)}

			<div style={styles.container}>
				<div style={{ marginRight: '10px' }}>
					<Tooltip content="isArchived ? 'Cannot edit archived desk type' : 'Make changes'">
							<Button variant="icon" size="sm" color="neutral" onClick={() => setEditing(true)} disabled={isArchived}>
							<IconEdit size={15} />
						</Button>
						</Tooltip>
				</div>
				<Tooltip content="isArchived ? 'Restore desk type' : 'Archive desk type'">
							<Button variant="icon" size="sm" color="neutral" onClick={() => setShowActionConfirm(true)} disabled={isPending}>
							isArchived ? (
							<IconArchiveOff size={15} style={{ color: 'var(--status-success)' }} />
						) : (
							<IconArchive size={15} style={{ color: 'var(--status-error)' }} />
						)
						</Button>
						</Tooltip>
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
