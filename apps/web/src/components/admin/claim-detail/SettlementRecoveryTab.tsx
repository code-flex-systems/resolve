'use client';

import {
	IconAlertTriangle,
	IconCurrencyDollar,
	IconGavel,
	IconSettings,
} from '@tabler/icons-react';
import Tooltip from '@/components/ui/Tooltip';
import Card from '@/components/ui/Card';
import Collapse from '@/components/ui/Collapse';
import Skeleton from '@/components/ui/Skeleton';
import Button from '@/components/ui/Button';
import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { useRecoveryTrpc } from '@/hooks/trpc/useRecoveryTrpc';
import { useFinancialReportingInvalidation } from '@/hooks/trpc/useFinancialReportingTrpc';
import BasicDialog from '@/components/common/BasicDialog';
import SettlementFormDialog, { SettlementFormData, DROP_CHECK_VALUE } from './SettlementFormDialog';
import RecoveryFormDialog, { RecoveryFormData } from './RecoveryFormDialog';
import config from '@/config/config';
import SettlementTable from './SettlementTable';
import SettlementTimeline from './SettlementTimeline';
import RecoverySummaryTable from './RecoverySummaryTable';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { formatCoverageType } from '@/lib/utils/claimUtils';
import { SettlementStatus, SettlementStructure, PaymentFrequency } from '@/config/enums';
import { useAlertStore } from '@/stores/useAlertStore';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

interface RecoveryTabProps {
	claimId: string;
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
	// New fields
	adverse_party_reference: '',
	settlement_structure: '',
	payment_amount: '',
	payment_frequency: '',
	settled_by: '',
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
	const reportingInvalidation = useFinancialReportingInvalidation();
	const showAlert = useAlertStore((state) => state.showAlert);

	// Data queries
	const { data: claimDetail } = trpc.claim.getClaimDetail.useQuery({ claimId });
	const { data: recoveryEvents = [], isLoading: isLoadingRecovery } =
		useRecoveryTrpc().listRecoveryEvents({ claimId }, { enabled: !!claimId });
	const { data: settlements = [], isLoading: isLoadingSettlements } =
		trpc.settlement.listSettlements.useQuery({ claimId }, { enabled: !!claimId });
	const { data: settlementsForDropdown = [] } = trpc.settlement.getSettlementsForDropdown.useQuery(
		{ claimId },
		{ enabled: !!claimId }
	);
	const { data: claimParties = [] } = trpc.party.getClaimParties.useQuery(
		{ claimId },
		{ enabled: !!claimId }
	);
	// Get only adverse parties (with roles from adverse_party_role reference list) for settlement creation
	const { data: adverseParties = [] } = trpc.party.getClaimParties.useQuery(
		{ claimId, roleListEntity: 'adverse_party_role' },
		{ enabled: !!claimId }
	);
	const { data: coverages = [] } = trpc.coverage.getCoverages.useQuery(
		{ claimId },
		{ enabled: !!claimId }
	);
	// Fetch admin users for settled_by dropdown (filtered to Admin role for now)
	const { data: adminUsers = [] } = trpc.user.getUsers.useQuery(
		{ role: config.ROLES.ADMIN },
		{ enabled: !!claimId }
	);
	const { data: recoverySummary = [], isLoading: isLoadingSummary } =
		useRecoveryTrpc().getRecoverySummaryByCoverage({ claimId }, { enabled: !!claimId });

	// Mutations
	const createRecoveryEvent = useRecoveryTrpc().createRecoveryEvent;
	const updateRecoveryEvent = useRecoveryTrpc().updateRecoveryEvent;
	const deleteRecoveryEvent = useRecoveryTrpc().deleteRecoveryEvent;
	const createSettlement = trpc.settlement.createSettlement.useMutation({
		onSuccess: () => {
			utils.settlement.listSettlements.invalidate({ claimId });
			utils.settlement.getSettlementsForDropdown.invalidate({ claimId });
			reportingInvalidation.onSettlementMutate();
		},
	});
	const updateSettlement = trpc.settlement.updateSettlement.useMutation({
		onSuccess: () => {
			utils.settlement.listSettlements.invalidate({ claimId });
			utils.settlement.getSettlementsForDropdown.invalidate({ claimId });
			reportingInvalidation.onSettlementMutate();
		},
	});
	const deleteSettlement = trpc.settlement.deleteSettlement.useMutation({
		onSuccess: () => {
			// Invalidate settlement queries
			utils.settlement.listSettlements.invalidate({ claimId });
			utils.settlement.getSettlementsForDropdown.invalidate({ claimId });
			// Invalidate recovery queries (cascade deletes recovery events)
			utils.recovery.listRecoveryEvents.invalidate({ claimId });
			utils.recovery.getRecoverySummaryByCoverage.invalidate({ claimId });
			utils.recovery.listRecoveryEventsWithFilters.invalidate();
			// Invalidate recovery metrics
			utils.recovery.getRecoveryMetricsSummary.invalidate();
			utils.recovery.getRecoveryMetricsTimeSeries.invalidate();
			// Invalidate claim detail to update actual_recovery totals
			utils.claim.getClaimDetail.invalidate({ claimId });
			reportingInvalidation.onSettlementMutate();
		},
	});

