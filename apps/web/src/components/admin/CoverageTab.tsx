'use client';

import { useState, useEffect } from 'react';
import { DataGridPro, GridColDef } from '@mui/x-data-grid-pro';
import { Box, Button, Paper, Typography } from '@mui/material';
import AddBox from '@mui/icons-material/AddBox';
import Shield from '@mui/icons-material/Shield';
import { useCoverageTrpc, CoverageListItem } from '@/hooks/trpc/useCoverageTrpc';
import { formatCurrency } from '@/lib/utils/recoveryUtils';
import { formatCoverageType } from '@/lib/utils/claimUtils';
import IconHeaderCell from '../common/IconHeaderCell';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import Toolbar from '../common/Toolbar';
import { Claim, useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import CoverageActionsCell from '../coverage/CoverageActionsCell';
import ClaimFilter from '../common/ClaimFilter';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import BasicDialog from '../common/BasicDialog';
import CoverageFormDialog from '../coverage/CoverageFormDialog';

function NoRowsWithClaim() {
	return (
		<CustomNoRowsOverlay
			text="No coverages found"
			icon={<Shield sx={{ fontSize: 35, color: BASE_COLOR_LIGHT }} />}
		/>
	);
}

function NoRowsNoClaim() {
	return (
		<CustomNoRowsOverlay
			text="Select a claim to view coverages"
			icon={<Shield sx={{ fontSize: 35, color: BASE_COLOR_LIGHT }} />}
		/>
	);
}

export default function CoverageTab() {
	const { getParam, setParam } = useUrlFilters();
	const claimIdFromUrl = getParam('claimId');

	const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
	const [showClaimSelectDialog, setShowClaimSelectDialog] = useState(false);
	const [tempSelectedClaim, setTempSelectedClaim] = useState<Claim | null>(null);
	const [showCoverageDialog, setShowCoverageDialog] = useState(false);
	const [editingCoverage, setEditingCoverage] = useState<CoverageListItem | null>(null);

	// Fetch claim data if claimId is in URL
	const { data: claimFromUrl } = useClaimTrpc().get(
		{ claimId: parseInt(claimIdFromUrl!, 10) },
		{ enabled: !!claimIdFromUrl && !isNaN(parseInt(claimIdFromUrl, 10)) }
	);

	// Show dialog on mount if no claimId in URL
	useEffect(() => {
		if (!claimIdFromUrl) {
			setShowClaimSelectDialog(true);
		}
	}, []);

	// Update selectedClaim when claimFromUrl changes
	useEffect(() => {
		if (claimFromUrl) {
			setSelectedClaim(claimFromUrl);
		}
	}, [claimFromUrl]);

	const { data: coverages = [], isFetching } = useCoverageTrpc().list(
		{ claimId: selectedClaim?.id! },
		{ enabled: selectedClaim !== null }
	);
	const createCoverage = useCoverageTrpc().create;
	const updateCoverage = useCoverageTrpc().update;

	const totalCoverage = coverages.reduce(
		(sum, c) => sum + (c.coverage_amount ? parseFloat(c.coverage_amount.toString()) : 0),
		0
	);

	const handleClaimSelect = (claim: Claim | null) => {
		setSelectedClaim(claim);
		if (claim) {
			setParam('claimId', claim.id.toString());
		} else {
			setParam('claimId', null);
		}
	};

	const handleConfirmClaimSelection = () => {
		if (tempSelectedClaim) {
			handleClaimSelect(tempSelectedClaim);
			setShowClaimSelectDialog(false);
			setTempSelectedClaim(null);
		}
	};

	const handleOpenCoverageDialog = (coverage?: CoverageListItem) => {
		setEditingCoverage(coverage || null);
		setShowCoverageDialog(true);
	};

	const handleCloseCoverageDialog = () => {
		setShowCoverageDialog(false);
		setEditingCoverage(null);
	};

	const handleSubmit = async (data: { loss_type: string; coverage_amount: string | null; amount_reserved: string | null }) => {
		if (!selectedClaim?.id) return;

		try {
			if (editingCoverage) {
				await updateCoverage.mutateAsync({
					id: editingCoverage.id,
					loss_type: data.loss_type as any,
					coverage_amount: data.coverage_amount ? parseFloat(data.coverage_amount) : null,
					amount_reserved: data.amount_reserved ? parseFloat(data.amount_reserved) : null,
				});
			} else {
				// Note: Creating coverages requires claim_party_id which is not supported in this standalone tab.
				// Coverage creation should be done through the ClaimantsCoverageTab in claim detail view.
				console.warn('Coverage creation is disabled in standalone coverage tab - use ClaimantsCoverageTab instead');
			}
			handleCloseCoverageDialog();
		} catch (error) {
			console.error('Failed to save coverage:', error);
		}
	};

	const COLUMNS: GridColDef[] = [
		{
			headerName: 'Coverage Type',
			field: 'loss_type',
			renderHeader: (params) => <IconHeaderCell {...params} icon={<Shield sx={{ color: BASE_COLOR_LIGHT }} />} />,
			valueFormatter: (value) => formatCoverageType(value),
			flex: 1,
			minWidth: 200,
		},
		{
			headerName: 'Coverage Amount',
			field: 'coverage_amount',
			renderHeader: (params) => <IconHeaderCell {...params} />,
			valueFormatter: (value: any) => (value ? formatCurrency(parseFloat(value.toString())) : 'N/A'),
			flex: 1,
			minWidth: 150,
		},
		{
			field: 'actions',
			headerName: '',
			width: 100,
			renderCell: (params) => <CoverageActionsCell {...params} onEdit={handleOpenCoverageDialog} />,
		},
	];

	const NoRowsOverlay = selectedClaim ? NoRowsWithClaim : NoRowsNoClaim;

	return (
		<div style={styles.container} className="flex-col-start">
			<Paper sx={styles.paper} className="flex-col-start">
				<Toolbar
					left={
						<>
							<Typography variant="h6" marginRight="15px">
								Coverages
							</Typography>
							<ClaimFilter claim={selectedClaim} setClaim={handleClaimSelect} />
							{selectedClaim && (
								<Typography fontSize={14} marginLeft="15px" color="text.secondary">
									Total Coverage: {formatCurrency(totalCoverage)}
								</Typography>
							)}
						</>
					}
					right={
						selectedClaim ? (
							<Button
								variant="contained"
								startIcon={<AddBox />}
								onClick={() => handleOpenCoverageDialog()}
							>
								Add Coverage
							</Button>
						) : undefined
					}
					leftWidth="75%"
					rightWidth="25%"
					height={50}
					padding="0px 10px"
				/>

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
							noRowsOverlay: NoRowsOverlay,
							noResultsOverlay: NoRowsOverlay,
						}}
						getRowClassName={(params) => (params.indexRelativeToCurrentPage % 2 === 0 ? 'striped' : '')}
						sx={styles.tableOverrides}
					/>
				</div>
			</Paper>

			{/* Claim Selection Dialog */}
			{showClaimSelectDialog && (
				<BasicDialog
					title="Select a Claim"
					onClose={() => {}}
					closeDisabled={true}
					showCloseButton={false}
					showOverflow={true}
					width={500}
					primaryAction={{
						label: 'Confirm',
						onClick: handleConfirmClaimSelection,
						disabled: !tempSelectedClaim,
					}}
				>
					<Box display="flex" flexDirection="column" gap={2}>
						<Typography fontSize={14} color="text.secondary">
							Please select a claim to view and manage its coverages.
						</Typography>
						<Box>
							<ClaimFilter claim={tempSelectedClaim} setClaim={setTempSelectedClaim} zIndex={1400} />
						</Box>
					</Box>
				</BasicDialog>
			)}

			{/* Coverage Form Dialog */}
			<CoverageFormDialog
				open={showCoverageDialog}
				onClose={handleCloseCoverageDialog}
				onSubmit={handleSubmit}
				editingCoverage={editingCoverage}
				isSubmitting={createCoverage.isPending || updateCoverage.isPending}
			/>
		</div>
	);
}

const styles = {
	container: {
		flex: 1,
		minWidth: 0,
		height: '100%',
	},
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
