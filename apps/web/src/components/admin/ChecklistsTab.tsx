'use client';

import { IconChecklist, IconFileSearch, IconSettings, IconSquarePlus } from '@tabler/icons-react';
import Tooltip from '@/components/ui/Tooltip';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { formatMDY } from '@/lib/utils/utils';
import { useMemo, useState } from 'react';
import Toolbar from '../common/Toolbar';
import IconHeaderCell from '../common/IconHeaderCell';
import ChecklistActionsCell from './ChecklistActionsCell';
import { useAdminStore } from '@/stores/useAdminStore';
import NewChecklistDialog from './NewChecklistDialog';
import ExpandableHeaderCell from '../common/ExpandableHeaderCell';
import StackedHeaderCell from '../common/StackedHeaderCell';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import PageTransitionWrapper from '../common/PageTransitionWrapper';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';

const getColumns = (isManageMode: boolean): ColumnDef<any, any>[] => [
	{
		accessorKey: 'name',
		header: '',
		// header: (params) => (
		// 	<ExpandableHeaderCell {...params} icon={<IconFileSearch size={17} style={{ color: white }} />} />
		// ),
		cell: (info: any) => { const params = { row: info.row.original, value: info.getValue() }; return <StackedHeaderCell primary={params.row.name} secondary={params.row.creator} />; },
		size: 200,
		enableSorting: false,
	},
	{
		accessorKey: 'page_count',
		header: '',
		cell: ({ getValue }) => { const value = getValue(); return `${value?.toLocaleString() ?? ''} pages`; },
		size: 120,
		enableSorting: false,
	},
	{
		accessorKey: 'dates',
		header: () => <IconHeaderCell />,
		cell: (info: any) => { const params = { row: info.row.original, value: info.getValue() }; return (
			<StackedHeaderCell
				primary={params.row.updated_at ? `Last updated ${formatMDY(params.row.updated_at)}` : ''}
				secondary={`Created ${formatMDY(params.row.created_at)}`}
			/>
		); },
		size: 250,
		enableSorting: false,
	},
	{
		accessorKey: 'actions',
		header: '',
		minSize: 200,
		enableSorting: false,
		cell: (info: any) => { const params = { row: info.row.original, value: info.getValue() }; return <ChecklistActionsCell {...params} isManageMode={isManageMode} />; },
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
	const [isManageMode, setIsManageMode] = useState(false);

	const columns = useMemo(() => getColumns(isManageMode), [isManageMode]);
	return (
		<PageTransitionWrapper criticalDataReady={true} loadingMessage="Loading checklists...">
			<div style={styles.container}>
				<Card variant="beveled" padding="md" style={styles.paper}>
					<Toolbar
						left={undefined}
						right={
							<>
								<Button variant="contained" startIcon={<IconSquarePlus size={20} />} onClick={toggleNewChecklistDialog}>
									Checklist
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
					<p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 12px', lineHeight: 1.5 }}>
						Checklists are templates that guide adjusters through claim requirements. Published checklists are available to all users.
					</p>
					<div style={styles.table}>
						<DataTable
							columns={columns}
							headerHeight={45}
							loading={isFetching}
							rows={checklists}
							rowHeight={60}
							pinnedRight={isManageMode ? ['actions'] : []}
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
		size: '100%',
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
		size: '100%',
		height: 'calc(100% - 50px)',
	},
};
