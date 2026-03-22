'use client';

import { IconArchive, IconArrowsMaximize, IconArrowsMinimize, IconCircleCheck, IconEdit, IconSettings, IconSquarePlus, IconUser, IconUserPlus } from '@tabler/icons-react';
import Tooltip from '@/components/ui/Tooltip';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import Divider from '@/components/ui/Divider';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import { useState, useMemo, useCallback } from 'react';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { useCoverageTrpc } from '@/hooks/trpc/useCoverageTrpc';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
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
import { DeductibleStatus } from '@/config/enums';
import { DEDUCTIBLE_STATUS_OPTIONS } from '../../coverage/DeductibleStatusSelect';
import Highlight from '@/components/common/Highlight';

dayjs.extend(relativeTime);

interface ClaimantsCoverageTabProps {
	claimId: string;
}

export default function ClaimantsCoverageTab({ claimId }: ClaimantsCoverageTabProps) {
	const [showPartyDialog, setShowPartyDialog] = useState(false);
	const [editingClaimParty, setEditingClaimParty] = useState<any | null>(null);
	const [showCoverageDialog, setShowCoverageDialog] = useState(false);
	const [editingCoverage, setEditingCoverage] = useState<any | null>(null);
	const [selectedClaimPartyId, setSelectedClaimPartyId] = useState<string | null>(null);
	const [archivingCoverage, setArchivingCoverage] = useState<{ id: string; coverageType: string | null } | null>(
		null
	);
	const [archivingClaimParty, setArchivingClaimParty] = useState<any | null>(null);
	const [isFacilitatorMode, setIsFacilitatorMode] = useState(false);
	const [parentClaimPartyId, setParentClaimPartyId] = useState<string | null>(null);
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
		const facilitatorsMap: Record<string, any[]> = {};

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

	const handleOpenFacilitatorDialog = (parentId?: string | null, claimParty?: any) => {
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

	const handleOpenCoverageDialog = (claimPartyId: string, coverage?: any) => {
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
		party_id: string;
		representative_id?: string | null;
		address_id?: string | null;
		// Free-form representative (entities)
		representative_name?: string | null;
		liability_percentage?: number | null;
		notes?: string | null;
		parent_claim_party_id?: string | null;
		// Facilitator-specific fields
		loss_type?: string | null;
		policy_limit?: number | null;
	}) => {
		try {
			if (editingClaimParty) {
				// Update existing claim party
				await updatePartyMutation.mutateAsync({
					id: editingClaimParty.id,
					params: {
						role: data.role,
						representative_id: data.representative_id ?? undefined,
						address_id: data.address_id ?? undefined,
						representative_name: data.representative_name ?? undefined,
						liability_percentage: data.liability_percentage ?? undefined,
						notes: data.notes ?? undefined,
						parent_claim_party_id: data.parent_claim_party_id ?? undefined,
						loss_type: (data.loss_type ?? undefined) as any,
						policy_limit: data.policy_limit ?? undefined,
					},
				});
			} else {
				// Link new party to claim
				await linkPartyMutation.mutateAsync({
					claim_id: claimId,
					party_id: data.party_id,
					role: data.role,
					representative_id: data.representative_id ?? undefined,
					address_id: data.address_id ?? undefined,
					representative_name: data.representative_name ?? undefined,
					liability_percentage: data.liability_percentage ?? undefined,
					notes: data.notes ?? undefined,
					parent_claim_party_id: data.parent_claim_party_id ?? undefined,
					loss_type: (data.loss_type ?? undefined) as any,
					policy_limit: data.policy_limit ?? undefined,
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
		deductible_amount: string | null;
		deductible_status: DeductibleStatus;
		subro_applicable: boolean;
		statute_preserved: boolean;
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
					deductible_amount: data.deductible_amount ? parseFloat(data.deductible_amount) : null,
					deductible_status: data.deductible_status,
					subro_applicable: data.subro_applicable,
					statute_preserved: data.statute_preserved,
				});
			} else {
				// Create new coverage
				await createCoverageMutation.mutateAsync({
					claim_id: claimId,
					claim_party_id: selectedClaimPartyId,
					loss_type: data.loss_type,
					coverage_amount: data.coverage_amount ? parseFloat(data.coverage_amount) : null,
					amount_reserved: data.amount_reserved ? parseFloat(data.amount_reserved) : null,
					deductible_amount: data.deductible_amount ? parseFloat(data.deductible_amount) : null,
					deductible_status: data.deductible_status,
					subro_applicable: data.subro_applicable,
					statute_preserved: data.statute_preserved,
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
			<div style={{ marginTop: 16 }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
					<span style={{ fontSize: 13, fontWeight: 600 }}>
						Coverages ({(claimParty.coverages || []).length})
					</span>
					<Button
						size="sm"
						startIcon={<IconSquarePlus size={20} />}
						variant="outlined"
						onClick={() => handleOpenCoverageDialog(claimParty.id)}
					>
						Add Coverage
					</Button>
				</div>

				{(claimParty.coverages || []).length === 0 && (
					<span style={{  fontSize: 12,  color: 'var(--text-secondary)'  ,  fontStyle: 'italic'  }}>
						No coverages added yet
					</span>
				)}

				{(claimParty.coverages || []).length > 0 && (
					<div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
						{claimParty.coverages.map((coverage: any) => (
							<div
								key={coverage.id}
								style={{
									padding: 2,
									backgroundColor: 'var(--bg-primary)',
									boxShadow:
										'inset 0 1px 0 0 rgba(255, 255, 255, 0.8), 0 1px 3px 0 rgba(0, 0, 0, 0.04)',
								}}
							>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
									<div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const }}>
										<span style={{ fontSize: 14, fontWeight: 600 }}>
											{formatCoverageType(coverage.loss_type)}
										</span>
										<div
											style={{
												display: 'flex',
												gap: 8,
												marginBottom: 8,
												flexWrap: 'wrap',
												alignItems: 'center',
											}}
										>
											{coverage.coverage_amount && (
												<Chip size="sm" color="info">
													{`Limit: ${formatCurrencyExact(parseFloat(coverage.coverage_amount.toString()))}`}
												</Chip>
											)}
											{coverage.amount_reserved && (
												<Chip size="sm" color="warning" variant="outlined">
													{`Reserved: ${formatCurrencyExact(parseFloat(coverage.amount_reserved.toString()))}`}
												</Chip>
											)}
											{coverage.deductible_amount &&
												parseFloat(coverage.deductible_amount.toString()) > 0 && (
													<Chip size="sm" color="info" variant="outlined">
														{`Deductible: ${formatCurrencyExact(parseFloat(coverage.deductible_amount.toString()))} (${DEDUCTIBLE_STATUS_OPTIONS.find((opt) => opt.value === coverage.deductible_status)?.abbrev || coverage.deductible_status})`}
													</Chip>
												)}
										</div>
										{coverage.subro_applicable && (
											<span style={{ fontSize: 13, marginBottom: 4, color: 'var(--text-secondary)', display: 'block' }}>
												Subro: <Highlight>Yes</Highlight>
											</span>
										)}
										{coverage.statute_date && (
											<span style={{ fontSize: 13, marginBottom: 4, color: 'var(--text-secondary)', display: 'block' }}>
												Statute:{' '}
												<Highlight>
													{new Date(coverage.statute_date).toLocaleDateString()}
												</Highlight>
											</span>
										)}
										{coverage.statute_preserved && (
											<div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
												<IconCircleCheck size={15} style={{ color: 'var(--status-success)' }} />
												<span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 4 }}>
													Statute Preserved
												</span>
											</div>
										)}
									</div>
									{isManageMode && (
										<div style={{ display: 'flex', gap: 4 }}>
											<BasicButtonStyled
												buttonProps={{
													onClick: () => handleOpenCoverageDialog(claimParty.id, coverage),
												}}
												tooltipProps={{ title: 'Edit coverage' }}
												icon={<IconEdit size={20} />}
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
												icon={<IconArchive style={{ color: 'var(--status-error)' }} />}
												compact
											/>
										</div>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		),
		[isManageMode]
	);

	return (
		<div style={{ padding: 24 }}>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1000, margin: '0 auto' }}>
				{/* Summary */}
				<Card variant="float" padding="lg">
					<span style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
						Coverage Summary
					</span>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
						<div style={{ display: 'flex', flexDirection: 'column' as const }}>
							<span style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
								Total Coverage Amount
							</span>
							<span style={{ fontSize: 11,  color: 'var(--text-secondary)'  }}>
								Sum of all party coverage limits
							</span>
							<span style={{ fontSize: 18,  color: 'var(--text-accent)'  }}>
								{formatCurrencyExact(totalCoverageAmount)}
							</span>
						</div>
						<div style={{ display: 'flex', flexDirection: 'column' as const }}>
							<span style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
								Total Amount Reserved
							</span>
							<span style={{ fontSize: 11,  color: 'var(--text-secondary)'  }}>
								Sum of all reserved amounts
							</span>
							<span style={{ fontSize: 18,  color: 'var(--status-warning)'  }}>
								{formatCurrencyExact(totalAmountReserved)}
							</span>
						</div>
						<div style={{ display: 'flex', flexDirection: 'column' as const }}>
							<span style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
								Linked Entities
							</span>
							<span style={{ fontSize: 11,  color: 'var(--text-secondary)'  }}>
								Claimants and other entities
							</span>
							<span style={{ fontSize: 18,  color: 'var(--status-success)'  }}>
								{entities.length}
							</span>
						</div>
					</div>
				</Card>

				{/* Party List */}
				<Card variant="beveled" padding="lg">
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
						<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
							Claimants & Entities ({entities.length})
						</span>
						<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
							<Button
								size="sm"
								startIcon={<IconUserPlus size={20} />}
								variant="outlined"
								onClick={() => handleOpenFacilitatorDialog()}
							>
								Add Facilitator
							</Button>
							<Button
								size="sm"
								startIcon={<IconSquarePlus size={20} />}
								variant="contained"
								onClick={() => handleOpenEntityDialog()}
							>
								Add Entity
							</Button>
							{entities.length > 0 && (
								<>
									<Tooltip content="Manage">
										<Button variant="icon" size="sm"
											onClick={() => setIsManageMode(!isManageMode)}
											style={{
												backgroundColor: isManageMode ? 'var(--bg-tertiary)' : undefined,
											}}
										>
											<IconSettings size={20} style={{ color: isManageMode ? 'primary.main' : undefined }} />
										</Button>
									</Tooltip>
									<Tooltip content={allExpanded ? 'Collapse all' : 'Expand all'}>
										<Button variant="icon" size="sm"
											onClick={() => setAllExpanded(!allExpanded)}
											style={{ marginRight: 4 }}
										>
											{allExpanded ? (
												<IconArrowsMinimize size={20} />
											) : (
												<IconArrowsMaximize size={20} />
											)}
										</Button>
									</Tooltip>
								</>
							)}
						</div>
					</div>

					{isLoading && (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
							<Skeleton variant="rect" height={80} />
							<Skeleton variant="rect" height={80} />
						</div>
					)}

					{!isLoading && entities.length === 0 && (
						<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
							<IconUser size={48} style={{ color: 'var(--text-muted)', marginBottom: 1 }} />
							<span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
								No claimants or entities linked yet
							</span>
						</div>
					)}

					{!isLoading && entities.length > 0 && (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
							{entities.map((claimParty, index) => (
								<div key={claimParty.id}>
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
									{index < entities.length - 1 && <Divider />}
								</div>
							))}
						</div>
					)}
				</Card>
			</div>

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
					<span style={{  fontStyle: 'italic' ,  fontWeight: 'bold'  }}>
						Are you sure you want to archive this coverage?
					</span>
					{archivingCoverage.coverageType && (
						<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
							<span style={{ fontSize: 13,  color: 'var(--text-secondary)'  }}>
								Coverage Type:
							</span>
							<span style={{ fontSize: 13 }}>{formatCoverageType(archivingCoverage.coverageType)}</span>
						</div>
					)}
					<span style={{  paddingTop: '10px', fontStyle: 'italic' ,  color: 'var(--text-secondary)'  }}>
						The coverage will be archived and hidden from view, but the record will be preserved for
						traceability.
					</span>
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
					<span style={{  fontStyle: 'italic' ,  fontWeight: 'bold'  }}>
						Are you sure you want to archive{' '}
						<span style={{  fontWeight: 'bold' ,  color: 'var(--text-accent)'  }}>
							{archivingClaimParty.party?.name}
						</span>
						?
					</span>

					{archivePreview.hasNestedElements && (
						<div
							style={{
								backgroundColor: 'rgba(237, 108, 2, 0.08)',
								padding: 2,
								marginTop: 16, marginBottom: 16,
								borderLeft: '4px solid',
								borderColor: 'warning.main',
							}}
						>
							<span style={{  fontSize: 13, fontWeight: 600 ,  color: 'var(--status-warning)'  }}>
								This will also archive:
							</span>
							<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
								{archivePreview.facilitatorCount > 0 && (
									<span style={{ fontSize: 13,  color: 'var(--status-warning)'  }}>
										• {archivePreview.facilitatorCount} facilitator
										{archivePreview.facilitatorCount > 1 ? 's' : ''}
									</span>
								)}
								{archivePreview.coverageCount > 0 && (
									<span style={{ fontSize: 13,  color: 'var(--status-warning)'  }}>
										• {archivePreview.coverageCount} coverage
										{archivePreview.coverageCount > 1 ? 's' : ''}
									</span>
								)}
							</div>
						</div>
					)}

					<span style={{  paddingTop: '10px', fontStyle: 'italic' ,  color: 'var(--text-secondary)'  }}>
						The {archivingClaimParty.party?.party_type === 'facilitator' ? 'facilitator' : 'entity'} will be
						archived and hidden from view, but all records will be preserved for traceability.
					</span>
				</BasicDialog>
			)}

			{/* Party Details Dialog */}
			<PartyDetailDialog
				open={!!viewingPartyDetails}
				onClose={() => setViewingPartyDetails(null)}
				claimParty={viewingPartyDetails}
			/>
		</div>
	);
}
