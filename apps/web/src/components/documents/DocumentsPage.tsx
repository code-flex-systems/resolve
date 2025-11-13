'use client';

import { Paper, Stack, Typography } from '@mui/material';
import { useState, useMemo, useEffect } from 'react';
import { useDocTrpc } from '@/hooks/trpc/useDocTrpc';
import type { DocListItem } from '@/hooks/trpc/useDocTrpc';
import DocumentNavigationTable from '../admin/DocumentNavigationTable';
import DocumentPreviewDialog from '../admin/DocumentPreviewDialog';
import Toolbar from '../common/Toolbar';
import PageWrapper from '../common/PageWrapper';

export default function DocumentsPage() {
	const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
	const [previewDocument, setPreviewDocument] = useState<DocListItem | null>(null);

	// Fetch all groups and filter to show only Shared folder and its children
	const { data: allGroups = [], isFetching: isFetchingGroups } = useDocTrpc().listDocGroups();

	// Find the Shared folder
	const sharedFolder = useMemo(() => {
		return allGroups.find((g) => g.name === 'Shared' && g.system === true && g.parent_group_id === null);
	}, [allGroups]);

	// Initialize currentFolderId to Shared folder when it loads
	useEffect(() => {
		if (sharedFolder && currentFolderId === null) {
			setCurrentFolderId(sharedFolder.id);
		}
	}, [sharedFolder, currentFolderId]);

	// Filter groups to show Shared folder and its descendants
	// (Shared itself is included for breadcrumb navigation, but won't appear in rows)
	const filteredGroups = useMemo(() => {
		if (!sharedFolder) return [];

		const sharedFolderId = sharedFolder.id;
		const descendants: typeof allGroups = [sharedFolder];

		// Recursive function to find all descendants
		const findDescendants = (parentId: number) => {
			allGroups.forEach((g) => {
				if (g.parent_group_id === parentId) {
					descendants.push(g);
					findDescendants(g.id); // Recursively find children
				}
			});
		};

		// Find all descendants of Shared folder
		findDescendants(sharedFolderId);

		return descendants;
	}, [allGroups, sharedFolder]);

	// Fetch documents for the current folder
	const { data: docs = [], isFetching: isFetchingDocs } = useDocTrpc().listDocs(
		{
			filters: { doc_group_id: currentFolderId },
		},
		{
			enabled: currentFolderId !== null,
		}
	);

	const isLoading = isFetchingGroups || isFetchingDocs;

	// Override the onNavigate to start from inside the Shared folder
	const handleNavigate = (folderId: number | null) => {
		// If navigating to null (root), navigate back to Shared folder level
		if (folderId === null && sharedFolder) {
			setCurrentFolderId(sharedFolder.id); // This will show Shared folder's children
		} else {
			setCurrentFolderId(folderId);
		}
	};

	return (
		<PageWrapper>
			<Stack width="100%" flex={1} padding="20px">
				<Paper sx={styles.container}>
					<Toolbar
						left={<Typography variant="h6">Shared Documents</Typography>}
						height={50}
						padding={'0px 10px'}
					/>

					<DocumentNavigationTable
						groups={filteredGroups}
						docs={docs}
						currentFolderId={currentFolderId}
						onNavigate={handleNavigate}
						onDocumentPreview={setPreviewDocument}
						loading={isLoading}
						showBreadcrumbs={true}
						breadcrumbRootLabel="Documents"
						adminMode={false}
						emptyRootText="No shared documents available yet."
						emptyFolderText="No documents in this folder yet."
						hiddenBreadcrumbFolderId={sharedFolder?.id}
					/>

					{previewDocument && (
						<DocumentPreviewDialog onClose={() => setPreviewDocument(null)} document={previewDocument} />
					)}
				</Paper>
			</Stack>
		</PageWrapper>
	);
}

const styles = {
	container: {
		width: '100%',
		height: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
		padding: '20px',
		border: 1,
		borderColor: 'divider',
	},
};
