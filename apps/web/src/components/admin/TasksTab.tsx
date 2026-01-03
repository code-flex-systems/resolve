'use client';

import { useMemo, useState } from 'react';
import {
	Autocomplete,
	Box,
	Button,
	Chip,
	FormControlLabel,
	IconButton,
	Paper,
	Stack,
	Switch,
	TextField,
	Tooltip,
	Typography,
} from '@mui/material';
import PageTransitionWrapper from '../common/PageTransitionWrapper';
import { DataGridPro, GridColDef, GridRenderCellParams, GridRowSelectionModel } from '@mui/x-data-grid-pro';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Refresh from '@mui/icons-material/Refresh';
import FilterList from '@mui/icons-material/FilterList';
import Cancel from '@mui/icons-material/Cancel';
import OpenInNew from '@mui/icons-material/OpenInNew';
import TaskIcon from '@mui/icons-material/Task';
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
import theme, { BASE_COLOR_LIGHT, dataGridFocusStyles } from '@/styles/theme';

// Status display config
const STATUS_COLORS: Record<TaskStatus, 'default' | 'primary' | 'success' | 'error'> = {
	[TaskStatus.PENDING]: 'default',
	[TaskStatus.IN_PROGRESS]: 'primary',
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
		<CustomNoRowsOverlay text="No tasks found" icon={<TaskIcon sx={{ fontSize: 35, color: BASE_COLOR_LIGHT }} />} />
	);
}

