'use client';

import { IconBuilding, IconSettings, IconSquarePlus } from '@tabler/icons-react';
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
import PartyActionsCell from './PartyActionsCell';
import useDebounce from '@/lib/utils/useDebounce';
import { useAdminStore } from '@/stores/useAdminStore';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import PartyDialog from './PartyDialog';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import PageTransitionWrapper from '../common/PageTransitionWrapper';
import { dataGridFocusStyles } from '@/styles/theme';
import { formatPhoneDisplay } from '@/lib/utils/utils';
import { Dialog } from '@mui/material';

interface PartiesTabProps {
	isAdminContext?: boolean;
}

const getColumns = (isAdminContext: boolean, isManageMode: boolean): GridColDef[] => [
	{
		headerName: 'Name',
		field: 'name',
		flex: 1,
		minWidth: 180,
	},
	{
		headerName: 'Type',
		field: 'party_type',
		renderCell: ({ row }) => (
			<Chip
				size="sm"
				color={row.party_type === 'entity' ? 'info' : 'neutral'}
				variant="outlined">{row.party_type === 'entity' ? 'Entity' : 'Facilitator'}</Chip>
		),
		width: 110,
	},
	{
		headerName: 'Organization',
		field: 'organization',
		renderCell: ({ row }) => row.organization || '—',
		width: 160,
	},
	{
		headerName: 'Email',
		field: 'primary_email',
		renderCell: ({ row }) => row.primary_email || '—',
		width: 200,
	},
	{
		headerName: 'Phone',
		field: 'primary_phone',
		renderCell: ({ row }) => formatPhoneDisplay(row.primary_phone) || '—',
		width: 140,
	},
	{
		headerName: 'City',
		field: 'primary_city',
		renderCell: ({ row }) => row.primary_city || '—',
		width: 120,
	},
	{
		headerName: 'State',
		field: 'primary_state',
		renderCell: ({ row }) => row.primary_state || '—',
		width: 80,
	},
	{
		headerName: '',
		field: 'actions',
		renderCell: (params) => (
			<PartyActionsCell {...params} isAdminContext={isAdminContext} isManageMode={isManageMode} />
		),
		width: isAdminContext ? 100 : 50,
		resizable: false,
	},
];

function NoRows() {
	return (
		<CustomNoRowsOverlay
			text="No parties found"
			icon={<IconBuilding size={35} style={{ color: 'var(--text-muted)' }} />}
		/>
	);
}

export default function PartiesTab({ isAdminContext = true }: PartiesTabProps) {
	const showNewPartyDialog = useAdminStore((state) => state.showNewPartyDialog);
	const partyConstraints = useAdminStore((state) => state.partyConstraints);
	const toggleNewPartyDialog = useAdminStore((state) => state.toggleNewPartyDialog);
	const updatePartyConstraints = useAdminStore((state) => state.updatePartyConstraints);

	// Deep linking: edit party via URL param
	const router = useRouter();
	const searchParams = useSearchParams();
	const editPartyId = searchParams.get('edit');
	const [editingPartyFromUrl, setEditingPartyFromUrl] = useState<any | null>(null);
	const partyTrpc = usePartyTrpc();

	// URL filters hook for managing filters via search params
	const { getParam, getBoolParam, setParam } = useUrlFilters();

	// Filter states from URL params
	const partySearchTerm = getParam('search') ?? '';
	// Only allow archived filter in admin context
	const showArchivedParties = isAdminContext ? getBoolParam('archived') : false;

	// Local state for search input
	const [searchTerm, setSearchTerm] = useState('');
	const [isManageMode, setIsManageMode] = useState(false);

	// Query to fetch party by ID for deep linking (only when edit param is present)
	const { data: partyToEdit } = partyTrpc.get(
		{ id: editPartyId ? parseInt(editPartyId, 10) : 0 },
		{ enabled: !!editPartyId && !editingPartyFromUrl }
	);

	// Effect to set editing state when party is fetched from URL param
	useEffect(() => {
		if (partyToEdit && editPartyId) {
			setEditingPartyFromUrl(partyToEdit);
		}
	}, [partyToEdit, editPartyId]);

	// Handler to close the edit dialog and clear URL param
	const handleCloseEditDialog = () => {
		setEditingPartyFromUrl(null);
		// Clear the edit param from URL
		const params = new URLSearchParams(searchParams.toString());
		params.delete('edit');
		const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
		router.replace(newUrl, { scroll: false });
	};

	// Memoize columns based on isAdminContext and isManageMode
	const columns = useMemo(() => getColumns(isAdminContext, isManageMode), [isAdminContext, isManageMode]);
	const pinnedColumns = useMemo<GridPinnedColumnFields>(
		() => (isManageMode ? { right: ['actions'] } : {}),
		[isManageMode]
	);

	const { data = { rows: [], count: undefined }, isFetching } = partyTrpc.list({
		limit: partyConstraints.pageSize,
		offset: partyConstraints.page * partyConstraints.pageSize,
		searchTerm: partySearchTerm,
		showArchived: showArchivedParties,
	});
	const rowCountRef = useRef(data.count ?? 0);

	const rowCount = useMemo(() => {
		if (data.count !== undefined) {
			rowCountRef.current = data.count;
		}
		return rowCountRef.current;
	}, [data.count]);

	// Sync local search state with URL param changes
	useEffect(() => {
		setSearchTerm(partySearchTerm);
	}, [partySearchTerm]);

	// Debounce search input to URL param
	const debouncedSearch = useDebounce((search: string) => setParam('search', search), 500);

	return (
		<PageTransitionWrapper criticalDataReady={true} loadingMessage="Loading parties...">
			<div style={styles.container}>
				<div style={styles.paper} className="flex-col-start">
					<Toolbar
						left={
							<>
								<span style={{ marginRight: '20px' }}>
									Parties
								</span>
								{isAdminContext && (
									<>
										<Switch
											size="sm"
											checked={showArchivedParties}
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
									placeholder="Search parties..."
								/>
								<Button
									variant="contained"
									startIcon={<IconSquarePlus size={20} />}
									onClick={toggleNewPartyDialog}
									style={{ marginLeft: 12 }}
								>
									Party
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
							paginationModel={partyConstraints}
							onPaginationModelChange={updatePartyConstraints}
							disableColumnSelector
							disableRowSelectionOnClick
							disableColumnMenu
							pinnedColumns={pinnedColumns}
							style={{
								...styles.tableOverrides,
								...dataGridFocusStyles,
							}}
						/>
					</div>

					{showNewPartyDialog && <PartyDialog />}
					{editingPartyFromUrl && <PartyDialog party={editingPartyFromUrl} onClose={handleCloseEditDialog} />}
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
