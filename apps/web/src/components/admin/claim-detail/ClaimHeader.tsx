'use client';

import { Box, Chip, Icon, IconButton, Paper, Skeleton, Stack, Typography } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Edit from '@mui/icons-material/Edit';
import Assignment from '@mui/icons-material/Assignment';
import Archive from '@mui/icons-material/Archive';
import Print from '@mui/icons-material/Print';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { formatCurrencyExact, formatRecoveryStatus } from '@/lib/utils/recoveryUtils';
import { formatLineOfBusiness, formatLossType, LOB_ICONS, LOSS_TYPE_ICONS } from '@/lib/utils/claimUtils';
import { LineOfBusiness, LossType } from '@/config/enums';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import useIsAdmin from '@/hooks/useIsAdmin';
import useIsSuperAdmin from '@/hooks/useIsSuperAdmin';

interface ClaimHeaderProps {
	claimId: number;
	backRoute?: string; // Optional custom back route
}

export default function ClaimHeader({ claimId, backRoute = '/admin/claims' }: ClaimHeaderProps) {
	const router = useRouter();
	const isAdmin = useIsAdmin();
	const isSuperAdmin = useIsSuperAdmin();
	const canEditClaim = isAdmin || isSuperAdmin;
	const { data: claimDetail, isLoading } = trpc.claim.getClaimDetail.useQuery({ claimId });

	if (isLoading) {
		return (
			<Paper elevation={0} sx={styles.container}>
				<Stack spacing={1}>
					<Skeleton variant="text" width={200} />
					<Skeleton variant="rectangular" height={80} />
				</Stack>
			</Paper>
		);
	}

	if (!claimDetail) {
		return null;
	}

	return (
		<Paper elevation={0} sx={styles.container}>
			{/* Main Header Content */}
			<Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap">
				{/* Left: Claim Number and Insured */}
				<Box>
					<Box display="flex" alignItems="center" gap={1} marginBottom={1}>
						<IconButton onClick={() => router.push(backRoute)}>
							<ArrowBack />
						</IconButton>
						<Typography variant="h4" color="primary">
							{claimDetail.claim_number}
						</Typography>
					</Box>
					<Typography variant="body1" color="text.secondary">
						{claimDetail.insured || 'N/A'}
					</Typography>
				</Box>

				{/* Right: Key Metrics */}
				<Box display="flex" gap={3} alignItems="center" flexWrap="wrap">
					<Box>
						<Typography fontSize={12} color={BASE_COLOR_LIGHT}>
							Claim Amount
						</Typography>
						<Typography variant="h6" fontSize={18}>
							{formatCurrencyExact(Number(claimDetail.claim_amount) || 0)}
						</Typography>
					</Box>
					<Box>
						<Typography fontSize={12} color={BASE_COLOR_LIGHT}>
							Total Incurred
						</Typography>
						<Typography variant="h6" fontSize={18}>
							{formatCurrencyExact(Number(claimDetail.total_incurred) || 0)}
						</Typography>
					</Box>
					<Box>
						<Typography fontSize={12} color={BASE_COLOR_LIGHT}>
							Expected Recovery
						</Typography>
						<Typography variant="h6" fontSize={18}>
							{formatCurrencyExact(Number(claimDetail.expected_recovery) || 0)}
						</Typography>
					</Box>
					<Box>
						<Typography fontSize={12} color={BASE_COLOR_LIGHT}>
							Actual Recovery
						</Typography>
						<Typography variant="h6" fontSize={18}>
							{formatCurrencyExact(Number(claimDetail.actual_recovery) || 0)}
						</Typography>
					</Box>
				</Box>
			</Box>

			{/* Action Toolbar */}
			<Box display="flex" justifyContent="space-between" gap={1} marginTop={2}>
				<Box display="flex" flexWrap="wrap" gap={1} justifyContent="flex-start" alignItems="center">
					{claimDetail.line_of_business && (
						<Chip
							icon={
								<Box marginLeft="5px">
									<Typography fontSize={14}>
										{LOB_ICONS[claimDetail.line_of_business as LineOfBusiness]}
									</Typography>
								</Box>
							}
							label={formatLineOfBusiness(claimDetail.line_of_business)}
							color="primary"
							variant="outlined"
						/>
					)}
					{claimDetail.loss_type && (
						<Chip
							icon={
								<Box marginLeft="5px">
									<Typography fontSize={14}>
										{LOSS_TYPE_ICONS[claimDetail.loss_type as LossType]}
									</Typography>
								</Box>
							}
							label={formatLossType(claimDetail.loss_type)}
							color="secondary"
							variant="outlined"
						/>
					)}
					{claimDetail.recovery_status && (
						<Chip
							label={`Recovery: ${formatRecoveryStatus(claimDetail.recovery_status)}`}
							variant="outlined"
						/>
					)}
					{claimDetail.feed_name && <Chip label={`Feed: ${claimDetail.feed_name}`} variant="outlined" />}
				</Box>
				<Box display="flex" gap={1} justifyContent="flex-end" alignItems="center">
					{canEditClaim && (
						<IconButton
							size="small"
							title="Edit Claim"
							onClick={() => router.push(`/admin/claims/edit/${claimId}`)}
						>
							<Edit />
						</IconButton>
					)}
					<IconButton size="small" title="Assign Claim" disabled>
						<Assignment />
					</IconButton>
					<IconButton size="small" title="Archive Claim" disabled>
						<Archive />
					</IconButton>
					<IconButton size="small" title="Print" disabled>
						<Print />
					</IconButton>
				</Box>
			</Box>
		</Paper>
	);
}

const styles = {
	container: {
		padding: '20px 30px',
		borderBottom: 1,
		borderRadius: 0,
		borderColor: 'divider',
	},
};
