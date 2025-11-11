'use client';

import { Breadcrumbs, Link, Paper, Typography, Box } from '@mui/material';
import { DataGridPro, GridColDef, GridRowParams } from '@mui/x-data-grid-pro';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import IconHeaderCell from '../common/IconHeaderCell';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { capitalize, formatMDY } from '@/lib/utils/utils';
import { useState, useMemo, useEffect } from 'react';
import type { DocGroupListItem, DocListItem } from '@/hooks/trpc/useDocTrpc';
import { useDocTrpc } from '@/hooks/trpc/useDocTrpc';

type GridRow = { type: 'folder'; data: DocGroupListItem } | { type: 'document'; data: DocListItem };

interface CompactDocumentBrowserProps {
	onSelectDocument: (document: DocListItem) => void;
	filterByType?: 'image' | 'all'; // Restrict to images only or show all
	height?: number;
	userFilteredMode?: boolean; // Filter to show only user's documents
	userId?: string; // User ID for filtering
	allowedExtensions?: string[] | null; // Filter by allowed extensions
	disabled?: boolean; // Disable interactions during operations
}

export default function CompactDocumentBrowser({
	onSelectDocument,
	filterByType = 'all',
	height = 400,
	userFilteredMode = false,
	userId,
	allowedExtensions = null,
	disabled = false,
}: CompactDocumentBrowserProps) {
	const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);

	const { data: groups = [], isFetching: isFetchingGroups } = useDocTrpc().listDocGroups();
	const { data: docs = [], isFetching: isFetchingDocs } = useDocTrpc().listDocs({
		filters: { doc_group_id: currentFolderId },
	});
	const isLoading = isFetchingGroups || isFetchingDocs;

	// Auto-navigate to user's folder when in userFilteredMode
	useEffect(() => {
		if (userFilteredMode && userId && groups.length > 0 && currentFolderId === null) {
			// Find the user's folder (group_type: 'user', user_id: userId)
			const userFolder = groups.find((g) => g.user_id === userId && g.group_type === 'user');
			if (userFolder) {
				setCurrentFolderId(userFolder.id);
			}
		}
	}, [userFilteredMode, userId, groups, currentFolderId]);

	// Build breadcrumb trail from root to current folder
	const breadcrumbTrail = useMemo(() => {
		if (!currentFolderId) return [];

		const trail: DocGroupListItem[] = [];
		let folderId: number | null = currentFolderId;

		// Walk up the tree to build the trail
		while (folderId !== null) {
			const folder = groups.find((g) => g.id === folderId);
			if (!folder) break;
			trail.unshift(folder); // Add to beginning
			folderId = folder.parent_group_id;
		}

		return trail;
	}, [currentFolderId, groups]);

	// Build rows: folders (at root only) + documents
	const rows: GridRow[] = useMemo(() => {
		const result: GridRow[] = [];

		// In userFilteredMode, don't show any folders - only documents
		if (!userFilteredMode) {
			// Show folders based on current location
			if (currentFolderId === null) {
				// At root level, show folders without a parent
				const rootFolders = groups.filter((g) => g.parent_group_id === null);
				rootFolders.forEach((folder) => {
					result.push({ type: 'folder', data: folder });
				});
			} else {
				// Inside a folder, show child folders
				const childFolders = groups.filter((g) => g.parent_group_id === currentFolderId);
				childFolders.forEach((folder) => {
					result.push({ type: 'folder', data: folder });
				});
			}
		}

		// Filter documents based on various criteria
		let filteredDocs = docs;

		// Filter by type if needed
		if (filterByType === 'image') {
			filteredDocs = filteredDocs.filter((doc) => doc.mime_type?.startsWith('image/'));
		}

		// Filter by user if in userFilteredMode
		if (userFilteredMode && userId) {
			filteredDocs = filteredDocs.filter((doc) => doc.created_by === userId);
		}

		// Filter by allowed extensions
		if (allowedExtensions && allowedExtensions.length > 0) {
			filteredDocs = filteredDocs.filter((doc) => {
				const fileExtension = doc.filename.substring(doc.filename.lastIndexOf('.')).toLowerCase();
				return allowedExtensions.includes(fileExtension);
			});
		}

		filteredDocs.forEach((doc) => {
			result.push({ type: 'document', data: doc });
		});

		return result;
	}, [currentFolderId, groups, docs, filterByType, userFilteredMode, userId, allowedExtensions]);

	const handleRowDoubleClick = (params: GridRowParams<GridRow>) => {
		if (disabled) return; // Prevent interactions when disabled

		if (params.row.type === 'folder') {
			setCurrentFolderId(params.row.data.id);
		} else {
			onSelectDocument(params.row.data);
		}
	};

	return (
		<Paper elevation={0} sx={{ ...styles.container, height }}>
			{/* Breadcrumbs for navigation - hidden in userFilteredMode */}
			{!userFilteredMode && (
				<Breadcrumbs sx={{ p: 2, pb: 1 }}>
					<Link
						component="button"
						underline="hover"
						color={currentFolderId === null ? 'text.primary' : 'inherit'}
						onClick={() => !disabled && setCurrentFolderId(null)}
						sx={{ cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }}
					>
						Documents
					</Link>
					{breadcrumbTrail.map((folder, index) => {
						const isLast = index === breadcrumbTrail.length - 1;
						return isLast ? (
							<Typography key={folder.id} color="text.primary">
								{folder.name}
							</Typography>
						) : (
							<Link
								key={folder.id}
								component="button"
								underline="hover"
								color="inherit"
								onClick={() => !disabled && setCurrentFolderId(folder.id)}
								sx={{ cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }}
							>
								{folder.name}
							</Link>
						);
					})}
				</Breadcrumbs>
			)}

			<DataGridPro
				rows={rows}
				loading={isLoading}
				columns={COLUMNS}
				getRowId={(row) => `${row.type}-${row.data.id}`}
				onRowDoubleClick={handleRowDoubleClick}
				slots={{
					noRowsOverlay: () => (
						<CustomNoRowsOverlay
							text={
								currentFolderId === null
									? filterByType === 'image'
										? 'No images found. Upload images to select from the library.'
										: 'No documents found. Upload documents to select from the library.'
									: filterByType === 'image'
									? 'No images in this folder.'
									: 'No documents in this folder.'
							}
							icon={<InsertDriveFileIcon style={{ fontSize: 40, color: BASE_COLOR_LIGHT }} />}
						/>
					),
				}}
				sx={styles.dataGrid}
				hideFooter
			/>

			<Box sx={{ p: 1, bgcolor: '#f5f5f5', borderTop: '1px solid #e0e0e0' }}>
				<Typography fontSize={11} color="text.secondary">
					Double-click a {filterByType === 'image' ? 'image' : 'document'} to select it
				</Typography>
			</Box>
		</Paper>
	);
}

