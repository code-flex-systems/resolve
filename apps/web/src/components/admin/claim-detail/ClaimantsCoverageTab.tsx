'use client';

import { Box, Button, Chip, Divider, IconButton, Paper, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import AddBox from '@mui/icons-material/AddBox';
import Person from '@mui/icons-material/Person';
import PersonAdd from '@mui/icons-material/PersonAdd';
import Edit from '@mui/icons-material/Edit';
import Archive from '@mui/icons-material/Archive';
import UnfoldMore from '@mui/icons-material/UnfoldMore';
import UnfoldLess from '@mui/icons-material/UnfoldLess';
import Settings from '@mui/icons-material/Settings';
import { useState, useMemo, useCallback } from 'react';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { useCoverageTrpc } from '@/hooks/trpc/useCoverageTrpc';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { BASE_COLOR_LIGHT, containerStyles } from '@/styles/theme';
import { formatCoverageType } from '@/lib/utils/claimUtils';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import PartyLinkingDialog from './PartyLinkingDialog';
import PartyDetailDialog from './PartyDetailDialog';
import CoverageFormDialog from '../../coverage/CoverageFormDialog';
import PartyCard from './PartyCard';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import BasicDialog from '@/components/common/BasicDialog';
import { useAlertStore } from '@/stores/useAlertStore';

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
	const [archivingCoverage, setArchivingCoverage] = useState<{ id: number; coverageType: string | null } | null>(
		null
	);
	const [archivingClaimParty, setArchivingClaimParty] = useState<any | null>(null);
	const [isFacilitatorMode, setIsFacilitatorMode] = useState(false);
	const [parentClaimPartyId, setParentClaimPartyId] = useState<number | null>(null);
	const [allExpanded, setAllExpanded] = useState(true);
	const [viewingPartyDetails, setViewingPartyDetails] = useState<any | null>(null);
	const [isManageMode, setIsManageMode] = useState(false);

	const showAlert = useAlertStore((state) => state.showAlert);
	const partyTrpc = usePartyTrpc();
	const coverageTrpc = useCoverageTrpc();

	// Fetch parties with claimant_party_role roles
	const { data: claimParties = [], isLoading } = partyTrpc.listClaimParties(
		{ claimId, roleListEntity: 'claimant_party_role' },
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
	const createCoverageMutation = coverageTrpc.create;
	const updateCoverageMutation = coverageTrpc.update;
	const archiveCoverageMutation = coverageTrpc.archive;

	// Compute archive preview from existing frontend data (no backend query needed)
	const archivePreview = useMemo(() => {
		if (!archivingClaimParty) return null;
		const facilitatorCount = facilitatorsByParent[archivingClaimParty.id]?.length ?? 0;
		const coverageCount = archivingClaimParty.coverages?.length ?? 0;
		return {
			facilitatorCount,
			coverageCount,
			hasNestedElements: facilitatorCount > 0 || coverageCount > 0,
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
		role: string[];
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

	const handleCoverageSubmit = async (data: {
		loss_type: string;
		coverage_amount: string | null;
		amount_reserved: string | null;
	}) => {
		try {
			if (!selectedClaimPartyId) return;

			if (editingCoverage) {
				// Update existing coverage
				await updateCoverageMutation.mutateAsync({
					id: editingCoverage.id,
					loss_type: data.loss_type,
					coverage_amount: data.coverage_amount ? parseFloat(data.coverage_amount) : null,
					amount_reserved: data.amount_reserved ? parseFloat(data.amount_reserved) : null,
				});
			} else {
				// Create new coverage
				await createCoverageMutation.mutateAsync({
					claim_id: claimId,
					claim_party_id: selectedClaimPartyId,
					loss_type: data.loss_type,
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

	// Render coverage content for a party
	const renderCoverageContent = useCallback(
		(claimParty: any) => (
			<Box marginTop={2}>
				<Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={1}>
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
					<Typography fontSize={12} color="text.secondary" fontStyle="italic" marginY={1}>
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
									boxShadow:
										'inset 0 1px 0 0 rgba(255, 255, 255, 0.8), 0 1px 3px 0 rgba(0, 0, 0, 0.04)',
								}}
							>
								<Box display="flex" justifyContent="space-between" alignItems="flex-start">
									<Box flex={1}>
										<Typography fontSize={14} fontWeight={600} marginBottom={1}>
											{formatCoverageType(coverage.loss_type)}
										</Typography>
										<Box display="flex" gap={1} marginBottom={0.5} flexWrap="wrap">
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
									{isManageMode && (
										<Box display="flex" gap={0.5}>
											<BasicButtonStyled
												buttonProps={{
													onClick: () => handleOpenCoverageDialog(claimParty.id, coverage),
												}}
												tooltipProps={{ title: 'Edit coverage' }}
												icon={<Edit />}
												compact
											/>
											<BasicButtonStyled
												buttonProps={{
													onClick: () =>
														setArchivingCoverage({
															id: coverage.id,
															coverageType: coverage.loss_type,
														}),
												}}
												tooltipProps={{ title: 'Archive coverage' }}
												icon={<Archive sx={{ color: 'error.main' }} />}
												compact
											/>
										</Box>
									)}
								</Box>
							</Paper>
						))}
					</Stack>
				)}
			</Box>
		),
		[isManageMode]
	);

	return (
		<Box p={3}>
			<Stack spacing={3} maxWidth={1000} mx="auto">
				{/* Summary */}
				<Paper elevation={0} sx={styles.gradientPaper}>
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
								Linked Entities
							</Typography>
							<Typography variant="body2" fontSize={11} color="text.secondary" marginBottom={1}>
								Claimants and other entities
							</Typography>
							<Typography variant="h6" fontSize={18} color="success.main">
								{entities.length}
							</Typography>
						</Box>
					</Box>
				</Paper>

				{/* Party List */}
				<Paper elevation={0} sx={styles.beveledPaper}>
					<Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={2}>
						<Typography fontSize={13} color={BASE_COLOR_LIGHT}>
							Claimants & Entities ({entities.length})
						</Typography>
						<Box display="flex" gap={1} alignItems="center">
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
							{entities.length > 0 && (
								<>
									<Tooltip title="Manage">
										<IconButton
											size="small"
											onClick={() => setIsManageMode(!isManageMode)}
											sx={{
												bgcolor: isManageMode ? 'action.selected' : undefined,
											}}
										>
											<Settings sx={{ fontSize: 20 }} />
										</IconButton>
									</Tooltip>
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
								</>
							)}
						</Box>
					</Box>

					{isLoading && (
						<Stack spacing={2}>
							<Skeleton variant="rectangular" height={80} />
							<Skeleton variant="rectangular" height={80} />
						</Stack>
					)}

					{!isLoading && entities.length === 0 && (
						<Box
							display="flex"
							flexDirection="column"
							alignItems="center"
							justifyContent="center"
							padding={4}
						>
							<Person sx={{ fontSize: 48, color: BASE_COLOR_LIGHT, marginBottom: 1 }} />
							<Typography fontSize={13} color={BASE_COLOR_LIGHT} fontStyle="italic">
								No claimants or entities linked yet
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
										renderTabContent={renderCoverageContent}
										expanded={allExpanded}
										isManageMode={isManageMode}
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
				roleListEntity="claimant_party_role"
				isFacilitatorMode={isFacilitatorMode}
				parentClaimPartyId={parentClaimPartyId}
				availableParentEntities={entities}
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

			{/* Archive Coverage Confirmation Dialog */}
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
										• {archivePreview.facilitatorCount} facilitator
										{archivePreview.facilitatorCount > 1 ? 's' : ''}
									</Typography>
								)}
								{archivePreview.coverageCount > 0 && (
									<Typography fontSize={13} color="warning.dark">
										• {archivePreview.coverageCount} coverage
										{archivePreview.coverageCount > 1 ? 's' : ''}
									</Typography>
								)}
							</Stack>
						</Paper>
					)}

					<Typography paddingTop="10px" fontStyle="italic" color="text.secondary">
						The {archivingClaimParty.party?.party_type === 'facilitator' ? 'facilitator' : 'entity'} will be
						archived and hidden from view, but all records will be preserved for traceability.
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
