'use client';

import { IconChevronLeft, IconChevronRight, IconCircleX, IconExternalLink, IconFilter, IconRefresh, IconSubtask } from '@tabler/icons-react';
import { Autocomplete, FormControlLabel, TextField } from '@mui/material';
import Tooltip from '@/components/ui/Tooltip';
import Card from '@/components/ui/Card';
import Switch from '@/components/ui/Switch';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import { useMemo, useState } from 'react';
import PageTransitionWrapper from '../common/PageTransitionWrapper';
import { DataGridPro, GridColDef, GridPinnedColumnFields, GridRenderCellParams, GridRowSelectionModel } from '@mui/x-data-grid-pro';
import dayjs from 'dayjs';
import { useTaskTrpc } from '@/hooks/trpc/useTaskTrpc';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { TaskStatus, TaskType } from '@/config/enums';
import { TASK_TYPE_CONFIG } from '@/lib/utils/taskUtils';
import TaskMetrics from './TaskMetrics';
import TaskBulkCancellationDialog from './TaskBulkCancellationDialog';
import BasicButtonStyled from '../common/BasicButtonStyled';
import BasicPopper from '../common/BasicPopper';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import { dataGridFocusStyles } from '@/styles/theme';

// Status display config
const STATUS_COLORS: Record<TaskStatus, 'neutral' | 'info' | 'success' | 'error'> = {
	[TaskStatus.PENDING]: 'neutral',
	[TaskStatus.IN_PROGRESS]: 'info',
	[TaskStatus.COMPLETED]: 'success',
	[TaskStatus.CANCELLED]: 'error',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
	[TaskStatus.PENDING]: 'Pending',
	[TaskStatus.IN_PROGRESS]: 'In Progress',
	[TaskStatus.COMPLETED]: 'Completed',
	[TaskStatus.CANCELLED]: 'Cancelled',
};

// Get start of week (Monday)
function getWeekStart(date: dayjs.Dayjs): dayjs.Dayjs {
	const day = date.day();
	// If Sunday (0), go back 6 days, otherwise go back (day - 1) days
	const diff = day === 0 ? 6 : day - 1;
	return date.subtract(diff, 'day').startOf('day');
}

// Get end of week (Sunday)
function getWeekEnd(weekStart: dayjs.Dayjs): dayjs.Dayjs {
	return weekStart.add(6, 'day').endOf('day');
}

function NoRows() {
	return (
		<CustomNoRowsOverlay text="No tasks found" icon={<IconSubtask size={35} style={{ color: 'var(--text-muted)' }} />} />
	);
}