const COLUMNS: GridColDef<GridRow>[] = [
	{
		headerName: 'Name',
		field: 'name',
		flex: 1,
		renderCell: ({ row }) => (
			<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
				{row.type === 'folder' ? (
					<FolderIcon style={{ color: BASE_COLOR_LIGHT }} />
				) : (
					<InsertDriveFileIcon style={{ color: BASE_COLOR_LIGHT }} />
				)}
				<Typography variant="body2">
					{row.type === 'folder' ? row.data.name : row.data.title ?? row.data.alias}
				</Typography>
			</div>
		),
		renderHeader: (params) => (
			<IconHeaderCell {...(params as any)} icon={<InsertDriveFileIcon style={{ color: BASE_COLOR_LIGHT }} />} />
		),
	},
	{
		headerName: 'Type',
		field: 'type',
		width: 150,
		renderCell: ({ row }) => (
			<Typography variant="body2" color="text.secondary">
				{row.type === 'folder' ? 'Folder' : capitalize(row.data.doc_type.replace('_', ' '))}
			</Typography>
		),
	},
	{
		headerName: 'Date',
		field: 'date',
		width: 150,
		renderCell: ({ row }) => (
			<Typography variant="body2" color="text.secondary">
				{formatMDY(row.data.created_at)}
			</Typography>
		),
	},
];

const styles = {
	container: {
		width: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
		border: '1px solid #e0e0e0',
		borderRadius: 1,
	},
	dataGrid: {
		flex: 1,
		border: 'none',
		'& .MuiDataGrid-row': {
			cursor: 'pointer',
		},
		'& .MuiDataGrid-cell': {
			display: 'flex',
			alignItems: 'center',
		},
	},
};
