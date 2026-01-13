'use client';

import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { Button, Chip, Paper, Switch, Tooltip, Typography } from '@mui/material';
import { DataGridPro, GridColDef } from '@mui/x-data-grid-pro';
import AddBox from '@mui/icons-material/AddBox';
import Person from '@mui/icons-material/Person';
import Warning from '@mui/icons-material/Warning';
import CustomPagination from '../common/CustomPagination';
import SearchInput from '../common/SearchInput';
import Toolbar from '../common/Toolbar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import RepresentativeActionsCell from './RepresentativeActionsCell';
import { BASE_COLOR_LIGHT, dataGridFocusStyles } from '@/styles/theme';
import useDebounce from '@/lib/utils/useDebounce';
import { useAdminStore } from '@/stores/useAdminStore';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import RepresentativeDialog from './RepresentativeDialog';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import PageTransitionWrapper from '../common/PageTransitionWrapper';
import { formatPhoneDisplay } from '@/lib/utils/utils';

interface RepresentativesTabProps {
	isAdminContext?: boolean;
}

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
		field: 'address_name',
		renderCell: ({ row }) => (
			<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
				{row.address_deleted_at && (
					<Tooltip title="Address is archived" placement="right">
						<Warning sx={{ fontSize: 16, color: 'info.main' }} />
					</Tooltip>
				)}
				<span>{row.address_name || '—'}</span>
			</div>
		),
		width: 140,
	},
	{
		headerName: 'Primary',
		field: 'is_primary',
		renderCell: ({ row }) => (row.is_primary ? <Chip label="Primary" color="primary" size="small" /> : null),
		width: 90,
	},
	{
		headerName: '',
		field: 'actions',
		renderCell: (params) => <RepresentativeActionsCell {...params} isAdminContext={isAdminContext} />,
		width: isAdminContext ? 100 : 50,
		resizable: false,
	},
];

function NoRows() {
	return (
		<CustomNoRowsOverlay
			text="No representatives found"
			icon={<Person sx={{ fontSize: 35, color: BASE_COLOR_LIGHT }} />}
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

	// Handler to close the edit dialog and clear URL param
	const handleCloseEditDialog = () => {
		setEditingRepresentativeFromUrl(null);
		// Clear the edit param from URL
		const params = new URLSearchParams(searchParams.toString());
		params.delete('edit');
		const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
		router.replace(newUrl, { scroll: false });
	};

	// Memoize columns based on isAdminContext
	const columns = useMemo(() => getColumns(isAdminContext), [isAdminContext]);

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
				<Paper sx={styles.paper} className="flex-col-start">
					<Toolbar
						left={
							<>
								<Typography variant="h6" marginRight="20px">
									Representatives
								</Typography>
								{isAdminContext && (
									<>
										<Switch
											size="small"
											checked={showArchivedRepresentatives}
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
									placeholder="Search representatives..."
								/>
								<Button
									variant="contained"
									startIcon={<AddBox />}
									onClick={toggleNewRepresentativeDialog}
									sx={{ ml: 2 }}
								>
									Representative
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
							paginationModel={representativeConstraints}
							onPaginationModelChange={updateRepresentativeConstraints}
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

					{showNewRepresentativeDialog && <RepresentativeDialog />}
					{editingRepresentativeFromUrl && (
						<RepresentativeDialog representative={editingRepresentativeFromUrl} onClose={handleCloseEditDialog} />
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