export default function TasksTab() {
	// Week navigation state
	const [weekStart, setWeekStart] = useState(() => getWeekStart(dayjs()));
	const weekEnd = getWeekEnd(weekStart);

	// Manage mode state
	const [manageMode, setManageMode] = useState(false);
	const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>([]);

	// Bulk cancellation dialog state
	const [showBulkCancel, setShowBulkCancel] = useState(false);

	// Filter popper state
	const [filtersAnchorEl, setFiltersAnchorEl] = useState<HTMLElement | null>(null);

	// URL filters
	const { getParam, setParam, setParams, getBoolParam } = useUrlFilters();
	const showOnlyOpen = getBoolParam('open') ?? true; // Default true (show pending + in progress)
	const filterClaimedBy = getParam('claimedBy');
	const filterClaimNumber = getParam('claimNumber');

	// Draft filter state for popper
	const [draftClaimedBy, setDraftClaimedBy] = useState<string | null>(null);
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
			// Collect users who are working on tasks
			if (task.claimed_by && task.claimed_by_first && task.claimed_by_last) {
				usersMap.set(task.claimed_by, {
					id: task.claimed_by,
					name: `${task.claimed_by_first} ${task.claimed_by_last}`,
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

		// Filter by claimed by (user working on task)
		if (filterClaimedBy) {
			tasks = tasks.filter((t) => t.claimed_by === filterClaimedBy);
		}

		// Filter by claim number
		if (filterClaimNumber) {
			tasks = tasks.filter((t) => t.claim_number === filterClaimNumber);
		}

		return tasks;
	}, [allTasks, showOnlyOpen, filterClaimedBy, filterClaimNumber]);

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
						<Stack direction="row" spacing={1} alignItems="center">
							{config.icon}
							<Typography variant="body2">{config.label}</Typography>
						</Stack>
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
						<Stack direction="row" spacing={0.5} alignItems="center">
							<Typography variant="body2">{params.value || '-'}</Typography>
							{claimId && (
								<Tooltip title="Open claim in new tab">
									<IconButton size="small" onClick={() => handleGoToClaim(claimId)}>
										<OpenInNew sx={{ fontSize: 14 }} />
									</IconButton>
								</Tooltip>
							)}
						</Stack>
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
						label={STATUS_LABELS[params.value as TaskStatus]}
						color={STATUS_COLORS[params.value as TaskStatus]}
						size="small"
					/>
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
						<Typography variant="body2" color={isOverdue ? 'error.main' : 'inherit'}>
							{dueDate.format('MMM D, YYYY')}
						</Typography>
					);
				},
			},
			{
				field: 'claimed_by_name',
				headerName: 'Working By',
				width: 140,
				valueGetter: (_value, row) =>
					row.claimed_by_first && row.claimed_by_last
						? `${row.claimed_by_first} ${row.claimed_by_last}`
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
						<Stack direction="row" spacing={0.5} justifyContent="flex-end" width="100%">
							<BasicButtonStyled
								buttonProps={{
									onClick: () => {
										setSelectedRows([task.id]);
										setShowBulkCancel(true);
									},
								}}
								tooltipProps={{ title: 'Cancel task' }}
								icon={<Cancel sx={{ fontSize: 15, color: theme.palette.error.main }} />}
							/>
						</Stack>
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
	const activeFilterCount = [filterClaimedBy, filterClaimNumber].filter(Boolean).length;

	// Handler for opening filters popper - sync draft with applied
	const handleOpenFilters = (e: React.MouseEvent<HTMLElement>) => {
		setDraftClaimedBy(filterClaimedBy);
		setDraftClaimNumber(filterClaimNumber);
		setFiltersAnchorEl(e.currentTarget);
	};

	// Handler for applying filters
	const handleApplyFilters = () => {
		setParams({
			claimedBy: draftClaimedBy,
			claimNumber: draftClaimNumber,
		});
		setFiltersAnchorEl(null);
	};

	// Handler for clearing filters
	const handleClearFilters = () => {
		setDraftClaimedBy(null);
		setDraftClaimNumber(null);
		setParams({
			claimedBy: null,
			claimNumber: null,
		});
		setFiltersAnchorEl(null);
	};

	return (
		<PageTransitionWrapper criticalDataReady={true} loadingMessage="Loading tasks...">
			<div style={styles.container}>
				<Paper sx={styles.paper} className="flex-col-start">
					<Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
						{/* Metrics */}
						<TaskMetrics
							openTasks={metrics.openTasks}
							overdueTasks={metrics.overdueTasks}
							avgCompletionDays={metrics.avgCompletionDays}
							isLoading={isLoading}
						/>

						{/* Toolbar */}
						<Paper elevation={0} sx={{ p: 1.5, mb: 2 }}>
							<Stack direction="row" justifyContent="space-between" alignItems="center">
								{/* Left: Week navigation */}
								<Stack direction="row" spacing={1} alignItems="center">
									<Typography variant="h6" marginRight="40px">
										Tasks
									</Typography>
									<IconButton size="small" onClick={handlePreviousWeek}>
										<ChevronLeft />
									</IconButton>
									<Typography
										fontSize={14}
										fontWeight={500}
										sx={{ minWidth: 160, textAlign: 'center', cursor: 'pointer' }}
										onClick={handleGoToCurrentWeek}
									>
										{weekDisplay}
									</Typography>
									<IconButton size="small" onClick={handleNextWeek}>
										<ChevronRight />
									</IconButton>
									{!isCurrentWeek && (
										<Button size="small" variant="text" onClick={handleGoToCurrentWeek}>
											Today
										</Button>
									)}
									<Tooltip title="Refresh">
										<IconButton size="small" onClick={() => refetch()} disabled={isFetching}>
											<Refresh sx={{ fontSize: 20 }} />
										</IconButton>
									</Tooltip>
								</Stack>

								{/* Right: Filters and manage */}
								<Stack direction="row" spacing={1} alignItems="center">
									{/* Show only open tasks toggle */}
									<FormControlLabel
										control={
											<Switch
												size="small"
												checked={showOnlyOpen}
												onChange={(e) => setParam('open', e.target.checked ? null : 'false')}
											/>
										}
										label={<Typography variant="body2">Open only</Typography>}
										sx={{ mr: 1 }}
									/>

									{/* Filters button */}
									<Button
										size="small"
										variant="outlined"
										startIcon={<FilterList />}
										onClick={handleOpenFilters}
									>
										Filters
										{activeFilterCount > 0 && (
											<Chip
												label={activeFilterCount}
												size="small"
												color="primary"
												sx={{ ml: 0.5, height: 18, fontSize: 11 }}
											/>
										)}
									</Button>

									{/* Manage mode */}
									{manageMode ? (
										<>
											{selectedRows.length > 0 && (
												<Button
													size="small"
													variant="outlined"
													color="error"
													startIcon={<Cancel />}
													onClick={handleBulkCancel}
												>
													Cancel ({selectedRows.length})
												</Button>
											)}
											<Button size="small" variant="outlined" onClick={handleToggleManageMode}>
												Done
											</Button>
										</>
									) : (
										<Button size="small" variant="outlined" onClick={handleToggleManageMode}>
											Manage
										</Button>
									)}
								</Stack>
							</Stack>
						</Paper>

						{/* Filter Popper */}
						<BasicPopper
							anchorEl={filtersAnchorEl}
							setAnchorEl={(el) => setFiltersAnchorEl(el as HTMLElement | null)}
							placement="bottom-end"
						>
							<Paper sx={{ p: 2, minWidth: 300 }}>
								<Typography variant="subtitle2" mb={2}>
									Filter Tasks
								</Typography>

								<Stack spacing={2}>
									{/* User filter */}
									<Autocomplete
										size="small"
										options={filterOptions.users}
										getOptionLabel={(option) => option.name}
										value={filterOptions.users.find((u) => u.id === draftClaimedBy) || null}
										onChange={(_, newValue) => setDraftClaimedBy(newValue?.id || null)}
										renderInput={(params) => (
											<TextField
												{...params}
												placeholder="Select"
												label="Working By"
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

									<Stack direction="row" spacing={1} justifyContent="flex-end">
										<Button
											size="small"
											onClick={handleClearFilters}
											disabled={!draftClaimedBy && !draftClaimNumber}
										>
											Clear
										</Button>
										<Button size="small" variant="contained" onClick={handleApplyFilters}>
											Apply
										</Button>
									</Stack>
								</Stack>
							</Paper>
						</BasicPopper>

						{/* DataGrid */}
						<Box sx={{ flex: 1, minHeight: 0 }}>
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
								pinnedColumns={{ right: ['actions'] }}
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
								sx={{
									height: '100%',
									border: 'none',
									'& .MuiDataGrid-cell': {
										py: 1,
										display: 'flex',
										alignItems: 'center',
									},
									'& .MuiDataGrid-columnSeparator': {
										display: 'none',
									},
									...dataGridFocusStyles,
								}}
							/>
						</Box>

						{/* Bulk Cancellation Dialog */}
						{showBulkCancel && selectedRows.length > 0 && (
							<TaskBulkCancellationDialog
								taskIds={selectedRows as number[]}
								onClose={() => setShowBulkCancel(false)}
								onCancelled={handleBulkCancelComplete}
							/>
						)}
					</Box>
				</Paper>
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
