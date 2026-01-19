'use client';

import { Box, Chip, Skeleton, Stack, Typography } from '@mui/material';
import { useClerkSession } from '@/lib/auth/use-clerk-session';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { ClaimStatus } from '@/config/enums';
import theme, { containerStyles, ORANGE } from '@/styles/theme';

export default function MyClaimsMetric() {
	const { data: session } = useClerkSession();
	const { data: stats = [], isLoading } = useChecklistTrpc().stats(
		{ users: session?.user?.id ? [session.user.id] : [] },
		{ enabled: !!session?.user?.id }
	);

	const totalOpen =
		(stats[ClaimStatus.IN_PROGRESS] ?? 0) + (stats[ClaimStatus.BLOCKED] ?? 0) + (stats[ClaimStatus.UNWORKED] ?? 0);

	return (
		<Box sx={{ ...containerStyles.section, ...styles.container }}>
			<Typography sx={containerStyles.sectionTitle}>My Open Claims</Typography>
			<Box sx={{ ...containerStyles.sectionContent, ...styles.contentContainer }}>
				{isLoading ? (
					<Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 1 }} />
				) : (
					<Stack width="100%" height="100%" spacing={2}>
						{/* Main Count */}
						<Box display="flex" alignItems="baseline" gap={1}>
							<Typography variant="h2" fontSize={48} fontWeight={700} color="primary">
								{totalOpen}
							</Typography>
							<Typography variant="body2" color="text.secondary">
								open {totalOpen === 1 ? 'claim' : 'claims'}
							</Typography>
						</Box>

						{/* Status Breakdown */}
						<Box display="flex" gap={1} flexWrap="wrap">
							<Chip
								label={`${stats[ClaimStatus.IN_PROGRESS] ?? 0} In Progress`}
								size="small"
								sx={{
									border: 'none',
									backgroundColor: theme.palette.warning.light,
									color: 'white',
									fontSize: 12,
									'& .MuiChip-label': {
										color: 'white',
									},
								}}
							/>
							<Chip
								label={`${stats[ClaimStatus.BLOCKED] ?? 0} Blocked`}
								size="small"
								sx={{
									border: 'none',
									backgroundColor: ORANGE,
									color: 'white',
									fontSize: 12,
									'& .MuiChip-label': {
										color: 'white',
									},
								}}
							/>
							<Chip
								label={`${stats[ClaimStatus.UNWORKED] ?? 0} Unworked`}
								size="small"
								sx={{
									border: 'none',
									backgroundColor: theme.palette.error.light,
									color: 'white',
									fontSize: 12,
									'& .MuiChip-label': {
										color: 'white',
									},
								}}
							/>
						</Box>
					</Stack>
				)}
			</Box>
		</Box>
	);
}

const styles = {
	container: {
		width: 400,
		minWidth: 400,
		height: 180,
		margin: '15px',
	},
	contentContainer: {
		height: 'calc(100% - 45px)',
		background: 'linear-gradient(135deg, rgba(50, 174, 153, 0.03) 0%, rgba(255, 255, 255, 1) 100%)',
	},
};
