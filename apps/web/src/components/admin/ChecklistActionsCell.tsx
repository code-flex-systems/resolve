'use client';

import { IconArchive, IconArchiveOff, IconChartBar, IconExternalLink } from '@tabler/icons-react';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useRouter } from 'next/navigation';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useState } from 'react';
import BasicDialog from '../common/BasicDialog';
import { useCrudAlerts } from '@/hooks/useCrudAlerts';

interface ChecklistActionsCellProps {
	row: any;
	value?: any;
	id?: string | number;
}

export default function ChecklistActionsCell(params: ChecklistActionsCellProps) {
	const router = useRouter();
	const [updating, setUpdating] = useState(false);
	const { mutate: updateChecklist, isPending } = useChecklistTrpc().update;
	const published = params.row.published;
	const { showSuccess, showError } = useCrudAlerts('checklist');

	return (
		<>
			<div style={styles.container}>
				<Tooltip content={published ? 'Unpublish' : 'Publish'}>
					<Button
						variant="icon"
						size="sm"
						color="neutral"
						disabled={isPending}
						onClick={() => setUpdating(true)}
					>
						{published ? (
							<IconArchive size={15} stroke={1.5} style={{ color: 'var(--status-error)' }} />
						) : (
							<IconArchiveOff size={15} stroke={1.5} style={{ color: 'var(--status-success)' }} />
						)}
					</Button>
				</Tooltip>
				<div style={{ marginLeft: '10px' }}>
					<Tooltip content="Go to breakdown...">
						<Button
							variant="icon"
							size="sm"
							color="neutral"
							onClick={() => router.push(`/checklists/${params.row.id}/breakdown`)}
						>
							<IconChartBar size={15} stroke={1.5} style={{ transform: 'rotate(90deg)' }} />
						</Button>
					</Tooltip>
				</div>
				<div style={{ marginLeft: '10px' }}>
					<Tooltip content="Open checklist...">
						<Button
							variant="icon"
							size="sm"
							color="neutral"
							onClick={() => router.push(`/checklists/${params.row.id}`)}
						>
							<IconExternalLink size={15} stroke={1.5} />
						</Button>
					</Tooltip>
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
		display: 'flex',
		justifyContent: 'flex-end',
		alignItems: 'center',
	},
};
