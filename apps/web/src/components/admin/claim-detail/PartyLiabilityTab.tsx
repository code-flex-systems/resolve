'use client';

import { Box, Button, Chip, Divider, IconButton, Paper, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import AddBox from '@mui/icons-material/AddBox';
import Business from '@mui/icons-material/Business';
import PersonAdd from '@mui/icons-material/PersonAdd';
import Edit from '@mui/icons-material/Edit';
import Archive from '@mui/icons-material/Archive';
import UnfoldMore from '@mui/icons-material/UnfoldMore';
import UnfoldLess from '@mui/icons-material/UnfoldLess';
import { useState, useMemo, useCallback } from 'react';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { useLiabilityTrpc } from '@/hooks/trpc/useLiabilityTrpc';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { BASE_COLOR_LIGHT, containerStyles } from '@/styles/theme';
import { LineOfBusinessChip, LossTypeValue } from '@/components/common/ReferenceDataSelect';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import PartyLinkingDialog from './PartyLinkingDialog';
import PartyDetailDialog from './PartyDetailDialog';
import LiabilityFormDialog from './LiabilityFormDialog';
import PartyCard from './PartyCard';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import BasicDialog from '@/components/common/BasicDialog';
import { useAlertStore } from '@/stores/useAlertStore';

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
	const [archivingClaimParty, setArchivingClaimParty] = useState<any | null>(null);
	const [isFacilitatorMode, setIsFacilitatorMode] = useState(false);
	const [parentClaimPartyId, setParentClaimPartyId] = useState<number | null>(null);
	const [allExpanded, setAllExpanded] = useState(true);
	const [viewingPartyDetails, setViewingPartyDetails] = useState<any | null>(null);

	const showAlert = useAlertStore((state) => state.showAlert);
	const partyTrpc = usePartyTrpc();
	const liabilityTrpc = useLiabilityTrpc();

	// Fetch parties with adverse_party_role roles
	const { data: claimParties = [], isLoading } = partyTrpc.listClaimParties(
		{ claimId, roleListEntity: 'adverse_party_role' },
		{ enabled: !!claimId }
	);

	// Group parties into entities (root) and facilitators (nested under parent)
	const { entities, facilitatorsByParent } = useMemo(() => {
		const entitiesArray: any[] = [];
		const facilitatorsMap: Record<number, any[]> = {};

		claimParties.forEach((cp) => {
			if (cp.parent_claim_party_id) {
				// This is a facilitator
				if (!facilitatorsMap[cp.parent_claim_party_id]) {
					facilitatorsMap[cp.parent_claim_party_id] = [];
				}
				facilitatorsMap[cp.parent_claim_party_id].push(cp);
			} else if (cp.party?.party_type === 'entity') {
				// This is a root-level entity
				entitiesArray.push(cp);
			} else {
				// Legacy facilitator without parent - treat as entity for display
				entitiesArray.push(cp);
			}
		});

		return { entities: entitiesArray, facilitatorsByParent: facilitatorsMap };
	}, [claimParties]);

	const linkPartyMutation = partyTrpc.linkToClaim;
	const updatePartyMutation = partyTrpc.updateClaimParty;
	const archiveClaimPartyMutation = partyTrpc.archiveClaimParty;
	const createLiabilityMutation = liabilityTrpc.create;
	const updateLiabilityMutation = liabilityTrpc.update;
	const deleteLiabilityMutation = liabilityTrpc.delete;

	// Compute archive preview from existing frontend data (no backend query needed)
	const archivePreview = useMemo(() => {
		if (!archivingClaimParty) return null;
		const facilitatorCount = facilitatorsByParent[archivingClaimParty.id]?.length ?? 0;
		const liabilityCount = archivingClaimParty.liabilities?.length ?? 0;
		return {
			facilitatorCount,
			liabilityCount,
			hasNestedElements: facilitatorCount > 0 || liabilityCount > 0,
		};
	}, [archivingClaimParty, facilitatorsByParent]);

	const handleOpenEntityDialog = (claimParty?: any) => {
		setIsFacilitatorMode(false);
		setParentClaimPartyId(null);
		if (claimParty) {
			setEditingClaimParty(claimParty);
		} else {
			setEditingClaimParty(null);
		}
		setShowPartyDialog(true);
	};

	const handleOpenFacilitatorDialog = (parentId?: number | null, claimParty?: any) => {
		setIsFacilitatorMode(true);
		setParentClaimPartyId(parentId || null);
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
		setIsFacilitatorMode(false);
		setParentClaimPartyId(null);
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
		parent_claim_party_id?: number | null;
	}) => {
		try {
			if (editingClaimParty) {
				// Update existing claim party
				await updatePartyMutation.mutateAsync({
					id: editingClaimParty.id,
					params: {
						role: data.role,
						representative_id: data.representative_id ?? undefined,
						liability_percentage: data.liability_percentage ?? undefined,
						notes: data.notes ?? undefined,
						parent_claim_party_id: data.parent_claim_party_id ?? undefined,
					},
				});
			} else {
				// Link new party to claim
				await linkPartyMutation.mutateAsync({
					claim_id: claimId,
					party_id: data.party_id,
					role: data.role,
					representative_id: data.representative_id ?? undefined,
					liability_percentage: data.liability_percentage ?? undefined,
					notes: data.notes ?? undefined,
					parent_claim_party_id: data.parent_claim_party_id ?? undefined,
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

	const handleArchiveClaimParty = async () => {
		if (!archivingClaimParty) return;

		try {
			await archiveClaimPartyMutation.mutateAsync({ id: archivingClaimParty.id });
			const partyType = archivingClaimParty.party?.party_type === 'facilitator' ? 'Facilitator' : 'Entity';
			showAlert(`${partyType} archived successfully`, 'success');
			setArchivingClaimParty(null);
		} catch (error: any) {
			const message = error?.message || 'Failed to archive party';
			showAlert(message, 'error');
			setArchivingClaimParty(null);
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

	// Render liability content for a party
	const renderLiabilityContent = useCallback(
		(claimParty: any) => (
			<Box marginTop={2}>
				<Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={1}>
					<Typography fontSize={13} fontWeight={600} color={BASE_COLOR_LIGHT}>
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
					<Typography fontSize={12} color="text.secondary" fontStyle="italic" marginY={1}>
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
									boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.8), 0 1px 3px 0 rgba(0, 0, 0, 0.04)',
								}}
							>
								<Box display="flex" justifyContent="space-between" alignItems="flex-start">
									<Box flex={1}>
										{/* Loss Type */}
										{liability.loss_type && (
											<Box display="flex" alignItems="center" gap={1} marginBottom={1}>
												<LossTypeValue value={liability.loss_type} fontSize={14} sx={{ fontWeight: 600 }} />
											</Box>
										)}

										{/* Liability Details */}
										<Box display="flex" gap={1} marginBottom={0.5} flexWrap="wrap">
											{liability.coverage_amount && (
												<Chip
													label={`Coverage: ${formatCurrencyExact(parseFloat(liability.coverage_amount.toString()))}`}
													size="small"
													color="success"
												/>
											)}
											{liability.line_of_business && (
												<LineOfBusinessChip value={liability.line_of_business} showEmoji={false} />
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
											<Typography fontSize={12} color="text.secondary" marginTop={0.5}>
												{liability.notes}
											</Typography>
										)}
									</Box>

									{/* Liability Actions */}
									<Box display="flex" gap={0.5}>
										<BasicButtonStyled
											buttonProps={{
												onClick: () => handleOpenLiabilityDialog(claimParty.id, liability),
											}}
											tooltipProps={{ title: 'Edit liability' }}
											icon={<Edit />}
											compact
										/>
										<BasicButtonStyled
											buttonProps={{
												onClick: () =>
													setArchivingLiability({
														id: liability.id,
														lossType: liability.loss_type,
													}),
											}}
											tooltipProps={{ title: 'Archive liability' }}
											icon={<Archive sx={{ color: 'error.main' }} />}
											compact
										/>
									</Box>
								</Box>
							</Paper>
						))}
					</Stack>
				)}
			</Box>
		),
		[]
	);

	return (
		<Box p={3}>
			<Stack spacing={3} maxWidth={1000} mx="auto">
				{/* Summary */}
				<Paper elevation={0} sx={styles.gradientPaper}>
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
				<Paper elevation={0} sx={styles.beveledPaper}>
					<Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={2}>
						<Typography fontSize={13} color={BASE_COLOR_LIGHT}>
							Adverse Parties ({entities.length})
						</Typography>
						<Box display="flex" gap={1} alignItems="center">
							{entities.length > 0 && (
								<Tooltip title={allExpanded ? 'Collapse all' : 'Expand all'}>
									<IconButton
										size="small"
										onClick={() => setAllExpanded(!allExpanded)}
										sx={{ mr: 0.5 }}
									>
										{allExpanded ? (
											<UnfoldLess sx={{ fontSize: 20 }} />
										) : (
											<UnfoldMore sx={{ fontSize: 20 }} />
										)}
									</IconButton>
								</Tooltip>
							)}
							<Button
								size="small"
								startIcon={<PersonAdd />}
								variant="outlined"
								onClick={() => handleOpenFacilitatorDialog()}
							>
								Add Facilitator
							</Button>
							<Button
								size="small"
								startIcon={<AddBox />}
								variant="contained"
								onClick={() => handleOpenEntityDialog()}
							>
								Add Entity
							</Button>
						</Box>
					</Box>

					{isLoading && (
						<Stack spacing={2}>
							<Skeleton variant="rectangular" height={80} />
							<Skeleton variant="rectangular" height={80} />
						</Stack>
					)}

					{!isLoading && entities.length === 0 && (
						<Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" padding={4}>
							<Business sx={{ fontSize: 48, color: BASE_COLOR_LIGHT, marginBottom: 1 }} />
							<Typography fontSize={13} color={BASE_COLOR_LIGHT} fontStyle="italic">
								No adverse parties linked yet
							</Typography>
						</Box>
					)}

					{!isLoading && entities.length > 0 && (
						<Stack spacing={2}>
							{entities.map((claimParty, index) => (
								<Box key={claimParty.id}>
									<PartyCard
										claimParty={claimParty}
										isNested={false}
										facilitators={facilitatorsByParent[claimParty.id] || []}
										onEditParty={handleOpenEntityDialog}
										onArchiveParty={setArchivingClaimParty}
										onAddFacilitator={handleOpenFacilitatorDialog}
										onEditFacilitator={handleOpenFacilitatorDialog}
										onArchiveFacilitator={(_, facilitator) => setArchivingClaimParty(facilitator)}
										onViewDetails={setViewingPartyDetails}
										renderTabContent={renderLiabilityContent}
										showLiabilityPercentage={true}
										expanded={allExpanded}
									/>
									{index < entities.length - 1 && <Divider sx={{ marginTop: 2 }} />}
								</Box>
							))}
						</Stack>
					)}
				</Paper>
			</Stack>

			{/* Party Dialog */}
			<PartyLinkingDialog
				open={showPartyDialog}
				onClose={handleClosePartyDialog}
				onSubmit={handlePartySubmit}
				editingClaimParty={editingClaimParty}
				currentClaimParties={claimParties}
				isSubmitting={linkPartyMutation.isPending || updatePartyMutation.isPending}
				roleListEntity="adverse_party_role"
				isFacilitatorMode={isFacilitatorMode}
				parentClaimPartyId={parentClaimPartyId}
				availableParentEntities={entities}
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

			{/* Archive Liability Confirmation Dialog */}
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

			{/* Archive Entity/Facilitator Confirmation Dialog */}
			{archivingClaimParty && archivePreview && (
				<BasicDialog
					title={`Archive ${archivingClaimParty.party?.party_type === 'facilitator' ? 'Facilitator' : 'Entity'}`}
					primaryAction={{
						label: archiveClaimPartyMutation.isPending ? 'Archiving...' : 'Archive',
						onClick: handleArchiveClaimParty,
						color: 'error',
						disabled: archiveClaimPartyMutation.isPending,
					}}
					secondaryActions={[
						{
							label: 'Cancel',
							onClick: () => setArchivingClaimParty(null),
						},
					]}
					onClose={() => setArchivingClaimParty(null)}
					width={500}
				>
					<Typography fontStyle="italic" fontWeight="bold" marginBottom={1}>
						Are you sure you want to archive{' '}
						<Typography component="span" fontWeight="bold" color="primary.main">
							{archivingClaimParty.party?.name}
						</Typography>
						?
					</Typography>

					{archivePreview.hasNestedElements && (
						<Paper
							elevation={0}
							sx={{
								backgroundColor: 'rgba(237, 108, 2, 0.08)',
								padding: 2,
								marginY: 2,
								borderLeft: '4px solid',
								borderColor: 'warning.main',
							}}
						>
							<Typography fontSize={13} fontWeight={600} color="warning.dark" marginBottom={1}>
								This will also archive:
							</Typography>
							<Stack spacing={0.5}>
								{archivePreview.facilitatorCount > 0 && (
									<Typography fontSize={13} color="warning.dark">
										• {archivePreview.facilitatorCount} facilitator{archivePreview.facilitatorCount > 1 ? 's' : ''}
									</Typography>
								)}
								{archivePreview.liabilityCount > 0 && (
									<Typography fontSize={13} color="warning.dark">
										• {archivePreview.liabilityCount} liabilit{archivePreview.liabilityCount > 1 ? 'ies' : 'y'}
									</Typography>
								)}
							</Stack>
						</Paper>
					)}

					<Typography paddingTop="10px" fontStyle="italic" color="text.secondary">
						The {archivingClaimParty.party?.party_type === 'facilitator' ? 'facilitator' : 'entity'} will be archived
						and hidden from view, but all records will be preserved for traceability.
					</Typography>
				</BasicDialog>
			)}

			{/* Party Details Dialog */}
			<PartyDetailDialog
				open={!!viewingPartyDetails}
				onClose={() => setViewingPartyDetails(null)}
				claimParty={viewingPartyDetails}
			/>
		</Box>
	);
}

const styles = {
	gradientPaper: {
		...containerStyles.gradientCard,
		padding: '24px',
	},
	beveledPaper: {
		...containerStyles.beveledCard,
		padding: '24px',
	},
};
