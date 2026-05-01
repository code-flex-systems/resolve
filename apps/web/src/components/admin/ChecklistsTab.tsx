'use client';

import { IconChecklist, IconSquarePlus } from '@tabler/icons-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { formatMDYAbv } from '@/lib/utils/utils';
import Toolbar from '../common/Toolbar';
import ChecklistActionsCell from './ChecklistActionsCell';
import { useAdminStore } from '@/stores/useAdminStore';
import NewChecklistDialog from './NewChecklistDialog';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import PageTransitionWrapper from '../common/PageTransitionWrapper';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';

const columns: ColumnDef<any, any>[] = [
	{
		accessorKey: 'name',
		header: 'Title',
		cell: ({ row }) => row.original.name,
		size: 260,
		enableSorting: false,
	},
	{
		accessorKey: 'creator',
		header: 'Creator',
		cell: ({ row }) => row.original.creator,
		size: 160,
		enableSorting: false,
	},
	{
		accessorKey: 'page_count',
		header: 'Pages',
		cell: ({ getValue }) => {
			const value = getValue();
			return value?.toLocaleString() ?? '';
		},
		size: 90,
		enableSorting: false,
	},
	{
		accessorKey: 'updated_at',
		header: 'Last Updated',
		cell: ({ row }) => formatMDYAbv(row.original.updated_at),
		size: 130,
		enableSorting: false,
	},
	{
		accessorKey: 'created_at',
		header: 'Created',
		cell: ({ row }) => formatMDYAbv(row.original.created_at),
		size: 130,
		enableSorting: false,
	},
	{
		accessorKey: 'actions',
		header: '',
		size: 120,
		enableSorting: false,
		cell: (info: any) => {
			const params = { row: info.row.original, value: info.getValue() };
			return <ChecklistActionsCell {...params} />;
		},
	},
];

function NoRows() {
	return (
		<CustomNoRowsOverlay
			text="No checklists found"
			icon={<IconChecklist size={35} style={{ color: 'var(--text-muted)' }} />}
		/>
	);
}

export default function ChecklistsTab() {
	const { data: checklists = [], isFetching } = useChecklistTrpc().list({});
	const showNewChecklistDialog = useAdminStore((state) => state.showNewChecklistDialog);
	const toggleNewChecklistDialog = useAdminStore((state) => state.toggleNewChecklistDialog);

	return (
		<PageTransitionWrapper criticalDataReady={true} loadingMessage="Loading checklists...">
			<div style={styles.container}>
				<Card variant="beveled" padding="md" style={styles.paper}>
					<Toolbar
						left={
							<p
								style={{
									color: 'var(--text-secondary)',
									fontSize: 13,
									margin: '0 0 12px',
									lineHeight: 1.5,
								}}
							>
								Checklists are templates that guide adjusters through claim requirements. Published
								checklists are available to all users.
							</p>
						}
						right={
							<Button
								variant="contained"
								startIcon={<IconSquarePlus size={20} />}
								onClick={toggleNewChecklistDialog}
							>
								Checklist
							</Button>
						}
						padding={'0px 10px'}
					/>

					<div style={styles.table}>
						<DataTable
							columns={columns}
							headerHeight={45}
							loading={isFetching}
							rows={checklists}
							rowHeight={52}
							hideFooter
						/>
					</div>
				</Card>
				{showNewChecklistDialog && <NewChecklistDialog />}
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
		height: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
		minHeight: 0,
	},
	table: {
		width: '100%',
		height: 'calc(100% - 50px)',
	},
};
