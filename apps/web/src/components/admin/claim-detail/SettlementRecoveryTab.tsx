'use client';

import { Box, Button, Collapse, IconButton, Link, Paper, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import AttachMoney from '@mui/icons-material/AttachMoney';
import Gavel from '@mui/icons-material/Gavel';
import Settings from '@mui/icons-material/Settings';
import Warning from '@mui/icons-material/Warning';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useRecoveryTrpc } from '@/hooks/trpc/useRecoveryTrpc';
import BasicDialog from '@/components/common/BasicDialog';
import SettlementFormDialog, { SettlementFormData } from './SettlementFormDialog';
import RecoveryFormDialog, { RecoveryFormData } from './RecoveryFormDialog';
import SettlementTable from './SettlementTable';
import SettlementTimeline from './SettlementTimeline';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { formatCoverageType } from '@/lib/utils/claimUtils';
import { BASE_COLOR_LIGHT, containerStyles } from '@/styles/theme';
import { SettlementStatus } from '@/config/enums';
import { useAlertStore } from '@/stores/useAlertStore';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

interface RecoveryTabProps {
	claimId: number;
}

const initialRecoveryForm: RecoveryFormData = {
	settlement_id: '',
	recovery_date: dayjs().format('YYYY-MM-DD'),
	recovery_amount: '',
	recovery_source: '',
	notes: '',
};

const initialSettlementForm: SettlementFormData = {
	claim_party_id: '',
	coverage_id: '',
	demand_amount: '',
	demand_date: dayjs().format('YYYY-MM-DD'),
	status: SettlementStatus.SENT,
	agreed_liability_percentage: '',
	settlement_amount: '',
	settlement_date: '',
	notes: '',
};

type ViewMode = 'table' | 'timeline';

