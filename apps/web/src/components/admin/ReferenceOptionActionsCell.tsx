'use client';

import { IconEdit, IconTrash, IconTrashOff } from '@tabler/icons-react';
import { GridRenderCellParams } from '@mui/x-data-grid-pro';
import { useState } from 'react';
import BasicButtonStyled from '../common/BasicButtonStyled';
import BasicDialog from '../common/BasicDialog';
import ReferenceOptionDialog from './ReferenceOptionDialog';
import { useReferenceDataTrpc } from '@/hooks/trpc/useReferenceDataTrpc';
import { useAlertStore } from '@/stores/useAlertStore';
import { Dialog } from '@mui/material';

interface ReferenceOptionActionsCellProps extends GridRenderCellParams {
	isManageMode?: boolean;
}

export default function ReferenceOptionActionsCell(params: ReferenceOptionActionsCellProps) {
	const { isManageMode = true } = params;
	if (!isManageMode) return null;
	const { row } = params;
	const [editing, setEditing] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const showAlert = useAlertStore((state) => state.showAlert);
	const referenceDataTrpc = useReferenceDataTrpc();
	const { mutateAsync: deleteOption, isPending: deleting } = referenceDataTrpc.deleteOption;
	const { mutateAsync: restoreOption, isPending: restoring } = referenceDataTrpc.restoreOption;

	const isDeleted = !!row.deleted_at;
	const isSystemDefault = row.is_system_default;
	const isPending = deleting || restoring;

	const handleAction = async () => {
		try {
			if (isDeleted) {
				await restoreOption({ id: row.id });
				showAlert('Option reactivated successfully', 'success');
			} else {
				await deleteOption({ id: row.id });
				showAlert('Option deactivated successfully', 'success');
			}
			setShowDeleteConfirm(false);
		} catch (error: any) {
			const message = error?.message || `Failed to ${isDeleted ? 'reactivate' : 'deactivate'} option`;
			showAlert(message, 'error');
			setShowDeleteConfirm(false);
		}
	};

	return (
		<>
			{editing && <ReferenceOptionDialog option={row} onClose={() => setEditing(false)} />}

			{showDeleteConfirm && (
				<BasicDialog
					title={`${isDeleted ? 'Reactivate' : 'Deactivate'} "${row.display_label}"`}
					primaryAction={{
						label: 'Confirm',
						onClick: handleAction,
						color: isDeleted ? 'success' : 'error',
					}}
					secondaryActions={[
						{
							label: 'Cancel',
							onClick: () => setShowDeleteConfirm(false),
						},
					]}
					onClose={() => setShowDeleteConfirm(false)}
					width={500}
				>
					<span style={{  fontStyle: 'italic' ,  fontWeight: 'bold'  }}>
						Are you sure you want to {isDeleted ? 'reactivate' : 'deactivate'} this option?
					</span>
					<span style={{ paddingTop: '10px', fontStyle: 'italic' }}>
						{isDeleted
							? 'The option will be reactivated and become available for selection.'
							: 'The option will no longer be available for selection, but existing records will retain this value.'}
					</span>
				</BasicDialog>
			)}

			<div style={styles.container}>
				<div style={{ marginRight: '10px' }}>
					<BasicButtonStyled
						buttonProps={{
							onClick: () => setEditing(true),
							disabled: isDeleted,
						}}
						tooltipProps={{ title: isDeleted ? 'Cannot edit deactivated option' : 'Edit option' }}
						icon={<IconEdit size={15} />}
					/>
				</div>
				<BasicButtonStyled
					buttonProps={{
						onClick: () => setShowDeleteConfirm(true),
						disabled: isPending || (!isDeleted && isSystemDefault),
					}}
					tooltipProps={{
						title: isSystemDefault && !isDeleted
							? 'Cannot deactivate system default'
							: isDeleted
								? 'Reactivate option'
								: 'Deactivate option',
					}}
					icon={
						isDeleted ? (
							<IconTrashOff size={15} style={{ color: 'var(--status-success)' }} />
						) : (
							<IconTrash size={15} style={{ color: isSystemDefault ? '#bdbdbd' : 'var(--status-error)', }} />
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
