'use client';

import { Box } from '@mui/material';
import CoverageManager from '@/components/coverage/CoverageManager';

interface CoverageTabForClaimProps {
	claimId: number;
}

export default function CoverageTabForClaim({ claimId }: CoverageTabForClaimProps) {
	return (
		<Box p={3} height="100%">
			<Box height="calc(100vh - 275px)">
				<CoverageManager claimId={claimId} showHeader={true} headerTitle="" />
			</Box>
		</Box>
	);
}
