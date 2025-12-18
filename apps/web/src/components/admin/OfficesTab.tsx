'use client';

import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { Button, Chip, Paper, Switch, Tooltip, Typography } from '@mui/material';
import { DataGridPro, GridColDef } from '@mui/x-data-grid-pro';
import AddBox from '@mui/icons-material/AddBox';
import Business from '@mui/icons-material/Business';
import LocationOn from '@mui/icons-material/LocationOn';
import Phone from '@mui/icons-material/Phone';
import Warning from '@mui/icons-material/Warning';
import CustomPagination from '../common/CustomPagination';
import SearchInput from '../common/SearchInput';
import Toolbar from '../common/Toolbar';
import IconHeaderCell from '../common/IconHeaderCell';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import OfficeActionsCell from './OfficeActionsCell';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import useDebounce from '@/lib/utils/useDebounce';
import StackedHeaderCell from '../common/StackedHeaderCell';
import { useAdminStore } from '@/stores/useAdminStore';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import OfficeDialog from './OfficeDialog';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { formatCityState } from '@/schemas/addressSchemas';
import PageTransitionWrapper from '../common/PageTransitionWrapper';

interface OfficesTabProps {
	isAdminContext?: boolean;
}

const getColumns = (isAdminContext: boolean): GridColDef[] => [
	{
		headerName: 'Party',
		field: 'party',
		renderCell: ({ row }) => (
			<div
				style={{ height: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 8 }}
			>
				{row.party_deleted_at && (
					<Tooltip title="Party is archived" placement="right">
						<Warning sx={{ fontSize: 18, color: 'warning.main' }} />
					</Tooltip>
				)}
				<StackedHeaderCell primary={row.party_name} secondary={row.party_organization ?? 'No organization'} />
			</div>
		),
		renderHeader: (params) => (
			<IconHeaderCell {...params} icon={<Business style={{ color: BASE_COLOR_LIGHT }} />} />
		),
		flex: 1,
		minWidth: 200,
	},
	{
		headerName: 'Office',
		field: 'office',
		renderCell: ({ row }) => (
			<StackedHeaderCell
				primary={row.office_name || 'Unnamed office'}
				secondary={formatCityState(row.city, row.state) || 'No location'}
			/>
		),
		renderHeader: (params) => (
			<IconHeaderCell {...params} icon={<LocationOn style={{ color: BASE_COLOR_LIGHT }} />} />
		),
		flex: 1,
		minWidth: 200,
	},
	{
		headerName: 'Contact',
		field: 'contact',
		renderCell: ({ row }) => (
			<StackedHeaderCell primary={row.phone ?? 'No phone'} secondary={row.fax ?? 'No fax'} />
		),
		renderHeader: (params) => <IconHeaderCell {...params} icon={<Phone style={{ color: BASE_COLOR_LIGHT }} />} />,
		width: 200,
	},
	{
		headerName: 'Primary',
		field: 'is_primary',
		renderCell: ({ row }) => (row.is_primary ? <Chip label="Primary" color="primary" size="small" /> : null),
		width: 100,
		align: 'center',
	},
	{
		headerName: '',
		field: 'actions',
		renderCell: (params) => <OfficeActionsCell {...params} isAdminContext={isAdminContext} />,
		width: isAdminContext ? 100 : 50,
		resizable: false,
	},
];

function NoRows() {
	return (
		<CustomNoRowsOverlay
			text="No offices found"
			icon={<LocationOn sx={{ fontSize: 35, color: BASE_COLOR_LIGHT }} />}
		/>
	);
}

