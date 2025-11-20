'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Paper, IconButton, PopperProps, Typography, Button } from '@mui/material';
import { DataGridPro, GridColDef } from '@mui/x-data-grid-pro';
import { useClaimTrpc, type MyClaimListItem } from '@/hooks/trpc/useClaimTrpc';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ClaimDetailPanel from '@/components/admin/ClaimDetailPanel';
import ClaimStatusSelect from '@/components/common/ClaimStatusSelect';
import RecoveryStatusSelect from '@/components/common/RecoveryStatusSelect';
import MyClaimsMetrics from './MyClaimsMetrics';
import MyClaimsDeadlines from './MyClaimsDeadlines';
import CustomNoRowsOverlay from '@/components/common/CustomNoRowsOverlay';
import IconHeaderCell from '@/components/common/IconHeaderCell';
import StackedHeaderCell from '@/components/common/StackedHeaderCell';
import ClaimStatusCell from '@/components/metrics/Claims/ClaimStatusCell';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import BasicPopper from '@/components/common/BasicPopper';
import Toolbar from '@/components/common/Toolbar';
import Search from '@mui/icons-material/Search';
import FileDownload from '@mui/icons-material/FileDownload';
import FilterList from '@mui/icons-material/FilterList';
import Clear from '@mui/icons-material/Clear';
import ContentPasteSearch from '@mui/icons-material/ContentPasteSearch';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { formatMDYAbv, formatUser } from '@/lib/utils/utils';
import dayjs from 'dayjs';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { ClaimStatus, RecoveryStatus } from '@/config/enums';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import useDebounce from '@/lib/utils/useDebounce';

