'use client';

import { useState } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import ClaimsSearch from '@/components/home/ClaimsSearch';
import ClaimSummaryDialog from '@/components/admin/ClaimSummaryDialog';
import ChecklistSelectionDialog from '@/components/common/ChecklistSelectionDialog';
import { useClerkSession } from '@/lib/auth/use-clerk-session';
import { BG_TERTIARY, BORDER_COLOR } from '@/styles/theme';

/**
 * Landing page with hero search
 * Features:
 * - Simple, clean claim search
 * - Opens claim summary dialog on selection
 * - Can start a checklist from the summary
 */
export default function SearchLanding() {
	const { data: session } = useClerkSession();
	const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);
	const [showClaimDialog, setShowClaimDialog] = useState(false);
	const [showChecklistDialog, setShowChecklistDialog] = useState(false);

	const handleClaimSelect = (claimId: number) => {
		setSelectedClaimId(claimId);
		setShowClaimDialog(true);
	};

	const handleClaimDialogClose = () => {
		setShowClaimDialog(false);
		setTimeout(() => setSelectedClaimId(null), 300);
	};

	const handleStartChecklist = () => {
		setShowClaimDialog(false);
		setShowChecklistDialog(true);
	};

	const handleChecklistDialogClose = () => {
		setShowChecklistDialog(false);
		setTimeout(() => setSelectedClaimId(null), 300);
	};

	return (
		<>
			<Box sx={styles.container}>
				<Paper sx={styles.paper}>
					<Stack width="100%" maxWidth={700} spacing={4} mx="auto">
						{/* Hero Header */}
						<Box textAlign="center">
							<Typography variant="h3" fontSize={48} fontWeight={700} color="primary" mb={2}>
								MANIFEST
							</Typography>
							<Typography variant="h5" fontSize={24} fontWeight={500} color="text.secondary" mb={1}>
								Welcome{session?.user ? `, ${session.user.name?.split(' ')[0] ?? ''}` : ''}!
							</Typography>
							<Typography variant="body1" fontSize={16} color="text.secondary" mt={2}>
								Search for a claim to get started
							</Typography>
						</Box>

						{/* Hero Search */}
						<Box sx={styles.searchContainer}>
							<ClaimsSearch onClaimSelect={handleClaimSelect} heroMode />
						</Box>

						{/* Helper Text */}
						<Box textAlign="center">
							<Typography variant="body2" fontSize={14} color="text.disabled">
								Search by claim number or insured name
							</Typography>
						</Box>
					</Stack>
				</Paper>
			</Box>

			{/* Claim Summary Dialog */}
			<ClaimSummaryDialog
				claimId={selectedClaimId}
				open={showClaimDialog}
				onClose={handleClaimDialogClose}
				onStartChecklist={handleStartChecklist}
			/>

			{/* Checklist Selection Dialog */}
			{selectedClaimId && (
				<ChecklistSelectionDialog
					claimId={selectedClaimId}
					open={showChecklistDialog}
					onClose={handleChecklistDialogClose}
				/>
			)}
		</>
	);
}

const styles = {
	container: {
		width: '100%',
		minHeight: '80vh',
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'center',
		alignItems: 'center',
		p: '40px 20px',
	},
	paper: {
		width: '100%',
		maxWidth: 900,
		p: '30px 40px',
		borderRadius: 4,
		m: '15px auto',
		background: 'linear-gradient(135deg, rgba(50, 174, 153, 0.06) 0%, rgba(255, 255, 255, 1) 100%)',
		border: `1px solid ${BORDER_COLOR}`,
	},
	searchContainer: {
		width: '100%',
		height: '100%',
	},
};
