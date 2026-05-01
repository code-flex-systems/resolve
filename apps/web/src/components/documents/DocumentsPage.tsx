'use client';

import { useState, useMemo, useEffect } from 'react';
import { useDocTrpc } from '@/hooks/trpc/useDocTrpc';
import type { DocListItem, DocGroupListItem } from '@/hooks/trpc/useDocTrpc';
import Card from '@/components/ui/Card';
import DocumentNavigationTable from '../admin/DocumentNavigationTable';
import DocumentPreviewDialog from '../admin/DocumentPreviewDialog';
import Toolbar from '../common/Toolbar';
import { useBreadcrumbs } from '../common/BreadcrumbContext';

export default function DocumentsPage() {
	const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
	const [previewDocument, setPreviewDocument] = useState<DocListItem | null>(null);
	const { setDynamicSegments, setSegments } = useBreadcrumbs();

	// Fetch all groups and filter to show only Shared folder and its children
	const { data: allGroups = [], isFetching: isFetchingGroups } = useDocTrpc().listDocGroups();

	// Find the Shared folder
	const sharedFolder = useMemo(() => {
		return allGroups.find(
			(g) => g.name === 'Shared' && g.system === true && g.parent_group_id === null
		);
	}, [allGroups]);

	// Initialize currentFolderId to Shared folder when it loads
	useEffect(() => {
		if (sharedFolder && currentFolderId === null) {
			setCurrentFolderId(sharedFolder.id);
		}
	}, [sharedFolder, currentFolderId]);

	// Filter groups to show Shared folder and its descendants
	const filteredGroups = useMemo(() => {
		if (!sharedFolder) return [];

		const sharedFolderId = sharedFolder.id;
		const descendants: typeof allGroups = [sharedFolder];

		const findDescendants = (parentId: string) => {
			allGroups.forEach((g) => {
				if (g.parent_group_id === parentId) {
					descendants.push(g);
					findDescendants(g.id);
				}
			});
		};

		findDescendants(sharedFolderId);
		return descendants;
	}, [allGroups, sharedFolder]);

	// Build folder breadcrumb path for the app header
	const currentFolder = useMemo(() => {
		return currentFolderId ? filteredGroups.find((g) => g.id === currentFolderId) : null;
	}, [currentFolderId, filteredGroups]);

	const parentFolder = useMemo(() => {
		if (!currentFolder?.parent_group_id) return null;
		return filteredGroups.find((g) => g.id === currentFolder.parent_group_id) ?? null;
	}, [currentFolder, filteredGroups]);

	useEffect(() => {
		const segments: { label: string; onClick?: () => void }[] = [
			{ label: 'Documents', onClick: () => handleNavigate(null) },
		];
		if (parentFolder && parentFolder.id !== sharedFolder?.id) {
			const folderId = parentFolder.id;
			segments.push({ label: parentFolder.name, onClick: () => handleNavigate(folderId) });
		}
		if (currentFolder && currentFolder.id !== sharedFolder?.id) {
			segments.push({ label: currentFolder.name });
		}
		setSegments(segments);
	}, [currentFolder?.name, parentFolder?.name, sharedFolder?.id, setSegments]);

	// Fetch documents for the current folder
	const { data: docsResult, isFetching: isFetchingDocs } = useDocTrpc().listDocs(
		{
			filters: { doc_group_id: currentFolderId },
		},
		{
			enabled: currentFolderId !== null,
		}
	);
	const docs = docsResult?.rows ?? [];

	const isLoading = isFetchingGroups || isFetchingDocs;

	// Override the onNavigate to start from inside the Shared folder
	const handleNavigate = (folderId: string | null) => {
		if (folderId === null && sharedFolder) {
			setCurrentFolderId(sharedFolder.id);
		} else {
			setCurrentFolderId(folderId);
		}
	};

	return (
		<div style={{ width: '100%', height: '100%', padding: 20 }}>
			<Card
				variant="beveled"
				padding="md"
				style={{
					display: 'flex',
					flexDirection: 'column',
					width: '100%',
					height: '100%',
					minHeight: 0,
					overflow: 'hidden',
				}}
			>
				<Toolbar left={<span>Shared Documents</span>} height={50} padding={'0px 10px'} />

				<div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
					<DocumentNavigationTable
						groups={filteredGroups}
						docs={docs}
						currentFolderId={currentFolderId}
						onNavigate={handleNavigate}
						onDocumentPreview={setPreviewDocument}
						loading={isLoading}
						emptyRootText="No shared documents available yet."
						emptyFolderText="No documents in this folder yet."
					/>
				</div>

				{previewDocument && (
					<DocumentPreviewDialog
						onClose={() => setPreviewDocument(null)}
						document={previewDocument}
					/>
				)}
			</Card>
		</div>
	);
}
