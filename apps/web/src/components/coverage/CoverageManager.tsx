'use client';

import { useState } from 'react';
import { DataGridPro, GridColDef } from '@mui/x-data-grid-pro';
import { Button, Paper, Typography } from '@mui/material';
import AddBox from '@mui/icons-material/AddBox';
import Shield from '@mui/icons-material/Shield';
import { useCoverageTrpc, CoverageListItem } from '@/hooks/trpc/useCoverageTrpc';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { formatCoverageType } from '@/lib/utils/claimUtils';
import IconHeaderCell from '../common/IconHeaderCell';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import Toolbar from '../common/Toolbar';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import CoverageActionsCell from './CoverageActionsCell';
import CoverageFormDialog from './CoverageFormDialog';

interface CoverageManagerProps {
	claimId: number;
	showHeader?: boolean;
	headerTitle?: string;
}

export default function CoverageManager({
	claimId,
	showHeader = true,
	headerTitle = 'Coverages',
}: CoverageManagerProps) {
	const [showDialog, setShowDialog] = useState(false);
	const [editingCoverage, setEditingCoverage] = useState<CoverageListItem | null>(null);

	const { data: coverages = [], isFetching } = useCoverageTrpc().list({ claimId });
	const createCoverage = useCoverageTrpc().create;
	const updateCoverage = useCoverageTrpc().update;

	const totalCoverage = coverages.reduce(
		(sum, c) => sum + (c.coverage_amount ? parseFloat(c.coverage_amount.toString()) : 0),
		0
	);

	const totalReserved = coverages.reduce(
		(sum, c) => sum + (c.amount_reserved ? parseFloat(c.amount_reserved.toString()) : 0),
		0
	);

	const handleOpenDialog = (coverage?: CoverageListItem) => {
		setEditingCoverage(coverage || null);
		setShowDialog(true);
	};

	const handleCloseDialog = () => {
		setShowDialog(false);
		setEditingCoverage(null);
	};

	const handleSubmit = async (data: {
		coverage_type: string;
		coverage_amount: string | null;
		amount_reserved: string | null;
	}) => {
		try {
			if (editingCoverage) {
				await updateCoverage.mutateAsync({
					id: editingCoverage.id,
					coverage_type: data.coverage_type as any,
					coverage_amount: data.coverage_amount,
					amount_reserved: data.amount_reserved,
				});
			} else {
				await createCoverage.mutateAsync({
					claim_id: claimId,
					coverage_type: data.coverage_type as any,
					coverage_amount: data.coverage_amount,
					amount_reserved: data.amount_reserved,
				});
			}
			handleCloseDialog();
		} catch (error) {
			console.error('Failed to save coverage:', error);
		}
	};

	const COLUMNS: GridColDef[] = [
		{
			headerName: 'Coverage Type',
			field: 'coverage_type',
			renderHeader: (params) => <IconHeaderCell {...params} icon={<Shield sx={{ color: BASE_COLOR_LIGHT }} />} />,
			valueFormatter: (value: string) => formatCoverageType(value),
			flex: 1,
			minWidth: 200,
		},
		{
			headerName: 'Coverage Amount',
			field: 'coverage_amount',
			renderHeader: (params) => <IconHeaderCell {...params} />,
			valueFormatter: (value: string) => (value ? formatCurrencyExact(parseFloat(value)) : 'N/A'),
			flex: 1,
			minWidth: 150,
		},
		{
			headerName: 'Amount Reserved',
			field: 'amount_reserved',
			renderHeader: (params) => <IconHeaderCell {...params} />,
			valueFormatter: (value: string) => (value ? formatCurrencyExact(parseFloat(value)) : '-'),
			flex: 1,
			minWidth: 150,
		},
		{
			field: 'actions',
			headerName: '',
			width: 100,
			renderCell: (params) => <CoverageActionsCell {...params} onEdit={handleOpenDialog} />,
		},
	];

	function NoRows() {
		return (
			<CustomNoRowsOverlay
				text="No coverages found"
				icon={<Shield sx={{ fontSize: 35, color: BASE_COLOR_LIGHT }} />}
			/>
		);
	}

	return (
		<>
			<Paper sx={styles.paper} className="flex-col-start">
				{showHeader && (
					<Toolbar
						left={
							<>
								<Typography variant="h6" marginRight="15px">
									{headerTitle}
								</Typography>
								<Typography fontSize={14} marginLeft="5px" color="text.secondary">
									Total Coverage: {formatCurrencyExact(totalCoverage)}
								</Typography>
								<Typography fontSize={14} marginLeft="15px" color="text.secondary">
									Total Reserved: {formatCurrencyExact(totalReserved)}
								</Typography>
							</>
						}
						right={
							<Button variant="contained" startIcon={<AddBox />} onClick={() => handleOpenDialog()}>
								Add Coverage
							</Button>
						}
						leftWidth="75%"
						rightWidth="25%"
						height={50}
						padding="0px 10px"
					/>
				)}

				<div style={styles.table}>
					<DataGridPro
						columns={COLUMNS}
						rows={coverages}
						loading={isFetching}
						columnHeaderHeight={45}
						rowHeight={40}
						hideFooter
						disableColumnMenu
						disableColumnSelector
						slots={{
							noRowsOverlay: NoRows,
							noResultsOverlay: NoRows,
						}}
						getRowClassName={(params) => (params.indexRelativeToCurrentPage % 2 === 0 ? 'striped' : '')}
						sx={styles.tableOverrides}
					/>
				</div>
			</Paper>

			<CoverageFormDialog
				open={showDialog}
				onClose={handleCloseDialog}
				onSubmit={handleSubmit}
				editingCoverage={editingCoverage}
				isSubmitting={createCoverage.isPending || updateCoverage.isPending}
			/>
		</>
	);
}

const styles = {
	paper: {
		width: '100%',
		height: '100%',
		border: 1,
		borderColor: 'divider',
		padding: '15px 15px 0px',
	},
	table: {
		width: '100%',
		height: 'calc(100% - 50px)',
	},
	tableOverrides: {
		border: 'none',
	},
};
