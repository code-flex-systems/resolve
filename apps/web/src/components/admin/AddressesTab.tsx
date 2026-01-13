'use client';

import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { Button, Chip, Paper, Switch, Tooltip, Typography } from '@mui/material';
import { DataGridPro, GridColDef } from '@mui/x-data-grid-pro';
import AddBox from '@mui/icons-material/AddBox';
import LocationOn from '@mui/icons-material/LocationOn';
import Warning from '@mui/icons-material/Warning';
import CustomPagination from '../common/CustomPagination';
import SearchInput from '../common/SearchInput';
import Toolbar from '../common/Toolbar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AddressActionsCell from './AddressActionsCell';
import { BASE_COLOR_LIGHT, dataGridFocusStyles } from '@/styles/theme';
import useDebounce from '@/lib/utils/useDebounce';
import { useAdminStore } from '@/stores/useAdminStore';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import AddressDialog from './AddressDialog';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import PageTransitionWrapper from '../common/PageTransitionWrapper';
import { AddressStatus } from '@/schemas/partySchemas';

interface AddressesTabProps {
	isAdminContext?: boolean;
}

const getStatusChip = (status: string) => {
	switch (status) {
		case AddressStatus.VALID:
			return <Chip label="Valid" color="success" size="small" />;
		case AddressStatus.MAILING:
			return <Chip label="Mailing" color="primary" size="small" />;
		case AddressStatus.UNDELIVERABLE:
			return <Chip label="Undeliverable" color="error" size="small" />;
		case AddressStatus.UNKNOWN:
		default:
			return <Chip label="Unknown" color="default" size="small" />;
	}
};

const getColumns = (isAdminContext: boolean): GridColDef[] => [
	{
		headerName: 'Party',
		field: 'party_name',
		renderCell: ({ row }) => (
			<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
				{row.party_deleted_at && (
					<Tooltip title="Party is archived" placement="right">
						<Warning sx={{ fontSize: 16, color: 'warning.main' }} />
					</Tooltip>
				)}
				<span>{row.party_name}</span>
			</div>
		),
		flex: 1,
		minWidth: 160,
	},
	{
		headerName: 'Label',
		field: 'name',
		renderCell: ({ row }) => row.name || '—',
		width: 140,
	},
	{
		headerName: 'Street',
		field: 'street_address',
		renderCell: ({ row }) => row.street_address || '—',
		flex: 1,
		minWidth: 180,
	},
	{
		headerName: 'City',
		field: 'city',
		renderCell: ({ row }) => row.city || '—',
		width: 120,
	},
	{
		headerName: 'State',
		field: 'state',
		renderCell: ({ row }) => row.state || '—',
		width: 70,
	},
	{
		headerName: 'Postal',
		field: 'postal_code',
		renderCell: ({ row }) => row.postal_code || '—',
		width: 90,
	},
	{
		headerName: 'Type',
		field: 'address_type',
		renderCell: ({ row }) => (
			<Typography variant="body2" textTransform="capitalize" fontSize={13}>
				{row.address_type || 'business'}
			</Typography>
		),
		width: 90,
	},
	{
		headerName: 'Status',
		field: 'address_status',
		renderCell: ({ row }) => getStatusChip(row.address_status),
		width: 115,
	},
	{
		headerName: '',
		field: 'actions',
		renderCell: (params) => <AddressActionsCell {...params} isAdminContext={isAdminContext} />,
		width: isAdminContext ? 100 : 50,
		resizable: false,
	},
];

function NoRows() {
	return (
		<CustomNoRowsOverlay
			text="No addresses found"
			icon={<LocationOn sx={{ fontSize: 35, color: BASE_COLOR_LIGHT }} />}
		/>
	);
}

