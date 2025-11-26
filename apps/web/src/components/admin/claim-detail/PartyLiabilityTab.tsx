'use client';

import { Box, Button, Chip, Divider, Paper, Skeleton, Stack, Typography, IconButton } from '@mui/material';
import AddBox from '@mui/icons-material/AddBox';
import Business from '@mui/icons-material/Business';
import Edit from '@mui/icons-material/Edit';
import { useState } from 'react';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import Highlight from '@/components/common/Highlight';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { formatClaimPartyRole } from '@/lib/utils/partyUtils';
import { formatLineOfBusiness, formatLiabilityCoverageType } from '@/lib/utils/claimUtils';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import PartyLiabilityFormDialog from './PartyLiabilityFormDialog';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';

dayjs.extend(relativeTime);

interface PartyLiabilityTabProps {
	claimId: number;
}

export default function PartyLiabilityTab({ claimId }: PartyLiabilityTabProps) {
	const [showDialog, setShowDialog] = useState(false);
	const [editingClaimParty, setEditingClaimParty] = useState<any | null>(null);

	const partyTrpc = usePartyTrpc();
	const { data: claimParties = [], isLoading } = partyTrpc.listClaimParties({ claimId }, { enabled: !!claimId });
	const linkPartyMutation = partyTrpc.linkToClaim;
	const updatePartyMutation = partyTrpc.updateClaimParty;

	const handleOpenDialog = (claimParty?: any) => {
		if (claimParty) {
			setEditingClaimParty(claimParty);
		} else {
			setEditingClaimParty(null);
		}
		setShowDialog(true);
	};

	const handleCloseDialog = () => {
		setShowDialog(false);
		setEditingClaimParty(null);
	};

	const handleSubmit = async (data: {
		role: string;
		party_id: number;
		representative_id?: number | null;
		liability_percentage?: number | null;
		coverage_amount?: string | null;
		notes?: string | null;
		line_of_business?: string | null;
		coverage_type?: string | null;
		paid_recovery?: number | null;
		reserved_recovery?: number | null;
	}) => {
		try {
			if (editingClaimParty) {
				// Update existing claim party
				await updatePartyMutation.mutateAsync({
					id: editingClaimParty.id,
					params: {
						role: data.role as import('@/config/enums').ClaimPartyRole,
						representative_id: data.representative_id ?? undefined,
						liability_percentage: data.liability_percentage ?? undefined,
						coverage_amount: data.coverage_amount ? parseFloat(data.coverage_amount) : undefined,
						notes: data.notes ?? undefined,
						line_of_business: data.line_of_business ?? undefined,
						coverage_type: data.coverage_type ?? undefined,
						paid_recovery: data.paid_recovery ?? undefined,
						reserved_recovery: data.reserved_recovery ?? undefined,
					},
				});
			} else {
				// Link new party to claim
				await linkPartyMutation.mutateAsync({
					claim_id: claimId,
					party_id: data.party_id,
					role: data.role as import('@/config/enums').ClaimPartyRole,
					representative_id: data.representative_id ?? undefined,
					liability_percentage: data.liability_percentage ?? undefined,
					coverage_amount: data.coverage_amount ? parseFloat(data.coverage_amount) : undefined,
					notes: data.notes ?? undefined,
					line_of_business: data.line_of_business ?? undefined,
					coverage_type: data.coverage_type ?? undefined,
					paid_recovery: data.paid_recovery ?? undefined,
					reserved_recovery: data.reserved_recovery ?? undefined,
				});
			}
			handleCloseDialog();
		} catch (error) {
			console.error('Failed to save party liability:', error);
		}
	};

	// Calculate totals
	const totalLiability = claimParties.reduce(
		(sum, cp) => sum + (cp.liability_percentage ? parseFloat(cp.liability_percentage.toString()) : 0),
		0
	);

	const totalCoverage = claimParties.reduce((sum, cp) => {
		const amount = cp.coverage_amount ? parseFloat(cp.coverage_amount.toString()) : 0;
		return sum + amount;
	}, 0);

	const totalPaidRecovery = claimParties.reduce((sum, cp) => {
		const amount = cp.paid_recovery ? parseFloat(cp.paid_recovery.toString()) : 0;
		return sum + amount;
	}, 0);

	const totalReservedRecovery = claimParties.reduce((sum, cp) => {
		const amount = cp.reserved_recovery ? parseFloat(cp.reserved_recovery.toString()) : 0;
		return sum + amount;
	}, 0);

	return (
		<Box p={3}>
			<Stack spacing={3} maxWidth={1000} mx="auto">
				{/* Summary */}
				<Paper elevation={0} sx={styles.paper}>
					<Typography fontSize={13} color={BASE_COLOR_LIGHT} marginBottom={2}>
						Liability Summary
					</Typography>
					<Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={2}>
						<Box>
							<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={0.5}>
								Total Coverage Amount
							</Typography>
							<Typography variant="body2" fontSize={11} color="text.secondary" marginBottom={1}>
								Sum of all party coverage amounts
							</Typography>
							<Typography variant="h6" fontSize={18} color="primary.main">
								{formatCurrencyExact(totalCoverage)}
							</Typography>
						</Box>
						<Box>
							<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={0.5}>
								Total Liability Percentage
							</Typography>
							<Typography variant="body2" fontSize={11} color="text.secondary" marginBottom={1}>
								Sum of all party liability percentages
							</Typography>
							<Typography variant="h6" fontSize={18} color="warning.main">
								{totalLiability.toFixed(2)}%
							</Typography>
						</Box>
						<Box>
							<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={0.5}>
								Total Paid Recovery
							</Typography>
							<Typography variant="body2" fontSize={11} color="text.secondary" marginBottom={1}>
								Sum of paid recovery across liabilities
							</Typography>
							<Typography variant="h6" fontSize={18} color="success.main">
								{formatCurrencyExact(totalPaidRecovery)}
							</Typography>
						</Box>
						<Box>
							<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={0.5}>
								Total Reserved Recovery
							</Typography>
							<Typography variant="body2" fontSize={11} color="text.secondary" marginBottom={1}>
								Sum of reserved recovery across liabilities
							</Typography>
							<Typography variant="h6" fontSize={18} color="info.main">
								{formatCurrencyExact(totalReservedRecovery)}
							</Typography>
						</Box>
					</Box>
				</Paper>

				{/* Party List */}
				<Paper elevation={0} sx={styles.paper}>
					<Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={2}>
						<Typography fontSize={13} color={BASE_COLOR_LIGHT}>
							Linked Parties ({claimParties.length})
						</Typography>
						<Button
							size="small"
							startIcon={<AddBox />}
							variant="contained"
							onClick={() => handleOpenDialog()}
						>
							Add Party
						</Button>
					</Box>

					{isLoading && (
						<Stack spacing={2}>
							<Skeleton variant="rectangular" height={80} />
							<Skeleton variant="rectangular" height={80} />
						</Stack>
					)}

					{!isLoading && claimParties.length === 0 && (
						<Box
							display="flex"
							flexDirection="column"
							alignItems="center"
							justifyContent="center"
							padding={4}
						>
							<Business sx={{ fontSize: 48, color: BASE_COLOR_LIGHT, marginBottom: 1 }} />
							<Typography fontSize={13} color={BASE_COLOR_LIGHT} fontStyle="italic">
								No parties linked yet
							</Typography>
						</Box>
					)}

					{!isLoading && claimParties.length > 0 && (
						<Stack spacing={2}>
							{claimParties.map((claimParty, index) => (
								<Box key={claimParty.id}>
									<Box display="flex" gap={2}>
										<Box
											sx={{
												width: 8,
												height: 8,
												borderRadius: '50%',
												bgcolor: 'primary.main',
												marginTop: '6px',
												flexShrink: 0,
											}}
										/>
										<Box flex={1}>
											<Box display="flex" justifyContent="space-between" alignItems="flex-start">
												<Box flex={1}>
													{/* Party Name and Role */}
													<Box display="flex" alignItems="center" gap={1} marginBottom={0.5}>
														<Typography fontSize={16} fontWeight={600}>
															{claimParty.party?.name || 'Unknown Party'}
														</Typography>
														<Chip
															label={formatClaimPartyRole(claimParty.role)}
															size="small"
															color="primary"
															variant="outlined"
														/>
													</Box>

													{/* Party Organization */}
													{claimParty.party?.organization && (
														<Typography
															fontSize={13}
															marginBottom={0.5}
															color="text.secondary"
														>
															Organization:{' '}
															<Highlight>{claimParty.party.organization}</Highlight>
														</Typography>
													)}

													{/* Party Contact Info */}
													{(claimParty.party?.email || claimParty.party?.phone) && (
														<Box display="flex" gap={2} marginBottom={0.5}>
															{claimParty.party?.email && (
																<Typography fontSize={12} color="text.secondary">
																	✉️ {claimParty.party.email}
																</Typography>
															)}
															{claimParty.party?.phone && (
																<Typography fontSize={12} color="text.secondary">
																	📞 {claimParty.party.phone}
																</Typography>
															)}
														</Box>
													)}

													{/* Representative with inline contact info */}
													{claimParty.representative && (
														<Box marginBottom={0.5}>
															<Typography fontSize={13} display="inline">
																Representative:{' '}
																<Highlight>
																	{claimParty.representative.first_name}{' '}
																	{claimParty.representative.last_name}
																</Highlight>
																{claimParty.representative.title &&
																	` - ${claimParty.representative.title}`}
																{(claimParty.representative.email ||
																	claimParty.representative.phone) && (
																	<>
																		{' '}
																		<Typography
																			component="span"
																			fontSize={12}
																			color="text.secondary"
																		>
																			(
																			{claimParty.representative.email && (
																				<>
																					✉️ {claimParty.representative.email}
																				</>
																			)}
																			{claimParty.representative.email &&
																				claimParty.representative.phone &&
																				' • '}
																			{claimParty.representative.phone && (
																				<>
																					📞 {claimParty.representative.phone}
																				</>
																			)}
																			)
																		</Typography>
																	</>
																)}
															</Typography>
														</Box>
													)}

													{/* Office */}
													{claimParty.office && (
														<Typography fontSize={13} marginBottom={0.5}>
															Office:{' '}
															<Highlight>{claimParty.office.office_name}</Highlight>
															{claimParty.office.address &&
																` - ${claimParty.office.address}`}
														</Typography>
													)}

													{/* Liability & Coverage */}
													<Box display="flex" gap={1} marginTop={1} marginBottom={0.5} flexWrap="wrap">
														{claimParty.liability_percentage !== null && (
															<Chip
																label={`Liability: ${parseFloat(claimParty.liability_percentage.toString()).toFixed(2)}%`}
																size="small"
																color="warning"
															/>
														)}
														{claimParty.coverage_amount && (
															<Chip
																label={`Coverage: ${formatCurrencyExact(parseFloat(claimParty.coverage_amount.toString()))}`}
																size="small"
																color="success"
															/>
														)}
														{claimParty.line_of_business && (
															<Chip
																label={`LOB: ${formatLineOfBusiness(claimParty.line_of_business)}`}
																size="small"
																color="primary"
																variant="outlined"
															/>
														)}
														{claimParty.coverage_type && (
															<Chip
																label={`Type: ${formatLiabilityCoverageType(claimParty.coverage_type)}`}
																size="small"
																color="secondary"
																variant="outlined"
															/>
														)}
													</Box>

													{/* Recovery Tracking */}
													{(claimParty.paid_recovery || claimParty.reserved_recovery) && (
														<Box display="flex" gap={1} marginBottom={0.5} flexWrap="wrap">
															{claimParty.paid_recovery && (
																<Chip
																	label={`Paid: ${formatCurrencyExact(parseFloat(claimParty.paid_recovery.toString()))}`}
																	size="small"
																	color="success"
																	variant="outlined"
																/>
															)}
															{claimParty.reserved_recovery && (
																<Chip
																	label={`Reserved: ${formatCurrencyExact(parseFloat(claimParty.reserved_recovery.toString()))}`}
																	size="small"
																	color="info"
																	variant="outlined"
																/>
															)}
														</Box>
													)}

													{/* Notes */}
													{claimParty.notes && (
														<Typography fontSize={13} color="text.secondary" marginTop={1}>
															Notes: {claimParty.notes}
														</Typography>
													)}

													{/* Metadata */}
													<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginTop={1}>
														Linked {dayjs(claimParty.created_at).format('MMM D, YYYY')} (
														{dayjs(claimParty.created_at).fromNow()})
													</Typography>
												</Box>

												{/* Edit Button */}
												<BasicButtonStyled
													buttonProps={{
														onClick: () => handleOpenDialog(claimParty),
													}}
													icon={<Edit />}
												/>
											</Box>
										</Box>
									</Box>
									{index < claimParties.length - 1 && <Divider sx={{ marginTop: 2 }} />}
								</Box>
							))}
						</Stack>
					)}
				</Paper>
			</Stack>

			{/* Dialog */}
			<PartyLiabilityFormDialog
				open={showDialog}
				onClose={handleCloseDialog}
				onSubmit={handleSubmit}
				editingClaimParty={editingClaimParty}
				currentClaimParties={claimParties}
				isSubmitting={linkPartyMutation.isPending || updatePartyMutation.isPending}
			/>
		</Box>
	);
}

const styles = {
	paper: {
		padding: '20px',
		border: 1,
		borderColor: 'divider',
	},
};
