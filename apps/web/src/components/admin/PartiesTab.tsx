'use client';

import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { Button, Fade, IconButton, Paper, Switch, Typography } from '@mui/material';
import { DataGridPro, GridColDef } from '@mui/x-data-grid-pro';
import AddBox from '@mui/icons-material/AddBox';
import Business from '@mui/icons-material/Business';
import Category from '@mui/icons-material/Category';
import Email from '@mui/icons-material/Email';
import Search from '@mui/icons-material/Search';
import Clear from '@mui/icons-material/Clear';
import CustomPagination from '../common/CustomPagination';
import Toolbar from '../common/Toolbar';
import IconHeaderCell from '../common/IconHeaderCell';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PartyActionsCell from './PartyActionsCell';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import useDebounce from '@/lib/utils/useDebounce';
import StackedHeaderCell from '../common/StackedHeaderCell';
import { useAdminStore } from '@/stores/useAdminStore';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import PartyDialog from './PartyDialog';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { PartyCategoryValue } from '../common/ReferenceDataSelect';

const COLUMNS: GridColDef[] = [
	{
		headerName: 'Party',
		field: 'party',
		renderCell: ({ row }) => (
			<StackedHeaderCell primary={row.name} secondary={row.organization ?? 'No organization'} />
		),
		renderHeader: (params) => (
			<IconHeaderCell {...params} icon={<Business style={{ color: BASE_COLOR_LIGHT }} />} />
		),
		flex: 1,
	},
	{
		headerName: 'Type',
		field: 'party_type',
		renderCell: ({ row }) => (
			<StackedHeaderCell
				primary={row.party_type}
				secondary={<PartyCategoryValue value={row.party_category} partyType={row.party_type} showEmoji={false} fontSize={12} />}
			/>
		),
		renderHeader: (params) => (
			<IconHeaderCell {...params} icon={<Category style={{ color: BASE_COLOR_LIGHT }} />} />
		),
		width: 200,
	},
	{
		headerName: 'Contact',
		field: 'contact',
		renderCell: ({ row }) => (
			<StackedHeaderCell primary={row.email ?? 'No email'} secondary={row.phone ?? 'No phone'} />
		),
		renderHeader: (params) => <IconHeaderCell {...params} icon={<Email style={{ color: BASE_COLOR_LIGHT }} />} />,
		width: 250,
	},
	{
		headerName: '',
		field: 'actions',
		renderCell: (params) => <PartyActionsCell {...params} />,
		width: 100,
		resizable: false,
	},
];

function NoRows() {
	return (
		<CustomNoRowsOverlay
			text="No parties found"
			icon={<Business sx={{ fontSize: 35, color: BASE_COLOR_LIGHT }} />}
		/>
	);
}

export default function PartiesTab() {
	const showNewPartyDialog = useAdminStore((state) => state.showNewPartyDialog);
	const partyConstraints = useAdminStore((state) => state.partyConstraints);
	const toggleNewPartyDialog = useAdminStore((state) => state.toggleNewPartyDialog);
	const updatePartyConstraints = useAdminStore((state) => state.updatePartyConstraints);

	// URL filters hook for managing filters via search params
	const { getParam, getBoolParam, setParam } = useUrlFilters();

	// Filter states from URL params
	const partySearchTerm = getParam('search') ?? '';
	const showArchivedParties = getBoolParam('archived');

	// Local state for search input
	const [searchTerm, setSearchTerm] = useState(partySearchTerm);

	const { data = { rows: [], count: undefined }, isFetching } = usePartyTrpc().list({
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
	const debouncedSearch = useCallback(
		useDebounce((search: string) => setParam('search', search), 500),
		[setParam]
	);

	return (
		<Fade in={true} timeout={1000}>
			<div style={styles.container}>
				<Paper sx={styles.paper} className="flex-col-start">
					<Toolbar
						left={
							<>
								<Typography variant="h6" marginRight="20px">
									Parties
								</Typography>
								<Switch
									size="small"
									checked={showArchivedParties}
									onChange={(_, checked) => setParam('archived', checked)}
									color="warning"
									sx={{ marginLeft: '10px' }}
								/>
								<Typography fontSize={14} fontStyle="italic">
									Show Archived Only
								</Typography>
							</>
						}
						right={
							<>
								<Paper elevation={0} sx={styles.searchPaper}>
									<Search
										sx={{
											fontSize: 17,
											marginRight: '5px',
										}}
									/>
									<input
										placeholder="Search"
										type="text"
										style={styles.textField}
										value={searchTerm}
										onChange={(e) => {
											setSearchTerm(e.target.value);
											debouncedSearch(e.target.value);
										}}
									/>
									{searchTerm && (
										<IconButton
											size="small"
											onClick={() => {
												setSearchTerm('');
												setParam('search', '');
											}}
											sx={{ padding: '2px', marginLeft: '2px' }}
										>
											<Clear sx={{ fontSize: 16 }} />
										</IconButton>
									)}
								</Paper>
								<Button variant="contained" startIcon={<AddBox />} onClick={toggleNewPartyDialog}>
									Party
								</Button>
							</>
						}
						height={50}
						padding={'0px 10px'}
					/>
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
							paginationModel={partyConstraints}
							onPaginationModelChange={updatePartyConstraints}
							disableColumnSelector
							disableRowSelectionOnClick
							disableColumnMenu
							sx={styles.tableOverrides}
						/>
					</div>

					{showNewPartyDialog && <PartyDialog />}
				</Paper>
			</div>
		</Fade>
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
		padding: '15px 15px 0px',
		border: 1,
		borderColor: 'divider',
		minHeight: 0,
	},
	searchPaper: {
		border: 1,
		borderColor: 'divider',
		borderRadius: 3,
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		width: 200,
		height: 35,
		marginRight: '20px',
	},
	table: {
		width: '100%',
		height: 'calc(100% - 50px)',
	},
	tableOverrides: {
		border: 'none',
	},
	textField: {
		border: 'none',
		outline: 'none',
		padding: '2px 5px',
	},
};
