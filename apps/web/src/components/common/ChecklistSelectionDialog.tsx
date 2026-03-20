'use client';

import { useState } from 'react';
import { IconChecklist, IconFileDescription, IconCircleCheck } from '@tabler/icons-react';
import BasicDialog from './BasicDialog';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import RingLoadingIndicator from './RingLoadingIndicator';
import { useRouter } from 'next/navigation';
import css from './ChecklistSelectionDialog.module.css';

interface ChecklistSelectionDialogProps {
	claimId: number;
	open: boolean;
	onClose: () => void;
}

/**
 * Dialog for selecting a checklist to start for a claim
 * Features scrollable list of all checklists with modern styling
 */
export default function ChecklistSelectionDialog({ claimId, open, onClose }: ChecklistSelectionDialogProps) {
	const router = useRouter();
	const { data: checklists = [], isLoading } = useChecklistTrpc().list({});
	const [selectedChecklist, setSelectedChecklist] = useState<any>(null);

	const handleSelectChecklist = (checklist: any) => {
		setSelectedChecklist(checklist);
	};

	const handleConfirm = () => {
		if (selectedChecklist) {
			router.push(`/checklist/${selectedChecklist.id}/claim/${claimId}`);
			onClose();
		}
	};

	if (!open) return null;

	return (
		<BasicDialog
			title="Select a Checklist"
			onClose={onClose}
			width={600}
			maxHeight="80vh"
			primaryAction={{
				label: 'Start Checklist',
				onClick: handleConfirm,
				disabled: !selectedChecklist,
			}}
			secondaryActions={[
				{
					label: 'Cancel',
					onClick: onClose,
				},
			]}
		>
			<div className={css.container}>
				{isLoading && (
					<div className={css.emptyState}>
						<RingLoadingIndicator message="Loading checklists..." />
					</div>
				)}

				{!isLoading && checklists.length === 0 && (
					<div className={css.emptyState}>
						<span style={{ fontSize: 15, color: BASE_COLOR_LIGHT }}>
							No checklists available
						</span>
					</div>
				)}

				{!isLoading && checklists.length > 0 && (
					<div style={{ width: '100%' }}>
						{checklists.map((checklist) => {
							const pageCount = parseInt(checklist.page_count?.toString() ?? '0');
							const isSelected = selectedChecklist?.id === checklist.id;

							return (
								<div
									key={checklist.id}
									onClick={() => handleSelectChecklist(checklist)}
									className={`${css.menuItem} ${isSelected ? css.menuItemSelected : ''}`}
								>
									<div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
										{/* Name and Page Count */}
										<div className={css.nameRow}>
											<div className={css.nameGroup}>
												<IconChecklist size={20} style={{ color: 'var(--text-accent)' }} />
												<span style={{ fontSize: 16, fontWeight: 600 }}>
													{checklist.name}
												</span>
												{isSelected && (
													<span style={{ display: 'inline-flex' }}>
														<IconCircleCheck
															size={20}
															style={{ color: 'var(--text-accent)' }}
														/>
													</span>
												)}
											</div>
											<div
												className={css.pageBadge}
												style={{ backgroundColor: 'var(--status-info-bg)' }}
											>
												<IconFileDescription size={14} style={{ color: 'white' }} />
												<span style={{ fontSize: 12, fontWeight: 600, color: 'white' }}>
													{pageCount} {pageCount === 1 ? 'page' : 'pages'}
												</span>
											</div>
										</div>

										{/* Description */}
										{checklist.description && (
											<p className={css.description}>
												{checklist.description}
											</p>
										)}

										{!checklist.description && (
											<span className={css.noDescription}>
												No description provided
											</span>
										)}
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</BasicDialog>
	);
}
