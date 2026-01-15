'use client';

import { Box, Link, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { useClaimTrpc, type MyDeskClaimListItem } from '@/hooks/trpc/useClaimTrpc';
import ClaimDetailPanel from '../admin/ClaimDetailPanel';
import { useState } from 'react';
import ClaimListItem, { ClaimListItemData } from '@/components/common/ClaimListItem';

export default function MyQueue() {
	const { data, isFetching } = useClaimTrpc().listMyDeskClaims(
		{ limit: 25 },
		{
			refetchOnMount: 'always',
			refetchOnWindowFocus: true,
			staleTime: 0,
		}
	);

	const claims = data?.rows ?? [];

	const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);
	const [panelOpen, setPanelOpen] = useState(false);

	const handleRowClick = (claimId: number) => {
		setSelectedClaimId(claimId);
		setPanelOpen(true);
	};

	const handlePanelClose = () => {
		setPanelOpen(false);
		setTimeout(() => setSelectedClaimId(null), 300); // Clear after animation
	};

	// Map MyDeskClaimListItem to ClaimListItemData
	const mapToClaimListItemData = (claim: MyDeskClaimListItem): ClaimListItemData => ({
		id: claim.id,
		claim_number: claim.claim_number,
		client: claim.client,
		insured: claim.insured,
		claim_amount: claim.claim_amount,
		date_of_loss: claim.date_of_loss,
		recovery_status: claim.recovery_status,
		substatus: claim.substatus,
		last_update: claim.last_update,
		desk_location_name: claim.desk_location_name,
	});

	return (
		<>
			<Paper elevation={0} sx={styles.container}>
				{isFetching ? (
					<Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 4 }} />
				) : (
					<Stack width="100%" height="100%" spacing={1}>
						{/* Header */}
						<Box width="100%" height={40} display="flex" justifyContent="space-between" alignItems="center">
							<Typography variant="subtitle1" fontSize={14} fontWeight={600}>
								My Queue
							</Typography>
							{claims.length > 0 && (
								<Typography variant="caption" color="text.secondary">
									{claims.length} {claims.length === 1 ? 'claim' : 'claims'}
								</Typography>
							)}
						</Box>

						{/* Claims List */}
						<Box sx={styles.listContainer}>
							{claims.length === 0 ? (
								<Box
									width="100%"
									height="100%"
									display="flex"
									justifyContent="center"
									alignItems="center"
								>
									<Typography fontSize={15} color={BASE_COLOR_LIGHT}>
										No claims in queue
									</Typography>
								</Box>
							) : (
								<Stack width="100%" spacing={0}>
									{claims.map((claim, index) => (
										<ClaimListItem
											key={claim.id}
											claim={mapToClaimListItemData(claim)}
											onClick={() => handleRowClick(claim.id)}
											showStatusChip={true}
											showAmount={false}
											showLastUpdate={true}
											showDeskLocation={true}
											variant="listRow"
											index={index}
										/>
									))}
								</Stack>
							)}
						</Box>

						{/* Footer */}
						{claims.length > 0 && (
							<Box width="100%" display="flex" justifyContent="center" paddingTop={1}>
								<Link
									href="/my-claims"
									underline="hover"
									fontSize={12}
									color="primary"
									sx={{ cursor: 'pointer' }}
								>
									View All My Claims
								</Link>
							</Box>
						)}
					</Stack>
				)}
			</Paper>

			{/* Claim Detail Panel */}
			<ClaimDetailPanel claimId={selectedClaimId} open={panelOpen} onClose={handlePanelClose} />
		</>
	);
}

const styles = {
	container: {
		width: 550,
		minWidth: 550,
		height: 'calc(100vh - 320px)',
		padding: '24px',
		overflow: 'hidden',
		borderRadius: 4,
		margin: '15px',
	},
	listContainer: {
		width: '100%',
		overflowY: 'auto',
		overflowX: 'hidden',
		'&::-webkit-scrollbar': {
			width: '8px',
		},
		'&::-webkit-scrollbar-track': {
			background: '#f1f1f1',
			borderRadius: '4px',
		},
		'&::-webkit-scrollbar-thumb': {
			background: '#888',
			borderRadius: '4px',
		},
		'&::-webkit-scrollbar-thumb:hover': {
			background: '#555',
		},
	},
};
