'use client';

import { IconArchive, IconArchiveOff, IconChartBar, IconExternalLink } from '@tabler/icons-react';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { GridRenderCellParams } from '@mui/x-data-grid-pro';
import { useRouter } from 'next/navigation';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useState } from 'react';
import BasicDialog from '../common/BasicDialog';
import BasicButtonStyled from '../common/BasicButtonStyled';
import { useCrudAlerts } from '@/hooks/useCrudAlerts';
import { Dialog } from '@mui/material';

interface ChecklistActionsCellProps extends GridRenderCellParams {
	isManageMode?: boolean;
}

export default function ChecklistActionsCell(params: ChecklistActionsCellProps) {
	const { isManageMode = true } = params;
	if (!isManageMode) return null;
	const router = useRouter();
	const [updating, setUpdating] = useState(false);
	const { mutate: updateChecklist, isPending } = useChecklistTrpc().update;
	const published = params.row.published;
	const { showSuccess, showError } = useCrudAlerts('checklist');

	return (
		<>
			<div style={styles.container} className="flex-row-right">
				<BasicButtonStyled
					buttonProps={{
						disabled: isPending,
						onClick: () => setUpdating(true),
					}}
					tooltipProps={{
						title: `${published ? 'Unpublish' : 'Publish'}`,
					}}
					icon={
						published ? (
							<IconArchive style={{ ...styles.icon, color: 'var(--status-error)' }} />
						) : (
							<IconArchiveOff style={{ ...styles.icon, color: 'var(--status-success)' }} />
						)
					}
				/>
				<div style={{ marginLeft: '10px' }}>
					<BasicButtonStyled
						buttonProps={{
							onClick: () => router.push(`/checklist/${params.id}/breakdown`),
						}}
						tooltipProps={{
							title: 'Go to breakdown...',
						}}
						icon={<IconChartBar style={{ ...styles.icon, transform: 'rotate(90deg)' }} />}
					/>
				</div>
				<div style={{ marginLeft: '10px' }}>
					<BasicButtonStyled
						buttonProps={{
							onClick: () => router.push(`/checklist/${params.id}`),
						}}
						tooltipProps={{
							title: 'Open checklist...',
						}}
						icon={<IconExternalLink style={styles.icon} />}
					/>
				</div>
			</div>

			{updating && (
				<BasicDialog
					title={`${published ? 'Unpublish' : 'Publish'} ${params.row.name}`}
					primaryAction={{
						label: 'Confirm',
						onClick: () => {
							updateChecklist(
								{ id: params.row.id, params: { published: !published } },
								{
									onSuccess: () =>
										showSuccess('update', published ? 'Checklist unpublished' : 'Checklist published'),
									onError: (error) =>
										showError('update', error, 'Failed to update checklist visibility'),
								}
							);
							setUpdating(false);
						},
						color: published ? 'error' : 'success',
					}}
					secondaryActions={[
						{
							label: 'Cancel',
							onClick: () => setUpdating(false),
						},
					]}
					onClose={() => setUpdating(false)}
					width={500}
				>
					<span style={{  fontStyle: 'italic' ,  fontWeight: 'bold'  }}>
						Are you sure you want to {published ? 'unpublish' : 'publish'} this checklist?
					</span>
					<span style={{ paddingTop: '10px', fontStyle: 'italic' }}>
						{published
							? 'Users will no longer have access to this checklist or be able to open it with new or associated claims.'
							: 'Users will now have access to this checklist and be able to open it with new or associated claims.'}
					</span>
				</BasicDialog>
			)}
		</>
	);
}

const styles = {
	container: {
		width: '100%',
		height: '100%',
		padding: '10px',
	},
	icon: {
		fontSize: 17,
	},
};