export default function SettlementRecoveryTab({ claimId }: RecoveryTabProps) {
	const [viewMode, setViewMode] = useState<ViewMode>('table');
	const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
	const [showSettlementDialog, setShowSettlementDialog] = useState(false);
	const [recoveryForm, setRecoveryForm] = useState<RecoveryFormData>(initialRecoveryForm);
	const [settlementForm, setSettlementForm] = useState<SettlementFormData>(initialSettlementForm);
	const [isManageMode, setIsManageMode] = useState(false);
	const [editingSettlement, setEditingSettlement] = useState<any | null>(null);
	const [editingRecovery, setEditingRecovery] = useState<any | null>(null);
	const [archivingSettlement, setArchivingSettlement] = useState<any | null>(null);
	const [archivingRecovery, setArchivingRecovery] = useState<any | null>(null);

	const utils = trpc.useUtils();
	const showAlert = useAlertStore((state) => state.showAlert);

	// Data queries
	const { data: claimDetail } = trpc.claim.getClaimDetail.useQuery({ claimId });
	const { data: recoveryEvents = [], isLoading: isLoadingRecovery } = useRecoveryTrpc().listRecoveryEvents(
		{ claimId },
		{ enabled: !!claimId }
	);
	const { data: settlements = [], isLoading: isLoadingSettlements } = trpc.settlement.listSettlements.useQuery(
		{ claimId },
		{ enabled: !!claimId }
	);
	const { data: settlementsForDropdown = [] } = trpc.settlement.getSettlementsForDropdown.useQuery(
		{ claimId },
		{ enabled: !!claimId }
	);
	const { data: claimParties = [] } = trpc.party.getClaimParties.useQuery({ claimId }, { enabled: !!claimId });
	// Get only adverse parties (with roles from adverse_party_role reference list) for settlement creation
	const { data: adverseParties = [] } = trpc.party.getClaimParties.useQuery(
		{ claimId, roleListEntity: 'adverse_party_role' },
		{ enabled: !!claimId }
	);
	const { data: coverages = [] } = trpc.coverage.getCoverages.useQuery({ claimId }, { enabled: !!claimId });

	// Mutations
	const createRecoveryEvent = useRecoveryTrpc().createRecoveryEvent;
	const updateRecoveryEvent = useRecoveryTrpc().updateRecoveryEvent;
	const deleteRecoveryEvent = useRecoveryTrpc().deleteRecoveryEvent;
	const createSettlement = trpc.settlement.createSettlement.useMutation({
		onSuccess: () => {
			utils.settlement.listSettlements.invalidate({ claimId });
			utils.settlement.getSettlementsForDropdown.invalidate({ claimId });
		},
	});
	const updateSettlement = trpc.settlement.updateSettlement.useMutation({
		onSuccess: () => {
			utils.settlement.listSettlements.invalidate({ claimId });
			utils.settlement.getSettlementsForDropdown.invalidate({ claimId });
		},
	});
	const deleteSettlement = trpc.settlement.deleteSettlement.useMutation({
		onSuccess: () => {
			utils.settlement.listSettlements.invalidate({ claimId });
			utils.settlement.getSettlementsForDropdown.invalidate({ claimId });
			utils.recovery.listRecoveryEvents.invalidate({ claimId });
		},
	});

	const getRecoveryCountForSettlement = (settlementId: number) => {
		return recoveryEvents.filter((r) => r.settlement_id === settlementId).length;
	};

	// Recovery Dialog handlers
	const handleOpenRecoveryDialog = (recovery?: any) => {
		if (recovery) {
			setEditingRecovery(recovery);
			setRecoveryForm({
				settlement_id: recovery.settlement_id,
				recovery_date: dayjs.utc(recovery.recovery_date).format('YYYY-MM-DD'),
				recovery_amount: recovery.recovery_amount?.toString() || '',
				recovery_source: recovery.recovery_source || '',
				notes: recovery.notes || '',
			});
		} else {
			setEditingRecovery(null);
			setRecoveryForm({
				...initialRecoveryForm,
				settlement_id: settlementsForDropdown.length > 0 ? settlementsForDropdown[0].id : '',
				recovery_date: dayjs().format('YYYY-MM-DD'),
			});
		}
		setShowRecoveryDialog(true);
	};

	const handleCloseRecoveryDialog = () => {
		setShowRecoveryDialog(false);
		setRecoveryForm(initialRecoveryForm);
		setEditingRecovery(null);
	};

	const handleSubmitRecovery = async () => {
		if (recoveryForm.settlement_id === '') return;
		try {
			if (editingRecovery) {
				await updateRecoveryEvent.mutateAsync({
					recoveryEventId: editingRecovery.id,
					params: {
						settlement_id: recoveryForm.settlement_id,
						recovery_date: recoveryForm.recovery_date,
						recovery_amount: recoveryForm.recovery_amount,
						recovery_source: recoveryForm.recovery_source || undefined,
						notes: recoveryForm.notes || undefined,
					},
				});
				utils.recovery.listRecoveryEvents.invalidate({ claimId });
				utils.claim.getClaimDetail.invalidate({ claimId });
				showAlert('Recovery event updated successfully', 'success');
			} else {
				await createRecoveryEvent.mutateAsync({
					claimId,
					params: {
						settlement_id: recoveryForm.settlement_id,
						recovery_date: recoveryForm.recovery_date,
						recovery_amount: recoveryForm.recovery_amount,
						recovery_source: recoveryForm.recovery_source || undefined,
						notes: recoveryForm.notes || undefined,
					},
				});
				showAlert('Recovery event created successfully', 'success');
			}
			handleCloseRecoveryDialog();
		} catch (error: any) {
			showAlert(error?.message || 'Failed to save recovery event', 'error');
		}
	};

	// Settlement Dialog handlers
	const handleOpenSettlementDialog = (settlement?: any) => {
		if (settlement) {
			setEditingSettlement(settlement);
			setSettlementForm({
				claim_party_id: settlement.claim_party_id,
				coverage_id: settlement.coverage_id,
				demand_amount: settlement.demand_amount?.toString() || '',
				demand_date: dayjs.utc(settlement.demand_date).format('YYYY-MM-DD'),
				status: settlement.status || SettlementStatus.SENT,
				agreed_liability_percentage: settlement.agreed_liability_percentage?.toString() || '',
				settlement_amount: settlement.settlement_amount?.toString() || '',
				settlement_date: settlement.settlement_date
					? dayjs.utc(settlement.settlement_date).format('YYYY-MM-DD')
					: '',
				notes: settlement.notes || '',
			});
		} else {
			setEditingSettlement(null);
			setSettlementForm({
				...initialSettlementForm,
				claim_party_id: adverseParties.length > 0 ? adverseParties[0].id : '',
				coverage_id: coverages.length > 0 ? coverages[0].id : '',
				demand_date: dayjs().format('YYYY-MM-DD'),
			});
		}
		setShowSettlementDialog(true);
	};

	const handleCloseSettlementDialog = () => {
		setShowSettlementDialog(false);
		setSettlementForm(initialSettlementForm);
		setEditingSettlement(null);
	};

	const handleSubmitSettlement = async () => {
		if (settlementForm.claim_party_id === '' || settlementForm.coverage_id === '') return;
		try {
			if (editingSettlement) {
				await updateSettlement.mutateAsync({
					settlementId: editingSettlement.id,
					params: {
						claim_party_id: settlementForm.claim_party_id,
						coverage_id: settlementForm.coverage_id,
						demand_amount: settlementForm.demand_amount,
						demand_date: settlementForm.demand_date,
						status: settlementForm.status as SettlementStatus,
						agreed_liability_percentage: settlementForm.agreed_liability_percentage || undefined,
						settlement_amount: settlementForm.settlement_amount || undefined,
						settlement_date: settlementForm.settlement_date || undefined,
						notes: settlementForm.notes || undefined,
					},
				});
				showAlert('Settlement updated successfully', 'success');
			} else {
				await createSettlement.mutateAsync({
					claimId,
					params: {
						claim_party_id: settlementForm.claim_party_id,
						coverage_id: settlementForm.coverage_id,
						demand_amount: settlementForm.demand_amount,
						demand_date: settlementForm.demand_date,
						notes: settlementForm.notes || undefined,
					},
				});
				showAlert('Settlement created successfully', 'success');
			}
			handleCloseSettlementDialog();
		} catch (error: any) {
			showAlert(error?.message || 'Failed to save settlement', 'error');
		}
	};

	// Archive handlers
	const handleArchiveSettlement = async () => {
		if (!archivingSettlement) return;
		try {
			await deleteSettlement.mutateAsync({ settlementId: archivingSettlement.id, claimId });
			showAlert('Settlement archived successfully', 'success');
			setArchivingSettlement(null);
		} catch (error: any) {
			showAlert(error?.message || 'Failed to archive settlement', 'error');
		}
	};

	const handleArchiveRecovery = async () => {
		if (!archivingRecovery) return;
		try {
			await deleteRecoveryEvent.mutateAsync({ recoveryEventId: archivingRecovery.id, claimId });
			showAlert('Recovery event archived successfully', 'success');
			setArchivingRecovery(null);
		} catch (error: any) {
			showAlert(error?.message || 'Failed to archive recovery event', 'error');
		}
	};

	const totalDemanded = settlements.reduce(
		(sum, s) => sum + (s.demand_amount ? parseFloat(s.demand_amount.toString()) : 0),
		0
	);

	const isLoading = isLoadingRecovery || isLoadingSettlements;

	return (
		<Box p={3}>
			<Stack spacing={3} maxWidth={1000} mx="auto">
				{/* Summary */}
				<Paper elevation={0} sx={styles.gradientPaper}>
					<Typography fontSize={13} color={BASE_COLOR_LIGHT} marginBottom={2}>
						Settlement & Recovery Summary
					</Typography>
					<Box
						display="grid"
						gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }}
						gap={3}
					>
						<Box>
							<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={0.5}>
								Total Demanded
							</Typography>
							<Typography variant="body2" fontSize={11} color="text.secondary" marginBottom={1}>
								Sum of all settlement demands
							</Typography>
							<Typography variant="h6" fontSize={18} color="warning.main">
								{formatCurrencyExact(totalDemanded)}
							</Typography>
						</Box>
						<Box>
							<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={0.5}>
								Expected Recovery
							</Typography>
							<Typography variant="body2" fontSize={11} color="text.secondary" marginBottom={1}>
								Team's forecasted recovery
							</Typography>
							<Typography variant="h6" fontSize={18} color="primary.main">
								{formatCurrencyExact(Number(claimDetail?.expected_recovery) || 0)}
							</Typography>
						</Box>
						<Box>
							<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={0.5}>
								Actual Recovery
							</Typography>
							<Typography variant="body2" fontSize={11} color="text.secondary" marginBottom={1}>
								Payments received
							</Typography>
							<Typography variant="h6" fontSize={18} color="success.main">
								{formatCurrencyExact(Number(claimDetail?.actual_recovery) || 0)}
							</Typography>
						</Box>
						<Box>
							<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={0.5}>
								Recovery Rate
							</Typography>
							<Typography variant="body2" fontSize={11} color="text.secondary" marginBottom={1}>
								Actual vs Expected
							</Typography>
							<Typography variant="h6" fontSize={18}>
								{claimDetail?.expected_recovery && Number(claimDetail.expected_recovery) > 0
									? `${Math.round((Number(claimDetail.actual_recovery || 0) / Number(claimDetail.expected_recovery)) * 100)}%`
									: 'N/A'}
							</Typography>
						</Box>
					</Box>
				</Paper>

				{/* Settlements & Recoveries */}
				<Paper elevation={0} sx={styles.beveledPaper}>
					{/* Header */}
					<Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={2}>
						<Box display="flex" alignItems="center" gap={2}>
							<Typography fontSize={13} color={BASE_COLOR_LIGHT}>
								Settlements ({settlements.length})
							</Typography>
							<Link
								component="button"
								onClick={() => setViewMode(viewMode === 'table' ? 'timeline' : 'table')}
								underline="hover"
								sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 14 }}
							>
								{viewMode === 'table' ? 'See in timeline...' : 'See in table...'}
							</Link>
						</Box>
						<Box display="flex" gap={1} alignItems="center">
							<Button
								size="small"
								startIcon={<AttachMoney />}
								variant="outlined"
								onClick={() => handleOpenRecoveryDialog()}
								disabled={settlementsForDropdown.length === 0}
								title={settlementsForDropdown.length === 0 ? 'Create a settlement first' : ''}
							>
								Add Recovery
							</Button>
							<Button
								size="small"
								startIcon={<Gavel />}
								variant="contained"
								onClick={() => handleOpenSettlementDialog()}
								disabled={adverseParties.length === 0 || coverages.length === 0}
								title={
									adverseParties.length === 0
										? 'Add an adverse carrier party first'
										: coverages.length === 0
											? 'Add coverage first'
											: ''
								}
							>
								Add Settlement
							</Button>
							<Tooltip title="Manage">
								<IconButton
									size="small"
									onClick={() => setIsManageMode(!isManageMode)}
									sx={{ bgcolor: isManageMode ? 'action.selected' : undefined }}
								>
									<Settings
										fontSize="small"
										sx={{ color: isManageMode ? 'primary.main' : undefined }}
									/>
								</IconButton>
							</Tooltip>
						</Box>
					</Box>

					{isLoading && (
						<Stack spacing={2}>
							<Skeleton variant="rectangular" height={60} />
							<Skeleton variant="rectangular" height={60} />
						</Stack>
					)}

					{!isLoading && settlements.length === 0 && (
						<Box
							display="flex"
							flexDirection="column"
							alignItems="center"
							justifyContent="center"
							padding={4}
						>
							<Gavel sx={{ fontSize: 48, color: BASE_COLOR_LIGHT, marginBottom: 1 }} />
							<Typography fontSize={13} color={BASE_COLOR_LIGHT} fontStyle="italic">
								No settlements or recoveries recorded yet
							</Typography>
						</Box>
					)}

					{!isLoading && settlements.length > 0 && (
						<>
							<Collapse in={viewMode === 'table'} unmountOnExit>
								<SettlementTable
									settlements={settlements}
									recoveryEvents={recoveryEvents}
									isManageMode={isManageMode}
									onEditSettlement={handleOpenSettlementDialog}
									onEditRecovery={handleOpenRecoveryDialog}
									onArchiveSettlement={setArchivingSettlement}
									onArchiveRecovery={setArchivingRecovery}
								/>
							</Collapse>
							<Collapse in={viewMode === 'timeline'} unmountOnExit>
								<SettlementTimeline
									settlements={settlements}
									recoveryEvents={recoveryEvents}
									isManageMode={isManageMode}
									onEditSettlement={handleOpenSettlementDialog}
									onEditRecovery={handleOpenRecoveryDialog}
									onArchiveSettlement={setArchivingSettlement}
									onArchiveRecovery={setArchivingRecovery}
								/>
							</Collapse>
						</>
					)}
				</Paper>
			</Stack>

			{/* Dialogs */}
			<SettlementFormDialog
				open={showSettlementDialog}
				onClose={handleCloseSettlementDialog}
				onSubmit={handleSubmitSettlement}
				formData={settlementForm}
				setFormData={setSettlementForm}
				adverseParties={adverseParties}
				coverages={coverages}
				isEditing={!!editingSettlement}
				isSubmitting={createSettlement.isPending || updateSettlement.isPending}
			/>

			<RecoveryFormDialog
				open={showRecoveryDialog}
				onClose={handleCloseRecoveryDialog}
				onSubmit={handleSubmitRecovery}
				formData={recoveryForm}
				setFormData={setRecoveryForm}
				settlements={settlementsForDropdown}
				isEditing={!!editingRecovery}
				isSubmitting={createRecoveryEvent.isPending || updateRecoveryEvent.isPending}
			/>

			{archivingSettlement && (
				<BasicDialog
					title="Archive Settlement"
					primaryAction={{
						label: deleteSettlement.isPending ? 'Archiving...' : 'Archive',
						onClick: handleArchiveSettlement,
						color: 'error',
						disabled: deleteSettlement.isPending,
					}}
					secondaryActions={[{ label: 'Cancel', onClick: () => setArchivingSettlement(null) }]}
					onClose={() => setArchivingSettlement(null)}
					width={450}
				>
					<Box>
						<Typography fontSize={14} marginBottom={2}>
							Are you sure you want to archive this settlement?
						</Typography>
						<Box bgcolor="#fff8e1" padding={2} borderRadius={1} marginBottom={2}>
							<Typography fontSize={13} fontWeight={600}>
								{archivingSettlement.party_name}
							</Typography>
							<Typography fontSize={12} color="text.secondary">
								{formatCoverageType(archivingSettlement.loss_type)} ·{' '}
								{formatCurrencyExact(parseFloat(archivingSettlement.demand_amount.toString()))}
							</Typography>
						</Box>
						{getRecoveryCountForSettlement(archivingSettlement.id) > 0 && (
							<Box
								bgcolor="#fff3e0"
								padding={2}
								borderRadius={1}
								marginBottom={2}
								display="flex"
								gap={1}
								alignItems="flex-start"
							>
								<Warning color="warning" sx={{ fontSize: 20, mt: 0.25 }} />
								<Box>
									<Typography fontSize={13} fontWeight={600} color="warning.dark">
										This will also archive:
									</Typography>
									<Typography fontSize={13} color="warning.dark">
										• {getRecoveryCountForSettlement(archivingSettlement.id)} recovery event
										{getRecoveryCountForSettlement(archivingSettlement.id) > 1 ? 's' : ''}
									</Typography>
								</Box>
							</Box>
						)}
						<Typography fontSize={12} color="text.secondary">
							The settlement will be archived and hidden from view, but the record will be preserved for
							historical purposes.
						</Typography>
					</Box>
				</BasicDialog>
			)}

			{archivingRecovery && (
				<BasicDialog
					title="Archive Recovery Event"
					primaryAction={{
						label: deleteRecoveryEvent.isPending ? 'Archiving...' : 'Archive',
						onClick: handleArchiveRecovery,
						color: 'error',
						disabled: deleteRecoveryEvent.isPending,
					}}
					secondaryActions={[{ label: 'Cancel', onClick: () => setArchivingRecovery(null) }]}
					onClose={() => setArchivingRecovery(null)}
					width={450}
				>
					<Box>
						<Typography fontSize={14} marginBottom={2}>
							Are you sure you want to archive this recovery event?
						</Typography>
						<Box bgcolor="#e8f5e9" padding={2} borderRadius={1} marginBottom={2}>
							<Typography fontSize={13} fontWeight={600} color="success.main">
								{formatCurrencyExact(parseFloat(archivingRecovery.recovery_amount.toString()))}
							</Typography>
							<Typography fontSize={12} color="text.secondary">
								{dayjs(archivingRecovery.recovery_date).format('MMM D, YYYY')}
								{archivingRecovery.recovery_source && ` · ${archivingRecovery.recovery_source}`}
							</Typography>
						</Box>
						<Typography fontSize={12} color="text.secondary">
							The recovery event will be archived and hidden from view, but the record will be preserved
							for historical purposes.
						</Typography>
					</Box>
				</BasicDialog>
			)}
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
