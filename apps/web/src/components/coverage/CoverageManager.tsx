'use client';

import { useState } from 'react';
import { DataGridPro, GridColDef } from '@mui/x-data-grid-pro';
import { Box, Button, Paper, Typography } from '@mui/material';
import AddBox from '@mui/icons-material/AddBox';
import Shield from '@mui/icons-material/Shield';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useCoverageTrpc, CoverageListItem } from '@/hooks/trpc/useCoverageTrpc';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { formatCoverageType } from '@/lib/utils/claimUtils';
import IconHeaderCell from '../common/IconHeaderCell';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import Toolbar from '../common/Toolbar';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import CoverageActionsCell from './CoverageActionsCell';
import CoverageFormDialog from './CoverageFormDialog';
import { DEDUCTIBLE_STATUS_OPTIONS } from './DeductibleStatusSelect';
import { shouldIncludeDeductibleInClaimAmount } from '@/api/utils/deductibleUtils';
import { DeductibleStatus } from '@/config/enums';

function NoRows() {
	return (
		<CustomNoRowsOverlay
			text="No coverages found"
			icon={<Shield sx={{ fontSize: 35, color: BASE_COLOR_LIGHT }} />}
		/>
	);
}

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

	const totalDeductible = coverages.reduce((sum, c) => {
		// Only include deductible if status says to include in claim amount
		const shouldInclude = shouldIncludeDeductibleInClaimAmount(c.deductible_status);
		return sum + (shouldInclude && c.deductible_amount ? parseFloat(c.deductible_amount.toString()) : 0);
	}, 0);

	const handleOpenDialog = (coverage?: CoverageListItem) => {
		setEditingCoverage(coverage || null);
		setShowDialog(true);
	};

	const handleCloseDialog = () => {
		setShowDialog(false);
		setEditingCoverage(null);
	};

	const handleSubmit = async (data: {
		loss_type: string;
		coverage_amount: string | null;
		amount_reserved: string | null;
		deductible_amount: string | null;
		deductible_status: DeductibleStatus;
		subro_applicable: boolean;
		statute_preserved: boolean;
	}) => {
		try {
			if (editingCoverage) {
				await updateCoverage.mutateAsync({
					id: editingCoverage.id,
					loss_type: data.loss_type as any,
					coverage_amount: data.coverage_amount ? parseFloat(data.coverage_amount) : null,
					amount_reserved: data.amount_reserved ? parseFloat(data.amount_reserved) : null,
					deductible_amount: data.deductible_amount ? parseFloat(data.deductible_amount) : null,
					deductible_status: data.deductible_status,
					subro_applicable: data.subro_applicable,
					statute_preserved: data.statute_preserved,
				});
			} else {
				// Note: Creating coverages requires claim_party_id which is not supported in this component.
				// Coverage creation should be done through the ClaimantsCoverageTab in claim detail view.
				console.warn('Coverage creation is disabled - use ClaimantsCoverageTab instead');
			}
			handleCloseDialog();
		} catch (error) {
			console.error('Failed to save coverage:', error);
		}
	};

	const COLUMNS: GridColDef[] = [
		{
			headerName: 'Coverage Type',
			field: 'loss_type',
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
			headerName: 'Deductible',
			field: 'deductible_amount',
			renderHeader: (params) => <IconHeaderCell {...params} />,
			valueFormatter: (value: string) => (value ? formatCurrencyExact(parseFloat(value)) : '$0'),
			flex: 1,
			minWidth: 120,
		},
		{
			headerName: 'Ded. Status',
			field: 'deductible_status',
			renderHeader: (params) => <IconHeaderCell {...params} />,
			valueGetter: (value: DeductibleStatus) => {
				const option = DEDUCTIBLE_STATUS_OPTIONS.find((o) => o.value === value);
				return option?.abbrev ?? value;
			},
			flex: 1,
			minWidth: 100,
		},
		{
			headerName: 'Subro',
			field: 'subro_applicable',
			renderHeader: (params) => <IconHeaderCell {...params} />,
			renderCell: (params) =>
				params.row.subro_applicable ? (
					<CheckIcon sx={{ color: 'success.main' }} />
				) : (
					<CloseIcon sx={{ color: 'text.disabled' }} />
				),
			width: 80,
		},
		{
			headerName: 'Statute Date',
			field: 'statute_date',
			renderHeader: (params) => <IconHeaderCell {...params} />,
			valueFormatter: (value: string) => (value ? new Date(value).toLocaleDateString() : 'N/A'),
			flex: 1,
			minWidth: 120,
		},
		{
			headerName: 'Preserved',
			field: 'statute_preserved',
			renderHeader: (params) => <IconHeaderCell {...params} />,
			renderCell: (params) =>
				params.row.statute_preserved ? (
					<CheckIcon sx={{ color: 'success.main' }} />
				) : (
					<CloseIcon sx={{ color: 'text.disabled' }} />
				),
			width: 100,
		},
		{
			field: 'actions',
			headerName: '',
			width: 100,
			renderCell: (params) => <CoverageActionsCell {...params} onEdit={handleOpenDialog} />,
		},
	];

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
								<Typography fontSize={14} marginLeft="15px" color="text.secondary">
									Total Deductible: {formatCurrencyExact(totalDeductible)}
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

				<Box sx={styles.table}>
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
				</Box>
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
		padding: '24px 24px 0px',
	},
	table: {
		width: '100%',
		height: 'calc(100% - 50px)',
	},
	tableOverrides: {
		border: 'none',
	},
};
