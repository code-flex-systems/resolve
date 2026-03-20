'use client';

import { IconAlertTriangle, IconSettings, IconSquarePlus, IconUser } from '@tabler/icons-react';
import Tooltip from '@/components/ui/Tooltip';
import Card from '@/components/ui/Card';
import Switch from '@/components/ui/Switch';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { DataGridPro, GridColDef, GridPinnedColumnFields } from '@mui/x-data-grid-pro';
import CustomPagination from '../common/CustomPagination';
import SearchInput from '../common/SearchInput';
import Toolbar from '../common/Toolbar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import RepresentativeActionsCell from './RepresentativeActionsCell';
import { dataGridFocusStyles } from '@/styles/theme';
import useDebounce from '@/lib/utils/useDebounce';
import { useAdminStore } from '@/stores/useAdminStore';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import RepresentativeDialog from './RepresentativeDialog';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import PageTransitionWrapper from '../common/PageTransitionWrapper';
import { formatPhoneDisplay } from '@/lib/utils/utils';
import { formatAddressInline } from '@/schemas/addressSchemas';
import { Dialog } from '@mui/material';

interface RepresentativesTabProps {
	isAdminContext?: boolean;
}

const getColumns = (isAdminContext: boolean, isManageMode: boolean): GridColDef[] => [
	{
		headerName: 'Party',
		field: 'party_name',
		renderCell: ({ row }) => (
			<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
				{row.party_deleted_at && (
					<Tooltip content="Party is archived" position="right">
						<IconAlertTriangle size={16} style={{ color: 'var(--status-warning)' }} />
					</Tooltip>
				)}
				<span>{row.party_name}</span>
			</div>
		),
		flex: 1,
		minWidth: 150,
	},
	{
		headerName: 'First Name',
		field: 'first_name',
		width: 120,
	},
	{
		headerName: 'Last Name',
		field: 'last_name',
		width: 120,
	},
	{
		headerName: 'Title',
		field: 'title',
		renderCell: ({ row }) => row.title || '—',
		width: 130,
	},
	{
		headerName: 'Email',
		field: 'email',
		renderCell: ({ row }) => row.email || '—',
		flex: 1,
		minWidth: 180,
	},
	{
		headerName: 'Phone',
		field: 'phone',
		renderCell: ({ row }) => formatPhoneDisplay(row.phone) || formatPhoneDisplay(row.mobile_phone) || '—',
		width: 140,
	},
	{
		headerName: 'Address',
		field: 'address_city',
		renderCell: ({ row }) => {
			const formattedAddress = formatAddressInline({
				street_address: row.address_street_address,
				city: row.address_city,
				state: row.address_state,
				postal_code: row.address_postal_code,
				country: row.address_country,
			});
			return (
				<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
					{row.address_deleted_at && (
						<Tooltip content="Address is archived" position="right">
							<IconAlertTriangle size={16} style={{ color: 'var(--status-info)' }} />
						</Tooltip>
					)}
					<span>{formattedAddress || '—'}</span>
				</div>
			);
		},
		width: 220,
	},
	{
		headerName: 'Primary',
		field: 'is_primary',
		renderCell: ({ row }) => (row.is_primary ? <Chip  color="info" size="sm">Primary</Chip> : null),
		width: 90,
	},
	{
		headerName: '',
		field: 'actions',
		renderCell: (params) => <RepresentativeActionsCell {...params} isAdminContext={isAdminContext} isManageMode={isManageMode} />,
		width: isAdminContext ? 100 : 50,
		resizable: false,
	},
];

function NoRows() {
	return (
		<CustomNoRowsOverlay
			text="No representatives found"
			icon={<IconUser size={35} style={{ color: 'var(--text-muted)' }} />}
		/>
	);
}