export default function MyClaims() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const claimTrpc = useClaimTrpc();

	// URL filters hook
	const { getParam, setParams, clearParams, setParam } = useUrlFilters();

	// Applied filter states (read from URL params)
	const appliedClaimStatus = getParam('status');
	const appliedRecoveryStatus = getParam('recovery_status');
	const appliedSearch = getParam('search') ?? '';

	// Draft filter states (in the popper, not yet applied)
	const [draftClaimStatus, setDraftClaimStatus] = useState<string | null>(null);
	const [draftRecoveryStatus, setDraftRecoveryStatus] = useState<string | null>(null);

	// Search state - synced with URL param
	const [searchTerm, setSearchTerm] = useState(appliedSearch);

	// Selected claim for detail panel
	const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);

	// Filters popper
	const [filtersAnchorEl, setFiltersAnchorEl] = useState<PopperProps['anchorEl']>();

	// Debounce search - write to URL param
	const debouncedSearch = useCallback(
		useDebounce((search: string) => setParam('search', search), 500),
		[setParam]
	);

	// Sync local search state with URL param changes
	useEffect(() => {
		setSearchTerm(appliedSearch);
	}, [appliedSearch]);

	// Debounce local search input to URL param
	useEffect(() => {
		debouncedSearch(searchTerm);
	}, [searchTerm, debouncedSearch]);

	// Sync selectedClaimId with URL query param
	useEffect(() => {
		const selected = searchParams.get('selected');
		if (selected) {
			const claimId = parseInt(selected, 10);
			if (!isNaN(claimId)) {
				setSelectedClaimId(claimId);
			}
		} else {
			setSelectedClaimId(null);
		}
	}, [searchParams]);

	// Fetch claims with filters (no pagination)
	const { data, isFetching } = claimTrpc.listMyClaims(
		{
			searchTerm: appliedSearch || undefined,
			claimStatus: (appliedClaimStatus as ClaimStatus) || undefined,
			recoveryStatus: (appliedRecoveryStatus as RecoveryStatus) || undefined,
		},
		{
			refetchOnMount: 'always',
			refetchOnWindowFocus: true,
			staleTime: 0,
		}
	);

	const rows = data?.rows ?? [];
	const count = data?.count ?? 0;
	const metrics = data?.metrics ?? { totalValue: 0, avgDaysInQueue: 0 };

	// Handle row click - update URL with selected claim ID
	const handleRowClick = (params: any) => {
		const claimId = params.row.id;
		const newParams = new URLSearchParams(searchParams.toString());
		newParams.set('selected', claimId.toString());
		router.push(`${pathname}?${newParams.toString()}`);
	};

	// Handle panel close - clear selected claim from URL
	const handleClosePanel = () => {
		const newParams = new URLSearchParams(searchParams.toString());
		newParams.delete('selected');
		router.push(`${pathname}${newParams.toString() ? `?${newParams.toString()}` : ''}`);
	};

	// Handle opening filters popper - sync draft states with applied states
	const handleOpenFilters = (e: React.MouseEvent) => {
		setDraftClaimStatus(appliedClaimStatus);
		setDraftRecoveryStatus(appliedRecoveryStatus);
		setFiltersAnchorEl(e.currentTarget);
	};

	// Apply filters from draft to URL params
	const handleApplyFilters = () => {
		setParams({
			status: draftClaimStatus,
			recovery_status: draftRecoveryStatus,
		});
		setFiltersAnchorEl(null);
	};

	// Clear all filters from URL params
	const handleClearAllFilters = () => {
		clearParams(['selected']);
		setDraftClaimStatus(null);
		setDraftRecoveryStatus(null);
		setSearchTerm('');
	};

	// Handle closing filters popper
	const handleCloseFilters = useCallback(() => {
		setFiltersAnchorEl(null);
	}, []);

	const hasActiveFilters = appliedClaimStatus || appliedRecoveryStatus || appliedSearch;

	// Export to CSV
	const handleExport = () => {
		if (!rows || rows.length === 0) return;

		const headers = [
			'Claim Number',
			'Checklist',
			'Insured',
			'Expected Recovery',
			'Actual Recovery',
			'Status',
			'Assignee',
			'Last Update',
		];

		const csvRows = rows.map((row: MyClaimListItem) => [
			row.claim_number || '',
			row.checklist_name || '',
			row.insured || '',
			row.expected_recovery?.toString() || '',
			row.actual_recovery?.toString() || '',
			row.claim_status || '',
			row.assignee ? `${row.assignee_last}, ${row.assignee_first}` : '',
			row.last_update ? dayjs(row.last_update).format('MM/DD/YYYY') : '',
		]);

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
	const columns: GridColDef<MyClaimListItem>[] = useMemo(
		() => [
			{
				field: 'claim_status',
				headerName: 'Status',
				renderHeader: (params) => <IconHeaderCell {...(params as any)} />,
				renderCell: (params) => <ClaimStatusCell {...params} row={{ status: params.row.claim_status }} />,
				width: 150,
				align: 'right',
			},
			{
				field: 'claim_number',
				headerName: 'Claim / Checklist',
				renderHeader: (params) => (
					<IconHeaderCell
						{...(params as any)}
						icon={<ContentPasteSearch sx={{ color: BASE_COLOR_LIGHT }} />}
					/>
				),
				renderCell: (params) => (
					<StackedHeaderCell primary={params.value} secondary={params.row.checklist_name} />
				),
				cellClassName: 'cell-bold',
				width: 220,
			},
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
			},
			{
				field: 'assignee',
				headerName: 'Assignee',
				renderHeader: (params) => <IconHeaderCell {...(params as any)} />,
				renderCell: (params) => {
					const user = formatUser({
						id: params.value,
						first: params.row.assignee_first,
						last: params.row.assignee_last,
						email: params.row.assignee_email,
						phone: null,
					});
					return <StackedHeaderCell primary={user} secondary={params.row.assignee_email} />;
				},
				width: 250,
			},
			{
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
			},
		],
		[]
	);

	return (
		<Box display="flex" gap={2} width="100%" height="100%" padding="20px">
			<Box flexShrink={0}>
				<MyClaimsDeadlines />
			</Box>
			<Box flex={1} minWidth={0} height="100%">
				<Paper sx={styles.paper} className="flex-col-start">
					{/* Main Toolbar: Title and Actions */}
					<Box width="100%" padding="10px">
						<Typography variant="h6">My Claims</Typography>
					</Box>

					{/* Metrics and Legend */}
					<Box
						width="100%"
						display="flex"
						alignItems="center"
						justifyContent="space-between"
						padding="0px 10px"
					>
						<MyClaimsMetrics
							count={count}
							totalValue={metrics.totalValue}
							avgDaysInQueue={metrics.avgDaysInQueue}
							isLoading={isFetching}
						/>
						<Box display="flex" flexDirection="column" gap={0.5} mr={2}>
							<Typography fontSize={11} fontWeight={600} color="text.secondary" mb={0.5}>
								LAST ACTIVITY
							</Typography>
							<Box display="flex" alignItems="center" gap={0.75}>
								<Box sx={{ ...styles.indicator, bgcolor: 'success.main' }} />
								<Typography fontSize={12}>Today</Typography>
							</Box>
							<Box display="flex" alignItems="center" gap={0.75}>
								<Box sx={{ ...styles.indicator, bgcolor: 'warning.main' }} />
								<Typography fontSize={12}>Within 7 days</Typography>
							</Box>
							<Box display="flex" alignItems="center" gap={0.75}>
								<Box sx={{ ...styles.indicator, bgcolor: 'error.main' }} />
								<Typography fontSize={12}>Over 7 days</Typography>
							</Box>
						</Box>
					</Box>

					{/* Search and Filters Toolbar */}
					<Toolbar
						left={
							<Box display="flex" gap={1} alignItems="center">
								<Paper elevation={0} sx={styles.searchPaper}>
									<Search sx={{ fontSize: 17, marginRight: '5px' }} />
									<input
										placeholder="Search by claim number, insured, or client..."
										type="text"
										style={styles.textField}
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
									/>
									{searchTerm && (
										<IconButton
											size="small"
											onClick={() => setSearchTerm('')}
											sx={{ padding: '2px', marginLeft: '2px' }}
										>
											<Clear sx={{ fontSize: 16 }} />
										</IconButton>
									)}
								</Paper>
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
											{
												[appliedClaimStatus, appliedRecoveryStatus, appliedSearch].filter(
													Boolean
												).length
											}
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
						<BasicPopper
							anchorEl={filtersAnchorEl}
							setAnchorEl={handleCloseFilters}
							placement="bottom-start"
						>
							<Paper sx={styles.filtersPaper}>
								<Typography fontSize={14} fontWeight={600} marginBottom={2}>
									Filter My Claims
								</Typography>
								<Box display="flex" flexDirection="column" gap={2}>
									<ClaimStatusSelect
										claimStatus={draftClaimStatus as ClaimStatus | null}
										setClaimStatus={(status) => setDraftClaimStatus(status as string | null)}
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

					{/* DataGrid and Deadlines */}
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
										text={
											hasActiveFilters
												? 'No claims match your filters'
												: 'No claims assigned to you'
										}
										icon={<ContentPasteSearch sx={{ fontSize: 35, color: BASE_COLOR_LIGHT }} />}
									/>
								),
							}}
						/>
					</Box>
				</Paper>
			</Box>

			{/* Claim Detail Panel */}
			<ClaimDetailPanel claimId={selectedClaimId} open={!!selectedClaimId} onClose={handleClosePanel} />
		</Box>
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
		height: 'calc(100% - 95px)', // Account for two toolbars (50px + 45px)
	},
	tableOverrides: {
		border: 'none',
	},
	searchPaper: {
		display: 'flex',
		alignItems: 'center',
		bgcolor: 'white',
		border: `1px solid ${BASE_COLOR_LIGHT}`,
		borderRadius: 2,
		padding: '5px 10px',
		minWidth: 250,
	},
	textField: {
		border: 'none',
		outline: 'none',
		padding: '2px 5px',
		width: '100%',
		fontSize: 13,
		fontFamily: 'Inter',
	} as React.CSSProperties,
	filtersPaper: {
		outline: 1,
		outlineColor: 'divider',
		marginTop: '5px',
		padding: '15px',
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
