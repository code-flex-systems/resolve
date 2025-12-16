'use client';

import { Box, Button, Chip, Divider, Paper, Skeleton, Stack, Typography } from '@mui/material';
import AddBox from '@mui/icons-material/AddBox';
import Business from '@mui/icons-material/Business';
import Edit from '@mui/icons-material/Edit';
import Archive from '@mui/icons-material/Archive';
import { useState } from 'react';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { useLiabilityTrpc } from '@/hooks/trpc/useLiabilityTrpc';
import Highlight from '@/components/common/Highlight';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { LineOfBusinessValue, LossTypeValue, ClaimPartyRoleValue } from '@/components/common/ReferenceDataSelect';
import { formatCityState } from '@/schemas/addressSchemas';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import PartyLiabilityFormDialog from './PartyLiabilityFormDialog';
import LiabilityFormDialog from './LiabilityFormDialog';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import BasicDialog from '@/components/common/BasicDialog';
import { useAlertStore } from '@/stores/useAlertStore';
import { PartyType } from '@/config/enums';

dayjs.extend(relativeTime);

interface PartyLiabilityTabProps {
	claimId: number;
}

export default function PartyLiabilityTab({ claimId }: PartyLiabilityTabProps) {
	const [showPartyDialog, setShowPartyDialog] = useState(false);
	const [editingClaimParty, setEditingClaimParty] = useState<any | null>(null);
	const [showLiabilityDialog, setShowLiabilityDialog] = useState(false);
	const [editingLiability, setEditingLiability] = useState<any | null>(null);
	const [selectedClaimPartyId, setSelectedClaimPartyId] = useState<number | null>(null);
	const [archivingLiability, setArchivingLiability] = useState<{ id: number; lossType: string | null } | null>(null);

	const showAlert = useAlertStore((state) => state.showAlert);
	const partyTrpc = usePartyTrpc();
	const liabilityTrpc = useLiabilityTrpc();
	// Filter to only Facilitator-type parties (adverse carriers, attorneys, experts, vendors)
	const { data: claimParties = [], isLoading } = partyTrpc.listClaimParties(
		{ claimId, partyType: PartyType.FACILITATOR },
		{ enabled: !!claimId }
	);
	const linkPartyMutation = partyTrpc.linkToClaim;
	const updatePartyMutation = partyTrpc.updateClaimParty;
	const createLiabilityMutation = liabilityTrpc.create;
	const updateLiabilityMutation = liabilityTrpc.update;
	const deleteLiabilityMutation = liabilityTrpc.delete;

	const handleOpenPartyDialog = (claimParty?: any) => {
		if (claimParty) {
			setEditingClaimParty(claimParty);
		} else {
			setEditingClaimParty(null);
		}
		setShowPartyDialog(true);
	};

	const handleClosePartyDialog = () => {
		setShowPartyDialog(false);
		setEditingClaimParty(null);
	};

	const handleOpenLiabilityDialog = (claimPartyId: number, liability?: any) => {
		setSelectedClaimPartyId(claimPartyId);
		if (liability) {
			setEditingLiability(liability);
		} else {
			setEditingLiability(null);
		}
		setShowLiabilityDialog(true);
	};

	const handleCloseLiabilityDialog = () => {
		setShowLiabilityDialog(false);
		setEditingLiability(null);
		setSelectedClaimPartyId(null);
	};

	const handlePartySubmit = async (data: {
		role: string;
		party_id: number;
		representative_id?: number | null;
		liability_percentage?: number | null;
		notes?: string | null;
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
						notes: data.notes ?? undefined,
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
					notes: data.notes ?? undefined,
				});
			}
			handleClosePartyDialog();
		} catch (error) {
			console.error('Failed to save party:', error);
		}
	};

	// Note: liability_percentage is now on claim_party, not claim_liability
	// amount_paid replaces amount_paid; reserved_recovery removed (reserved is on coverage)
	const handleLiabilitySubmit = async (data: {
		claim_party_id: number;
		loss_type?: string | null;
		coverage_amount?: number | null;
		line_of_business?: string | null;
		amount_paid?: number | null;
		notes?: string | null;
	}) => {
		try {
			if (editingLiability) {
				// Update existing liability
				await updateLiabilityMutation.mutateAsync({
					id: editingLiability.id,
					params: {
						loss_type: data.loss_type as import('@/config/enums').LossType | undefined,
						coverage_amount: data.coverage_amount ?? undefined,
						line_of_business: data.line_of_business as import('@/config/enums').LineOfBusiness | undefined,
						amount_paid: data.amount_paid ?? undefined,
						notes: data.notes ?? undefined,
					},
				});
			} else {
				// Create new liability
				await createLiabilityMutation.mutateAsync({
					claim_party_id: data.claim_party_id,
					loss_type: data.loss_type as import('@/config/enums').LossType | undefined,
					coverage_amount: data.coverage_amount ?? undefined,
					line_of_business: data.line_of_business as import('@/config/enums').LineOfBusiness | undefined,
					amount_paid: data.amount_paid ?? undefined,
					notes: data.notes ?? undefined,
				});
			}
			handleCloseLiabilityDialog();
		} catch (error) {
			console.error('Failed to save liability:', error);
		}
	};

	const handleArchiveLiability = async () => {
		if (!archivingLiability) return;

		try {
			await deleteLiabilityMutation.mutateAsync({ id: archivingLiability.id });
			showAlert('Liability archived successfully', 'success');
			setArchivingLiability(null);
		} catch (error: any) {
			const message = error?.message || 'Failed to archive liability';
			showAlert(message, 'error');
			setArchivingLiability(null);
		}
	};

	// Calculate totals - liability_percentage is now on claim_party, not claim_liability
	const totalLiability = claimParties.reduce((sum, cp) => {
		const partyLiability = cp.liability_percentage ? parseFloat(cp.liability_percentage.toString()) : 0;
		return sum + partyLiability;
	}, 0);

	const totalCoverage = claimParties.reduce((sum, cp) => {
		const partyCoverageSum = (cp.liabilities || []).reduce((coverageSum: number, liability: any) => {
			const amount = liability.coverage_amount ? parseFloat(liability.coverage_amount.toString()) : 0;
			return coverageSum + amount;
		}, 0);
		return sum + partyCoverageSum;
	}, 0);

	const totalPaidRecovery = claimParties.reduce((sum, cp) => {
		const partyPaidSum = (cp.liabilities || []).reduce((paidSum: number, liability: any) => {
			const amount = liability.amount_paid ? parseFloat(liability.amount_paid.toString()) : 0;
			return paidSum + amount;
		}, 0);
		return sum + partyPaidSum;
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
								Total Paid
							</Typography>
							<Typography variant="body2" fontSize={11} color="text.secondary" marginBottom={1}>
								Sum of paid across liabilities
							</Typography>
							<Typography variant="h6" fontSize={18} color="success.main">
								{formatCurrencyExact(totalPaidRecovery)}
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
							onClick={() => handleOpenPartyDialog()}
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
															label={
																<ClaimPartyRoleValue
																	value={claimParty.role}
																	showEmoji={false}
																	fontSize={12}
																/>
															}
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
															{(claimParty.office.city || claimParty.office.state) &&
																` - ${formatCityState(claimParty.office.city, claimParty.office.state)}`}
														</Typography>
													)}

													{/* Liability Percentage (now on claim_party) */}
													{claimParty.liability_percentage != null && (
														<Box marginTop={1} marginBottom={0.5}>
															<Chip
																label={`Liability: ${parseFloat(claimParty.liability_percentage.toString()).toFixed(2)}%`}
																size="small"
																color="warning"
															/>
														</Box>
													)}

													{/* Liabilities Section */}
													<Box marginTop={2}>
														<Box
															display="flex"
															justifyContent="space-between"
															alignItems="center"
															marginBottom={1}
														>
															<Typography
																fontSize={13}
																fontWeight={600}
																color={BASE_COLOR_LIGHT}
															>
																Liabilities ({(claimParty.liabilities || []).length})
															</Typography>
															<Button
																size="small"
																startIcon={<AddBox />}
																variant="outlined"
																onClick={() => handleOpenLiabilityDialog(claimParty.id)}
															>
																Add Liability
															</Button>
														</Box>

														{(claimParty.liabilities || []).length === 0 && (
															<Typography
																fontSize={12}
																color="text.secondary"
																fontStyle="italic"
																marginY={1}
															>
																No liabilities added yet
															</Typography>
														)}

														{(claimParty.liabilities || []).length > 0 && (
															<Stack spacing={1.5} marginTop={1}>
																{claimParty.liabilities.map((liability: any) => (
																	<Paper
																		key={liability.id}
																		variant="outlined"
																		sx={{
																			padding: 2,
																			backgroundColor: 'background.default',
																		}}
																	>
																		<Box
																			display="flex"
																			justifyContent="space-between"
																			alignItems="flex-start"
																		>
																			<Box flex={1}>
																				{/* Loss Type */}
																				{liability.loss_type && (
																					<Box
																						display="flex"
																						alignItems="center"
																						gap={1}
																						marginBottom={1}
																					>
																						<LossTypeValue
																							value={liability.loss_type}
																							fontSize={14}
																							sx={{ fontWeight: 600 }}
																						/>
																					</Box>
																				)}

																				{/* Liability Details */}
																				<Box
																					display="flex"
																					gap={1}
																					marginBottom={0.5}
																					flexWrap="wrap"
																				>
																					{liability.coverage_amount && (
																						<Chip
																							label={`Coverage: ${formatCurrencyExact(parseFloat(liability.coverage_amount.toString()))}`}
																							size="small"
																							color="success"
																						/>
																					)}
																					{liability.line_of_business && (
																						<Chip
																							label={
																								<LineOfBusinessValue
																									value={
																										liability.line_of_business
																									}
																									showEmoji={false}
																									fontSize={12}
																								/>
																							}
																							size="small"
																							color="primary"
																							variant="outlined"
																						/>
																					)}
																					{liability.amount_paid && (
																						<Chip
																							label={`Paid: ${formatCurrencyExact(parseFloat(liability.amount_paid.toString()))}`}
																							size="small"
																							color="info"
																							variant="outlined"
																						/>
																					)}
																				</Box>

																				{/* Liability Notes */}
																				{liability.notes && (
																					<Typography
																						fontSize={12}
																						color="text.secondary"
																						marginTop={0.5}
																					>
																						{liability.notes}
																					</Typography>
																				)}
																			</Box>

																			{/* Liability Actions */}
																			<Box display="flex" gap={0.5}>
																				<BasicButtonStyled
																					buttonProps={{
																						onClick: () =>
																							handleOpenLiabilityDialog(
																								claimParty.id,
																								liability
																							),
																					}}
																					tooltipProps={{
																						title: 'Edit liability',
																					}}
																					icon={<Edit />}
																				/>
																				<BasicButtonStyled
																					buttonProps={{
																						onClick: () =>
																							setArchivingLiability({
																								id: liability.id,
																								lossType:
																									liability.loss_type,
																							}),
																					}}
																					tooltipProps={{
																						title: 'Archive liability',
																					}}
																					icon={
																						<Archive
																							sx={{ color: 'error.main' }}
																						/>
																					}
																				/>
																			</Box>
																		</Box>
																	</Paper>
																))}
															</Stack>
														)}
													</Box>

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

												{/* Edit Party Button */}
												<BasicButtonStyled
													buttonProps={{
														onClick: () => handleOpenPartyDialog(claimParty),
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

			{/* Party Dialog */}
			<PartyLiabilityFormDialog
				open={showPartyDialog}
				onClose={handleClosePartyDialog}
				onSubmit={handlePartySubmit}
				editingClaimParty={editingClaimParty}
				currentClaimParties={claimParties}
				isSubmitting={linkPartyMutation.isPending || updatePartyMutation.isPending}
				partyTypeFilter={PartyType.FACILITATOR}
			/>

			{/* Liability Dialog */}
			{selectedClaimPartyId && (
				<LiabilityFormDialog
					open={showLiabilityDialog}
					onClose={handleCloseLiabilityDialog}
					onSubmit={handleLiabilitySubmit}
					claimPartyId={selectedClaimPartyId}
					editingLiability={editingLiability}
					currentLiabilities={claimParties.find((cp) => cp.id === selectedClaimPartyId)?.liabilities || []}
					isSubmitting={
						createLiabilityMutation.isPending ||
						updateLiabilityMutation.isPending ||
						deleteLiabilityMutation.isPending
					}
				/>
			)}

			{/* Archive Confirmation Dialog */}
			{archivingLiability && (
				<BasicDialog
					title="Archive Liability"
					primaryAction={{
						label: 'Archive',
						onClick: handleArchiveLiability,
						color: 'error',
					}}
					secondaryActions={[
						{
							label: 'Cancel',
							onClick: () => setArchivingLiability(null),
						},
					]}
					onClose={() => setArchivingLiability(null)}
					width={500}
				>
					<Typography fontStyle="italic" fontWeight="bold" marginBottom={1}>
						Are you sure you want to archive this liability?
					</Typography>
					{archivingLiability.lossType && (
						<Box display="flex" alignItems="center" gap={1} marginBottom={2}>
							<Typography fontSize={13} color="text.secondary">
								Loss Type:
							</Typography>
							<LossTypeValue value={archivingLiability.lossType} fontSize={13} />
						</Box>
					)}
					<Typography paddingTop="10px" fontStyle="italic" color="text.secondary">
						The liability will be archived and hidden from view, but the record will be preserved for
						traceability.
					</Typography>
				</BasicDialog>
			)}
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
