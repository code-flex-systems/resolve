'use client';

import { IconEye, IconFileSearch, IconFilter, IconSquarePlus, IconUpload, IconUserSearch } from '@tabler/icons-react';
import Combobox, { type ComboboxOption } from '@/components/ui/Combobox';
import Card from '@/components/ui/Card';
import Collapse from '@/components/ui/Collapse';
import Switch from '@/components/ui/Switch';
import Button from '@/components/ui/Button';
import { useAdminStore } from '@/stores/useAdminStore';
import { formatAmount, formatMDYAbv } from '@/lib/utils/utils';
import { formatLineOfBusiness, formatLabel } from '@/lib/utils/claimUtils';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { formatCityState } from '@/schemas/addressSchemas';
import PageTransitionWrapper from '../common/PageTransitionWrapper';
import IconHeaderCell from '../common/IconHeaderCell';
import SearchInput from '../common/SearchInput';
import Toolbar from '../common/Toolbar';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useFeedTrpc } from '@/hooks/trpc/useFeedTrpc';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import { formatRecoveryStatus } from '@/lib/utils/recoveryUtils';
import { LineOfBusinessSelect } from '../common/ReferenceDataSelect';
import RecoveryStatusSelect from '../common/RecoveryStatusSelect';
import SubstatusSelect from '../common/SubstatusSelect';
import BasicButtonStyled from '../common/BasicButtonStyled';
import BasicPopper from '../common/BasicPopper';
import { RecoveryStatus, ClaimSearch, ClaimSubstatus } from '@/config/enums';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import ClaimDetailPanel from './ClaimDetailPanel';
import useDebounce from '@/lib/utils/useDebounce';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';

const COLUMNS: ColumnDef<any, any>[] = [
	{
		accessorKey: 'claim_number',
		header: (params) => (
			<IconHeaderCell {...params} icon={<IconFileSearch style={{ color: 'var(--text-muted)' }} />} />
		),
		size: 150,
	},
	{
		accessorKey: 'client',
		header: (params) => (
			<IconHeaderCell {...params} icon={<IconUserSearch style={{ color: 'var(--text-muted)' }} />} />
		),
		size: 150,
	},
	{
		accessorKey: 'client_adjuster',
		header: () => <IconHeaderCell />,
		size: 150,
	},
	{
		accessorKey: 'insured',
		header: () => <IconHeaderCell />,
		size: 150,
	},
	{
		accessorKey: 'date_of_loss',
		header: () => <IconHeaderCell />,
		cell: ({ getValue }) => { const value = getValue(); return formatMDYAbv(value); },
		size: 150,
	},
	{
		accessorKey: 'loss_city',
		header: () => <IconHeaderCell headerName='Loss Location' />,
		size: 150,
	},
	{
		accessorKey: 'line_of_business',
		header: () => <IconHeaderCell />,
		cell: ({ getValue }) => { const v = getValue(); return formatLineOfBusiness(v); },
		size: 150,
	},
	{
		accessorKey: 'recovery_status',
		header: () => <IconHeaderCell />,
		cell: ({ getValue }) => { const v = getValue(); return formatRecoveryStatus(v); },
		size: 150,
	},
	{
		accessorKey: 'substatus',
		header: () => <IconHeaderCell />,
		cell: ({ getValue }) => { const v = getValue(); return formatLabel(v); },
		size: 150,
	},
	// Amount fields grouped at end (ClaimHeader order)
	{
		accessorKey: 'claim_amount',
		header: () => <IconHeaderCell />,
		cell: ({ getValue }) => { const value = getValue(); return (value ? `$${formatAmount(value)}` : '$0.00'); },
		size: 130,
	},
	{
		accessorKey: 'total_incurred',
		header: () => <IconHeaderCell />,
		cell: ({ getValue }) => { const value = getValue(); return (value ? `$${formatAmount(value)}` : '$0.00'); },
		size: 130,
	},
	{
		accessorKey: 'expected_recovery',
		header: () => <IconHeaderCell />,
		cell: ({ getValue }) => { const value = getValue(); return (value ? `$${formatAmount(value)}` : '$0.00'); },
		size: 140,
	},
	{
		accessorKey: 'actual_recovery',
		header: () => <IconHeaderCell />,
		cell: ({ getValue }) => { const value = getValue(); return (value ? `$${formatAmount(value)}` : '$0.00'); },
		size: 130,
	},
];