export default function OfficesTab({ isAdminContext = true }: OfficesTabProps) {
	const showNewOfficeDialog = useAdminStore((state) => state.showNewOfficeDialog);
	const officeConstraints = useAdminStore((state) => state.officeConstraints);
	const toggleNewOfficeDialog = useAdminStore((state) => state.toggleNewOfficeDialog);
	const updateOfficeConstraints = useAdminStore((state) => state.updateOfficeConstraints);

	// Deep linking: edit office via URL param
	const router = useRouter();
	const searchParams = useSearchParams();
	const editOfficeId = searchParams.get('edit');
	const [editingOfficeFromUrl, setEditingOfficeFromUrl] = useState<any | null>(null);
	const partyTrpc = usePartyTrpc();

	// Query to fetch office by ID for deep linking (only when edit param is present)
	const { data: officeToEdit } = partyTrpc.getOffice(
		{ id: editOfficeId ? parseInt(editOfficeId, 10) : 0 },
		{ enabled: !!editOfficeId && !editingOfficeFromUrl }
	);

	// URL filters hook for managing filters via search params
	const { getParam, getBoolParam, setParam } = useUrlFilters();

	// Filter states from URL params
	const officeSearchTerm = getParam('search') ?? '';
	// Only allow archived filter in admin context
	const showArchivedOffices = isAdminContext ? getBoolParam('archived') : false;

	// Local state for search input
	const [searchTerm, setSearchTerm] = useState('');

	// Handler to close the edit dialog and clear URL param
	const handleCloseEditDialog = () => {
		setEditingOfficeFromUrl(null);
		// Clear the edit param from URL
		const params = new URLSearchParams(searchParams.toString());
		params.delete('edit');
		const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
		router.replace(newUrl, { scroll: false });
	};

	// Memoize columns based on isAdminContext
	const columns = useMemo(() => getColumns(isAdminContext), [isAdminContext]);

	const { data = { rows: [], count: undefined }, isFetching } = usePartyTrpc().listAllOffices({
		limit: officeConstraints.pageSize,
		offset: officeConstraints.page * officeConstraints.pageSize,
		searchTerm: officeSearchTerm,
		showArchived: showArchivedOffices,
	});
	const rowCountRef = useRef(data.count ?? 0);

	const rowCount = useMemo(() => {
		if (data.count !== undefined) {
			rowCountRef.current = data.count;
		}
		return rowCountRef.current;
	}, [data.count]);

	// Effect to set editing office from dedicated query when data is loaded
	useEffect(() => {
		if (officeToEdit && editOfficeId) {
			setEditingOfficeFromUrl(officeToEdit);
		}
	}, [officeToEdit, editOfficeId]);

	// Sync local search state with URL param changes
	useEffect(() => {
		setSearchTerm(officeSearchTerm);
	}, [officeSearchTerm]);

	// Debounce search input to URL param
	const debouncedSearch = useDebounce((search: string) => setParam('search', search), 500);

	return (
		<PageTransitionWrapper criticalDataReady={true} loadingMessage="Loading offices...">
			<div style={styles.container}>
				<Paper sx={styles.paper} className="flex-col-start">
					<Toolbar
						left={
							<>
								<Typography variant="h6" marginRight="20px">
									Offices
								</Typography>
								{isAdminContext && (
									<>
										<Switch
											size="small"
											checked={showArchivedOffices}
											onChange={(_, checked) => setParam('archived', checked)}
											color="warning"
											sx={{ marginLeft: '10px' }}
										/>
										<Typography fontSize={14} fontStyle="italic">
											Show Archived Only
										</Typography>
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
									placeholder="Search offices..."
								/>
								<Button variant="contained" startIcon={<AddBox />} onClick={toggleNewOfficeDialog} sx={{ ml: 2 }}>
									Office
								</Button>
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
							rowHeight={60}
							hideFooterSelectedRowCount
							pageSizeOptions={[]}
							pagination
							paginationMode="server"
							paginationModel={officeConstraints}
							onPaginationModelChange={updateOfficeConstraints}
							disableColumnSelector
							disableRowSelectionOnClick
							disableColumnMenu
							sx={styles.tableOverrides}
						/>
					</div>

					{showNewOfficeDialog && <OfficeDialog />}
					{editingOfficeFromUrl && (
						<OfficeDialog office={editingOfficeFromUrl} onClose={handleCloseEditDialog} />
					)}
				</Paper>
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
	},
	tableOverrides: {
		border: 'none',
	},
};
