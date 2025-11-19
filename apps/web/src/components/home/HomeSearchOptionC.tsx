'use client';

import { Box, Card, CardContent, Chip, Paper, Stack, Typography, Button, IconButton } from '@mui/material';
import ContentPasteSearch from '@mui/icons-material/ContentPasteSearch';
import Checklist from '@mui/icons-material/Checklist';
import Close from '@mui/icons-material/Close';
import Add from '@mui/icons-material/Add';
import ArrowCircleRightOutlined from '@mui/icons-material/ArrowCircleRightOutlined';
import { useChecklistsStore } from '@/stores/useChecklistsStore';
import theme from '@/styles/theme';

/**
 * OPTION C: Card-Based Selection
 *
 * Two large clickable cards side-by-side
 * Click card to open search (could be modal or inline)
 * Selected items show as large chips on card
 * Remove selection via X button
 * Very clean, modern, unique UX
 * More whitespace, better visual hierarchy
 */
export default function HomeSearchOptionC() {
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
						Start a Checklist
					</Typography>
				</Box>

				{/* Two Cards Side-by-Side */}
				<Box display="flex" gap={2.5} width="100%">
					{/* Claim Card */}
					<Card sx={styles.card} onClick={() => {}}>
						<CardContent sx={{ p: 3, height: '100%' }}>
							<Stack height="100%" justifyContent="space-between">
								{/* Header */}
								<Box>
									<Box
										display="flex"
										justifyContent="center"
										alignItems="center"
										width={56}
										height={56}
										borderRadius="50%"
										bgcolor={theme.palette.primary.light}
										mb={2}
									>
										<ContentPasteSearch sx={{ color: 'white', fontSize: 32 }} />
									</Box>
									<Typography variant="h6" fontSize={16} fontWeight={600} mb={0.5}>
										Find a Claim
									</Typography>
									<Typography variant="caption" fontSize={12} color="text.secondary">
										Search by claim number
									</Typography>
								</Box>

								{/* Selected Item or Add Button */}
								{selectedClaim ? (
									<Chip
										label={selectedClaim.claim_number}
										onDelete={() => updateSelectedClaim(null)}
										deleteIcon={<Close />}
										sx={styles.selectedChip}
									/>
								) : (
									<Button
										variant="outlined"
										startIcon={<Add />}
										sx={{
											textTransform: 'none',
											fontWeight: 600,
											borderRadius: 2,
											borderWidth: 2,
											'&:hover': { borderWidth: 2 },
										}}
									>
										Select Claim
									</Button>
								)}
							</Stack>
						</CardContent>
					</Card>

					{/* Checklist Card */}
					<Card sx={styles.card} onClick={() => {}}>
						<CardContent sx={{ p: 3, height: '100%' }}>
							<Stack height="100%" justifyContent="space-between">
								{/* Header */}
								<Box>
									<Box
										display="flex"
										justifyContent="center"
										alignItems="center"
										width={56}
										height={56}
										borderRadius="50%"
										bgcolor={theme.palette.secondary.light}
										mb={2}
									>
										<Checklist sx={{ color: 'white', fontSize: 32 }} />
									</Box>
									<Typography variant="h6" fontSize={16} fontWeight={600} mb={0.5}>
										Select Checklist
									</Typography>
									<Typography variant="caption" fontSize={12} color="text.secondary">
										Choose a template
									</Typography>
								</Box>

								{/* Selected Item or Add Button */}
								{selectedChecklist ? (
									<Chip
										label={selectedChecklist.name}
										onDelete={() => updateSelectedChecklist(null)}
										deleteIcon={<Close />}
										sx={styles.selectedChip}
									/>
								) : (
									<Button
										variant="outlined"
										startIcon={<Add />}
										sx={{
											textTransform: 'none',
											fontWeight: 600,
											borderRadius: 2,
											borderWidth: 2,
											'&:hover': { borderWidth: 2 },
										}}
									>
										Select Checklist
									</Button>
								)}
							</Stack>
						</CardContent>
					</Card>
				</Box>

				{/* Action Button */}
				<Box display="flex" justifyContent="center">
					<Button
						variant="contained"
						size="large"
						disabled={!selectedClaim || !selectedChecklist}
						onClick={toggleChecklistClaimDialog}
						endIcon={<ArrowCircleRightOutlined />}
						fullWidth
						sx={{
							fontSize: 18,
							fontWeight: 600,
							height: 56,
							borderRadius: 3,
							textTransform: 'none',
							maxWidth: 400,
						}}
					>
						Open Checklist
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
		height: 320,
		padding: '25px 30px',
		borderRadius: 4,
		margin: '15px',
	},
	card: {
		flex: 1,
		height: 200,
		cursor: 'pointer',
		transition: 'all 0.2s ease',
		border: '2px solid',
		borderColor: theme.palette.divider,
		'&:hover': {
			borderColor: theme.palette.primary.main,
			transform: 'translateY(-4px)',
			boxShadow: `0 8px 16px ${theme.palette.primary.light}40`,
		},
	},
	selectedChip: {
		height: 40,
		fontSize: 14,
		fontWeight: 600,
		backgroundColor: theme.palette.primary.main,
		color: 'white',
		'& .MuiChip-deleteIcon': {
			color: 'white',
			fontSize: 20,
			'&:hover': {
				color: 'rgba(255, 255, 255, 0.8)',
			},
		},
	},
};
