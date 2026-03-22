'use client';

import { IconArrowsMaximize, IconArrowsMinimize, IconBuilding, IconSettings, IconSquarePlus, IconUserPlus } from '@tabler/icons-react';
import Tooltip from '@/components/ui/Tooltip';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import Divider from '@/components/ui/Divider';
import Button from '@/components/ui/Button';
import { useState, useMemo } from 'react';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import PartyLinkingDialog from './PartyLinkingDialog';
import PartyDetailDialog from './PartyDetailDialog';
import PartyCard from './PartyCard';
import BasicDialog from '@/components/common/BasicDialog';
import { useAlertStore } from '@/stores/useAlertStore';

dayjs.extend(relativeTime);

interface PartyLiabilityTabProps {
	claimId: string;
}

export default function PartyLiabilityTab({ claimId }: PartyLiabilityTabProps) {
	const [showPartyDialog, setShowPartyDialog] = useState(false);
	const [editingClaimParty, setEditingClaimParty] = useState<any | null>(null);
	const [archivingClaimParty, setArchivingClaimParty] = useState<any | null>(null);
	const [isFacilitatorMode, setIsFacilitatorMode] = useState(false);
	const [parentClaimPartyId, setParentClaimPartyId] = useState<string | null>(null);
	const [allExpanded, setAllExpanded] = useState(true);
	const [viewingPartyDetails, setViewingPartyDetails] = useState<any | null>(null);
	const [isManageMode, setIsManageMode] = useState(false);

	const showAlert = useAlertStore((state) => state.showAlert);
	const partyTrpc = usePartyTrpc();

	// Fetch parties with adverse_party_role roles
	const { data: claimParties = [], isLoading } = partyTrpc.listClaimParties(
		{ claimId, roleListEntity: 'adverse_party_role' },
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

	// Compute archive preview from existing frontend data (no backend query needed)
	const archivePreview = useMemo(() => {
		if (!archivingClaimParty) return null;
		const facilitatorCount = facilitatorsByParent[archivingClaimParty.id]?.length ?? 0;
		return {
			facilitatorCount,
			hasNestedElements: facilitatorCount > 0,
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

	// Calculate totals - liability_percentage is on claim_party for entities
	const totalLiability = entities.reduce((sum, cp) => {
		const partyLiability = cp.liability_percentage ? parseFloat(cp.liability_percentage.toString()) : 0;
		return sum + partyLiability;
	}, 0);

	return (
		<div style={{ padding: 24 }}>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1000, margin: '0 auto' }}>
				{/* Summary */}
				<Card variant="float" padding="lg">
					<span style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
						Liability Summary
					</span>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
						<div style={{ display: 'flex', flexDirection: 'column' as const }}>
							<span style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
								Adverse Parties
							</span>
							<span style={{ fontSize: 11,  color: 'var(--text-secondary)'  }}>
								Number of adverse party entities
							</span>
							<span style={{ fontSize: 18,  color: 'var(--text-accent)'  }}>
								{entities.length}
							</span>
						</div>
						<div style={{ display: 'flex', flexDirection: 'column' as const }}>
							<span style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
								Combined Liability
							</span>
							<span style={{ fontSize: 11,  color: 'var(--text-secondary)'  }}>
								Sum of all entity liability percentages
							</span>
							<span style={{ fontSize: 18,  color: 'var(--status-warning)'  }}>
								{totalLiability.toFixed(2)}%
							</span>
						</div>
					</div>
				</Card>

				{/* Party List */}
				<Card variant="beveled" padding="lg">
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
						<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
							Adverse Parties ({entities.length})
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
							<IconBuilding size={48} style={{ color: 'var(--text-muted)', marginBottom: 1 }} />
							<span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
								No adverse parties linked yet
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
										showLiabilityPercentage={true}
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
				roleListEntity="adverse_party_role"
				isFacilitatorMode={isFacilitatorMode}
				parentClaimPartyId={parentClaimPartyId}
				availableParentEntities={entities}
			/>

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
