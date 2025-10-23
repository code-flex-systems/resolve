'use client';

import { DataGridPro, GridColDef } from '@mui/x-data-grid-pro';
import { useAdminStore } from '@/stores/useAdminStore';
import { formatMDYAbv } from '@/lib/utils/utils';
import ClaimAmountCell from './ClaimAmountCell';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { Button, Collapse, Paper, Switch, Typography } from '@mui/material';
import AddBox from '@mui/icons-material/AddBox';
import ContentPasteSearch from '@mui/icons-material/ContentPasteSearch';
import PersonSearch from '@mui/icons-material/PersonSearch';
import Upload from '@mui/icons-material/Upload';
import IconHeaderCell from '../common/IconHeaderCell';
import { CustomPagination } from '../common/CustomPagination';
import Toolbar from '../common/Toolbar';
import { useMemo, useRef } from 'react';
import { useFeedTrpc } from '@/hooks/trpc/useFeedTrpc';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';

const COLUMNS: GridColDef[] = [
	{
		headerName: 'Claim',
		field: 'claim_number',
		cellClassName: 'cell-bold',
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
	const claimConstraints = useAdminStore((state) => state.claimConstraints);
	const selectedFeedId = useAdminStore((state) => state.selectedFeedId);
	const setFeedId = useAdminStore((state) => state.setFeedId);
	const toggleImportClaimsDialog = useAdminStore((state) => state.toggleImportClaimsDialog);
	const toggleNewClaimDialog = useAdminStore((state) => state.toggleNewClaimDialog);
	const updateClaimConstraints = useAdminStore((state) => state.updateClaimConstraints);
	const { data: feeds = [] } = useFeedTrpc().list();
	const { data = { rows: [], count: undefined }, isFetching } = useClaimTrpc().list({
		feedId: selectedFeedId,
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

	return (
		<div style={styles.container} className="flex-col-start">
			<Paper sx={styles.paper} className="flex-col-start">
				<Toolbar
					left={
						<>
							<Collapse in={!!selectedFeed} orientation="horizontal">
								<div style={{ width: 200, marginRight: 10 }}>
									<Typography fontSize={15} lineHeight="19px">
										Viewing claims for <b>{selectedFeed?.name ?? ''}</b>
									</Typography>
								</div>
							</Collapse>
							<Switch
								size="small"
								checked={selectedFeedId === null}
								onChange={(_, checked) => setFeedId(checked ? null : undefined)}
								sx={{ marginLeft: '10px' }}
							/>
							<Typography fontSize={14} fontStyle="italic">
								Only Manual Claims
							</Typography>
						</>
					}
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
							<Button variant="contained" startIcon={<AddBox />} onClick={toggleNewClaimDialog}>
								Claim
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
						getRowClassName={(params) => (params.indexRelativeToCurrentPage % 2 === 0 ? 'striped' : '')}
						disableColumnSelector
						disableColumnMenu
						sx={styles.tableOverrides}
					/>
				</div>
			</Paper>
		</div>
	);
}

const styles = {
	container: {
		flex: 1,
		minWidth: 0,
		height: '100%',
		paddingTop: 20,
		marginLeft: 20,
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
		height: 'calc(100% - 50px)',
	},
	tableOverrides: {
		border: 'none',
	},
};
