'use client';

import {
	useState,
	useMemo,
	useCallback,
	type ReactNode,
	type CSSProperties,
} from 'react';
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	getPaginationRowModel,
	flexRender,
	type ColumnDef,
	type SortingState,
	type RowSelectionState,
	type OnChangeFn,
	type ColumnResizeMode,
} from '@tanstack/react-table';
import { IconChevronUp, IconChevronDown } from '@tabler/icons-react';
import styles from './DataTable.module.css';

/* =========================================================================
   TYPES
   ========================================================================= */

export type { ColumnDef } from '@tanstack/react-table';

export interface PaginationState {
	page: number;
	pageSize: number;
}

export interface DataTableProps<T> {
	/** Data rows */
	rows: T[];
	/** TanStack column definitions */
	columns: ColumnDef<T, any>[];

	// --- Pagination ---
	/** Total row count for server-side pagination */
	rowCount?: number;
	/** Pagination mode */
	paginationMode?: 'client' | 'server';
	/** Current pagination state (server mode) */
	paginationModel?: PaginationState;
	/** Pagination change handler (server mode) */
	onPaginationModelChange?: (model: PaginationState) => void;
	/** Page size for client mode (default 25) */
	pageSize?: number;
	/** Hide the pagination footer */
	hideFooter?: boolean;

	// --- Selection ---
	/** Enable checkbox selection */
	checkboxSelection?: boolean;
	/** Selected row IDs */
	rowSelection?: Record<string, boolean>;
	/** Selection change handler */
	onRowSelectionChange?: (selection: Record<string, boolean>) => void;

	// --- Pinning ---
	/** Columns pinned to the left */
	pinnedLeft?: string[];
	/** Columns pinned to the right */
	pinnedRight?: string[];

	// --- Row behavior ---
	/** Row click handler */
	onRowClick?: (row: T) => void;
	/** Row class name function */
	getRowClassName?: (row: T, index: number) => string;
	/** Custom row ID accessor (default uses 'id' field) */
	getRowId?: (row: T) => string;

	// --- State ---
	/** Loading state — shows skeleton rows */
	loading?: boolean;
	/** Custom empty state content */
	emptyState?: ReactNode;
	/** Empty state text (default "No data") */
	emptyText?: string;

	// --- Sizing ---
	/** Row height in px (default 44) */
	rowHeight?: number;
	/** Header height in px (default 40) */
	headerHeight?: number;
	/** Minimum table height */
	minHeight?: number | string;
	/** Maximum table height (enables scroll) */
	maxHeight?: number | string;

	// --- Sorting ---
	/** Enable column sorting (default true) */
	sortable?: boolean;

	className?: string;
}

/* =========================================================================
   DATA TABLE COMPONENT
   ========================================================================= */