export default function TasksTab() {
	// Week navigation state
	const [weekStart, setWeekStart] = useState(() => getWeekStart(dayjs()));
	const weekEnd = getWeekEnd(weekStart);

	// Manage mode state
	const [manageMode, setManageMode] = useState(false);
	const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>([]);

	const pinnedColumns = useMemo<GridPinnedColumnFields>(() => (manageMode ? { right: ['actions'] } : {}), [manageMode]);

	// Bulk cancellation dialog state
	const [showBulkCancel, setShowBulkCancel] = useState(false);

	// Filter popper state
	const [filtersAnchorEl, setFiltersAnchorEl] = useState<HTMLElement | null>(null);

	// URL filters
	const { getParam, setParam, setParams, getBoolParam } = useUrlFilters();
	const showOnlyOpen = getBoolParam('open') ?? true; // Default true (show pending + in progress)
	const filterAssignedTo = getParam('assignedTo');
	const filterClaimNumber = getParam('claimNumber');

	// Draft filter state for popper
	const [draftAssignedTo, setDraftAssignedTo] = useState<string | null>(null);
	const [draftClaimNumber, setDraftClaimNumber] = useState<string | null>(null);

	// Fetch tasks for the week
	const { data, isLoading, isFetching, refetch } = useTaskTrpc().listByDueDateWeek({
		weekStart: weekStart.format('YYYY-MM-DD'),
		weekEnd: weekEnd.format('YYYY-MM-DD'),
	});

	const allTasks = data?.rows || [];

	// Calculate metrics from ALL tasks in the week (not affected by filters)
	const metrics = useMemo(() => {
		const today = dayjs().startOf('day');

		const openTasks = allTasks.filter(
			(t) => t.status === TaskStatus.PENDING || t.status === TaskStatus.IN_PROGRESS
		).length;

		const overdueTasks = allTasks.filter(
			(t) =>
				t.due_date &&
				dayjs(t.due_date).isBefore(today) &&
				t.status !== TaskStatus.COMPLETED &&
				t.status !== TaskStatus.CANCELLED
		).length;

		// Calculate average completion time for completed tasks
		const completedTasks = allTasks.filter(
			(t) => t.status === TaskStatus.COMPLETED && t.completed_at && t.created_at
		);
		let avgCompletionDays: number | null = null;
		if (completedTasks.length > 0) {
			const totalDays = completedTasks.reduce((sum, t) => {
				const created = dayjs(t.created_at);
				const completed = dayjs(t.completed_at);
				return sum + completed.diff(created, 'day', true);
			}, 0);
			avgCompletionDays = totalDays / completedTasks.length;
		}

		return { openTasks, overdueTasks, avgCompletionDays };
	}, [allTasks]);

	// Get unique users and claim numbers from the week's data for filter options
	const filterOptions = useMemo(() => {
		const usersMap = new Map<string, { id: string; name: string }>();
		const claimNumbersSet = new Set<string>();

		allTasks.forEach((task) => {
			// Collect users who are assigned to tasks
			if (task.assigned_to && task.assigned_to_first && task.assigned_to_last) {
				usersMap.set(task.assigned_to, {
					id: task.assigned_to,
					name: `${task.assigned_to_first} ${task.assigned_to_last}`,
				});
			}
			// Collect claim numbers
			if (task.claim_number) {
				claimNumbersSet.add(task.claim_number);
			}
		});

		return {
			users: Array.from(usersMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
			claimNumbers: Array.from(claimNumbersSet).sort(),
		};
	}, [allTasks]);

	// Apply client-side filters
	const filteredTasks = useMemo(() => {
		let tasks = allTasks;

		// Filter by open only (pending + in progress)
		if (showOnlyOpen) {
			tasks = tasks.filter((t) => t.status === TaskStatus.PENDING || t.status === TaskStatus.IN_PROGRESS);
		}

		// Filter by assigned to (user assigned to task)
		if (filterAssignedTo) {
			tasks = tasks.filter((t) => t.assigned_to === filterAssignedTo);
		}

		// Filter by claim number
		if (filterClaimNumber) {
			tasks = tasks.filter((t) => t.claim_number === filterClaimNumber);
		}

		return tasks;
	}, [allTasks, showOnlyOpen, filterAssignedTo, filterClaimNumber]);

	// Week navigation handlers
	const handlePreviousWeek = () => {
		setWeekStart((prev) => prev.subtract(7, 'day'));
		setSelectedRows([]);
	};

	const handleNextWeek = () => {
		setWeekStart((prev) => prev.add(7, 'day'));
		setSelectedRows([]);
	};

	const handleGoToCurrentWeek = () => {
		setWeekStart(getWeekStart(dayjs()));
		setSelectedRows([]);
	};

	// Manage mode handlers
	const handleToggleManageMode = () => {
		setManageMode(!manageMode);
		if (manageMode) {
			setSelectedRows([]);
		}
	};

	const handleBulkCancel = () => {
		setShowBulkCancel(true);
	};

	const handleBulkCancelComplete = () => {
		setShowBulkCancel(false);
		setSelectedRows([]);
		refetch();
	};

	// Navigate to claim
	const handleGoToClaim = (claimId: number) => {
		window.open(`/admin/claims?selected=${claimId}`, '_blank');
	};

	// DataGrid columns (memoized)
	const columns: GridColDef[] = useMemo(
		() => [
			{
				field: 'title',
				headerName: 'Title',
				flex: 1,
				minWidth: 200,
			},
			{
				field: 'task_type',
				headerName: 'Type',
				width: 150,
				renderCell: (params: GridRenderCellParams) => {
					const taskType = params.value as TaskType;
					const config = TASK_TYPE_CONFIG[taskType];
					if (!config) return params.value || '-';
					return (
						<div style={{ flexDirection: 'column', display: 'flex', gap: 8, alignItems: 'center' }}>
							{config.icon}
							<span>{config.label}</span>
						</div>
					);
				},
			},
			{
				field: 'claim_number',
				headerName: 'Claim',
				width: 150,
				renderCell: (params: GridRenderCellParams) => {
					const claimId = params.row.claim_id;
					return (
						<div style={{ flexDirection: 'column', display: 'flex', gap: 4, alignItems: 'center' }}>
							<span>{params.value || '-'}</span>
							{claimId && (
								<Tooltip content="Open claim in new tab">
									<Button variant="icon" size="sm" onClick={() => handleGoToClaim(claimId)}>
										<IconExternalLink size={14} />
									</Button>
								</Tooltip>
							)}
						</div>
					);
				},
			},
			{
				field: 'desk_location_name',
				headerName: 'Desk Location',
				width: 160,
			},
			{
				field: 'status',
				headerName: 'Status',
				width: 120,
				renderCell: (params: GridRenderCellParams) => (
					<Chip 
						color={STATUS_COLORS[params.value as TaskStatus]}
						size="sm">{STATUS_LABELS[params.value as TaskStatus]}</Chip>
				),
			},
			{
				field: 'due_date',
				headerName: 'Due Date',
				width: 110,
				renderCell: (params: GridRenderCellParams) => {
					if (!params.value) return '-';
					const dueDate = dayjs(params.value);
					const isOverdue =
						dueDate.isBefore(dayjs().startOf('day')) &&
						params.row.status !== TaskStatus.COMPLETED &&
						params.row.status !== TaskStatus.CANCELLED;
					return (
						<span style={{ color: isOverdue ? 'error.main' : 'inherit' }}>
							{dueDate.format('MMM D, YYYY')}
						</span>
					);
				},
			},
			{
				field: 'assigned_to_name',
				headerName: 'Assigned To',
				width: 140,
				valueGetter: (_value, row) =>
					row.assigned_to_first && row.assigned_to_last
						? `${row.assigned_to_first} ${row.assigned_to_last}`
						: '-',
			},
			{
				field: 'actions',
				headerName: '',
				width: 60,
				sortable: false,
				renderCell: (params: GridRenderCellParams) => {
					const task = params.row;
					const status = task.status as TaskStatus;

					// Only show cancel for pending/in-progress tasks
					if (status !== TaskStatus.PENDING && status !== TaskStatus.IN_PROGRESS) {
						return null;
					}

					return (
						<div style={{ flexDirection: 'column', display: 'flex', gap: 4, justifyContent: 'flex-end', width: '100%' }}>
							<BasicButtonStyled
								buttonProps={{
									onClick: () => {
										setSelectedRows([task.id]);
										setShowBulkCancel(true);
									},
								}}
								tooltipProps={{ title: 'Cancel task' }}
								icon={<IconCircleX size={15} style={{ color: 'var(--status-error)' }} />}
							/>
						</div>
					);
				},
			},
		],
		[]
	);

	// Week display string
	const weekDisplay = `${weekStart.format('MMM D')} - ${weekEnd.format('MMM D, YYYY')}`;
	const isCurrentWeek = weekStart.isSame(getWeekStart(dayjs()), 'day');

	// Filter count (only count filters in the popper, not the toggle)
	const activeFilterCount = [filterAssignedTo, filterClaimNumber].filter(Boolean).length;

	// Handler for opening filters popper - sync draft with applied
	const handleOpenFilters = (e: React.MouseEvent<HTMLElement>) => {
		setDraftAssignedTo(filterAssignedTo);
		setDraftClaimNumber(filterClaimNumber);
		setFiltersAnchorEl(e.currentTarget);
	};

	// Handler for applying filters
	const handleApplyFilters = () => {
		setParams({
			assignedTo: draftAssignedTo,
			claimNumber: draftClaimNumber,
		});
		setFiltersAnchorEl(null);
	};

	// Handler for clearing filters
	const handleClearFilters = () => {
		setDraftAssignedTo(null);
		setDraftClaimNumber(null);
		setParams({
			assignedTo: null,
			claimNumber: null,
		});
		setFiltersAnchorEl(null);
	};

	return (
		<PageTransitionWrapper criticalDataReady={true} loadingMessage="Loading tasks...">
			<div style={styles.container}>
				<div style={styles.paper} className="flex-col-start">
					<div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
						{/* Metrics */}
						<TaskMetrics
							openTasks={metrics.openTasks}
							overdueTasks={metrics.overdueTasks}
							avgCompletionDays={metrics.avgCompletionDays}
							isLoading={isLoading}
						/>

						{/* Toolbar */}
						<div style={{ padding: 12, marginBottom: 16 }}>
							<div style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
								{/* Left: Week navigation */}
								<div style={{ flexDirection: 'column', display: 'flex', gap: 8, alignItems: 'center' }}>
									<span style={{ marginRight: '40px' }}>
										Tasks
									</span>
									<Button variant="icon" size="sm" onClick={handlePreviousWeek}>
										<IconChevronLeft size={20} />
									</Button>
									<span style={{  fontSize: 14, fontWeight: 500 ,  minWidth: 160, textAlign: 'center', cursor: 'pointer'  }}
										onClick={handleGoToCurrentWeek}
									>
										{weekDisplay}
									</span>
									<Button variant="icon" size="sm" onClick={handleNextWeek}>
										<IconChevronRight size={20} />
									</Button>
									{!isCurrentWeek && (
										<Button size="sm" variant="text" onClick={handleGoToCurrentWeek}>
											Today
										</Button>
									)}
									<Tooltip content="Refresh">
										<Button variant="icon" size="sm" onClick={() => refetch()} disabled={isFetching}>
											<IconRefresh size={20} />
										</Button>
									</Tooltip>
								</div>

								{/* Right: Filters and manage */}
								<div style={{ flexDirection: 'column', display: 'flex', gap: 8, alignItems: 'center' }}>
									{/* Show only open tasks toggle */}
									<FormControlLabel
										control={
											<Switch
												size="sm"
												checked={showOnlyOpen}
												onChange={(checked) => setParam('open', checked ? null : 'false')}
											/>
										}
										label={<span>Open only</span>}
										style={{ marginRight: 8 }}
									/>

									{/* Filters button */}
									<Button
										size="sm"
										variant="outlined"
										startIcon={<IconFilter size={20} />}
										onClick={handleOpenFilters}
									>
										Filters
										{activeFilterCount > 0 && (
											<Chip 
												size="sm"
												color="info"
												style={{ marginLeft: 4, height: 18, fontSize: 11 }}>{activeFilterCount}</Chip>
										)}
									</Button>

									{/* Manage mode */}
									{manageMode ? (
										<>
											{selectedRows.length > 0 && (
												<Button
													size="sm"
													variant="outlined"
													color="error"
													startIcon={<IconCircleX size={20} />}
													onClick={handleBulkCancel}
												>
													Cancel ({selectedRows.length})
												</Button>
											)}
											<Button size="sm" variant="outlined" onClick={handleToggleManageMode}>
												Done
											</Button>
										</>
									) : (
										<Button size="sm" variant="outlined" onClick={handleToggleManageMode}>
											Manage
										</Button>
									)}
								</div>
							</div>
						</div>

						{/* Filter Popper */}
						<BasicPopper
							anchorEl={filtersAnchorEl}
							setAnchorEl={(el) => setFiltersAnchorEl(el as HTMLElement | null)}
							placement="bottom-end"
						>
							<div style={{ padding: 16, minWidth: 300 }}>
								<span>
									Filter Tasks
								</span>

								<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
									{/* User filter */}
									<Autocomplete
										size="small"
										options={filterOptions.users}
										getOptionLabel={(option) => option.name}
										value={filterOptions.users.find((u) => u.id === draftAssignedTo) || null}
										onChange={(_, newValue) => setDraftAssignedTo(newValue?.id || null)}
										renderInput={(params) => (
											<TextField
												{...params}
												placeholder="Select"
												label="Assigned To"
												variant="outlined"
											/>
										)}
										isOptionEqualToValue={(option, value) => option.id === value.id}
									/>

									{/* Claim number filter */}
									<Autocomplete
										size="small"
										options={filterOptions.claimNumbers}
										value={draftClaimNumber}
										onChange={(_, newValue) => setDraftClaimNumber(newValue)}
										renderInput={(params) => (
											<TextField
												{...params}
												placeholder="Select"
												label="Claim Number"
												variant="outlined"
											/>
										)}
									/>

									<div style={{ flexDirection: 'column', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
										<Button
											size="sm"
											onClick={handleClearFilters}
											disabled={!draftAssignedTo && !draftClaimNumber}
										>
											Clear
										</Button>
										<Button size="sm" variant="contained" onClick={handleApplyFilters}>
											Apply
										</Button>
									</div>
								</div>
							</div>
						</BasicPopper>

						{/* DataGrid */}
						<div style={{ flex: 1, minHeight: 0 }}>
							<DataGridPro
								rows={filteredTasks}
								columns={columns}
								loading={isLoading}
								checkboxSelection={manageMode}
								rowSelectionModel={selectedRows}
								onRowSelectionModelChange={setSelectedRows}
								isRowSelectable={(params) =>
									params.row.status === TaskStatus.PENDING ||
									params.row.status === TaskStatus.IN_PROGRESS
								}
								disableColumnMenu
								disableRowSelectionOnClick
								pinnedColumns={pinnedColumns}
								pageSizeOptions={[25, 50, 100]}
								initialState={{
									pagination: { paginationModel: { pageSize: 25 } },
								}}
								slots={{
									noRowsOverlay: NoRows,
									noResultsOverlay: NoRows,
								}}
								slotProps={{
									loadingOverlay: {
										noRowsVariant: 'linear-progress',
										variant: 'linear-progress',
									},
								}}
								style={{
									height: '100%',
									border: 'none',
									...dataGridFocusStyles,
								}}
							/>
						</div>

						{/* Bulk Cancellation Dialog */}
						{showBulkCancel && selectedRows.length > 0 && (
							<TaskBulkCancellationDialog
								taskIds={selectedRows as number[]}
								onClose={() => setShowBulkCancel(false)}
								onCancelled={handleBulkCancelComplete}
							/>
						)}
					</div>
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
		height: '100%',
		minHeight: 0,
		padding: '24px',
	},
};
