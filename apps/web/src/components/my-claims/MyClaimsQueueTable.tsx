'use client';

import { useMemo, useCallback } from 'react';
import CustomButton from '@/components/ui/Button';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import CustomNoRowsOverlay from '@/components/common/CustomNoRowsOverlay';
import IconHeaderCell from '@/components/common/IconHeaderCell';
import StackedHeaderCell from '@/components/common/StackedHeaderCell';
import { formatClaimStatus } from '@/lib/utils/claimUtils';
import ClaimStatusChip from '@/components/common/ClaimStatusChip';
import BasicPopper from '@/components/common/BasicPopper';
import Toolbar from '@/components/common/Toolbar';
import SearchInput from '@/components/common/SearchInput';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { formatMDYAbv, formatUser } from '@/lib/utils/utils';
import dayjs from 'dayjs';
import SubstatusSelect from '@/components/common/SubstatusSelect';
import RecoveryStatusSelect from '@/components/common/RecoveryStatusSelect';
import { ClaimSubstatus, RecoveryStatus } from '@/config/enums';
import { IconClipboardSearch, IconDownload, IconFilter } from '@tabler/icons-react';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';

export interface MyClaimListItem {
	id: string;
	claim_number: string | null;
	client: string | null;
	insured: string | null;
	claim_amount: string | number | null;
	date_of_loss: Date | null;
	last_update: string | null;
	actual_recovery: string | number | null;
	expected_recovery: string | number | null;
	recovery_status: string | null;
	substatus?: string | null;
	created_at: Date | null;
	// Desk queue fields (listMyDeskClaims)
	desk_location_id?: string | null;
	desk_priority?: number;
	desk_location_name?: string | null;
	// Checklist-based fields (listMyClaims) - optional for compatibility
	claim_status?: string;
	checklist_id?: number;
	checklist_name?: string | null;
	assignee?: string | null;
	assigned_at?: Date | null;
	assignee_first?: string | null;
	assignee_last?: string | null;
	assignee_email?: string | null;
}

interface MyClaimsQueueTableProps {
	rows: MyClaimListItem[];
	count: number;
	isFetching: boolean;
	searchTerm: string;
	setSearchTerm: (value: string) => void;
	appliedSubstatus: string | null;
	appliedRecoveryStatus: string | null;
	appliedSearch: string;
	hasActiveFilters: boolean;
	filtersAnchorEl: HTMLElement | null;
	handleOpenFilters: (e: React.MouseEvent) => void;
	handleCloseFilters: () => void;
	handleClearAllFilters: () => void;
	draftSubstatus: string | null;
	setDraftSubstatus: (value: string | null) => void;
	draftRecoveryStatus: string | null;
	setDraftRecoveryStatus: (value: string | null) => void;
	handleApplyFilters: () => void;
	showDeskColumn?: boolean;
}

