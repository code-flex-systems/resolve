'use client';

import { Box, Link, Skeleton, Stack, Typography } from '@mui/material';
import { containerStyles } from '@/styles/theme';
import { useClaimTrpc, type MyDeskClaimListItem } from '@/hooks/trpc/useClaimTrpc';
import ClaimDetailPanel from '../admin/ClaimDetailPanel';
import { useState } from 'react';
import ClaimListItem, { ClaimListItemData } from '@/components/common/ClaimListItem';
import ListAlt from '@mui/icons-material/ListAlt';

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
			<Box sx={{ ...containerStyles.section, ...styles.container }}>
				<Typography sx={containerStyles.sectionTitle}>
					<ListAlt sx={{ fontSize: 16, mr: 1, verticalAlign: 'text-bottom' }} />
					My Queue
					{claims.length > 0 && (
						<Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
							({claims.length})
						</Typography>
					)}
				</Typography>
				<Box sx={{ ...containerStyles.sectionContent, ...styles.contentContainer }}>
					{isFetching ? (
						<Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 1 }} />
					) : (
						<Stack width="100%" height="100%" spacing={1}>
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
										<Typography fontSize={13} color="text.secondary" fontStyle="italic">
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
				</Box>
			</Box>

			{/* Claim Detail Panel */}
			<ClaimDetailPanel claimId={selectedClaimId} open={panelOpen} onClose={handlePanelClose} />
		</>
	);
}

const styles = {
	container: {
		width: 550,
		minWidth: 550,
		height: 'calc(100vh - 140px)',
		margin: '15px',
	},
	contentContainer: {
		height: 'calc(100% - 45px)',
		overflow: 'hidden',
	},
	listContainer: {
		width: '100%',
		height: '100%',
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
