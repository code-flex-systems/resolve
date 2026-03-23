'use client';

import { useState } from 'react';
import BasicDialog from '../common/BasicDialog';
import { useCoverageTrpc, CoverageListItem } from '@/hooks/trpc/useCoverageTrpc';
import { formatCoverageType } from '@/lib/utils/claimUtils';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';

interface CoverageActionsCellProps {
	row: any;
	value?: any;
	id?: string | number;
	onEdit: (coverage: CoverageListItem) => void;
}

export default function CoverageActionsCell({ row, onEdit }: CoverageActionsCellProps) {
	const coverage = row as CoverageListItem;
	const { mutate: deleteCoverage, isPending } = useCoverageTrpc().remove;
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	const handleDelete = () => {
		deleteCoverage({ id: coverage.id });
		setShowDeleteDialog(false);
	};

	return (
		<>
			{showDeleteDialog && (
				<BasicDialog
					title="Delete Coverage"
					primaryAction={{
						label: 'Delete',
						onClick: handleDelete,
						color: 'error',
					}}
					secondaryActions={[
						{
							label: 'Cancel',
							onClick: () => setShowDeleteDialog(false),
						},
					]}
					onClose={() => setShowDeleteDialog(false)}
					width={500}
				>
					<span   style={{ fontWeight: 'bold', marginBottom: 1 }}>
						Are you sure you want to delete this coverage?
					</span>
					<span   style={{ fontSize: 14, color: 'text.secondary' }}>
						Coverage Type: <strong>{formatCoverageType(coverage.loss_type)}</strong>
					</span>
					<span   style={{ fontSize: 14, color: 'text.secondary' }}>
						Amount:{' '}
						<strong>
							{coverage.coverage_amount ? formatCurrencyExact(parseFloat(coverage.coverage_amount.toString())) : 'N/A'}
						</strong>
					</span>
					<span    style={{ paddingTop: 2, fontStyle: 'italic', fontSize: 13 }}>
						This action cannot be undone.
					</span>
				</BasicDialog>
			)}

			<div style={styles.container}>
				<Tooltip content="Edit coverage">
							<Button variant="icon" size="sm" color="neutral" onClick={() => onEdit(coverage)} disabled={isPending}>
							<IconEdit size={15} />
						</Button>
						</Tooltip>
				<div  style={{ marginLeft: '10px' }}>
					<Tooltip content="Delete coverage">
							<Button variant="icon" size="sm" color="neutral" onClick={() => setShowDeleteDialog(true)} disabled={isPending}>
							<IconTrash size={15} />
						</Button>
						</Tooltip>
				</div>
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