export default function MyClaimsQueueTable({
	rows,
	count,
	isFetching,
	searchTerm,
	setSearchTerm,
	appliedSubstatus,
	appliedRecoveryStatus,
	appliedSearch,
	hasActiveFilters,
	filtersAnchorEl,
	handleOpenFilters,
	handleCloseFilters,
	handleClearAllFilters,
	draftSubstatus,
	setDraftSubstatus,
	draftRecoveryStatus,
	setDraftRecoveryStatus,
	handleApplyFilters,
	showDeskColumn = false,
}: MyClaimsQueueTableProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	// Handle row click - update URL with selected claim ID
	const handleRowClick = (params: any) => {
		const claimId = params.row.id;
		const newParams = new URLSearchParams(searchParams.toString());
		newParams.set('selected', claimId.toString());
		router.push(`${pathname}?${newParams.toString()}`);
	};

	// Export to CSV
	const handleExport = () => {
		if (!rows || rows.length === 0) return;

		const headers = showDeskColumn
			? ['Claim Number', 'Desk', 'Insured', 'Expected Recovery', 'Actual Recovery', 'Status', 'Last Update']
			: ['Claim Number', 'Insured', 'Expected Recovery', 'Actual Recovery', 'Status', 'Last Update'];

		const csvRows = rows.map((row: MyClaimListItem) => {
			const baseRow = [row.claim_number || ''];

			if (showDeskColumn) {
				baseRow.push(row.desk_location_name || '');
			}

			baseRow.push(
				row.insured || '',
				row.expected_recovery?.toString() || '',
				row.actual_recovery?.toString() || '',
				formatClaimStatus(row.recovery_status, row.substatus)
			);

			baseRow.push(row.last_update ? dayjs(row.last_update).format('MM/DD/YYYY') : '');

			return baseRow;
		});

		const csvContent = [
			headers.join(','),
			...csvRows.map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(',')),
		].join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `my-claims-${dayjs().format('YYYY-MM-DD')}.csv`;
		a.click();
		window.URL.revokeObjectURL(url);
	};

	// Last activity indicator
	const getActivityIndicator = (lastUpdate: string | null) => {
		if (!lastUpdate) return null;
		const daysSince = dayjs().diff(dayjs(lastUpdate), 'day');
		if (daysSince === 0) return <div style={{ ...queueStyles.indicator }} />;
		if (daysSince <= 7) return <div style={{ ...queueStyles.indicator }} />;
		return <div style={{ ...queueStyles.indicator }} />;
	};

	// DataGrid columns
	const columns: ColumnDef<MyClaimListItem, any>[] = useMemo(() => {
		const baseColumns: ColumnDef<MyClaimListItem, any>[] = [
			{
				accessorKey: 'status',
				header: (ctx) => <IconHeaderCell {...ctx} />,
				cell: (info: any) => {
					const params = { row: info.row.original, value: info.getValue() };
					return (
						<ClaimStatusChip recoveryStatus={params.row.recovery_status} substatus={params.row.substatus} />
					);
				},
				size: 200,
			},
			{
				accessorKey: 'claim_number',
				header: (ctx) => <IconHeaderCell {...ctx} icon={<IconClipboardSearch size={20} />} />,
				size: 220,
			},
		];

		if (showDeskColumn) {
			baseColumns.push({
				accessorKey: 'desk_location_name',
				header: (ctx) => <IconHeaderCell {...ctx} />,
				size: 180,
			});
		}

		baseColumns.push(
			{
				accessorKey: 'insured',
				header: (ctx) => <IconHeaderCell {...ctx} />,
				size: 180,
			},
			{
				accessorKey: 'expected_recovery',
				header: (ctx) => <IconHeaderCell {...ctx} />,
				cell: (info: any) => {
					const params = { row: info.row.original, value: info.getValue() };
					return formatCurrencyExact(parseFloat(params.value?.toString() || '0'));
				},
				size: 130,
			},
			{
				accessorKey: 'actual_recovery',
				header: (ctx) => <IconHeaderCell {...ctx} />,
				cell: (info: any) => {
					const params = { row: info.row.original, value: info.getValue() };
					return formatCurrencyExact(parseFloat(params.value?.toString() || '0'));
				},
				size: 130,
			}
		);

		baseColumns.push({
			accessorKey: 'last_update',
			header: (ctx) => <IconHeaderCell {...ctx} />,
			cell: (info: any) => {
				const params = { row: info.row.original, value: info.getValue() };
				return (
					<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
						{getActivityIndicator(params.value)}
						{formatMDYAbv(params.value)}
					</div>
				);
			},
			size: 140,
		});

		return baseColumns;
	}, [showDeskColumn]);

	return (
		<>
			{/* Search and Filters Toolbar */}
			<Toolbar
				left={
					<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
						<SearchInput
							value={searchTerm}
							onChange={(value) => setSearchTerm(value)}
							placeholder="Search by claim number, insured, or client..."
							width={350}
						/>
						<CustomButton variant="outlined" onClick={handleOpenFilters} endIcon={<IconFilter size={16} />}>
							Filters...
							{hasActiveFilters && (
								<div
									style={{
										marginLeft: 4,
										color: 'white',
										borderRadius: '50%',
										width: 18,
										height: 18,
										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										fontSize: 11,
										fontWeight: 600,
									}}
								>
									{[appliedSubstatus, appliedRecoveryStatus, appliedSearch].filter(Boolean).length}
								</div>
							)}
						</CustomButton>
						{hasActiveFilters && (
							<CustomButton variant="outlined" onClick={handleClearAllFilters} size="sm">
								Clear all filters
							</CustomButton>
						)}
					</div>
				}
				right={
					<CustomButton
						variant="contained"
						startIcon={<IconDownload size={20} />}
						onClick={handleExport}
						disabled={rows.length === 0}
					>
						Export
					</CustomButton>
				}
				height={55}
				padding={'0px 10px'}
			/>

			{/* Filters Popper */}
			{!!filtersAnchorEl && (
				<BasicPopper
					anchorEl={filtersAnchorEl}
					setAnchorEl={() => handleCloseFilters()}
					placement="bottom-start"
				>
					<div
						style={{
							background: 'var(--bg-white)',
							border: '1px solid var(--border)',
							borderRadius: 'var(--radius-lg)',
							boxShadow: 'var(--shadow-lg)',
							padding: 24,
							marginTop: 5,
							minWidth: 300,
							maxWidth: 400,
						}}
					>
						<span style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Filter Claims</span>
						<div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
							<SubstatusSelect
								substatus={draftSubstatus as ClaimSubstatus | null}
								setSubstatus={(status) => setDraftSubstatus(status as string | null)}
								text="Status"
							/>
							<RecoveryStatusSelect
								recoveryStatus={draftRecoveryStatus as RecoveryStatus | null}
								setRecoveryStatus={(status) => setDraftRecoveryStatus(status as string | null)}
								text="Recovery"
							/>
						</div>
						<div style={{ display: 'flex', gap: 8, marginTop: 2, justifyContent: 'flex-end' }}>
							<CustomButton size="sm" variant="text" onClick={handleCloseFilters}>
								Cancel
							</CustomButton>
							<CustomButton size="sm" variant="contained" onClick={handleApplyFilters}>
								Apply
							</CustomButton>
						</div>
					</div>
				</BasicPopper>
			)}

			{/* DataGrid */}
			<div style={queueStyles.table}>
				<DataTable
					rows={rows}
					columns={columns}
					loading={isFetching}
					rowHeight={60}
					headerHeight={45}
					onRowClick={handleRowClick}
					getRowClassName={() => 'cursor-pointer'}
					hideFooter={true}
					emptyState={
						<CustomNoRowsOverlay
							text={hasActiveFilters ? 'No claims match your filters' : 'No claims in this queue'}
							icon={<IconClipboardSearch size={35} style={{ color: 'var(--text-muted)' }} />}
						/>
					}
				/>
			</div>
		</>
	);
}

const queueStyles = {
	table: {
		width: '100%',
		height: 'calc(100vh - 350px)',
		minHeight: 0,
	},
	indicator: {
		width: 8,
		height: 8,
		borderRadius: '50%',
		marginLeft: 1,
	},
};
