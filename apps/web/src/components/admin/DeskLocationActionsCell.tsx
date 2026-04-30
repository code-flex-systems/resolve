'use client';

import { IconArchive, IconArchiveOff, IconEdit } from '@tabler/icons-react';
import { useState } from 'react';
import BasicDialog from '../common/BasicDialog';
import DeskLocationDialog from './DeskLocationDialog';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import { useAlertStore } from '@/stores/useAlertStore';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';

interface DeskLocationActionsCellProps {
	row: any;
	value?: any;
	id?: string | number;
}

export default function DeskLocationActionsCell({ row }: DeskLocationActionsCellProps) {
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
				await restoreLocation({ id: row.id });
				showAlert('Desk location restored successfully', 'success');
			} else {
				await archiveLocation({ id: row.id });
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
					<span style={{ fontStyle: 'italic', fontWeight: 'bold' }}>
						Are you sure you want to {isArchived ? 'restore' : 'archive'} this desk location?
					</span>
					<span style={{ paddingTop: '10px', fontStyle: 'italic' }}>
						{isArchived
							? 'The desk location will be restored and become available for use.'
							: 'This desk location cannot be archived if it has assigned claims.'}
					</span>
				</BasicDialog>
			)}

			<div style={styles.container}>
				<Tooltip content={isArchived ? 'Cannot edit archived desk location' : 'Make changes'}>
					<Button
						variant="icon"
						size="sm"
						color="neutral"
						onClick={() => setEditing(true)}
						disabled={isArchived}
					>
						<IconEdit size={15} stroke={1.5} />
					</Button>
				</Tooltip>
				<Tooltip content={isArchived ? 'Restore desk location' : 'Archive desk location'}>
					<Button
						variant="icon"
						size="sm"
						color="neutral"
						onClick={() => setShowActionConfirm(true)}
						disabled={isPending}
					>
						{isArchived ? (
							<IconArchiveOff size={15} stroke={1.5} style={{ color: 'var(--status-success)' }} />
						) : (
							<IconArchive size={15} stroke={1.5} style={{ color: 'var(--status-error)' }} />
						)}
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
		gap: 8,
	},
};