const PINNED_COLUMNS: { left?: string[]; right?: string[] } = {
	left: ['claim_number'],
};

function NoRows() {
	return (
		<CustomNoRowsOverlay
			text="No claims found"
			icon={<IconFileSearch size={35} style={{ color: 'var(--text-muted)' }} />}
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
	const appliedRecoveryStatus = getParam('recovery_status');
	const appliedSubstatus = getParam('substatus');
	const appliedInsured = getParam('insured');
	const appliedClient = getParam('client');
	const appliedManualOnly = getBoolParam('manual_only');

	// Draft filter states (in the popper, not yet applied)
	const [draftLob, setDraftLob] = useState<string | null>(null);
	const [draftRecoveryStatus, setDraftRecoveryStatus] = useState<string | null>(null);
	const [draftSubstatus, setDraftSubstatus] = useState<ClaimSubstatus | null>(null);
	const [draftInsured, setDraftInsured] = useState<string | null>(null);
	const [draftClient, setDraftClient] = useState<string | null>(null);
	const [draftManualOnly, setDraftManualOnly] = useState(false);

	// Claim number search - synced with URL param
	const appliedClaimNumber = getParam('claim_number') ?? '';
	const [claimNumberSearch, setClaimNumberSearch] = useState('');

	// Search states for autocompletes (in filters popper)
	const [insuredSearchTerm, setInsuredSearchTerm] = useState('');
	const [clientSearchTerm, setClientSearchTerm] = useState('');
	const [debouncedInsuredSearch, setDebouncedInsuredSearch] = useState('');
	const [debouncedClientSearch, setDebouncedClientSearch] = useState('');

	const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);
	const [filtersAnchorEl, setFiltersAnchorEl] = useState<HTMLElement | null>(null);

	const { data: feeds = [] } = useFeedTrpc().list();
	const trpcUtils = useClaimTrpc();

	// Use applied filters for the actual query
	const effectiveFeedId = appliedManualOnly ? null : selectedFeedId;

	const { data = { rows: [], count: undefined }, isFetching } = trpcUtils.list({
		feedId: effectiveFeedId,
		searchTerm: appliedClaimNumber ? { value: appliedClaimNumber, type: ClaimSearch.CLAIM_NUMBER } : undefined,
		line_of_business: appliedLob ?? undefined,
		recovery_status: (appliedRecoveryStatus as RecoveryStatus) ?? undefined,
		substatus: (appliedSubstatus as ClaimSubstatus) ?? undefined,
		insured: appliedInsured ?? undefined,
		client: appliedClient ?? undefined,
		limit: claimConstraints.pageSize,
		offset: claimConstraints.page * claimConstraints.pageSize,
	});

	// Derive unique insureds/clients once (sorted)
	const uniqueInsureds = useMemo(
		() => [...new Set(data.rows.map((r: any) => r.insured).filter(Boolean))].sort() as string[],
		[data.rows]
	);
	const uniqueClients = useMemo(
		() => [...new Set(data.rows.map((r: any) => r.client).filter(Boolean))].sort() as string[],
		[data.rows]
	);

	// Autocomplete options - derived from unique lists and search terms
	const insuredOptions = useMemo(() => {
		if (uniqueInsureds.length <= 20) return uniqueInsureds;
		if (!debouncedInsuredSearch) return [];
		return uniqueInsureds
			.filter((ins) => ins.toLowerCase().includes(debouncedInsuredSearch.toLowerCase()))
			.slice(0, 20);
	}, [uniqueInsureds, debouncedInsuredSearch]);

	const clientOptions = useMemo(() => {
		if (uniqueClients.length <= 20) return uniqueClients;
		if (!debouncedClientSearch) return [];
		return uniqueClients
			.filter((cl) => cl.toLowerCase().includes(debouncedClientSearch.toLowerCase()))
			.slice(0, 20);
	}, [uniqueClients, debouncedClientSearch]);

	const selectedFeed = useMemo(() => {
		if (!selectedFeedId) return;
		return feeds.find((f) => f.id === selectedFeedId);
	}, [feeds, selectedFeedId]);

	// Debounce claim number search - write to URL param
	const debouncedClaimSearch = useDebounce((search: string) => setParam('claim_number', search), 500);

	// Debounce insured search
	const debouncedInsuredSearchCallback = useDebounce((search: string) => setDebouncedInsuredSearch(search), 500);

	// Debounce client search
	const debouncedClientSearchCallback = useDebounce((search: string) => setDebouncedClientSearch(search), 500);

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
	const handleRowClick = (row: any) => {
		const claimId = row.id;
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
		setDraftRecoveryStatus(appliedRecoveryStatus);
		setDraftSubstatus((appliedSubstatus as ClaimSubstatus) ?? null);
		setDraftInsured(appliedInsured);
		setDraftClient(appliedClient);
		setDraftManualOnly(appliedManualOnly);
		// Initialize search terms with current values
		setInsuredSearchTerm(appliedInsured ?? '');
		setClientSearchTerm(appliedClient ?? '');
		setFiltersAnchorEl(e.currentTarget as HTMLElement);
	};

	// Apply filters from draft to URL params
	const handleApplyFilters = () => {
		setParams({
			lob: draftLob,
			recovery_status: draftRecoveryStatus,
			substatus: draftSubstatus,
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
		setDraftRecoveryStatus(null);
		setDraftSubstatus(null);
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
		appliedRecoveryStatus ||
		appliedSubstatus ||
		appliedInsured ||
		appliedClient ||
		appliedManualOnly ||
		appliedClaimNumber;

	// Map string options to ComboboxOption for insured/client
	const insuredComboboxOptions: ComboboxOption[] = insuredOptions.map((s) => ({ value: s, label: s }));
	const clientComboboxOptions: ComboboxOption[] = clientOptions.map((s) => ({ value: s, label: s }));

	const selectedInsuredOption: ComboboxOption | null = draftInsured ? { value: draftInsured, label: draftInsured } : null;
	const selectedClientOption: ComboboxOption | null = draftClient ? { value: draftClient, label: draftClient } : null;

	return (
		<PageTransitionWrapper criticalDataReady={true} loadingMessage="Loading claims...">
			<div style={styles.container} className="flex-col-start">
				<Card variant="beveled" padding="md" style={styles.paper}>
					<p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 12px', lineHeight: 1.5 }}>
						View and manage all claims across the organization. Click a claim to see its full details.
					</p>
					{/* Main Toolbar: Title and Actions */}
					<Toolbar
						left={undefined}
						right={
							<>
								<Button
									variant="contained"
									color="neutral"
									startIcon={<IconUpload size={20} />}
									onClick={toggleImportClaimsDialog}
									style={{ marginRight: '10px' }}
								>
									Import
								</Button>
								<Button
									variant="contained"
									startIcon={<IconSquarePlus size={20} />}
									onClick={() => router.push('/admin/claims/edit')}
								>
									Claim
								</Button>
							</>
						}
						leftWidth="70%"
						rightWidth="30%"
						height={40}
						padding={'0px 10px'}
					/>

					{/* Search and Filters Toolbar */}
					<Toolbar
						left={
							<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
								<SearchInput
									value={claimNumberSearch}
									onChange={(value) => setClaimNumberSearch(value)}
									placeholder="Search by claim number..."
									width={280}
								/>
								<BasicButtonStyled
									buttonProps={{
										onClick: handleOpenFilters,
										endIcon: <IconFilter size={20} />,
									}}
								>
									Filters...
									{hasActiveFilters && (
										<div
											style={{
												marginLeft: 4,
												backgroundColor: 'primary.main',
												color: 'white',
												borderRadius: '50%',
												size: 18,
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
													appliedRecoveryStatus,
													appliedSubstatus,
													appliedInsured,
													appliedClient,
													appliedManualOnly,
													appliedClaimNumber,
												].filter(Boolean).length
											}
										</div>
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
								<Collapse open={!!selectedFeed}>
									<div style={{ display: 'flex', alignItems: 'center', marginLeft: '5px' }}>
										<IconEye size={18} style={{ color: 'var(--text-secondary)' }} />
										<span style={{ fontSize: 14, lineHeight: '18px', marginLeft: '8px' }}>
											Viewing{' '}
											<span style={{ color: 'var(--text-accent)', fontWeight: 600 }}>
												{selectedFeed?.name ?? ''}
											</span>
										</span>
									</div>
								</Collapse>
							</div>
						}
						leftWidth="100%"
						rightWidth="0%"
						height={55}
						padding="0px"
					/>

					{/* Filters Popper */}
					{!!filtersAnchorEl && (
						<BasicPopper
							anchorEl={filtersAnchorEl}
							setAnchorEl={handleCloseFilters}
							placement="bottom-start"
						>
							<div style={styles.filtersPaper}>
								<span style={{ fontSize: 14, fontWeight: 600 }}>
									Filter Claims
								</span>
								<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
										<Switch
											size="sm"
											checked={draftManualOnly}
											onChange={(checked) => setDraftManualOnly(checked)}
										/>
										<span style={{ fontSize: 13 }}>Only Manual Claims</span>
									</div>
									<div>
										<span style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
											Line of Business
										</span>
										<LineOfBusinessSelect
											lineOfBusiness={draftLob}
											setLineOfBusiness={setDraftLob}
											clearable={true}
											height={32}
										/>
									</div>
									<div>
										<span style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
											Recovery Status
										</span>
										<RecoveryStatusSelect
											recoveryStatus={draftRecoveryStatus}
											setRecoveryStatus={setDraftRecoveryStatus}
											clearable={true}
											height={32}
										/>
									</div>
									<div>
										<span style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
											Substatus
										</span>
										<SubstatusSelect
											substatus={draftSubstatus}
											setSubstatus={setDraftSubstatus}
											clearable={true}
											height={32}
										/>
									</div>
									<div>
										<span style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
											Insured
										</span>
										<Combobox
											freeSolo
											options={insuredComboboxOptions}
											value={selectedInsuredOption}
											onChange={(opt) => {
												setDraftInsured(opt ? String(opt.value) : null);
											}}
											onInputChange={(value) => {
												setInsuredSearchTerm(value);
											}}
											noOptionsText={insuredSearchTerm ? 'No matches' : 'Type to search'}
											placeholder={
												insuredOptions.length === 0 && !insuredSearchTerm
													? 'Type to search...'
													: 'Search insured...'
											}
											fullWidth
										/>
									</div>
									<div>
										<span style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
											Client
										</span>
										<Combobox
											freeSolo
											options={clientComboboxOptions}
											value={selectedClientOption}
											onChange={(opt) => {
												setDraftClient(opt ? String(opt.value) : null);
											}}
											onInputChange={(value) => {
												setClientSearchTerm(value);
											}}
											noOptionsText={clientSearchTerm ? 'No matches' : 'Type to search'}
											placeholder={
												clientOptions.length === 0 && !clientSearchTerm
													? 'Type to search...'
													: 'Search client...'
											}
											fullWidth
										/>
									</div>
								</div>
								<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: '1px solid #e0e0e0' }}>
									<Button variant="contained" onClick={handleApplyFilters} size="sm">
										Apply
									</Button>
								</div>
							</div>
						</BasicPopper>
					)}

					<div style={styles.table}>
						<DataTable
							columns={COLUMNS}
						pinnedLeft={['claim_number']}
							headerHeight={45}
							loading={isFetching}
							rows={Array.isArray(data.rows) ? data.rows : []}
							rowCount={data?.count ?? 0}
							rowHeight={40}
							paginationMode="server"
							paginationModel={claimConstraints}
							onPaginationModelChange={updateClaimConstraints}
							onRowClick={handleRowClick}
							getRowClassName={(row, index) => index % 2 === 0 ? 'striped' : ''}
						/>
					</div>
				</Card>
				<ClaimDetailPanel claimId={selectedClaimId} open={!!selectedClaimId} onClose={handleClosePanel} />
			</div>
		</PageTransitionWrapper>
	);
}

const styles = {
	container: {
		minSize: 0,
		height: '100%',
	},
	paper: {
		width: '100%',
		height: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
	},
	table: {
		size: '100%',
		height: 'calc(100% - 95px)', // Account for two toolbars (50px + 45px)
	},
	filtersPaper: {
		marginTop: 5,
		padding: '15px',
		minSize: 300,
		maxWidth: 400,
	},
};
