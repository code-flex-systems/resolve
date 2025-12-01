'use client';

import { useState } from 'react';
import { Box, Fade, MenuItem, Stack, Typography } from '@mui/material';
import Checklist from '@mui/icons-material/Checklist';
import Description from '@mui/icons-material/Description';
import CheckCircle from '@mui/icons-material/CheckCircle';
import BasicDialog from './BasicDialog';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import theme, { BASE_COLOR_LIGHT } from '@/styles/theme';
import RingLoadingIndicator from './RingLoadingIndicator';
import { useRouter } from 'next/navigation';

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
			<Box sx={styles.container}>
				{isLoading && (
					<Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
						<RingLoadingIndicator message="Loading checklists..." />
					</Box>
				)}

				{!isLoading && checklists.length === 0 && (
					<Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
						<Typography fontSize={15} color={BASE_COLOR_LIGHT}>
							No checklists available
						</Typography>
					</Box>
				)}

				{!isLoading && checklists.length > 0 && (
					<Stack width="100%" spacing={0}>
						{checklists.map((checklist) => {
							const pageCount = parseInt(checklist.page_count?.toString() ?? '0');
							const isSelected = selectedChecklist?.id === checklist.id;

							return (
								<MenuItem
									key={checklist.id}
									onClick={() => handleSelectChecklist(checklist)}
									sx={{
										...styles.menuItem,
										backgroundColor: isSelected ? '#F0F7F5 !important' : undefined,
									}}
									disableRipple
								>
									<Stack width="100%" spacing={0.5}>
										{/* Name and Page Count */}
										<Box display="flex" alignItems="center" justifyContent="space-between">
											<Box display="flex" alignItems="center" gap={1}>
												<Checklist sx={{ color: theme.palette.secondary.main, fontSize: 20 }} />
												<Typography variant="subtitle1" fontSize={16} fontWeight={600}>
													{checklist.name}
												</Typography>
												<Fade in={isSelected}>
													<CheckCircle
														sx={{ color: theme.palette.secondary.main, fontSize: 20 }}
													/>
												</Fade>
											</Box>
											<Box
												px={1.5}
												py={0.5}
												borderRadius={2}
												bgcolor={theme.palette.secondary.light}
												display="flex"
												alignItems="center"
												gap={0.5}
											>
												<Description sx={{ fontSize: 14, color: 'white' }} />
												<Typography fontSize={12} fontWeight={600} color="white">
													{pageCount} {pageCount === 1 ? 'page' : 'pages'}
												</Typography>
											</Box>
										</Box>

										{/* Description */}
										{checklist.description && (
											<Typography
												variant="body2"
												fontSize={13}
												color="text.secondary"
												sx={{
													display: '-webkit-box',
													WebkitLineClamp: 2,
													WebkitBoxOrient: 'vertical',
													overflow: 'hidden',
													textOverflow: 'ellipsis',
												}}
											>
												{checklist.description}
											</Typography>
										)}

										{!checklist.description && (
											<Typography
												variant="caption"
												fontSize={12}
												color={BASE_COLOR_LIGHT}
												fontStyle="italic"
											>
												No description provided
											</Typography>
										)}
									</Stack>
								</MenuItem>
							);
						})}
					</Stack>
				)}
			</Box>
		</BasicDialog>
	);
}

const styles = {
	container: {
		width: '100%',
		minHeight: 300,
		maxHeight: 500,
		overflowY: 'auto',
		overflowX: 'hidden',
		'&::-webkit-scrollbar': {
			width: '8px',
		},
		'&::-webkit-scrollbar-track': {
			background: '#f1f1f1',
			borderRadius: '4px',
		},
		'&::-webkit-scrollbar-thumb': {
			background: '#888',
			borderRadius: '4px',
		},
		'&::-webkit-scrollbar-thumb:hover': {
			background: '#555',
		},
	},
	menuItem: {
		minHeight: 80,
		padding: '16px',
		borderBottom: '1px solid #f0f0f0',
		transition: 'all 0.2s ease',
		cursor: 'pointer',
		'&:hover': {
			backgroundColor: '#F0F7F5 !important',
			transform: 'translateX(4px)',
		},
		'&:last-child': {
			borderBottom: 'none',
		},
		'&.Mui-focused': {
			backgroundColor: '#F0F7F5',
		},
	},
};
