'use client';

import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import { GridRenderCellParams } from '@mui/x-data-grid-pro';
import BasicButtonStyled from '../common/BasicButtonStyled';
import BasicDialog from '../common/BasicDialog';
import { useCoverageTrpc, CoverageListItem } from '@/hooks/trpc/useCoverageTrpc';
import { formatCoverageType } from '@/lib/utils/claimUtils';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';

interface CoverageActionsCellProps extends GridRenderCellParams {
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
					<Typography fontWeight="bold" marginBottom={1}>
						Are you sure you want to delete this coverage?
					</Typography>
					<Typography fontSize={14} color="text.secondary">
						Coverage Type: <strong>{formatCoverageType(coverage.loss_type)}</strong>
					</Typography>
					<Typography fontSize={14} color="text.secondary">
						Amount:{' '}
						<strong>
							{coverage.coverage_amount ? formatCurrencyExact(parseFloat(coverage.coverage_amount.toString())) : 'N/A'}
						</strong>
					</Typography>
					<Typography paddingTop={2} fontStyle="italic" fontSize={13}>
						This action cannot be undone.
					</Typography>
				</BasicDialog>
			)}

			<Box sx={styles.container}>
				<BasicButtonStyled
					buttonProps={{
						onClick: () => onEdit(coverage),
						disabled: isPending,
					}}
					tooltipProps={{ title: 'Edit coverage' }}
					icon={<Edit sx={{ fontSize: 15 }} />}
				/>
				<Box marginLeft="10px">
					<BasicButtonStyled
						buttonProps={{
							onClick: () => setShowDeleteDialog(true),
							disabled: isPending,
						}}
						tooltipProps={{ title: 'Delete coverage' }}
						icon={<Delete sx={{ fontSize: 15 }} />}
					/>
				</Box>
			</Box>
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
