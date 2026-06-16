'use client';

import { IconFileSearch, IconFilter, IconSquarePlus, IconUserSearch } from '@tabler/icons-react';
import Combobox, { type ComboboxOption } from '@/components/ui/Combobox';
import Card from '@/components/ui/Card';
import Switch from '@/components/ui/Switch';
import Button from '@/components/ui/Button';
import { useAdminStore } from '@/stores/useAdminStore';
import { formatAmount, formatMDYAbv } from '@/lib/utils/utils';
import { formatLineOfBusiness, formatLabel } from '@/lib/utils/claimUtils';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import PageTransitionWrapper from '../common/PageTransitionWrapper';
import IconHeaderCell from '../common/IconHeaderCell';
import SearchInput from '../common/SearchInput';
import Toolbar from '../common/Toolbar';
import { useMemo, useRef, useState, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import { formatRecoveryStatus } from '@/lib/utils/recoveryUtils';
import { LineOfBusinessSelect } from '../common/ReferenceDataSelect';
import RecoveryStatusSelect from '../common/RecoveryStatusSelect';
import SubstatusSelect from '../common/SubstatusSelect';
import Popper from '@/components/ui/Popper';
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
			<IconHeaderCell
				{...params}
				icon={<IconFileSearch style={{ color: 'var(--text-muted)' }} />}
			/>
		),
		size: 150,
	},
	{
		accessorKey: 'client',
		header: (params) => (
			<IconHeaderCell
				{...params}
				icon={<IconUserSearch style={{ color: 'var(--text-muted)' }} />}
			/>
		),
		size: 150,
	},
	{ accessorKey: 'client_adjuster', header: (ctx) => <IconHeaderCell {...ctx} />, size: 150 },
	{ accessorKey: 'insured', header: (ctx) => <IconHeaderCell {...ctx} />, size: 150 },
	{
		accessorKey: 'date_of_loss',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		cell: ({ getValue }) => formatMDYAbv(getValue()),
		size: 150,
	},
	{
		accessorKey: 'loss_city',
		header: (ctx) => <IconHeaderCell {...ctx} headerName="Loss Location" />,
		size: 150,
	},
	{
		accessorKey: 'line_of_business',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		cell: ({ getValue }) => formatLineOfBusiness(getValue()),
		size: 150,
	},
	{
		accessorKey: 'recovery_status',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		cell: ({ getValue }) => formatRecoveryStatus(getValue()),
		size: 150,
	},
	{
		accessorKey: 'substatus',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		cell: ({ getValue }) => formatLabel(getValue()),
		size: 150,
	},
	{
		accessorKey: 'claim_amount',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		cell: ({ getValue }) => {
			const value = getValue();
			return value ? `$${formatAmount(value)}` : '$0.00';
		},
		size: 130,
	},
	{
		accessorKey: 'total_incurred',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		cell: ({ getValue }) => {
			const value = getValue();
			return value ? `$${formatAmount(value)}` : '$0.00';
		},
		size: 130,
	},
	{
		accessorKey: 'expected_recovery',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		cell: ({ getValue }) => {
			const value = getValue();
			return value ? `$${formatAmount(value)}` : '$0.00';
		},
		size: 140,
	},
	{
		accessorKey: 'actual_recovery',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		cell: ({ getValue }) => {
			const value = getValue();
			return value ? `$${formatAmount(value)}` : '$0.00';
		},
		size: 130,
	},
];

interface ClaimFiltersFormValues {
	manual_only: boolean;
	lob: string | null;
	recovery_status: string | null;
	substatus: ClaimSubstatus | null;
	insured: string | null;
	client: string | null;
}

const EMPTY_FILTERS: ClaimFiltersFormValues = {
	manual_only: false,
	lob: null,
	recovery_status: null,
	substatus: null,
	insured: null,
	client: null,
};

