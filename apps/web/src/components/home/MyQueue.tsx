'use client';
import { Box, Link, Paper, Skeleton, Stack, Typography } from '@mui/material';
import theme, { BASE_COLOR_LIGHT } from '@/styles/theme';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import ClaimDetailPanel from '../admin/ClaimDetailPanel';
import { useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import ClaimStatusCell from '../metrics/Claims/ClaimStatusCell';

dayjs.extend(relativeTime);

export default function MyQueue() {
	const { isFetching, data: recentChecklistClaims = [] } = useChecklistTrpc().listRecents(undefined, {
		refetchOnMount: 'always',
		refetchOnWindowFocus: true,
		staleTime: 0, // Always consider data stale
	});

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
							{recentChecklistClaims.length > 0 && (
								<Typography variant="caption" color="text.secondary">
									{recentChecklistClaims.length}{' '}
									{recentChecklistClaims.length === 1 ? 'claim' : 'claims'}
								</Typography>
							)}
						</Box>

						{/* Claims List */}
						<Box sx={styles.listContainer}>
							{recentChecklistClaims.length === 0 ? (
								<Box
									width="100%"
									height="100%"
									display="flex"
									justifyContent="center"
									alignItems="center"
								>
									<Typography fontSize={15} color={BASE_COLOR_LIGHT}>
										No recent claims
									</Typography>
								</Box>
							) : (
								<Stack width="100%" spacing={0}>
									{recentChecklistClaims.map((claim, index) => (
										<Box
											key={`${claim.claim_id}-${claim.checklist_id}`}
											onClick={() => handleRowClick(claim.claim_id)}
											sx={{
												...styles.row,
												backgroundColor: index % 2 === 0 ? 'white' : '#FAFAFA',
											}}
										>
											{/* Main content */}
											<Stack width="100%" spacing={0.5}>
												{/* Top row: Claim number, LOB, Recovery Status */}
												<Box
													width="100%"
													display="flex"
													justifyContent="space-between"
													alignItems="center"
												>
													<Typography
														variant="body1"
														fontSize={15}
														// fontWeight={600}
														color="primary"
														sx={{
															cursor: 'pointer',
															'&:hover': { textDecoration: 'underline' },
														}}
														mr={1}
													>
														{claim.claim_number || 'N/A'}
													</Typography>

													{/* Status Dot */}
													<Box width="fit-content">
														<ClaimStatusCell row={{ status: claim.status }} fontSize={12} />
													</Box>
												</Box>

												{/* Middle row: Client & Insured */}
												<Box display="flex" alignItems="center" gap={1}>
													{claim.client && (
														<Typography variant="body2" fontSize={13} color="text.primary">
															{claim.client}
														</Typography>
													)}
													{claim.client && claim.insured && (
														<Box
															width={4}
															height={4}
															borderRadius="50%"
															bgcolor={BASE_COLOR_LIGHT}
														/>
													)}
													{claim.insured && (
														<Typography
															variant="body2"
															fontSize={13}
															color="text.secondary"
														>
															{claim.insured}
														</Typography>
													)}
												</Box>

												{/* Bottom row: Checklist name & Last opened */}
												<Box display="flex" alignItems="center" gap={1}>
													<Typography
														variant="caption"
														fontSize={12}
														color={BASE_COLOR_LIGHT}
														noWrap
													>
														{claim.checklist_name}
													</Typography>
													<Box
														width={4}
														height={4}
														borderRadius="50%"
														bgcolor={BASE_COLOR_LIGHT}
													/>
													<Typography
														variant="caption"
														fontSize={12}
														color={BASE_COLOR_LIGHT}
													>
														{claim.last_opened
															? dayjs(claim.last_opened).fromNow()
															: 'Never'}
													</Typography>
												</Box>
											</Stack>
										</Box>
									))}
								</Stack>
							)}
						</Box>

						{/* Footer */}
						{recentChecklistClaims.length > 0 && (
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
		// height: 'calc(100% - 110px)', // Account for header and footer
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
	row: {
		width: '100%',
		padding: '12px 16px',
		cursor: 'pointer',
		transition: 'all 0.2s ease',
		borderBottom: '1px solid #f0f0f0',
		'&:hover': {
			backgroundColor: '#F0F7F5 !important',
			transform: 'translateX(4px)',
		},
		'&:last-child': {
			borderBottom: 'none',
		},
	},
	lobChip: {
		height: 20,
		fontSize: 11,
		color: 'white',
		fontWeight: 500,
		border: `1px solid ${theme.palette.primary.main}`,
	},
	recoveryChip: {
		height: 20,
		fontSize: 11,
		color: 'white',
		fontWeight: 500,
		border: `1px solid ${theme.palette.secondary.main}`,
	},
};
