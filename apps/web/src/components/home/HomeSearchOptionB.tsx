'use client';

import { Box, Chip, Paper, Stack, Typography, Button, TextField } from '@mui/material';
import ContentPasteSearch from '@mui/icons-material/ContentPasteSearch';
import Checklist from '@mui/icons-material/Checklist';
import ArrowCircleRightOutlined from '@mui/icons-material/ArrowCircleRightOutlined';
import ClaimsSearch from '@/components/home/ClaimsSearch';
import ChecklistsSearch from '@/components/home/ChecklistsSearch';
import { useChecklistsStore } from '@/stores/useChecklistsStore';
import theme from '@/styles/theme';

/**
 * OPTION B: Dual-Column Modern
 *
 * Side-by-side layout with modern Material Design 3 styling
 * Larger, cleaner autocomplete fields
 * Visual separator between columns
 * Icons for better visual communication
 * Keeps familiar two-step workflow
 * Easiest to implement
 */
export default function HomeSearchOptionB() {
	const selectedChecklist = useChecklistsStore((state) => state.selectedChecklist);
	const selectedClaim = useChecklistsStore((state) => state.selectedClaim);
	const updateSelectedClaim = useChecklistsStore((state) => state.updateSelectedClaim);
	const updateSelectedChecklist = useChecklistsStore((state) => state.updateSelectedChecklist);
	const toggleChecklistClaimDialog = useChecklistsStore((state) => state.toggleChecklistClaimDialog);

	return (
		<Paper elevation={0} sx={styles.container}>
			<Stack width="100%" height="100%" spacing={2.5}>
				{/* Title */}
				<Box textAlign="center">
					<Typography variant="h6" fontSize={16} fontWeight={700} color="primary">
						Search Claims & Checklists
					</Typography>
				</Box>

				{/* Two-Column Layout */}
				<Box display="flex" gap={3} alignItems="flex-start" width="100%">
					{/* Left Column: Claims */}
					<Box flex={1}>
						<Stack spacing={1.5}>
							<Box display="flex" alignItems="center" gap={1}>
								<ContentPasteSearch sx={{ color: theme.palette.primary.main, fontSize: 24 }} />
								<Typography variant="subtitle2" fontSize={14} fontWeight={600}>
									1. Select Claim
								</Typography>
							</Box>
							<ClaimsSearch showIcon={false} />
							{selectedClaim && (
								<Chip
									label={selectedClaim.claim_number}
									onDelete={() => updateSelectedClaim(null)}
									size="medium"
									sx={styles.chip}
								/>
							)}
						</Stack>
					</Box>

					{/* Vertical Divider */}
					<Box width={2} height={120} bgcolor={theme.palette.primary.light} borderRadius={1} />

					{/* Right Column: Checklists */}
					<Box flex={1}>
						<Stack spacing={1.5}>
							<Box display="flex" alignItems="center" gap={1}>
								<Checklist sx={{ color: theme.palette.primary.main, fontSize: 24 }} />
								<Typography variant="subtitle2" fontSize={14} fontWeight={600}>
									2. Select Checklist
								</Typography>
							</Box>
							<ChecklistsSearch showIcon={false} />
							{selectedChecklist && (
								<Chip
									label={selectedChecklist.name}
									onDelete={() => updateSelectedChecklist(null)}
									size="medium"
									sx={styles.chip}
								/>
							)}
						</Stack>
					</Box>
				</Box>

				{/* Action Button */}
				<Box display="flex" justifyContent="center" pt={1}>
					<Button
						variant="contained"
						size="large"
						disabled={!selectedClaim || !selectedChecklist}
						onClick={toggleChecklistClaimDialog}
						endIcon={<ArrowCircleRightOutlined />}
						sx={{
							fontSize: 18,
							fontWeight: 600,
							height: 54,
							minWidth: 220,
							borderRadius: 3,
							textTransform: 'none',
						}}
					>
						Go to Checklist
					</Button>
				</Box>
			</Stack>
		</Paper>
	);
}

const styles = {
	container: {
		width: 700,
		minWidth: 700,
		height: 280,
		padding: '25px 30px',
		borderRadius: 4,
		margin: '15px',
		border: '2px solid',
		borderColor: theme.palette.primary.light,
	},
	chip: {
		height: 32,
		fontSize: 14,
		fontWeight: 600,
		backgroundColor: theme.palette.secondary.light,
		color: 'white',
		'& .MuiChip-deleteIcon': {
			color: 'white',
			'&:hover': {
				color: 'rgba(255, 255, 255, 0.8)',
			},
		},
	},
};
