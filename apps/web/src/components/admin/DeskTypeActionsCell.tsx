'use client';

import { IconArchive, IconArchiveOff, IconEdit } from '@tabler/icons-react';
import { GridRenderCellParams } from '@mui/x-data-grid-pro';
import { useState } from 'react';
import BasicButtonStyled from '../common/BasicButtonStyled';
import BasicDialog from '../common/BasicDialog';
import DeskLocationTypeDialog from './DeskLocationTypeDialog';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import { useAlertStore } from '@/stores/useAlertStore';

interface DeskTypeActionsCellProps extends GridRenderCellParams {
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
					<BasicButtonStyled
						buttonProps={{
							onClick: () => setEditing(true),
							disabled: isArchived,
						}}
						tooltipProps={{ title: isArchived ? 'Cannot edit archived desk type' : 'Make changes' }}
						icon={<IconEdit size={15} />}
					/>
				</div>
				<BasicButtonStyled
					buttonProps={{
						onClick: () => setShowActionConfirm(true),
						disabled: isPending,
					}}
					tooltipProps={{ title: isArchived ? 'Restore desk type' : 'Archive desk type' }}
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
