'use client';

import { Box, Button, Chip, Divider, Paper, Skeleton, Stack, Typography } from '@mui/material';
import AddBox from '@mui/icons-material/AddBox';
import Person from '@mui/icons-material/Person';
import Edit from '@mui/icons-material/Edit';
import Archive from '@mui/icons-material/Archive';
import { useState } from 'react';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { useCoverageTrpc } from '@/hooks/trpc/useCoverageTrpc';
import Highlight from '@/components/common/Highlight';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { ClaimPartyRoleValue, EntityCategoryValue } from '@/components/common/ReferenceDataSelect';
import { formatCoverageType } from '@/lib/utils/claimUtils';
import { formatCityState } from '@/schemas/addressSchemas';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import PartyLiabilityFormDialog from './PartyLiabilityFormDialog';
import CoverageFormDialog from '../../coverage/CoverageFormDialog';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import BasicDialog from '@/components/common/BasicDialog';
import { useAlertStore } from '@/stores/useAlertStore';
import { PartyType } from '@/config/enums';

dayjs.extend(relativeTime);

interface ClaimantsCoverageTabProps {
	claimId: number;
}

export default function ClaimantsCoverageTab({ claimId }: ClaimantsCoverageTabProps) {
	const [showPartyDialog, setShowPartyDialog] = useState(false);
	const [editingClaimParty, setEditingClaimParty] = useState<any | null>(null);
	const [showCoverageDialog, setShowCoverageDialog] = useState(false);
	const [editingCoverage, setEditingCoverage] = useState<any | null>(null);
	const [selectedClaimPartyId, setSelectedClaimPartyId] = useState<number | null>(null);
	const [archivingCoverage, setArchivingCoverage] = useState<{ id: number; coverageType: string | null } | null>(null);

	const showAlert = useAlertStore((state) => state.showAlert);
	const partyTrpc = usePartyTrpc();
	const coverageTrpc = useCoverageTrpc();

	// Only fetch Entity-type parties (claimants, responsible parties, witnesses, property owners)
	const { data: claimParties = [], isLoading } = partyTrpc.listClaimParties(
		{ claimId, partyType: PartyType.ENTITY },
		{ enabled: !!claimId }
	);

	const linkPartyMutation = partyTrpc.linkToClaim;
	const updatePartyMutation = partyTrpc.updateClaimParty;
	const createCoverageMutation = coverageTrpc.create;
	const updateCoverageMutation = coverageTrpc.update;
	const archiveCoverageMutation = coverageTrpc.archive;

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

	const handleOpenCoverageDialog = (claimPartyId: number, coverage?: any) => {
		setSelectedClaimPartyId(claimPartyId);
		if (coverage) {
			setEditingCoverage(coverage);
		} else {
			setEditingCoverage(null);
		}
		setShowCoverageDialog(true);
	};

	const handleCloseCoverageDialog = () => {
		setShowCoverageDialog(false);
		setEditingCoverage(null);
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

	const handleCoverageSubmit = async (data: {
		coverage_type: string;
		coverage_amount: string | null;
		amount_reserved: string | null;
	}) => {
		try {
			if (!selectedClaimPartyId) return;

			if (editingCoverage) {
				// Update existing coverage
				await updateCoverageMutation.mutateAsync({
					id: editingCoverage.id,
					coverage_type: data.coverage_type,
					coverage_amount: data.coverage_amount ? parseFloat(data.coverage_amount) : null,
					amount_reserved: data.amount_reserved ? parseFloat(data.amount_reserved) : null,
				});
			} else {
				// Create new coverage
				await createCoverageMutation.mutateAsync({
					claim_id: claimId,
					claim_party_id: selectedClaimPartyId,
					coverage_type: data.coverage_type,
					coverage_amount: data.coverage_amount ? parseFloat(data.coverage_amount) : null,
					amount_reserved: data.amount_reserved ? parseFloat(data.amount_reserved) : null,
				});
			}
			handleCloseCoverageDialog();
		} catch (error) {
			console.error('Failed to save coverage:', error);
		}
	};

	const handleArchiveCoverage = async () => {
		if (!archivingCoverage) return;

		try {
			await archiveCoverageMutation.mutateAsync({ id: archivingCoverage.id });
			showAlert('Coverage archived successfully', 'success');
			setArchivingCoverage(null);
		} catch (error: any) {
			const message = error?.message || 'Failed to archive coverage';
			showAlert(message, 'error');
			setArchivingCoverage(null);
		}
	};

	// Calculate totals from coverages
	const totalCoverageAmount = claimParties.reduce((sum, cp) => {
		const partyCoverageSum = (cp.coverages || []).reduce((coverageSum: number, coverage: any) => {
			const amount = coverage.coverage_amount ? parseFloat(coverage.coverage_amount.toString()) : 0;
			return coverageSum + amount;
		}, 0);
		return sum + partyCoverageSum;
	}, 0);

	const totalAmountReserved = claimParties.reduce((sum, cp) => {
		const partyReservedSum = (cp.coverages || []).reduce((reservedSum: number, coverage: any) => {
			const amount = coverage.amount_reserved ? parseFloat(coverage.amount_reserved.toString()) : 0;
			return reservedSum + amount;
		}, 0);
		return sum + partyReservedSum;
	}, 0);

	return (
		<Box p={3}>
			<Stack spacing={3} maxWidth={1000} mx="auto">
				{/* Summary */}
				<Paper elevation={0} sx={styles.paper}>
					<Typography fontSize={13} color={BASE_COLOR_LIGHT} marginBottom={2}>
						Coverage Summary
					</Typography>
					<Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={2}>
						<Box>
							<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={0.5}>
								Total Coverage Amount
							</Typography>
							<Typography variant="body2" fontSize={11} color="text.secondary" marginBottom={1}>
								Sum of all party coverage limits
							</Typography>
							<Typography variant="h6" fontSize={18} color="primary.main">
								{formatCurrencyExact(totalCoverageAmount)}
							</Typography>
						</Box>
						<Box>
							<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={0.5}>
								Total Amount Reserved
							</Typography>
							<Typography variant="body2" fontSize={11} color="text.secondary" marginBottom={1}>
								Sum of all reserved amounts
							</Typography>
							<Typography variant="h6" fontSize={18} color="warning.main">
								{formatCurrencyExact(totalAmountReserved)}
							</Typography>
						</Box>
						<Box>
							<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={0.5}>
								Linked Parties
							</Typography>
							<Typography variant="body2" fontSize={11} color="text.secondary" marginBottom={1}>
								Claimants and other entities
							</Typography>
							<Typography variant="h6" fontSize={18} color="success.main">
								{claimParties.length}
							</Typography>
						</Box>
					</Box>
				</Paper>

				{/* Party List */}
				<Paper elevation={0} sx={styles.paper}>
					<Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={2}>
						<Typography fontSize={13} color={BASE_COLOR_LIGHT}>
							Claimants & Entities ({claimParties.length})
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
						<Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" padding={4}>
							<Person sx={{ fontSize: 48, color: BASE_COLOR_LIGHT, marginBottom: 1 }} />
							<Typography fontSize={13} color={BASE_COLOR_LIGHT} fontStyle="italic">
								No claimants or entities linked yet
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
														{claimParty.party?.party_category && (
															<Chip
																label={
																	<EntityCategoryValue
																		value={claimParty.party.party_category}
																		showEmoji={false}
																		fontSize={12}
																	/>
																}
																size="small"
																color="secondary"
																variant="outlined"
															/>
														)}
													</Box>

													{/* Party Organization */}
													{claimParty.party?.organization && (
														<Typography fontSize={13} marginBottom={0.5} color="text.secondary">
															Organization: <Highlight>{claimParty.party.organization}</Highlight>
														</Typography>
													)}

													{/* Party Contact Info */}
													{(claimParty.party?.email || claimParty.party?.phone) && (
														<Box display="flex" gap={2} marginBottom={0.5}>
															{claimParty.party?.email && (
																<Typography fontSize={12} color="text.secondary">
																	{claimParty.party.email}
																</Typography>
															)}
															{claimParty.party?.phone && (
																<Typography fontSize={12} color="text.secondary">
																	{claimParty.party.phone}
																</Typography>
															)}
														</Box>
													)}

													{/* Representative */}
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
															</Typography>
														</Box>
													)}

													{/* Office */}
													{claimParty.office && (
														<Typography fontSize={13} marginBottom={0.5}>
															Office: <Highlight>{claimParty.office.office_name}</Highlight>
															{(claimParty.office.city || claimParty.office.state) &&
																` - ${formatCityState(claimParty.office.city, claimParty.office.state)}`}
														</Typography>
													)}

													{/* Coverages Section */}
													<Box marginTop={2}>
														<Box
															display="flex"
															justifyContent="space-between"
															alignItems="center"
															marginBottom={1}
														>
															<Typography fontSize={13} fontWeight={600} color={BASE_COLOR_LIGHT}>
																Coverages ({(claimParty.coverages || []).length})
															</Typography>
															<Button
																size="small"
																startIcon={<AddBox />}
																variant="outlined"
																onClick={() => handleOpenCoverageDialog(claimParty.id)}
															>
																Add Coverage
															</Button>
														</Box>

														{(claimParty.coverages || []).length === 0 && (
															<Typography
																fontSize={12}
																color="text.secondary"
																fontStyle="italic"
																marginY={1}
															>
																No coverages added yet
															</Typography>
														)}

														{(claimParty.coverages || []).length > 0 && (
															<Stack spacing={1.5} marginTop={1}>
																{claimParty.coverages.map((coverage: any) => (
																	<Paper
																		key={coverage.id}
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
																				{/* Coverage Type */}
																				<Typography
																					fontSize={14}
																					fontWeight={600}
																					marginBottom={1}
																				>
																					{formatCoverageType(coverage.coverage_type)}
																				</Typography>

																				{/* Coverage Details */}
																				<Box
																					display="flex"
																					gap={1}
																					marginBottom={0.5}
																					flexWrap="wrap"
																				>
																					{coverage.coverage_amount && (
																						<Chip
																							label={`Limit: ${formatCurrencyExact(parseFloat(coverage.coverage_amount.toString()))}`}
																							size="small"
																							color="primary"
																						/>
																					)}
																					{coverage.amount_reserved && (
																						<Chip
																							label={`Reserved: ${formatCurrencyExact(parseFloat(coverage.amount_reserved.toString()))}`}
																							size="small"
																							color="warning"
																							variant="outlined"
																						/>
																					)}
																				</Box>
																			</Box>

																			{/* Coverage Actions */}
																			<Box display="flex" gap={0.5}>
																				<BasicButtonStyled
																					buttonProps={{
																						onClick: () =>
																							handleOpenCoverageDialog(
																								claimParty.id,
																								coverage
																							),
																					}}
																					tooltipProps={{
																						title: 'Edit coverage',
																					}}
																					icon={<Edit />}
																				/>
																				<BasicButtonStyled
																					buttonProps={{
																						onClick: () =>
																							setArchivingCoverage({
																								id: coverage.id,
																								coverageType: coverage.coverage_type,
																							}),
																					}}
																					tooltipProps={{
																						title: 'Archive coverage',
																					}}
																					icon={<Archive sx={{ color: 'error.main' }} />}
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

			{/* Party Dialog - filtered to Entity types only */}
			<PartyLiabilityFormDialog
				open={showPartyDialog}
				onClose={handleClosePartyDialog}
				onSubmit={handlePartySubmit}
				editingClaimParty={editingClaimParty}
				currentClaimParties={claimParties}
				isSubmitting={linkPartyMutation.isPending || updatePartyMutation.isPending}
				partyTypeFilter={PartyType.ENTITY}
			/>

			{/* Coverage Dialog */}
			{selectedClaimPartyId && (
				<CoverageFormDialog
					open={showCoverageDialog}
					onClose={handleCloseCoverageDialog}
					onSubmit={handleCoverageSubmit}
					editingCoverage={editingCoverage}
					isSubmitting={createCoverageMutation.isPending || updateCoverageMutation.isPending}
				/>
			)}

			{/* Archive Confirmation Dialog */}
			{archivingCoverage && (
				<BasicDialog
					title="Archive Coverage"
					primaryAction={{
						label: 'Archive',
						onClick: handleArchiveCoverage,
						color: 'error',
					}}
					secondaryActions={[
						{
							label: 'Cancel',
							onClick: () => setArchivingCoverage(null),
						},
					]}
					onClose={() => setArchivingCoverage(null)}
					width={500}
				>
					<Typography fontStyle="italic" fontWeight="bold" marginBottom={1}>
						Are you sure you want to archive this coverage?
					</Typography>
					{archivingCoverage.coverageType && (
						<Box display="flex" alignItems="center" gap={1} marginBottom={2}>
							<Typography fontSize={13} color="text.secondary">
								Coverage Type:
							</Typography>
							<Typography fontSize={13}>{formatCoverageType(archivingCoverage.coverageType)}</Typography>
						</Box>
					)}
					<Typography paddingTop="10px" fontStyle="italic" color="text.secondary">
						The coverage will be archived and hidden from view, but the record will be preserved for
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
