'use client';

import { useMemo, useCallback } from 'react';
import { Box, Paper, PopperProps, Typography, Button } from '@mui/material';
import { DataGridPro, GridColDef } from '@mui/x-data-grid-pro';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import CustomNoRowsOverlay from '@/components/common/CustomNoRowsOverlay';
import IconHeaderCell from '@/components/common/IconHeaderCell';
import StackedHeaderCell from '@/components/common/StackedHeaderCell';
import { formatClaimStatus } from '@/lib/utils/claimUtils';
import ClaimStatusChip from '@/components/common/ClaimStatusChip';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import BasicPopper from '@/components/common/BasicPopper';
import Toolbar from '@/components/common/Toolbar';
import SearchInput from '@/components/common/SearchInput';
import FileDownload from '@mui/icons-material/FileDownload';
import FilterList from '@mui/icons-material/FilterList';
import ContentPasteSearch from '@mui/icons-material/ContentPasteSearch';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { formatMDYAbv, formatUser } from '@/lib/utils/utils';
import dayjs from 'dayjs';
import { BASE_COLOR_LIGHT, dataGridFocusStyles } from '@/styles/theme';
import SubstatusSelect from '@/components/common/SubstatusSelect';
import RecoveryStatusSelect from '@/components/common/RecoveryStatusSelect';
import { ClaimSubstatus, RecoveryStatus } from '@/config/enums';

export interface MyClaimListItem {
	id: number;
	claim_number: string | null;
	client: string | null;
	insured: string | null;
	claim_amount: string | number | null;
	date_of_loss: Date | null;
	last_update: string | null;
	actual_recovery: string | number | null;
	expected_recovery: string | number | null;
	recovery_status: string | null;
	substatus?: string | null;
	created_at: Date | null;
	// Desk queue fields (listMyDeskClaims)
	desk_location_id?: number | null;
	desk_priority?: number;
	desk_location_name?: string | null;
	// Checklist-based fields (listMyClaims) - optional for compatibility
	claim_status?: string;
	checklist_id?: number;
	checklist_name?: string | null;
	assignee?: string | null;
	assigned_at?: Date | null;
	assignee_first?: string | null;
	assignee_last?: string | null;
	assignee_email?: string | null;
}

interface MyClaimsQueueTableProps {
	rows: MyClaimListItem[];
	count: number;
	isFetching: boolean;
	searchTerm: string;
	setSearchTerm: (value: string) => void;
	appliedSubstatus: string | null;
	appliedRecoveryStatus: string | null;
	appliedSearch: string;
	hasActiveFilters: boolean;
	filtersAnchorEl: PopperProps['anchorEl'];
	handleOpenFilters: (e: React.MouseEvent) => void;
	handleCloseFilters: () => void;
	handleClearAllFilters: () => void;
	draftSubstatus: string | null;
	setDraftSubstatus: (value: string | null) => void;
	draftRecoveryStatus: string | null;
	setDraftRecoveryStatus: (value: string | null) => void;
	handleApplyFilters: () => void;
	showDeskColumn?: boolean;
}

