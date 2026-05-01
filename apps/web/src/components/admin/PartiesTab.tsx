'use client';

import { IconBuilding, IconSettings, IconSquarePlus } from '@tabler/icons-react';
import Tooltip from '@/components/ui/Tooltip';
import Card from '@/components/ui/Card';
import Switch from '@/components/ui/Switch';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import SearchInput from '../common/SearchInput';
import Toolbar from '../common/Toolbar';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PartyActionsCell from './PartyActionsCell';
import useDebounce from '@/lib/utils/useDebounce';
import { useAdminStore } from '@/stores/useAdminStore';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import PartyDialog from './PartyDialog';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import PageTransitionWrapper from '../common/PageTransitionWrapper';
import PhoneCell from './PhoneCell';
import EmailCell from './EmailCell';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';

interface PartiesTabProps {
	isAdminContext?: boolean;
}

const getColumns = (isAdminContext: boolean, isManageMode: boolean): ColumnDef<any, any>[] => [
	{
		header: 'Name',
		accessorKey: 'name',
		minSize: 180,
	},
	{
		header: 'Type',
		accessorKey: 'party_type',
		cell: ({ row: { original: row } }) => (
			<Chip size="sm" color={row.party_type === 'entity' ? 'info' : 'neutral'} variant="outlined">
				{row.party_type === 'entity' ? 'Entity' : 'Facilitator'}
			</Chip>
		),
		size: 110,
	},
	{
		header: 'Organization',
		accessorKey: 'organization',
		cell: ({ row: { original: row } }) => row.organization || '—',
		size: 160,
	},
	{
		header: 'Email',
		accessorKey: 'primary_email',
		cell: ({ row: { original: row } }) => <EmailCell value={row.primary_email} />,
		size: 200,
	},
	{
		header: 'Phone',
		accessorKey: 'primary_phone',
		cell: ({ row: { original: row } }) => <PhoneCell value={row.primary_phone} />,
		size: 140,
	},
	{
		header: 'City',
		accessorKey: 'primary_city',
		cell: ({ row: { original: row } }) => row.primary_city || '—',
		size: 120,
	},
	{
		header: 'State',
		accessorKey: 'primary_state',
		cell: ({ row: { original: row } }) => row.primary_state || '—',
		size: 80,
	},
	{
		header: '',
		accessorKey: 'actions',
		cell: (info: any) => {
			const params = { row: info.row.original, value: info.getValue() };
			return (
				<PartyActionsCell {...params} isAdminContext={isAdminContext} isManageMode={isManageMode} />
			);
		},
		size: isAdminContext ? 100 : 50,
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
		{ id: editPartyId ?? '' },
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
	const columns = useMemo(
		() => getColumns(isAdminContext, isManageMode),
		[isAdminContext, isManageMode]
	);
	const pinnedColumns = useMemo<{ left?: string[]; right?: string[] }>(
		() => (isManageMode ? { right: ['actions'] } : {}),
		[isManageMode]
	);

	const { data = { rows: [], count: undefined }, isFetching } = partyTrpc.list({
		limit: partyConstraints.pageSize,
		offset: partyConstraints.page * partyConstraints.pageSize,
		searchTerm: partySearchTerm,
		showArchived: showArchivedParties,
	});

	// Sync local search state with URL param changes
	useEffect(() => {
		setSearchTerm(partySearchTerm);
	}, [partySearchTerm]);

	// Debounce search input to URL param
	const debouncedSearch = useDebounce((search: string) => setParam('search', search), 500);

	return (
		<PageTransitionWrapper criticalDataReady={true} loadingMessage="Loading parties...">
			<div style={styles.container}>
				<Card variant="beveled" padding="md" style={styles.paper}>
					<p
						style={{
							color: 'var(--text-secondary)',
							fontSize: 13,
							margin: '0 0 12px',
							lineHeight: 1.5,
						}}
					>
						Parties are individuals and organizations involved in claims — insureds, claimants,
						attorneys, contractors, and other entities.
					</p>
					<Toolbar
						left={
							<>
								{isAdminContext && (
									<>
										<Switch
											size="sm"
											checked={showArchivedParties}
											onChange={(checked) => setParam('archived', checked)}
											color="warning"
											style={{ marginLeft: '10px' }}
										/>
										<span style={{ fontSize: 14, fontStyle: 'italic' }}>Show Archived Only</span>
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
									<Button
										variant="icon"
										size="sm"
										onClick={() => setIsManageMode(!isManageMode)}
										style={{
											marginLeft: 8,
											backgroundColor: isManageMode ? 'var(--bg-tertiary)' : undefined,
										}}
									>
										<IconSettings
											size={20}
											style={{ color: isManageMode ? 'primary.main' : undefined }}
										/>
									</Button>
								</Tooltip>
							</>
						}
						height={50}
						padding={'0px 10px'}
					/>
					<div style={styles.table}>
						<DataTable
							columns={columns}
							headerHeight={45}
							loading={isFetching}
							rows={data.rows}
							rowCount={data?.count ?? 0}
							rowHeight={45}
							paginationMode="server"
							paginationModel={partyConstraints}
							onPaginationModelChange={updatePartyConstraints}
							pinnedRight={isManageMode ? ['actions'] : []}
						/>
					</div>

					{showNewPartyDialog && <PartyDialog />}
					{editingPartyFromUrl && (
						<PartyDialog party={editingPartyFromUrl} onClose={handleCloseEditDialog} />
					)}
				</Card>
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
		overflow: 'hidden',
	},
};