export default function AddressesTab({ isAdminContext = true }: AddressesTabProps) {
	const showNewAddressDialog = useAdminStore((state) => state.showNewAddressDialog);
	const addressConstraints = useAdminStore((state) => state.addressConstraints);
	const toggleNewAddressDialog = useAdminStore((state) => state.toggleNewAddressDialog);
	const updateAddressConstraints = useAdminStore((state) => state.updateAddressConstraints);

	// Deep linking: edit address via URL param
	const router = useRouter();
	const searchParams = useSearchParams();
	const editAddressId = searchParams.get('edit');
	const [editingAddressFromUrl, setEditingAddressFromUrl] = useState<any | null>(null);
	const partyTrpc = usePartyTrpc();

	// Query to fetch address by ID for deep linking (only when edit param is present)
	const { data: addressToEdit } = partyTrpc.getAddress(
		{ id: editAddressId ? parseInt(editAddressId, 10) : 0 },
		{ enabled: !!editAddressId && !editingAddressFromUrl }
	);

	// URL filters hook for managing filters via search params
	const { getParam, getBoolParam, setParam } = useUrlFilters();

	// Filter states from URL params
	const addressSearchTerm = getParam('search') ?? '';
	// Only allow archived filter in admin context
	const showArchivedAddresses = isAdminContext ? getBoolParam('archived') : false;

	// Local state for search input
	const [searchTerm, setSearchTerm] = useState('');

	// Handler to close the edit dialog and clear URL param
	const handleCloseEditDialog = () => {
		setEditingAddressFromUrl(null);
		// Clear the edit param from URL
		const params = new URLSearchParams(searchParams.toString());
		params.delete('edit');
		const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
		router.replace(newUrl, { scroll: false });
	};

	// Memoize columns based on isAdminContext
	const columns = useMemo(() => getColumns(isAdminContext), [isAdminContext]);

	const { data = { rows: [], count: undefined }, isFetching } = usePartyTrpc().listAllAddresses({
		limit: addressConstraints.pageSize,
		offset: addressConstraints.page * addressConstraints.pageSize,
		searchTerm: addressSearchTerm,
		showArchived: showArchivedAddresses,
	});
	const rowCountRef = useRef(data.count ?? 0);

	const rowCount = useMemo(() => {
		if (data.count !== undefined) {
			rowCountRef.current = data.count;
		}
		return rowCountRef.current;
	}, [data.count]);

	// Effect to set editing address from dedicated query when data is loaded
	useEffect(() => {
		if (addressToEdit && editAddressId) {
			setEditingAddressFromUrl(addressToEdit);
		}
	}, [addressToEdit, editAddressId]);

	// Sync local search state with URL param changes
	useEffect(() => {
		setSearchTerm(addressSearchTerm);
	}, [addressSearchTerm]);

	// Debounce search input to URL param
	const debouncedSearch = useDebounce((search: string) => setParam('search', search), 500);

	return (
		<PageTransitionWrapper criticalDataReady={true} loadingMessage="Loading addresses...">
			<div style={styles.container}>
				<Paper sx={styles.paper} className="flex-col-start">
					<Toolbar
						left={
							<>
								<Typography variant="h6" marginRight="20px">
									Addresses
								</Typography>
								{isAdminContext && (
									<>
										<Switch
											size="small"
											checked={showArchivedAddresses}
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
									placeholder="Search addresses..."
								/>
								<Button variant="contained" startIcon={<AddBox />} onClick={toggleNewAddressDialog} sx={{ ml: 2 }}>
									Address
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
							rowHeight={45}
							hideFooterSelectedRowCount
							pageSizeOptions={[]}
							pagination
							paginationMode="server"
							paginationModel={addressConstraints}
							onPaginationModelChange={updateAddressConstraints}
							disableColumnSelector
							disableRowSelectionOnClick
							disableColumnMenu
							sx={{
								...styles.tableOverrides,
								...dataGridFocusStyles,
								'& .MuiDataGrid-cell': {
									display: 'flex',
									alignItems: 'center',
								},
							}}
						/>
					</div>

					{showNewAddressDialog && <AddressDialog />}
					{editingAddressFromUrl && (
						<AddressDialog address={editingAddressFromUrl} onClose={handleCloseEditDialog} />
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
		overflow: 'hidden',
	},
	tableOverrides: {
		border: 'none',
	},
};
