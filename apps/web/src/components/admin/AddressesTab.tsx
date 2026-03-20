'use client';

import { IconAlertTriangle, IconMapPin, IconSettings, IconSquarePlus } from '@tabler/icons-react';
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
import AddressActionsCell from './AddressActionsCell';
import useDebounce from '@/lib/utils/useDebounce';
import { useAdminStore } from '@/stores/useAdminStore';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import AddressDialog from './AddressDialog';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import PageTransitionWrapper from '../common/PageTransitionWrapper';
import { AddressStatus } from '@/schemas/partySchemas';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';

interface AddressesTabProps {
	isAdminContext?: boolean;
}

const getStatusChip = (status: string) => {
	switch (status) {
		case AddressStatus.VALID:
			return <Chip  color="success" size="sm">Valid</Chip>;
		case AddressStatus.MAILING:
			return <Chip  color="info" size="sm">Mailing</Chip>;
		case AddressStatus.UNDELIVERABLE:
			return <Chip  color="error" size="sm">Undeliverable</Chip>;
		case AddressStatus.UNKNOWN:
		default:
			return <Chip  color="neutral" size="sm">Unknown</Chip>;
	}
};

const getColumns = (isAdminContext: boolean, isManageMode: boolean): ColumnDef<any, any>[] => [
	{
		header: 'Party',
		accessorKey: 'party_name',
		cell: ({ row: { original: row } }) => (
			<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
				{row.party_deleted_at && (
					<Tooltip content="Party is archived" position="right">
						<IconAlertTriangle size={16} style={{ color: 'var(--status-warning)' }} />
					</Tooltip>
				)}
				<span>{row.party_name}</span>
			</div>
		),
		minSize: 160,
	},
	{
		header: 'Label',
		accessorKey: 'name',
		cell: ({ row: { original: row } }) => row.name || '—',
		size: 140,
	},
	{
		header: 'Street',
		accessorKey: 'street_address',
		cell: ({ row: { original: row } }) => row.street_address || '—',
		minSize: 180,
	},
	{
		header: 'City',
		accessorKey: 'city',
		cell: ({ row: { original: row } }) => row.city || '—',
		size: 120,
	},
	{
		header: 'State',
		accessorKey: 'state',
		cell: ({ row: { original: row } }) => row.state || '—',
		size: 70,
	},
	{
		header: 'Postal',
		accessorKey: 'postal_code',
		cell: ({ row: { original: row } }) => row.postal_code || '—',
		size: 90,
	},
	{
		header: 'Type',
		accessorKey: 'address_type',
		cell: ({ row: { original: row } }) => (
			<span style={{ textTransform: 'capitalize', fontSize: 13 }}>
				{row.address_type || 'business'}
			</span>
		),
		size: 90,
	},
	{
		header: 'Status',
		accessorKey: 'address_status',
		cell: ({ row: { original: row } }) => getStatusChip(row.address_status),
		size: 115,
	},
	{
		header: '',
		accessorKey: 'actions',
		cell: (info: any) => { const params = { row: info.row.original, value: info.getValue() }; return (
			<AddressActionsCell {...params} isAdminContext={isAdminContext} isManageMode={isManageMode} />
		); },
		size: isAdminContext ? 100 : 50,
	},
];

function NoRows() {
	return (
		<CustomNoRowsOverlay
			text="No addresses found"
			icon={<IconMapPin size={35} style={{ color: 'var(--text-muted)' }} />}
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
	const [isManageMode, setIsManageMode] = useState(false);

	// Handler to close the edit dialog and clear URL param
	const handleCloseEditDialog = () => {
		setEditingAddressFromUrl(null);
		// Clear the edit param from URL
		const params = new URLSearchParams(searchParams.toString());
		params.delete('edit');
		const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
		router.replace(newUrl, { scroll: false });
	};

	// Memoize columns based on isAdminContext and isManageMode
	const columns = useMemo(() => getColumns(isAdminContext, isManageMode), [isAdminContext, isManageMode]);
	const pinnedColumns = useMemo<{ left?: string[]; right?: string[] }>(
		() => (isManageMode ? { right: ['actions'] } : {}),
		[isManageMode]
	);

	const { data = { rows: [], count: undefined }, isFetching } = usePartyTrpc().listAllAddresses({
		limit: addressConstraints.pageSize,
		offset: addressConstraints.page * addressConstraints.pageSize,
		searchTerm: addressSearchTerm,
		showArchived: showArchivedAddresses,
	});

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
				<Card variant="beveled" padding="md" style={styles.paper}>
					<Toolbar
						left={
							<>
								<h5 style={{ margin: 0, fontSize: 18, fontWeight: 700, marginRight: '20px' }}>
									Addresses
								</h5>
								{isAdminContext && (
									<>
										<Switch
											size="sm"
											checked={showArchivedAddresses}
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
									placeholder="Search addresses..."
								/>
								<Button
									variant="contained"
									startIcon={<IconSquarePlus size={20} />}
									onClick={toggleNewAddressDialog}
									style={{ marginLeft: 16 }}
								>
									Address
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
						<DataTable
							columns={columns}
							headerHeight={45}
							loading={isFetching}
							rows={data.rows}
							rowCount={data?.count ?? 0}
							rowHeight={45}
							paginationMode="server"
							paginationModel={addressConstraints}
							onPaginationModelChange={updateAddressConstraints}
							pinnedRight={isManageMode ? ['actions'] : []}
						/>
					</div>

					{showNewAddressDialog && <AddressDialog />}
					{editingAddressFromUrl && (
						<AddressDialog address={editingAddressFromUrl} onClose={handleCloseEditDialog} />
					)}
				</Card>
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
		overflow: 'hidden',
	},
};
