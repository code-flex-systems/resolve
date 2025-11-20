'use client';

import { DataGridPro, GridColDef } from '@mui/x-data-grid-pro';
import { useAdminStore } from '@/stores/useAdminStore';
import { formatMDYAbv } from '@/lib/utils/utils';
import ClaimAmountCell from './ClaimAmountCell';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import {
	Autocomplete,
	Box,
	Button,
	Collapse,
	Fade,
	IconButton,
	Paper,
	PopperProps,
	Switch,
	TextField,
	Typography,
} from '@mui/material';
import AddBox from '@mui/icons-material/AddBox';
import ContentPasteSearch from '@mui/icons-material/ContentPasteSearch';
import PersonSearch from '@mui/icons-material/PersonSearch';
import Upload from '@mui/icons-material/Upload';
import Search from '@mui/icons-material/Search';
import FilterList from '@mui/icons-material/FilterList';
import Clear from '@mui/icons-material/Clear';
import IconHeaderCell from '../common/IconHeaderCell';
import CustomPagination from '../common/CustomPagination';
import Toolbar from '../common/Toolbar';
import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useFeedTrpc } from '@/hooks/trpc/useFeedTrpc';
import theme, { BASE_COLOR_LIGHT } from '@/styles/theme';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import { formatRecoveryStatus } from '@/lib/utils/recoveryUtils';
import { formatLineOfBusiness, formatLossType } from '@/lib/utils/claimUtils';
import Visibility from '@mui/icons-material/Visibility';
import LineOfBusinessSelect from '../common/LineOfBusinessSelect';
import LossTypeSelect from '../common/LossTypeSelect';
import RecoveryStatusSelect from '../common/RecoveryStatusSelect';
import BasicButtonStyled from '../common/BasicButtonStyled';
import BasicPopper from '../common/BasicPopper';
import { LineOfBusiness, LossType, RecoveryStatus, ClaimSearch } from '@/config/enums';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import ClaimDetailPanel from './ClaimDetailPanel';
import useDebounce from '@/lib/utils/useDebounce';
import { useUrlFilters } from '@/hooks/useUrlFilters';

const COLUMNS: GridColDef[] = [
	{
		headerName: 'Claim',
		field: 'claim_number',
		renderHeader: (params) => (
			<IconHeaderCell {...params} icon={<ContentPasteSearch sx={{ color: BASE_COLOR_LIGHT }} />} />
		),
		width: 150,
	},
	{
		headerName: 'Client',
		field: 'client',
		renderHeader: (params) => (
			<IconHeaderCell {...params} icon={<PersonSearch sx={{ color: BASE_COLOR_LIGHT }} />} />
		),
		width: 150,
	},
	{
		headerName: 'Client Adjuster',
		field: 'client_adjuster',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		width: 150,
	},
	{
		headerName: 'Insured',
		field: 'insured',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		width: 150,
	},
	{
		headerName: 'Claim Amount',
		field: 'claim_amount',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		renderCell: (params) => <ClaimAmountCell {...params} />,
		width: 150,
	},
	{
		headerName: 'Total Incurred',
		field: 'total_incurred',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		renderCell: (params) => <ClaimAmountCell {...params} />,
		width: 150,
	},
	{
		headerName: 'Date of Loss',
		field: 'date_of_loss',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		valueFormatter: (value: any) => formatMDYAbv(value),
		align: 'right',
		width: 150,
	},
	{
		headerName: 'Loss Location',
		field: 'loss_location',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		width: 150,
	},
	{
		headerName: 'Last Updated By',
		field: 'last_updated_by',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		width: 150,
	},
	{
		headerName: 'Last Update',
		field: 'last_update',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		valueFormatter: (value: any) => formatMDYAbv(value),
		align: 'right',
		width: 150,
	},
	{
		headerName: 'Expected Recovery',
		field: 'expected_recovery',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		renderCell: (params) => <ClaimAmountCell {...params} />,
		width: 150,
	},
	{
		headerName: 'Actual Recovery',
		field: 'actual_recovery',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		renderCell: (params) => <ClaimAmountCell {...params} />,
		width: 150,
	},
	{
		headerName: 'Line of Business',
		field: 'line_of_business',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		valueFormatter: (v) => formatLineOfBusiness(v),
		width: 150,
	},
	{
		headerName: 'Loss Type',
		field: 'loss_type',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		valueFormatter: (v) => formatLossType(v),
		width: 150,
	},
	{
		headerName: 'Recovery Status',
		field: 'recovery_status',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		valueFormatter: (v) => formatRecoveryStatus(v),
		width: 150,
	},
];

