'use client';

import { IconArchive, IconArchiveOff, IconEdit } from '@tabler/icons-react';
import { useState } from 'react';
import BasicButtonStyled from '../common/BasicButtonStyled';
import BasicDialog from '../common/BasicDialog';
import DeskLocationDialog from './DeskLocationDialog';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import { useAlertStore } from '@/stores/useAlertStore';

interface DeskLocationActionsCellProps {
	row: any;
	value?: any;
	id?: string | number;
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
					<span style={{  fontStyle: 'italic' ,  fontWeight: 'bold'  }}>
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
				<div style={{ marginRight: '10px' }}>
					<BasicButtonStyled
						buttonProps={{
							onClick: () => setEditing(true),
							disabled: isArchived,
						}}
						tooltipProps={{ title: isArchived ? 'Cannot edit archived desk location' : 'Make changes' }}
						icon={<IconEdit size={15} />}
					/>
				</div>
				<BasicButtonStyled
					buttonProps={{
						onClick: () => setShowActionConfirm(true),
						disabled: isPending,
					}}
					tooltipProps={{ title: isArchived ? 'Restore desk location' : 'Archive desk location' }}
					icon={
						isArchived ? (
							<IconArchiveOff size={15} style={{ color: 'var(--status-success)' }} />
						) : (
							<IconArchive size={15} style={{ color: 'var(--status-error)' }} />
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