export default function Claims() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const claimConstraints = useAdminStore((state) => state.claimConstraints);
	const updateClaimConstraints = useAdminStore((state) => state.updateClaimConstraints);

	// URL filters hook for managing filters via search params
	const { getParam, getBoolParam, setParams, clearParams, setParam } = useUrlFilters();

	// Applied filter state lives in URL params
	const appliedLob = getParam('lob');
	const appliedRecoveryStatus = getParam('recovery_status');
	const appliedSubstatus = getParam('substatus');
	const appliedInsured = getParam('insured');
	const appliedClient = getParam('client');
	const appliedManualOnly = getBoolParam('manual_only');
	const appliedClaimNumber = getParam('claim_number') ?? '';

	const currentApplied: ClaimFiltersFormValues = useMemo(
		() => ({
			manual_only: appliedManualOnly,
			lob: appliedLob,
			recovery_status: appliedRecoveryStatus,
			substatus: (appliedSubstatus as ClaimSubstatus) ?? null,
			insured: appliedInsured,
			client: appliedClient,
		}),
		[
			appliedManualOnly,
			appliedLob,
			appliedRecoveryStatus,
			appliedSubstatus,
			appliedInsured,
			appliedClient,
		]
	);

	// RHF manages the in-popper draft state; URL is the source of truth for what's applied
	const { control, handleSubmit, reset } = useForm<ClaimFiltersFormValues>({
		defaultValues: currentApplied,
	});

	// Claim number search (toolbar input — outside the popper)
	const [claimNumberSearch, setClaimNumberSearch] = useState('');

	// Combobox typing state for insured/client suggestions
	const [insuredSearchTerm, setInsuredSearchTerm] = useState('');
	const [clientSearchTerm, setClientSearchTerm] = useState('');
	const [debouncedInsuredSearch, setDebouncedInsuredSearch] = useState('');
	const [debouncedClientSearch, setDebouncedClientSearch] = useState('');

	const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
	const [filtersOpen, setFiltersOpen] = useState(false);
	const filtersAnchorRef = useRef<HTMLButtonElement>(null);

	const trpcUtils = useClaimTrpc();

	const { data = { rows: [], count: undefined }, isFetching } = trpcUtils.list({
		feedId: appliedManualOnly ? null : undefined,
		searchTerm: appliedClaimNumber
			? { value: appliedClaimNumber, type: ClaimSearch.CLAIM_NUMBER }
			: undefined,
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

	const debouncedClaimSearch = useDebounce(
		(search: string) => setParam('claim_number', search),
		500
	);
	const debouncedInsuredSearchCallback = useDebounce(
		(search: string) => setDebouncedInsuredSearch(search),
		500
	);
	const debouncedClientSearchCallback = useDebounce(
		(search: string) => setDebouncedClientSearch(search),
		500
	);

	useEffect(() => {
		setClaimNumberSearch(appliedClaimNumber);
	}, [appliedClaimNumber]);

	useEffect(() => {
		debouncedClaimSearch(claimNumberSearch);
	}, [claimNumberSearch, debouncedClaimSearch]);

	useEffect(() => {
		debouncedInsuredSearchCallback(insuredSearchTerm);
	}, [insuredSearchTerm, debouncedInsuredSearchCallback]);

	useEffect(() => {
		debouncedClientSearchCallback(clientSearchTerm);
	}, [clientSearchTerm, debouncedClientSearchCallback]);

	useEffect(() => {
		const selected = searchParams.get('selected');
		setSelectedClaimId(selected ?? null);
	}, [searchParams]);

	const handleRowClick = (row: any) => {
		const newParams = new URLSearchParams(searchParams.toString());
		newParams.set('selected', String(row.id));
		router.push(`${pathname}?${newParams.toString()}`);
	};

	const handleClosePanel = () => {
		const newParams = new URLSearchParams(searchParams.toString());
		newParams.delete('selected');
		router.push(`${pathname}${newParams.toString() ? `?${newParams.toString()}` : ''}`);
	};

	const handleOpenFilters = () => {
		// Sync RHF draft state with whatever is currently applied
		reset(currentApplied);
		setInsuredSearchTerm(appliedInsured ?? '');
		setClientSearchTerm(appliedClient ?? '');
		setFiltersOpen(true);
	};

	const handleCloseFilters = () => {
		setInsuredSearchTerm('');
		setClientSearchTerm('');
		setFiltersOpen(false);
	};

	const onApplyFilters = handleSubmit((values) => {
		setParams({
			lob: values.lob,
			recovery_status: values.recovery_status,
			substatus: values.substatus,
			insured: values.insured,
			client: values.client,
			manual_only: values.manual_only,
		});
		setInsuredSearchTerm('');
		setClientSearchTerm('');
		setFiltersOpen(false);
	});

	const handleClearAllFilters = () => {
		clearParams(['selected']);
		reset(EMPTY_FILTERS);
		setInsuredSearchTerm('');
		setClientSearchTerm('');
	};

	const activeFilters = [
		appliedLob,
		appliedRecoveryStatus,
		appliedSubstatus,
		appliedInsured,
		appliedClient,
		appliedManualOnly,
		appliedClaimNumber,
	].filter(Boolean);
	const hasActiveFilters = activeFilters.length > 0;

	const insuredComboboxOptions: ComboboxOption[] = insuredOptions.map((s) => ({
		value: s,
		label: s,
	}));
	const clientComboboxOptions: ComboboxOption[] = clientOptions.map((s) => ({
		value: s,
		label: s,
	}));

	return (
		<PageTransitionWrapper criticalDataReady={true} loadingMessage="Loading claims...">
			<div style={styles.container} className="flex-col-start">
				<Card variant="beveled" padding="md" style={styles.paper}>
					<p
						style={{
							color: 'var(--text-secondary)',
							fontSize: 13,
							margin: '0 0 12px',
							lineHeight: 1.5,
						}}
					>
						View and manage all claims across the organization. Click a claim to see its full
						details.
					</p>

					<Toolbar
						left={
							<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
								<SearchInput
									value={claimNumberSearch}
									onChange={setClaimNumberSearch}
									placeholder="Search by claim number..."
									width={280}
								/>
								<Button
									ref={filtersAnchorRef}
									variant="outlined"
									onClick={handleOpenFilters}
									endIcon={<IconFilter size={16} />}
								>
									Filters...
									{hasActiveFilters && (
										<div
											style={{
												marginLeft: 4,
												backgroundColor: 'var(--text-accent)',
												color: 'var(--text-on-accent)',
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
											{activeFilters.length}
										</div>
									)}
								</Button>
								{hasActiveFilters && (
									<Button variant="outlined" onClick={handleClearAllFilters} size="sm">
										Clear all filters
									</Button>
								)}
							</div>
						}
						right={
							<Button
								variant="contained"
								startIcon={<IconSquarePlus size={20} />}
								onClick={() => router.push('/admin/claims/edit')}
							>
								Claim
							</Button>
						}
						leftWidth="100%"
						rightWidth="0%"
						height={55}
						padding="0px"
					/>

					{/* Filters Popper */}
					<Popper
						open={filtersOpen}
						onClose={handleCloseFilters}
						anchorRef={filtersAnchorRef}
						placement="bottom-start"
					>
						<form onSubmit={onApplyFilters} style={styles.filtersPaper}>
							<span style={{ fontSize: 14, fontWeight: 600 }}>Filter Claims</span>
							<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
								<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
									<Controller
										control={control}
										name="manual_only"
										render={({ field }) => (
											<Switch size="sm" checked={field.value} onChange={field.onChange} />
										)}
									/>
									<span style={{ fontSize: 13 }}>Only Manual Claims</span>
								</div>
								<div>
									<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>
										Line of Business
									</span>
									<Controller
										control={control}
										name="lob"
										render={({ field }) => (
											<LineOfBusinessSelect
												lineOfBusiness={field.value}
												setLineOfBusiness={field.onChange}
												clearable
											/>
										)}
									/>
								</div>
								<div>
									<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>
										Recovery Status
									</span>
									<Controller
										control={control}
										name="recovery_status"
										render={({ field }) => (
											<RecoveryStatusSelect
												recoveryStatus={field.value}
												setRecoveryStatus={field.onChange}
												clearable
												height={32}
											/>
										)}
									/>
								</div>
								<div>
									<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>
										Substatus
									</span>
									<Controller
										control={control}
										name="substatus"
										render={({ field }) => (
											<SubstatusSelect
												substatus={field.value}
												setSubstatus={field.onChange}
												clearable
												height={32}
											/>
										)}
									/>
								</div>
								<div>
									<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>
										Insured
									</span>
									<Controller
										control={control}
										name="insured"
										render={({ field }) => (
											<Combobox
												freeSolo
												options={insuredComboboxOptions}
												value={field.value ? { value: field.value, label: field.value } : null}
												onChange={(opt) => field.onChange(opt ? String(opt.value) : null)}
												onInputChange={setInsuredSearchTerm}
												noOptionsText={insuredSearchTerm ? 'No matches' : 'Type to search'}
												placeholder={
													insuredOptions.length === 0 && !insuredSearchTerm
														? 'Type to search...'
														: 'Search insured...'
												}
												fullWidth
											/>
										)}
									/>
								</div>
								<div>
									<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>
										Client
									</span>
									<Controller
										control={control}
										name="client"
										render={({ field }) => (
											<Combobox
												freeSolo
												options={clientComboboxOptions}
												value={field.value ? { value: field.value, label: field.value } : null}
												onChange={(opt) => field.onChange(opt ? String(opt.value) : null)}
												onInputChange={setClientSearchTerm}
												noOptionsText={clientSearchTerm ? 'No matches' : 'Type to search'}
												placeholder={
													clientOptions.length === 0 && !clientSearchTerm
														? 'Type to search...'
														: 'Search client...'
												}
												fullWidth
											/>
										)}
									/>
								</div>
							</div>
							<div
								style={{
									display: 'flex',
									justifyContent: 'flex-end',
									marginTop: 16,
									paddingTop: 16,
									borderTop: '1px solid var(--border)',
								}}
							>
								<Button type="submit" variant="contained" size="sm">
									Apply
								</Button>
							</div>
						</form>
					</Popper>

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
						/>
					</div>
				</Card>
				<ClaimDetailPanel
					claimId={selectedClaimId}
					open={!!selectedClaimId}
					onClose={handleClosePanel}
				/>
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
		width: '100%',
		height: 'calc(100% - 95px)',
	},
	filtersPaper: {
		marginTop: 5,
		padding: '15px',
		minWidth: 300,
		maxWidth: 400,
		display: 'flex',
		flexDirection: 'column' as const,
	},
};
