'use client';

import { Box, Chip, IconButton, Paper, Skeleton, Stack, Typography } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Edit from '@mui/icons-material/Edit';
import Assignment from '@mui/icons-material/Assignment';
import Archive from '@mui/icons-material/Archive';
import Print from '@mui/icons-material/Print';
import { usePathname, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import useIsAdmin from '@/hooks/useIsAdmin';
import useIsSuperAdmin from '@/hooks/useIsSuperAdmin';
import { LineOfBusinessChip, LossTypeChip } from '@/components/common/ReferenceDataSelect';
import ClaimStatusChip from '@/components/common/ClaimStatusChip';

export default function ClaimHeader({ claimId }: { claimId: number }) {
	const router = useRouter();
	const pathname = usePathname();
	const isAdmin = useIsAdmin();
	const isSuperAdmin = useIsSuperAdmin();
	const { data: claimDetail, isLoading } = trpc.claim.getClaimDetail.useQuery({ claimId });

	const handleEditClaim = () => {
		if (claimId) {
			router.push(
				pathname.startsWith('/admin') && (isAdmin || isSuperAdmin)
					? `/admin/claims/edit/${claimId}`
					: `/my-claims/edit/${claimId}`
			);
		}
	};

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
						<IconButton onClick={() => router.back()}>
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
						<LineOfBusinessChip value={claimDetail.line_of_business} />
					)}
					{claimDetail.aggregated_loss_type &&
						claimDetail.aggregated_loss_type.length > 0 &&
						claimDetail.aggregated_loss_type.map((lt: string) => (
							<LossTypeChip key={lt} value={lt} />
						))}
					<ClaimStatusChip recoveryStatus={claimDetail.recovery_status} substatus={claimDetail.substatus} />
					{claimDetail.feed_name && (
						<Chip label={`Feed: ${claimDetail.feed_name}`} size="small" variant="outlined" />
					)}
				</Box>
				<Box display="flex" gap={1} justifyContent="flex-end" alignItems="center">
					<IconButton size="small" title="Edit Claim" onClick={handleEditClaim}>
						<Edit />
					</IconButton>
					{(isAdmin || isSuperAdmin) && (
						<>
							<IconButton size="small" title="Assign Claim" disabled>
								<Assignment />
							</IconButton>
							<IconButton size="small" title="Archive Claim" disabled>
								<Archive />
							</IconButton>
						</>
					)}
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
		border: 'none',
	},
};