	// Pre-compute recovery counts by settlement to avoid O(N) filtering per call
	const recoveryCounts = useMemo(() => {
		const map = new Map<string, number>();
		recoveryEvents.forEach((r) => {
			if (r.settlement_id) {
				map.set(r.settlement_id, (map.get(r.settlement_id) ?? 0) + 1);
			}
		});
		return map;
	}, [recoveryEvents]);

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
					claimId,
					params: {
						settlement_id: recoveryForm.settlement_id,
						recovery_date: recoveryForm.recovery_date,
						recovery_amount: recoveryForm.recovery_amount,
						recovery_source: recoveryForm.recovery_source || undefined,
						notes: recoveryForm.notes || undefined,
					},
				});
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
			// Map is_drop_check to the DROP_CHECK_VALUE for display
			const settledByValue = settlement.is_drop_check
				? DROP_CHECK_VALUE
				: settlement.settled_by || '';
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
				// New fields
				adverse_party_reference: settlement.adverse_party_reference || '',
				settlement_structure: settlement.settlement_structure || '',
				payment_amount: settlement.payment_amount?.toString() || '',
				payment_frequency: settlement.payment_frequency || '',
				settled_by: settledByValue,
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

		// Map settled_by dropdown value to backend fields
		const isDropCheck = settlementForm.settled_by === DROP_CHECK_VALUE;
		const settledByUserId = isDropCheck ? null : settlementForm.settled_by || null;

		// Determine payment fields - send null if not a payment plan or if fields are empty
		const isPaymentPlan = settlementForm.settlement_structure === SettlementStructure.PAYMENT_PLAN;
		const paymentAmount =
			isPaymentPlan && settlementForm.payment_amount ? settlementForm.payment_amount : null;
		const paymentFrequency =
			isPaymentPlan && settlementForm.payment_frequency
				? (settlementForm.payment_frequency as PaymentFrequency)
				: null;

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
						agreed_liability_percentage: settlementForm.agreed_liability_percentage || null,
						settlement_amount: settlementForm.settlement_amount || null,
						settlement_date: settlementForm.settlement_date || null,
						notes: settlementForm.notes || null,
						// New fields
						adverse_party_reference: settlementForm.adverse_party_reference || null,
						settlement_structure:
							(settlementForm.settlement_structure as SettlementStructure) ||
							SettlementStructure.LUMP_SUM,
						payment_amount: paymentAmount,
						payment_frequency: paymentFrequency,
						settled_by: settledByUserId,
						is_drop_check: isDropCheck,
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
						// New fields
						adverse_party_reference: settlementForm.adverse_party_reference || undefined,
						settlement_structure:
							(settlementForm.settlement_structure as SettlementStructure) || undefined,
						payment_amount: paymentAmount || undefined,
						payment_frequency: paymentFrequency || undefined,
						settled_by: settledByUserId || undefined,
						is_drop_check: isDropCheck || undefined,
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

	const isLoading = isLoadingRecovery || isLoadingSettlements;

	return (
		<div style={{ padding: 24 }}>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 24,
					maxWidth: 1000,
					margin: '0 auto',
				}}
			>
				{/* Summary */}
				<Card variant="float" padding="lg">
					<span style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
						Settlement & Recovery Summary
					</span>
					<RecoverySummaryTable
						data={recoverySummary}
						ourLiabilityPercentage={claimDetail?.our_liability_percentage ?? 0}
						isLoading={isLoadingSummary}
					/>
				</Card>

				{/* Settlements & Recoveries */}
				<Card variant="beveled" padding="lg">
					{/* Header */}
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							marginBottom: 16,
						}}
					>
						<div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
							<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
								Settlements ({settlements.length})
							</span>
							<button
								onClick={() => setViewMode(viewMode === 'table' ? 'timeline' : 'table')}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 4,
									fontSize: 14,
									background: 'none',
									border: 'none',
									padding: 0,
									font: 'inherit',
									color: 'var(--text-accent)',
									cursor: 'pointer',
								}}
							>
								{viewMode === 'table' ? 'See in timeline...' : 'See in table...'}
							</button>
						</div>
						<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
							<Button
								size="sm"
								startIcon={<IconCurrencyDollar size={20} />}
								variant="outlined"
								onClick={() => handleOpenRecoveryDialog()}
								disabled={settlementsForDropdown.length === 0}
								title={settlementsForDropdown.length === 0 ? 'Create a settlement first' : ''}
							>
								Add Recovery
							</Button>
							<Button
								size="sm"
								startIcon={<IconGavel size={20} />}
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
							<Tooltip content="Manage">
								<Button
									variant="icon"
									size="sm"
									onClick={() => setIsManageMode(!isManageMode)}
									style={{ backgroundColor: isManageMode ? 'var(--bg-tertiary)' : undefined }}
								>
									<IconSettings
										size={20}
										style={{ color: isManageMode ? 'primary.main' : undefined }}
									/>
								</Button>
							</Tooltip>
						</div>
					</div>

					{isLoading && (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
							<Skeleton variant="rect" height={60} />
							<Skeleton variant="rect" height={60} />
						</div>
					)}

					{!isLoading && settlements.length === 0 && (
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								justifyContent: 'center',
								padding: 32,
							}}
						>
							<IconGavel size={48} style={{ color: 'var(--text-muted)', marginBottom: 1 }} />
							<span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
								No settlements or recoveries recorded yet
							</span>
						</div>
					)}

					{!isLoading && settlements.length > 0 && (
						<>
							<Collapse open={viewMode === 'table'}>
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
							<Collapse open={viewMode === 'timeline'}>
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
				</Card>
			</div>

			{/* Dialogs */}
			<SettlementFormDialog
				open={showSettlementDialog}
				onClose={handleCloseSettlementDialog}
				onSubmit={handleSubmitSettlement}
				formData={settlementForm}
				setFormData={setSettlementForm}
				adverseParties={adverseParties}
				coverages={coverages}
				adminUsers={adminUsers}
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
					<div style={{ display: 'flex', flexDirection: 'column' as const }}>
						<span style={{ fontSize: 14, marginBottom: 16 }}>
							Are you sure you want to archive this settlement?
						</span>
						<div
							style={{
								display: 'flex',
								flexDirection: 'column' as const,
								backgroundColor: 'var(--status-warning-bg)',
								padding: 16,
								borderRadius: 4,
								marginBottom: 16,
							}}
						>
							<span style={{ fontSize: 13, fontWeight: 600 }}>
								{archivingSettlement.party_name}
							</span>
							<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
								{formatCoverageType(archivingSettlement.loss_type)} ·{' '}
								{formatCurrencyExact(parseFloat(archivingSettlement.demand_amount.toString()))}
							</span>
						</div>
						{(recoveryCounts.get(archivingSettlement.id) ?? 0) > 0 && (
							<div
								style={{
									backgroundColor: 'var(--status-warning-bg)',
									padding: 16,
									borderRadius: 4,
									marginBottom: 16,
									display: 'flex',
									gap: 8,
									alignItems: 'flex-start',
								}}
							>
								<IconAlertTriangle color="warning" style={{ fontSize: 20, marginTop: 2 }} />
								<div style={{ display: 'flex', flexDirection: 'column' as const }}>
									<span style={{ fontSize: 13, fontWeight: 600, color: 'var(--status-warning)' }}>
										This will also archive:
									</span>
									<span style={{ fontSize: 13, color: 'var(--status-warning)' }}>
										• {recoveryCounts.get(archivingSettlement.id) ?? 0} recovery event
										{(recoveryCounts.get(archivingSettlement.id) ?? 0) > 1 ? 's' : ''}
									</span>
								</div>
							</div>
						)}
						<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
							The settlement will be archived and hidden from view, but the record will be preserved
							for historical purposes.
						</span>
					</div>
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
					<div style={{ display: 'flex', flexDirection: 'column' as const }}>
						<span style={{ fontSize: 14, marginBottom: 16 }}>
							Are you sure you want to archive this recovery event?
						</span>
						<div
							style={{
								display: 'flex',
								flexDirection: 'column' as const,
								backgroundColor: 'var(--status-success-bg)',
								padding: 16,
								borderRadius: 4,
								marginBottom: 16,
							}}
						>
							<span style={{ fontSize: 13, fontWeight: 600, color: 'var(--status-success)' }}>
								{formatCurrencyExact(parseFloat(archivingRecovery.recovery_amount.toString()))}
							</span>
							<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
								{dayjs(archivingRecovery.recovery_date).format('MMM D, YYYY')}
								{archivingRecovery.recovery_source && ` · ${archivingRecovery.recovery_source}`}
							</span>
						</div>
						<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
							The recovery event will be archived and hidden from view, but the record will be
							preserved for historical purposes.
						</span>
					</div>
				</BasicDialog>
			)}
		</div>
	);
}