export default function MyClaimsQueueTable({
	rows,
	count,
	isFetching,
	searchTerm,
	setSearchTerm,
	appliedSubstatus,
	appliedRecoveryStatus,
	appliedSearch,
	hasActiveFilters,
	filtersAnchorEl,
	handleOpenFilters,
	handleCloseFilters,
	handleClearAllFilters,
	draftSubstatus,
	setDraftSubstatus,
	draftRecoveryStatus,
	setDraftRecoveryStatus,
	handleApplyFilters,
	showDeskColumn = false,
}: MyClaimsQueueTableProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	// Handle row click - update URL with selected claim ID
	const handleRowClick = (params: any) => {
		const claimId = params.row.id;
		const newParams = new URLSearchParams(searchParams.toString());
		newParams.set('selected', claimId.toString());
		router.push(`${pathname}?${newParams.toString()}`);
	};

	// Export to CSV
	const handleExport = () => {
		if (!rows || rows.length === 0) return;

		const headers = showDeskColumn
			? ['Claim Number', 'Desk', 'Insured', 'Expected Recovery', 'Actual Recovery', 'Status', 'Last Update']
			: ['Claim Number', 'Insured', 'Expected Recovery', 'Actual Recovery', 'Status', 'Last Update'];

		const csvRows = rows.map((row: MyClaimListItem) => {
			const baseRow = [row.claim_number || ''];

			if (showDeskColumn) {
				baseRow.push(row.desk_location_name || '');
			}

			baseRow.push(
				row.insured || '',
				row.expected_recovery?.toString() || '',
				row.actual_recovery?.toString() || '',
				formatClaimStatus(row.recovery_status, row.substatus)
			);

			baseRow.push(row.last_update ? dayjs(row.last_update).format('MM/DD/YYYY') : '');

			return baseRow;
		});

		const csvContent = [
			headers.join(','),
			...csvRows.map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(',')),
		].join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `my-claims-${dayjs().format('YYYY-MM-DD')}.csv`;
		a.click();
		window.URL.revokeObjectURL(url);
	};

	// Last activity indicator
	const getActivityIndicator = (lastUpdate: string | null) => {
		if (!lastUpdate) return null;
		const daysSince = dayjs().diff(dayjs(lastUpdate), 'day');
		if (daysSince === 0) return <Box sx={{ ...styles.indicator, bgcolor: 'success.main' }} />;
		if (daysSince <= 7) return <Box sx={{ ...styles.indicator, bgcolor: 'warning.main' }} />;
		return <Box sx={{ ...styles.indicator, bgcolor: 'error.main' }} />;
	};

	// DataGrid columns
	const columns: GridColDef<MyClaimListItem>[] = useMemo(() => {
		const baseColumns: GridColDef<MyClaimListItem>[] = [
			{
				field: 'status',
				headerName: 'Status',
				renderHeader: (params) => <IconHeaderCell {...(params as any)} />,
				renderCell: (params) => (
					<ClaimStatusChip
						recoveryStatus={params.row.recovery_status}
						substatus={params.row.substatus}
					/>
				),
				width: 200,
			},
			{
				field: 'claim_number',
				headerName: 'Claim',
				renderHeader: (params) => (
					<IconHeaderCell
						{...(params as any)}
						icon={<ContentPasteSearch sx={{ color: BASE_COLOR_LIGHT }} />}
					/>
				),
				cellClassName: 'cell-bold',
				width: 220,
			},
		];

		if (showDeskColumn) {
			baseColumns.push({
				field: 'desk_location_name',
				headerName: 'Desk',
				renderHeader: (params) => <IconHeaderCell {...(params as any)} />,
				width: 180,
			});
		}

		baseColumns.push(
			{
				field: 'insured',
				headerName: 'Insured',
				renderHeader: (params) => <IconHeaderCell {...(params as any)} />,
				width: 180,
			},
			{
				field: 'expected_recovery',
				headerName: 'Expected',
				renderHeader: (params) => <IconHeaderCell {...(params as any)} />,
				renderCell: (params) => formatCurrencyExact(parseFloat(params.value?.toString() || '0')),
				align: 'right',
				width: 130,
			},
			{
				field: 'actual_recovery',
				headerName: 'Actual',
				renderHeader: (params) => <IconHeaderCell {...(params as any)} />,
				renderCell: (params) => formatCurrencyExact(parseFloat(params.value?.toString() || '0')),
				align: 'right',
				width: 130,
			}
		);

		baseColumns.push({
			field: 'last_update',
			headerName: 'Last Update',
			renderHeader: (params) => <IconHeaderCell {...(params as any)} />,
			renderCell: (params) => (
				<Box display="flex" alignItems="center" gap={1}>
					{getActivityIndicator(params.value)}
					{formatMDYAbv(params.value)}
				</Box>
			),
			align: 'right',
			width: 140,
		});

		return baseColumns;
	}, [showDeskColumn]);

	return (
		<>
			{/* Search and Filters Toolbar */}
			<Toolbar
				left={
					<Box display="flex" gap={1} alignItems="center">
						<SearchInput
							value={searchTerm}
							onChange={(value) => setSearchTerm(value)}
							placeholder="Search by claim number, insured, or client..."
							width={350}
						/>
						<BasicButtonStyled
							buttonProps={{
								onClick: handleOpenFilters,
								endIcon: <FilterList />,
							}}
						>
							Filters...
							{hasActiveFilters && (
								<Box
									component="span"
									sx={{
										ml: 0.5,
										bgcolor: 'primary.main',
										color: 'white',
										borderRadius: '50%',
										width: 18,
										height: 18,
										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										fontSize: 11,
										fontWeight: 600,
									}}
								>
									{[appliedSubstatus, appliedRecoveryStatus, appliedSearch].filter(Boolean).length}
								</Box>
							)}
						</BasicButtonStyled>
						{hasActiveFilters && (
							<BasicButtonStyled
								buttonProps={{
									onClick: handleClearAllFilters,
									size: 'small',
								}}
							>
								Clear all filters
							</BasicButtonStyled>
						)}
					</Box>
				}
				right={
					<Button
						variant="contained"
						startIcon={<FileDownload />}
						onClick={handleExport}
						disabled={rows.length === 0}
					>
						Export
					</Button>
				}
				height={45}
				padding={'0px 10px'}
			/>

			{/* Filters Popper */}
			{!!filtersAnchorEl && (
				<BasicPopper anchorEl={filtersAnchorEl} setAnchorEl={handleCloseFilters} placement="bottom-start">
					<Paper sx={styles.filtersPaper}>
						<Typography fontSize={14} fontWeight={600} marginBottom={2}>
							Filter Claims
						</Typography>
						<Box display="flex" flexDirection="column" gap={2}>
							<SubstatusSelect
								substatus={draftSubstatus as ClaimSubstatus | null}
								setSubstatus={(status) => setDraftSubstatus(status as string | null)}
								text="Status"
							/>
							<RecoveryStatusSelect
								recoveryStatus={draftRecoveryStatus as RecoveryStatus | null}
								setRecoveryStatus={(status) => setDraftRecoveryStatus(status as string | null)}
								text="Recovery"
							/>
						</Box>
						<Box display="flex" gap={1} marginTop={2} justifyContent="flex-end">
							<Button size="small" onClick={handleCloseFilters}>
								Cancel
							</Button>
							<Button size="small" variant="contained" onClick={handleApplyFilters}>
								Apply
							</Button>
						</Box>
					</Paper>
				</BasicPopper>
			)}

			{/* DataGrid */}
			<Box sx={styles.table}>
				<DataGridPro
					rows={rows}
					columns={columns}
					loading={isFetching}
					rowHeight={60}
					columnHeaderHeight={45}
					onRowClick={handleRowClick}
					getRowClassName={() => 'cursor-pointer'}
					hideFooter={true}
					disableColumnSelector={true}
					disableColumnMenu={true}
					initialState={{
						pinnedColumns: { left: ['claim_status'] },
					}}
					sx={styles.tableOverrides}
					slots={{
						noRowsOverlay: () => (
							<CustomNoRowsOverlay
								text={hasActiveFilters ? 'No claims match your filters' : 'No claims in this queue'}
								icon={<ContentPasteSearch sx={{ fontSize: 35, color: BASE_COLOR_LIGHT }} />}
							/>
						),
					}}
				/>
			</Box>
		</>
	);
}

const styles = {
	table: {
		width: '100%',
		height: 'calc(100% - 250px)', // Account for toolbar
	},
	tableOverrides: {
		border: 'none',
		...dataGridFocusStyles,
	},
	filtersPaper: {
		mt: 0.625,
		padding: '24px',
		minWidth: 300,
		maxWidth: 400,
	},
	indicator: {
		width: 8,
		height: 8,
		borderRadius: '50%',
		marginLeft: 1,
	},
};