function NoRows() {
	return (
		<CustomNoRowsOverlay
			text="No claims found"
			icon={<ContentPasteSearch sx={{ fontSize: 35, color: BASE_COLOR_LIGHT }} />}
		/>
	);
}

export default function Claims() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const claimConstraints = useAdminStore((state) => state.claimConstraints);
	const selectedFeedId = useAdminStore((state) => state.selectedFeedId);
	const setFeedId = useAdminStore((state) => state.setFeedId);
	const toggleImportClaimsDialog = useAdminStore((state) => state.toggleImportClaimsDialog);
	const updateClaimConstraints = useAdminStore((state) => state.updateClaimConstraints);

	// URL filters hook for managing filters via search params
	const { getParam, getBoolParam, setParams, clearParams, setParam } = useUrlFilters();

	// Applied filter states (read from URL params)
	const appliedLob = getParam('lob');
	const appliedLossType = getParam('loss_type');
	const appliedRecoveryStatus = getParam('recovery_status');
	const appliedInsured = getParam('insured');
	const appliedClient = getParam('client');
	const appliedManualOnly = getBoolParam('manual_only');

	// Draft filter states (in the popper, not yet applied)
	const [draftLob, setDraftLob] = useState<string | null>(null);
	const [draftLossType, setDraftLossType] = useState<string | null>(null);
	const [draftRecoveryStatus, setDraftRecoveryStatus] = useState<string | null>(null);
	const [draftInsured, setDraftInsured] = useState<string | null>(null);
	const [draftClient, setDraftClient] = useState<string | null>(null);
	const [draftManualOnly, setDraftManualOnly] = useState(false);

	// Claim number search - synced with URL param
	const appliedClaimNumber = getParam('claim_number') ?? '';
	const [claimNumberSearch, setClaimNumberSearch] = useState(appliedClaimNumber);

	// Search states for autocompletes (in filters popper)
	const [insuredSearchTerm, setInsuredSearchTerm] = useState('');
	const [clientSearchTerm, setClientSearchTerm] = useState('');
	const [debouncedInsuredSearch, setDebouncedInsuredSearch] = useState('');
	const [debouncedClientSearch, setDebouncedClientSearch] = useState('');

	// Autocomplete options
	const [insuredOptions, setInsuredOptions] = useState<string[]>([]);
	const [clientOptions, setClientOptions] = useState<string[]>([]);

	const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);
	const [filtersAnchorEl, setFiltersAnchorEl] = useState<PopperProps['anchorEl']>();

	const { data: feeds = [] } = useFeedTrpc().list();
	const trpcUtils = useClaimTrpc();

	// Use applied filters for the actual query
	const effectiveFeedId = appliedManualOnly ? null : selectedFeedId;

	const { data = { rows: [], count: undefined }, isFetching } = trpcUtils.list({
		feedId: effectiveFeedId,
		searchTerm: appliedClaimNumber ? { value: appliedClaimNumber, type: ClaimSearch.CLAIM_NUMBER } : undefined,
		line_of_business: (appliedLob as LineOfBusiness) ?? undefined,
		loss_type: (appliedLossType as LossType) ?? undefined,
		recovery_status: (appliedRecoveryStatus as RecoveryStatus) ?? undefined,
		insured: appliedInsured ?? undefined,
		client: appliedClient ?? undefined,
		limit: claimConstraints.pageSize,
		offset: claimConstraints.page * claimConstraints.pageSize,
	});
	const rowCountRef = useRef(typeof data.count === 'number' ? data.count : 0);

	const rowCount = useMemo(() => {
		if (typeof data.count === 'number') {
			rowCountRef.current = data.count;
		}
		return rowCountRef.current;
	}, [data.count]);

	const selectedFeed = useMemo(() => {
		if (!selectedFeedId) return;
		return feeds.find((f) => f.id === selectedFeedId);
	}, [feeds, selectedFeedId]);

	// Debounce claim number search - write to URL param
	const debouncedClaimSearch = useCallback(
		useDebounce((search: string) => setParam('claim_number', search), 500),
		[setParam]
	);

	// Debounce insured search
	const debouncedInsuredSearchCallback = useCallback(
		useDebounce((search: string) => setDebouncedInsuredSearch(search), 500),
		[]
	);

	// Debounce client search
	const debouncedClientSearchCallback = useCallback(
		useDebounce((search: string) => setDebouncedClientSearch(search), 500),
		[]
	);

	// Sync local search state with URL param changes
	useEffect(() => {
		setClaimNumberSearch(appliedClaimNumber);
	}, [appliedClaimNumber]);

	// Debounce local search input to URL param
	useEffect(() => {
		debouncedClaimSearch(claimNumberSearch);
	}, [claimNumberSearch, debouncedClaimSearch]);

	useEffect(() => {
		debouncedInsuredSearchCallback(insuredSearchTerm);
	}, [insuredSearchTerm, debouncedInsuredSearchCallback]);

	useEffect(() => {
		debouncedClientSearchCallback(clientSearchTerm);
	}, [clientSearchTerm, debouncedClientSearchCallback]);

	// Fetch insured options (initial 20, then search-based)
	useEffect(() => {
		if (data.rows && Array.isArray(data.rows)) {
			const insureds = [...new Set(data.rows.map((r: any) => r.insured).filter(Boolean))].sort() as string[];

			// If we have 20 or fewer unique insureds, show them all
			// Otherwise, only show results when user types
			if (insureds.length <= 20) {
				setInsuredOptions(insureds);
			} else if (debouncedInsuredSearch) {
				const filtered = insureds.filter((ins) =>
					ins.toLowerCase().includes(debouncedInsuredSearch.toLowerCase())
				);
				setInsuredOptions(filtered.slice(0, 20));
			} else {
				setInsuredOptions([]);
			}
		}
	}, [data.rows, debouncedInsuredSearch]);

	// Fetch client options (initial 20, then search-based)
	useEffect(() => {
		if (data.rows && Array.isArray(data.rows)) {
			const clients = [...new Set(data.rows.map((r: any) => r.client).filter(Boolean))].sort() as string[];

			// If we have 20 or fewer unique clients, show them all
			// Otherwise, only show results when user types
			if (clients.length <= 20) {
				setClientOptions(clients);
			} else if (debouncedClientSearch) {
				const filtered = clients.filter((cl) => cl.toLowerCase().includes(debouncedClientSearch.toLowerCase()));
				setClientOptions(filtered.slice(0, 20));
			} else {
				setClientOptions([]);
			}
		}
	}, [data.rows, debouncedClientSearch]);

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
		setDraftLob(appliedLob);
		setDraftLossType(appliedLossType);
		setDraftRecoveryStatus(appliedRecoveryStatus);
		setDraftInsured(appliedInsured);
		setDraftClient(appliedClient);
		setDraftManualOnly(appliedManualOnly);
		// Initialize search terms with current values
		setInsuredSearchTerm(appliedInsured ?? '');
		setClientSearchTerm(appliedClient ?? '');
		setFiltersAnchorEl(e.currentTarget);
	};

	// Apply filters from draft to URL params
	const handleApplyFilters = () => {
		setParams({
			lob: draftLob,
			loss_type: draftLossType,
			recovery_status: draftRecoveryStatus,
			insured: draftInsured,
			client: draftClient,
			manual_only: draftManualOnly,
		});
		if (draftManualOnly) {
			setFeedId(null);
		}
		// Reset search terms
		setInsuredSearchTerm('');
		setClientSearchTerm('');
		setFiltersAnchorEl(null);
	};

	// Clear all filters from URL params
	const handleClearAllFilters = () => {
		// Clear all URL params except 'selected' (claim detail panel)
		clearParams(['selected']);
		// Reset draft states
		setDraftLob(null);
		setDraftLossType(null);
		setDraftRecoveryStatus(null);
		setDraftInsured(null);
		setDraftClient(null);
		setDraftManualOnly(false);
		setInsuredSearchTerm('');
		setClientSearchTerm('');
		setClaimNumberSearch('');
		setFeedId(undefined);
	};

	// Handle closing filters popper - reset search terms
	const handleCloseFilters = useCallback(() => {
		setInsuredSearchTerm('');
		setClientSearchTerm('');
		setFiltersAnchorEl(null);
	}, []);

	const hasActiveFilters =
		appliedLob ||
		appliedLossType ||
		appliedRecoveryStatus ||
		appliedInsured ||
		appliedClient ||
		appliedManualOnly ||
		appliedClaimNumber;

	return (
		<Fade in={true} timeout={1000}>
			<div style={styles.container} className="flex-col-start">
				<Paper sx={styles.paper} className="flex-col-start">
					{/* Main Toolbar: Title and Actions */}
					<Toolbar
						left={<Typography variant="h6">Claims</Typography>}
						right={
							<>
								<Button
									variant="contained"
									color="secondary"
									startIcon={<Upload />}
									onClick={toggleImportClaimsDialog}
									sx={{ marginRight: '10px' }}
								>
									Import
								</Button>
								<Button
									variant="contained"
									startIcon={<AddBox />}
									onClick={() => router.push('/admin/claims/edit')}
								>
									Claim
								</Button>
							</>
						}
						leftWidth="70%"
						rightWidth="30%"
						height={50}
						padding={'0px 10px'}
					/>

					{/* Search and Filters Toolbar */}
					<Toolbar
						left={
							<Box display="flex" gap={1} alignItems="center">
								<Paper elevation={0} sx={styles.searchPaper}>
									<Search sx={{ fontSize: 17, marginRight: '5px' }} />
									<input
										placeholder="Search by claim number..."
										type="text"
										style={styles.textField}
										value={claimNumberSearch}
										onChange={(e) => setClaimNumberSearch(e.target.value)}
									/>
									{claimNumberSearch && (
										<IconButton
											size="small"
											onClick={() => setClaimNumberSearch('')}
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
												[
													appliedLob,
													appliedLossType,
													appliedRecoveryStatus,
													appliedInsured,
													appliedClient,
													appliedManualOnly,
													appliedClaimNumber,
												].filter(Boolean).length
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
								<Collapse in={!!selectedFeed} orientation="horizontal">
									<Box display="flex" alignItems="center" marginLeft="5px">
										<Visibility sx={{ color: 'text.secondary', fontSize: 18 }} />
										<Typography fontSize={14} lineHeight="18px" marginLeft="8px" noWrap>
											Viewing{' '}
											<span style={{ color: theme.palette.primary.main, fontWeight: 600 }}>
												{selectedFeed?.name ?? ''}
											</span>
										</Typography>
									</Box>
								</Collapse>
							</Box>
						}
						leftWidth="100%"
						rightWidth="0%"
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
									Filter Claims
								</Typography>
								<Box display="flex" flexDirection="column" gap={2}>
									<Box display="flex" alignItems="center" gap={1}>
										<Switch
											size="small"
											checked={draftManualOnly}
											onChange={(_, checked) => setDraftManualOnly(checked)}
										/>
										<Typography fontSize={13}>Only Manual Claims</Typography>
									</Box>
									<Box>
										<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={1}>
											Line of Business
										</Typography>
										<LineOfBusinessSelect
											lineOfBusiness={draftLob}
											setLineOfBusiness={setDraftLob}
											clearable={true}
											height={32}
										/>
									</Box>
									<Box>
										<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={1}>
											Loss Type
										</Typography>
										<LossTypeSelect
											lossType={draftLossType}
											setLossType={setDraftLossType}
											clearable={true}
											height={32}
										/>
									</Box>
									<Box>
										<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={1}>
											Recovery Status
										</Typography>
										<RecoveryStatusSelect
											recoveryStatus={draftRecoveryStatus}
											setRecoveryStatus={setDraftRecoveryStatus}
											clearable={true}
											height={32}
										/>
									</Box>
									<Box>
										<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={1}>
											Insured
										</Typography>
										<Autocomplete
											freeSolo
											options={insuredOptions}
											value={draftInsured ?? ''}
											onInputChange={(_, value) => {
												setInsuredSearchTerm(value);
											}}
											onChange={(_, newValue) => {
												setDraftInsured(typeof newValue === 'string' ? newValue : null);
											}}
											renderInput={(params) => (
												<TextField
													{...params}
													variant="outlined"
													placeholder={
														insuredOptions.length === 0 && !insuredSearchTerm
															? 'Type to search...'
															: 'Search insured...'
													}
													size="small"
												/>
											)}
											noOptionsText={insuredSearchTerm ? 'No matches' : 'Type to search'}
											sx={styles.autocomplete}
										/>
									</Box>
									<Box>
										<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={1}>
											Client
										</Typography>
										<Autocomplete
											freeSolo
											options={clientOptions}
											value={draftClient ?? ''}
											onInputChange={(_, value) => {
												setClientSearchTerm(value);
											}}
											onChange={(_, newValue) => {
												setDraftClient(typeof newValue === 'string' ? newValue : null);
											}}
											renderInput={(params) => (
												<TextField
													{...params}
													variant="outlined"
													placeholder={
														clientOptions.length === 0 && !clientSearchTerm
															? 'Type to search...'
															: 'Search client...'
													}
													size="small"
												/>
											)}
											noOptionsText={clientSearchTerm ? 'No matches' : 'Type to search'}
											sx={styles.autocomplete}
										/>
									</Box>
								</Box>
								<Box
									display="flex"
									justifyContent="flex-end"
									marginTop={2}
									paddingTop={2}
									borderTop="1px solid #e0e0e0"
								>
									<Button variant="contained" onClick={handleApplyFilters} size="small">
										Apply
									</Button>
								</Box>
							</Paper>
						</BasicPopper>
					)}

					<div style={styles.table}>
						<DataGridPro
							columns={COLUMNS}
							columnHeaderHeight={45}
							loading={isFetching}
							slots={{
								pagination: CustomPagination,
								noRowsOverlay: NoRows,
								noResultsOverlay: NoRows,
							}}
							slotProps={{
								loadingOverlay: {
									noRowsVariant: 'skeleton',
									variant: 'skeleton',
								},
							}}
							initialState={{
								pagination: { paginationModel: { pageSize: 20 } },
							}}
							rows={Array.isArray(data.rows) ? data.rows : []}
							rowCount={rowCount}
							rowHeight={40}
							hideFooterSelectedRowCount
							pageSizeOptions={[]}
							pagination
							paginationMode="server"
							paginationModel={claimConstraints}
							onPaginationModelChange={updateClaimConstraints}
							onRowClick={handleRowClick}
							getRowClassName={(params) => (params.indexRelativeToCurrentPage % 2 === 0 ? 'striped' : '')}
							disableColumnSelector
							disableColumnMenu
							sx={{
								...styles.tableOverrides,
								'& .MuiDataGrid-row': {
									cursor: 'pointer',
								},
							}}
						/>
					</div>
				</Paper>
				<ClaimDetailPanel claimId={selectedClaimId} open={!!selectedClaimId} onClose={handleClosePanel} />
			</div>
		</Fade>
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
	autocomplete: {
		'& .MuiOutlinedInput-root': {
			padding: '3px 9px',
		},
		'& .MuiInputBase-input': {
			fontSize: 13,
		},
	},
};
