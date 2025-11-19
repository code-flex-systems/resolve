'use client';

import { Box, Drawer, IconButton, Typography } from '@mui/material';
import Close from '@mui/icons-material/Close';
import ClaimSummary from './ClaimSummary';

interface ClaimDetailPanelProps {
	claimId: number | null;
	open: boolean;
	onClose: () => void;
	onStartChecklist?: () => void;
}

export default function ClaimDetailPanel({ claimId, open, onClose, onStartChecklist }: ClaimDetailPanelProps) {
	return (
		<Drawer
			anchor="right"
			open={open}
			onClose={onClose}
			sx={{
				'& .MuiDrawer-paper': {
					width: 450,
					padding: '20px',
					display: 'flex',
					flexDirection: 'column',
				},
			}}
		>
			<Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="15px" flexShrink={0}>
				<Typography variant="h6">Claim Details</Typography>
				<IconButton onClick={onClose} size="small">
					<Close />
				</IconButton>
			</Box>

			<Box flex={1} overflow="hidden">
				{claimId && <ClaimSummary claimId={claimId} onStartChecklist={onStartChecklist} />}
			</Box>
		</Drawer>
	);
}
