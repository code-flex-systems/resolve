'use client';

import { Box, Chip, Paper, Stack, Typography, Button, Autocomplete, TextField } from '@mui/material';
import Search from '@mui/icons-material/Search';
import Checklist from '@mui/icons-material/Checklist';
import ContentPasteSearch from '@mui/icons-material/ContentPasteSearch';
import ArrowCircleRightOutlined from '@mui/icons-material/ArrowCircleRightOutlined';
import { useChecklistsStore } from '@/stores/useChecklistsStore';
import { useState } from 'react';
import theme from '@/styles/theme';

/**
 * OPTION A: Hero Search (Full-Width)
 *
 * Large, prominent search bar spanning full width
 * Single combined autocomplete showing both claims and checklists
 * Hero treatment with gradient background
 * Selected items show as chips
 * Most visually impressive option
 */
export default function HomeSearchOptionA() {
	const selectedChecklist = useChecklistsStore((state) => state.selectedChecklist);
	const selectedClaim = useChecklistsStore((state) => state.selectedClaim);
	const updateSelectedClaim = useChecklistsStore((state) => state.updateSelectedClaim);
	const updateSelectedChecklist = useChecklistsStore((state) => state.updateSelectedChecklist);
	const toggleChecklistClaimDialog = useChecklistsStore((state) => state.toggleChecklistClaimDialog);

	return (
		<Paper elevation={0} sx={styles.container}>
			<Stack width="100%" height="100%" spacing={3} justifyContent="center" alignItems="center">
				{/* Hero Title */}
				<Box textAlign="center">
					<Typography variant="h4" fontSize={28} fontWeight={700} color="primary" mb={0.5}>
						MANIFEST
					</Typography>
					<Typography variant="body2" fontSize={14} color="text.secondary">
						Search for a claim and select a checklist to begin
					</Typography>
				</Box>

				{/* Combined Search Bar */}
				<Box width="100%" maxWidth={800}>
					<TextField
						fullWidth
						placeholder="Search claims or checklists..."
						variant="filled"
						InputProps={{
							startAdornment: <Search sx={{ color: theme.palette.primary.main, mr: 1, fontSize: 32 }} />,
							sx: {
								fontSize: 18,
								height: 70,
								borderRadius: 3,
								backgroundColor: 'white',
								'&:hover': {
									backgroundColor: '#f8f8f8',
								},
							},
						}}
						sx={{
							'& .MuiFilledInput-root': {
								borderRadius: 3,
								'&:before': { display: 'none' },
								'&:after': { display: 'none' },
							},
						}}
					/>
				</Box>

				{/* Selected Items Chips */}
				{(selectedClaim || selectedChecklist) && (
					<Box display="flex" gap={2} flexWrap="wrap" justifyContent="center">
						{selectedClaim && (
							<Chip
								label={`Claim: ${selectedClaim.claim_number}`}
								icon={<ContentPasteSearch />}
								onDelete={() => updateSelectedClaim(null)}
								sx={styles.selectedChip}
							/>
						)}
						{selectedChecklist && (
							<Chip
								label={`Checklist: ${selectedChecklist.name}`}
								icon={<Checklist />}
								onDelete={() => updateSelectedChecklist(null)}
								sx={styles.selectedChip}
							/>
						)}
					</Box>
				)}

				{/* Action Button */}
				<Button
					variant="contained"
					size="large"
					disabled={!selectedClaim || !selectedChecklist}
					onClick={toggleChecklistClaimDialog}
					startIcon={<ArrowCircleRightOutlined />}
					sx={{
						fontSize: 20,
						fontWeight: 600,
						height: 60,
						minWidth: 200,
						borderRadius: 3,
						textTransform: 'none',
					}}
				>
					Open Checklist
				</Button>

				{/* Helper Text */}
				<Typography variant="caption" fontSize={12} color="text.disabled">
					{!selectedClaim && !selectedChecklist
						? 'Start by searching for a claim'
						: !selectedClaim
							? 'Now select a claim'
							: !selectedChecklist
								? 'Now select a checklist'
								: 'Ready to open!'}
				</Typography>
			</Stack>
		</Paper>
	);
}

const styles = {
	container: {
		width: '100%',
		maxWidth: 900,
		height: 250,
		padding: '30px 40px',
		borderRadius: 4,
		margin: '15px auto',
		background: 'linear-gradient(135deg, rgba(50, 174, 153, 0.08) 0%, rgba(255, 255, 255, 1) 100%)',
		border: '1px solid',
		borderColor: theme.palette.primary.light,
	},
	selectedChip: {
		height: 36,
		fontSize: 14,
		fontWeight: 600,
		backgroundColor: theme.palette.primary.light,
		color: 'white',
		'& .MuiChip-deleteIcon': {
			color: 'white',
			'&:hover': {
				color: 'rgba(255, 255, 255, 0.8)',
			},
		},
	},
};
