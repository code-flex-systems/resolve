'use client';

import { useState } from 'react';
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
			<div style={styles.container}>
				<div style={styles.paper}>
					<div style={{ width: '100%', maxWidth: 700, gap: 32, marginLeft: 'auto', marginRight: 'auto' }}>
						{/* Hero Header */}
						<div style={{ textAlign: 'center' }}>
							<span style={{ fontSize: 48, fontWeight: 700, color: 'primary', marginBottom: 16 }}>
								MANIFEST
							</span>
							<span style={{ fontSize: 24, fontWeight: 500, color: 'text.secondary', marginBottom: 8 }}>
								Welcome{session?.user ? `, ${session.user.name?.split(' ')[0] ?? ''}` : ''}!
							</span>
							<span style={{ fontSize: 16, color: 'text.secondary', marginTop: 16 }}>
								Search for a claim to get started
							</span>
						</div>

						{/* Hero Search */}
						<div style={styles.searchContainer}>
							<ClaimsSearch onClaimSelect={handleClaimSelect} heroMode />
						</div>

						{/* Helper Text */}
						<div style={{ textAlign: 'center' }}>
							<span style={{ fontSize: 14, color: 'text.disabled' }}>
								Search by claim number or insured name
							</span>
						</div>
					</div>
				</div>
			</div>

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
		padding: '40px 20px',
	},
	paper: {
		width: '100%',
		maxWidth: 900,
		padding: '30px 40px',
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
