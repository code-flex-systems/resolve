// import { useMemo, useState } from 'react';
// import { IconButton, Paper } from '@mui/material';
// import { ArrowForward } from '@mui/icons-material';
// import { DataGrid, GridColDef } from '@mui/x-data-grid';
// import { useClaims } from '@/hooks/useClaim';
// import * as actions from '@/state/checklists/actions';
// import { useChecklistsSlice } from '@/state/store';
// import { formatMDYAbv } from '@/lib/utils/utils';
// import theme from '@/styles/theme';
// import ClaimAmountCell from './ClaimAmountCell';
// import ClaimHeaderCell from './ClaimHeaderCell';
// import './styles.css';

// const COLUMNS: GridColDef[] = [
// 	{
// 		headerName: 'Claim',
// 		field: 'claim_number',
// 		cellClassName: 'cell-bold',
// 	},
// 	{
// 		headerName: 'Client',
// 		field: 'client',
// 	},
// 	{
// 		headerName: 'Client Adjuster',
// 		field: 'client_adjuster',
// 	},
// 	{
// 		headerName: 'Insured',
// 		field: 'insured',
// 	},
// 	{
// 		headerName: 'Claim Amount',
// 		field: 'claim_amount',
// 		renderCell: (params) => <ClaimAmountCell {...params} />,
// 	},
// 	{
// 		headerName: 'Total Incurred',
// 		field: 'total_incurred',
// 		renderCell: (params) => <ClaimAmountCell {...params} />,
// 	},
// 	{
// 		headerName: 'Date of Loss',
// 		field: 'date_of_loss',
// 		valueFormatter: (value: any) => formatMDYAbv(value),
// 		align: 'right',
// 	},
// 	{
// 		headerName: 'Loss Location',
// 		field: 'loss_location',
// 	},
// 	{
// 		headerName: 'Last Updated By',
// 		field: 'last_updated_by',
// 	},
// 	{
// 		headerName: 'Last Update',
// 		field: 'last_update',
// 		valueFormatter: (value: any) => formatMDYAbv(value),
// 		align: 'right',
// 	},
// 	{
// 		headerName: 'Expected Recovery',
// 		field: 'expected_recovery',
// 		renderCell: (params) => <ClaimAmountCell {...params} />,
// 	},
// ];

// export default function ClaimItems() {
// 	const claims = useChecklistsSlice((state) => state.claims);
// 	const [expanded, setExpanded] = useState(false);
// 	const { isFetching } = useClaims(actions.updateClaimData, !claims.length);

// 	const columns = useMemo(() => {
// 		let gridColumns: GridColDef[] = COLUMNS.map((c) => ({
// 			...c,
// 			width: 150,
// 			renderHeader: (params) => <ClaimHeaderCell {...params} />,
// 		}));
// 		return gridColumns;
// 	}, []);

// 	return (
// 		<div style={{ ...styles.container, width: expanded ? 900 : 300 }} className="flex-col-start">
// 			<Paper style={styles.table}>
// 				<DataGrid
// 					columns={columns}
// 					columnHeaderHeight={45}
// 					loading={isFetching}
// 					slotProps={{
// 						loadingOverlay: {
// 							noRowsVariant: 'skeleton',
// 							variant: 'skeleton',
// 						},
// 					}}
// 					initialState={{
// 						pagination: { paginationModel: { pageSize: 20 } },
// 					}}
// 					rows={claims}
// 					rowHeight={40}
// 					hideFooterSelectedRowCount
// 					pageSizeOptions={[]}
// 					getRowClassName={(params) =>
// 						params.indexRelativeToCurrentPage % 2 === 0 ? 'striped hovered-row' : 'hovered-row'
// 					}
// 					disableColumnSelector
// 					disableColumnMenu
// 					sx={styles.tableOverrides}
// 				/>
// 				<div style={styles.expandContainer}>
// 					<IconButton
// 						style={styles.button}
// 						onClick={(e) => {
// 							e.stopPropagation();
// 							e.preventDefault();
// 							setExpanded((prev) => !prev);
// 						}}
// 						className="hovered-button"
// 					>
// 						<ArrowForward
// 							sx={{
// 								color: 'white',
// 								transform: expanded ? 'rotate(180deg)' : undefined,
// 								transition: 'transform 300ms ease',
// 								transitionDelay: '400ms',
// 							}}
// 						/>
// 					</IconButton>
// 				</div>
// 			</Paper>
// 		</div>
// 	);
// }

// const styles = {
// 	button: {
// 		position: 'absolute' as const,
// 		bottom: 70,
// 		right: 10,
// 		backgroundColor: theme.palette.primary.main,
// 		width: 40,
// 		height: 40,
// 		boxShadow: '0 4px 6px rgba(0, 0, 0, 0.25)',
// 	},
// 	container: {
// 		height: 'calc(100% - 70px)',
// 		transition: 'width 600ms ease',
// 	},
// 	expandContainer: {
// 		position: 'relative' as const,
// 		zIndex: 10,
// 	},
// 	horizontalDiv: {
// 		height: 1,
// 		width: '100%',
// 	},
// 	icon: {
// 		marginRight: '5px',
// 	},
// 	menuItem: {
// 		padding: 0,
// 	},
// 	menuItemInner: {
// 		padding: 5,
// 	},
// 	table: {
// 		width: '100%',
// 		height: '100%',
// 		border: `1px solid ${theme.palette.primary.main}`,
// 		borderRadius: 5,
// 	},
// 	tableOverrides: {
// 		border: 'none',
// 	},
// 	verticalDiv: {
// 		height: 25,
// 		width: 1,
// 		padding: '0px 10px',
// 	},
// };

// {
// 	/* <Collapse in={!isFetching}>
// 	{claims.map((c) => (
// 		<MenuItem key={c.id} sx={styles.menuItem}>
// 			<div className="flex-col-center">
// 				<div style={styles.menuItemInner} className="flex-row-left">
// 					<Typography fontWeight="bold" color="primary" width={120}>
// 						{c.claim_number}
// 					</Typography>
// 					<div style={styles.verticalDiv}>
// 						<Divider orientation="vertical" />
// 					</div>
// 					<AccountCircle sx={styles.icon} />
// 					<Typography noWrap width={200}>
// 						{c.client}
// 					</Typography>
// 					<div style={styles.verticalDiv}>
// 						<Divider orientation="vertical" />
// 					</div>
// 					<AccessTimeFilled sx={styles.icon} />
// 					<Typography>{dayjs(c.last_update).format('DD/MM/YYYY')}</Typography>
// 				</div>
// 				<div style={{ ...styles.menuItemInner, paddingTop: 0 }} className="flex-row-left">
// 					<Typography>
// 						$
// 						{parseFloat(c.claim_amount.toString()).toLocaleString('en-US', {
// 							minimumFractionDigits: 2,
// 							maximumFractionDigits: 2,
// 						})}
// 					</Typography>
// 				</div>
// 				<div style={styles.horizontalDiv}>
// 					<Divider orientation="horizontal" />
// 				</div>
// 			</div>
// 		</MenuItem>
// 	))}
// </Collapse>; */
// }