export default function RepresentativesTab({ isAdminContext = true }: RepresentativesTabProps) {
	const showNewRepresentativeDialog = useAdminStore((state) => state.showNewRepresentativeDialog);
	const representativeConstraints = useAdminStore((state) => state.representativeConstraints);
	const toggleNewRepresentativeDialog = useAdminStore((state) => state.toggleNewRepresentativeDialog);
	const updateRepresentativeConstraints = useAdminStore((state) => state.updateRepresentativeConstraints);

	// Deep linking: edit representative via URL param
	const router = useRouter();
	const searchParams = useSearchParams();
	const editRepresentativeId = searchParams.get('edit');
	const [editingRepresentativeFromUrl, setEditingRepresentativeFromUrl] = useState<any | null>(null);
	const partyTrpc = usePartyTrpc();

	// Query to fetch representative by ID for deep linking (only when edit param is present)
	const { data: representativeToEdit } = partyTrpc.getRepresentative(
		{ id: editRepresentativeId ? parseInt(editRepresentativeId, 10) : 0 },
		{ enabled: !!editRepresentativeId && !editingRepresentativeFromUrl }
	);

	// URL filters hook for managing filters via search params
	const { getParam, getBoolParam, setParam } = useUrlFilters();

	// Filter states from URL params
	const representativeSearchTerm = getParam('search') ?? '';
	// Only allow archived filter in admin context
	const showArchivedRepresentatives = isAdminContext ? getBoolParam('archived') : false;

	// Local state for search input
	const [searchTerm, setSearchTerm] = useState('');

	// Manage mode state for showing/hiding action buttons
	const [isManageMode, setIsManageMode] = useState(false);

	// Handler to close the edit dialog and clear URL param
	const handleCloseEditDialog = () => {
		setEditingRepresentativeFromUrl(null);
		// Clear the edit param from URL
		const params = new URLSearchParams(searchParams.toString());
		params.delete('edit');
		const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
		router.replace(newUrl, { scroll: false });
	};

	// Memoize columns based on isAdminContext and isManageMode
	const columns = useMemo(() => getColumns(isAdminContext, isManageMode), [isAdminContext, isManageMode]);

	// Pinned columns - pin actions to right when in manage mode
	const pinnedColumns = useMemo<GridPinnedColumnFields>(
		() => (isManageMode ? { right: ['actions'] } : {}),
		[isManageMode]
	);

	const { data = { rows: [], count: undefined }, isFetching } = partyTrpc.listAllRepresentatives({
		limit: representativeConstraints.pageSize,
		offset: representativeConstraints.page * representativeConstraints.pageSize,
		searchTerm: representativeSearchTerm,
		showArchived: showArchivedRepresentatives,
	});
	const rowCountRef = useRef(data.count ?? 0);

	const rowCount = useMemo(() => {
		if (data.count !== undefined) {
			rowCountRef.current = data.count;
		}
		return rowCountRef.current;
	}, [data.count]);

	// Effect to set editing representative from dedicated query when data is loaded
	useEffect(() => {
		if (representativeToEdit && editRepresentativeId) {
			setEditingRepresentativeFromUrl(representativeToEdit);
		}
	}, [representativeToEdit, editRepresentativeId]);

	// Sync local search state with URL param changes
	useEffect(() => {
		setSearchTerm(representativeSearchTerm);
	}, [representativeSearchTerm]);

	// Debounce search input to URL param
	const debouncedSearch = useDebounce((search: string) => setParam('search', search), 500);

	return (
		<PageTransitionWrapper criticalDataReady={true} loadingMessage="Loading representatives...">
			<div style={styles.container}>
				<div style={styles.paper} className="flex-col-start">
					<Toolbar
						left={
							<>
								<span style={{ marginRight: '20px' }}>
									Representatives
								</span>
								{isAdminContext && (
									<>
										<Switch
											size="sm"
											checked={showArchivedRepresentatives}
											onChange={(checked) => setParam('archived', checked)}
											color="warning"
											style={{ marginLeft: '10px' }}
										/>
										<span style={{ fontSize: 14, fontStyle: 'italic' }}>
											Show Archived Only
										</span>
									</>
								)}
							</>
						}
						right={
							<>
								<SearchInput
									value={searchTerm}
									onChange={(value) => {
										setSearchTerm(value);
										if (value === '') {
											setParam('search', '');
										} else {
											debouncedSearch(value);
										}
									}}
									placeholder="Search representatives..."
								/>
								<Button
									variant="contained"
									startIcon={<IconSquarePlus size={20} />}
									onClick={toggleNewRepresentativeDialog}
									style={{ marginLeft: 16 }}
								>
									Representative
								</Button>
								<Tooltip content="Manage">
									<Button variant="icon" size="sm"
										onClick={() => setIsManageMode(!isManageMode)}
										style={{ marginLeft: 8, backgroundColor: isManageMode ? 'var(--bg-tertiary)' : undefined }}
									>
										<IconSettings size={20} style={{ color: isManageMode ? 'primary.main' : undefined }} />
									</Button>
								</Tooltip>
							</>
						}
						height={50}
						padding={'0px 10px'}
					/>
					<div style={styles.table}>
						<DataGridPro
							columns={columns}
							columnHeaderHeight={45}
							loading={isFetching}
							slots={{
								pagination: CustomPagination,
								noRowsOverlay: NoRows,
								noResultsOverlay: NoRows,
							}}
							slotProps={{
								loadingOverlay: {
									noRowsVariant: 'linear-progress',
									variant: 'linear-progress',
								},
							}}
							rows={data.rows}
							rowCount={rowCount}
							rowHeight={45}
							hideFooterSelectedRowCount
							pageSizeOptions={[]}
							pagination
							paginationMode="server"
							paginationModel={representativeConstraints}
							onPaginationModelChange={updateRepresentativeConstraints}
							pinnedColumns={pinnedColumns}
							disableColumnSelector
							disableRowSelectionOnClick
							disableColumnMenu
							style={{
								...styles.tableOverrides,
								...dataGridFocusStyles,
							}}
						/>
					</div>

					{showNewRepresentativeDialog && <RepresentativeDialog />}
					{editingRepresentativeFromUrl && (
						<RepresentativeDialog representative={editingRepresentativeFromUrl} onClose={handleCloseEditDialog} />
					)}
				</div>
			</div>
		</PageTransitionWrapper>
	);
}

const styles = {
	container: {
		width: '100%',
		height: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
	},
	paper: {
		width: '100%',
		flex: 1,
		padding: '24px 24px 0px',
		minHeight: 0,
	},
	table: {
		width: '100%',
		height: 'calc(100% - 50px)',
		overflow: 'hidden',
	},
	tableOverrides: {
		border: 'none',
	},
};