export default function DataTable<T extends Record<string, any>>({
	rows,
	columns,
	rowCount,
	paginationMode = 'client',
	paginationModel,
	onPaginationModelChange,
	pageSize = 25,
	hideFooter = false,
	checkboxSelection = false,
	rowSelection: controlledRowSelection,
	onRowSelectionChange,
	pinnedLeft = [],
	pinnedRight = [],
	onRowClick,
	getRowClassName,
	getRowId,
	loading = false,
	emptyState,
	emptyText = 'No data',
	rowHeight = 44,
	headerHeight = 40,
	minHeight,
	maxHeight,
	sortable = true,
	className,
}: DataTableProps<T>) {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({});

	const activeRowSelection = controlledRowSelection ?? internalRowSelection;
	const handleRowSelectionChange: OnChangeFn<RowSelectionState> = useCallback(
		(updaterOrValue) => {
			const newValue =
				typeof updaterOrValue === 'function'
					? updaterOrValue(activeRowSelection)
					: updaterOrValue;
			setInternalRowSelection(newValue);
			onRowSelectionChange?.(newValue);
		},
		[activeRowSelection, onRowSelectionChange]
	);

	// Server-side pagination state
	const pagination = useMemo(() => {
		if (paginationMode === 'server' && paginationModel) {
			return { pageIndex: paginationModel.page, pageSize: paginationModel.pageSize };
		}
		return undefined;
	}, [paginationMode, paginationModel]);

	const [columnResizeMode] = useState<ColumnResizeMode>('onChange');

	const table = useReactTable({
		data: rows,
		columns,
		columnResizeMode,
		state: {
			sorting,
			rowSelection: activeRowSelection,
			...(pagination ? { pagination } : {}),
		},
		onSortingChange: sortable ? setSorting : undefined,
		onRowSelectionChange: checkboxSelection ? handleRowSelectionChange : undefined,
		getCoreRowModel: getCoreRowModel(),
		...(sortable ? { getSortedRowModel: getSortedRowModel() } : {}),
		...(paginationMode === 'client' ? { getPaginationRowModel: getPaginationRowModel() } : {}),
		...(paginationMode === 'server' && rowCount != null ? { rowCount, manualPagination: true } : {}),
		enableRowSelection: checkboxSelection,
		enableColumnResizing: true,
		getRowId: getRowId ? (row) => getRowId(row) : (row) => String(row.id),
		initialState: {
			pagination: { pageSize },
		},
	});

	// Pinning helpers
	const isPinnedLeft = useCallback((colId: string) => pinnedLeft.includes(colId), [pinnedLeft]);
	const isPinnedRight = useCallback((colId: string) => pinnedRight.includes(colId), [pinnedRight]);

	// Calculate pinned column offsets
	const getPinnedLeftOffset = useCallback(
		(colId: string) => {
			const idx = pinnedLeft.indexOf(colId);
			if (idx <= 0) return 0;
			// Sum widths of previous pinned columns (estimate 150px each if no width set)
			const headers = table.getHeaderGroups()[0]?.headers ?? [];
			let offset = 0;
			for (let i = 0; i < idx; i++) {
				const header = headers.find((h) => h.id === pinnedLeft[i]);
				offset += header?.getSize() ?? 150;
			}
			return offset;
		},
		[pinnedLeft, table]
	);

	// Pagination controls
	const totalPages = useMemo(() => {
		if (paginationMode === 'server' && rowCount != null && paginationModel) {
			return Math.max(1, Math.ceil(rowCount / paginationModel.pageSize));
		}
		return table.getPageCount();
	}, [paginationMode, rowCount, paginationModel, table]);

	const currentPage = paginationMode === 'server' && paginationModel
		? paginationModel.page
		: table.getState().pagination.pageIndex;

	const handlePrevPage = useCallback(() => {
		if (paginationMode === 'server' && paginationModel && onPaginationModelChange) {
			onPaginationModelChange({ ...paginationModel, page: paginationModel.page - 1 });
		} else {
			table.previousPage();
		}
	}, [paginationMode, paginationModel, onPaginationModelChange, table]);

	const handleNextPage = useCallback(() => {
		if (paginationMode === 'server' && paginationModel && onPaginationModelChange) {
			onPaginationModelChange({ ...paginationModel, page: paginationModel.page + 1 });
		} else {
			table.nextPage();
		}
	}, [paginationMode, paginationModel, onPaginationModelChange, table]);

	const canPrevPage = currentPage > 0;
	const canNextPage = currentPage < totalPages - 1;

	const displayRows = table.getRowModel().rows;
	const headerGroups = table.getHeaderGroups();

	const containerStyle: CSSProperties = {
		...(minHeight ? { minHeight } : {}),
		...(maxHeight ? { maxHeight, overflowY: 'auto' } : {}),
	};

	return (
		<div className={`${styles.wrapper} ${className ?? ''}`}>
			<div className={styles.tableContainer} style={containerStyle}>
				<table className={styles.table} style={{ minWidth: table.getCenterTotalSize() }}>
					<thead>
						{headerGroups.map((headerGroup) => (
							<tr key={headerGroup.id}>
								{checkboxSelection && (
									<th className={styles.checkboxCell} style={{ height: headerHeight }}>
										<input
											type="checkbox"
											checked={table.getIsAllRowsSelected()}
											onChange={table.getToggleAllRowsSelectedHandler()}
											style={{ accentColor: 'var(--text-accent)' }}
										/>
									</th>
								)}
								{headerGroup.headers.map((header) => {
									const pinLeft = isPinnedLeft(header.id);
									const pinRight = isPinnedRight(header.id);
									const pinStyle: CSSProperties = {};

									if (pinLeft) {
										pinStyle.position = 'sticky';
										pinStyle.left = getPinnedLeftOffset(header.id);
										pinStyle.zIndex = 2;
										pinStyle.background = 'var(--bg-white)';
									}
									if (pinRight) {
										pinStyle.position = 'sticky';
										pinStyle.right = 0;
										pinStyle.zIndex = 2;
										pinStyle.background = 'var(--bg-white)';
									}

									return (
										<th
											key={header.id}
											style={{
												height: headerHeight,
												width: header.getSize(),
												position: 'relative' as const,
												...pinStyle,
											}}
											className={`${sortable && header.column.getCanSort() ? styles.sortable : ''} ${pinLeft ? styles.pinnedLeft : ''} ${pinRight ? styles.pinnedRight : ''}`}
											onClick={sortable ? header.column.getToggleSortingHandler() : undefined}
										>
											<span className={styles.headerContent}>
												{flexRender(header.column.columnDef.header, header.getContext())}
												{sortable && header.column.getIsSorted() && (
													<span className={styles.sortIcon}>
														{header.column.getIsSorted() === 'asc' ? (
															<IconChevronUp size={14} stroke={1.5} />
														) : (
															<IconChevronDown size={14} stroke={1.5} />
														)}
													</span>
												)}
											</span>
											{header.column.getCanResize() && (
												<div
													onMouseDown={header.getResizeHandler()}
													onTouchStart={header.getResizeHandler()}
													onClick={(e) => e.stopPropagation()}
													className={`${styles.resizeHandle} ${header.column.getIsResizing() ? styles.resizing : ''}`}
												/>
											)}
										</th>
									);
								})}
							</tr>
						))}
					</thead>
					<tbody>
						{loading
							? Array.from({ length: pageSize }).map((_, i) => (
									<tr key={`skeleton-${i}`}>
										{checkboxSelection && (
											<td style={{ height: rowHeight }}>
												<div className={styles.skeleton} style={{ width: 16, height: 16 }} />
											</td>
										)}
										{columns.map((_, j) => (
											<td key={j} style={{ height: rowHeight }}>
												<div
													className={styles.skeleton}
													style={{ width: `${55 + Math.random() * 40}%`, height: 14 }}
												/>
											</td>
										))}
									</tr>
								))
							: displayRows.length === 0
								? (
									<tr>
										<td
											colSpan={columns.length + (checkboxSelection ? 1 : 0)}
											className={styles.emptyCell}
										>
											{emptyState ?? (
												<div className={styles.emptyContent}>
													<span>{emptyText}</span>
												</div>
											)}
										</td>
									</tr>
								)
								: displayRows.map((row, rowIndex) => {
									const rowData = row.original;
									const rowClass = getRowClassName?.(rowData, rowIndex) ?? '';
									const isClickable = !!onRowClick;

									return (
										<tr
											key={row.id}
											className={`${rowClass} ${isClickable ? styles.clickableRow : ''} ${row.getIsSelected() ? styles.selectedRow : ''}`}
											onClick={isClickable ? () => onRowClick!(rowData) : undefined}
										>
											{checkboxSelection && (
												<td className={styles.checkboxCell} style={{ height: rowHeight }}>
													<input
														type="checkbox"
														checked={row.getIsSelected()}
														onChange={row.getToggleSelectedHandler()}
														onClick={(e) => e.stopPropagation()}
														style={{ accentColor: 'var(--text-accent)' }}
													/>
												</td>
											)}
											{row.getVisibleCells().map((cell) => {
												const pinLeft = isPinnedLeft(cell.column.id);
												const pinRight = isPinnedRight(cell.column.id);
												const pinStyle: CSSProperties = {};

												if (pinLeft) {
													pinStyle.position = 'sticky';
													pinStyle.left = getPinnedLeftOffset(cell.column.id);
													pinStyle.zIndex = 1;
													pinStyle.background = 'var(--bg-white)';
												}
												if (pinRight) {
													pinStyle.position = 'sticky';
													pinStyle.right = 0;
													pinStyle.zIndex = 1;
													pinStyle.background = 'var(--bg-white)';
												}

												return (
													<td
														key={cell.id}
														style={{
															height: rowHeight,
															width: cell.column.getSize(),
															...pinStyle,
														}}
														className={`${pinLeft ? styles.pinnedLeft : ''} ${pinRight ? styles.pinnedRight : ''}`}
													>
														{flexRender(cell.column.columnDef.cell, cell.getContext())}
													</td>
												);
											})}
										</tr>
									);
								})}
					</tbody>
				</table>
			</div>

			{!hideFooter && !loading && displayRows.length > 0 && (
				<div className={styles.footer}>
					{rowCount != null && (
						<span className={styles.rowCountText}>
							{rowCount} total
						</span>
					)}
					<div className={styles.pagination}>
						<button
							className={styles.pageBtn}
							onClick={handlePrevPage}
							disabled={!canPrevPage}
						>
							Previous
						</button>
						<span className={styles.pageInfo}>
							Page {currentPage + 1} of {totalPages}
						</span>
						<button
							className={styles.pageBtn}
							onClick={handleNextPage}
							disabled={!canNextPage}
						>
							Next
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
