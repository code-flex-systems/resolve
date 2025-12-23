'use client';

import { Box, Button, Divider, IconButton, Paper, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import AddBox from '@mui/icons-material/AddBox';
import Business from '@mui/icons-material/Business';
import PersonAdd from '@mui/icons-material/PersonAdd';
import UnfoldMore from '@mui/icons-material/UnfoldMore';
import UnfoldLess from '@mui/icons-material/UnfoldLess';
import Settings from '@mui/icons-material/Settings';
import { useState, useMemo } from 'react';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { BASE_COLOR_LIGHT, containerStyles } from '@/styles/theme';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import PartyLinkingDialog from './PartyLinkingDialog';
import PartyDetailDialog from './PartyDetailDialog';
import PartyCard from './PartyCard';
import BasicDialog from '@/components/common/BasicDialog';
import { useAlertStore } from '@/stores/useAlertStore';

dayjs.extend(relativeTime);

interface PartyLiabilityTabProps {
	claimId: number;
}

export default function PartyLiabilityTab({ claimId }: PartyLiabilityTabProps) {
	const [showPartyDialog, setShowPartyDialog] = useState(false);
	const [editingClaimParty, setEditingClaimParty] = useState<any | null>(null);
	const [archivingClaimParty, setArchivingClaimParty] = useState<any | null>(null);
	const [isFacilitatorMode, setIsFacilitatorMode] = useState(false);
	const [parentClaimPartyId, setParentClaimPartyId] = useState<number | null>(null);
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

	const handlePartySubmit = async (data: {
		role: string[];
		party_id: number;
		representative_id?: number | null;
		address_id?: number | null;
		// Free-form representative (entities)
		representative_name?: string | null;
		representative_title?: string | null;
		representative_email?: string | null;
		representative_phone?: string | null;
		liability_percentage?: number | null;
		notes?: string | null;
		parent_claim_party_id?: number | null;
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
						representative_title: data.representative_title ?? undefined,
						representative_email: data.representative_email ?? undefined,
						representative_phone: data.representative_phone ?? undefined,
						liability_percentage: data.liability_percentage ?? undefined,
						notes: data.notes ?? undefined,
						parent_claim_party_id: data.parent_claim_party_id ?? undefined,
						loss_type: data.loss_type ?? undefined,
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
					representative_title: data.representative_title ?? undefined,
					representative_email: data.representative_email ?? undefined,
					representative_phone: data.representative_phone ?? undefined,
					liability_percentage: data.liability_percentage ?? undefined,
					notes: data.notes ?? undefined,
					parent_claim_party_id: data.parent_claim_party_id ?? undefined,
					loss_type: data.loss_type ?? undefined,
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
		<Box p={3}>
			<Stack spacing={3} maxWidth={1000} mx="auto">
				{/* Summary */}
				<Paper elevation={0} sx={styles.gradientPaper}>
					<Typography fontSize={13} color={BASE_COLOR_LIGHT} marginBottom={2}>
						Liability Summary
					</Typography>
					<Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2}>
						<Box>
							<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={0.5}>
								Adverse Parties
							</Typography>
							<Typography variant="body2" fontSize={11} color="text.secondary" marginBottom={1}>
								Number of adverse party entities
							</Typography>
							<Typography variant="h6" fontSize={18} color="primary.main">
								{entities.length}
							</Typography>
						</Box>
						<Box>
							<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={0.5}>
								Combined Liability
							</Typography>
							<Typography variant="body2" fontSize={11} color="text.secondary" marginBottom={1}>
								Sum of all entity liability percentages
							</Typography>
							<Typography variant="h6" fontSize={18} color="warning.main">
								{totalLiability.toFixed(2)}%
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
											<Settings
												sx={{ fontSize: 20, color: isManageMode ? 'primary.main' : undefined }}
											/>
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
										showLiabilityPercentage={true}
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
