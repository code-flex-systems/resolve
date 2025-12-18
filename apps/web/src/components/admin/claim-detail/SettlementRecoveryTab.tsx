'use client';

import { Box, Button, Chip, Collapse, IconButton, Paper, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import AttachMoney from '@mui/icons-material/AttachMoney';
import Gavel from '@mui/icons-material/Gavel';
import Settings from '@mui/icons-material/Settings';
import Edit from '@mui/icons-material/Edit';
import Archive from '@mui/icons-material/Archive';
import Warning from '@mui/icons-material/Warning';
import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useRecoveryTrpc } from '@/hooks/trpc/useRecoveryTrpc';
import Highlight from '@/components/common/Highlight';
import BasicDialog from '@/components/common/BasicDialog';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import SettlementFormDialog, { SettlementFormData } from './SettlementFormDialog';
import RecoveryFormDialog, { RecoveryFormData } from './RecoveryFormDialog';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { BASE_COLOR_LIGHT, containerStyles } from '@/styles/theme';
import { SettlementStatus } from '@/config/enums';
import { useAlertStore } from '@/stores/useAlertStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';

dayjs.extend(relativeTime);
dayjs.extend(utc);

const capitalize = (str: string | null | undefined) => {
	if (!str) return '';
	return str.charAt(0).toUpperCase() + str.slice(1);
};

interface RecoveryTabProps {
	claimId: number;
}


type TimelineItem =
	| { type: 'settlement'; date: Date; data: any; settlementId: number }
	| { type: 'recovery'; date: Date; data: any; settlementId: number };

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

export default function SettlementRecoveryTab({ claimId }: RecoveryTabProps) {
	const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
	const [showSettlementDialog, setShowSettlementDialog] = useState(false);
	const [recoveryForm, setRecoveryForm] = useState<RecoveryFormData>(initialRecoveryForm);
	const [settlementForm, setSettlementForm] = useState<SettlementFormData>(initialSettlementForm);
	const [activeSettlementId, setActiveSettlementId] = useState<number | null>(null);
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

	// Filter to adverse parties only
	const adverseParties = claimParties.filter((cp) => cp.party?.party_category === 'adverse_carrier');

	// Build unified timeline sorted by date (newest first), then by created_at for deterministic ordering
	const timeline = useMemo<TimelineItem[]>(() => {
		const items: TimelineItem[] = [
			...settlements.map((s) => ({
				type: 'settlement' as const,
				date: s.demand_date,
				data: s,
				settlementId: s.id,
			})),
			...recoveryEvents.map((r) => ({
				type: 'recovery' as const,
				date: r.recovery_date,
				data: r,
				settlementId: r.settlement_id,
			})),
		];
		return items.sort((a, b) => {
			const dateDiff = dayjs(b.date).valueOf() - dayjs(a.date).valueOf();
			if (dateDiff !== 0) return dateDiff;
			// Secondary sort by created_at for deterministic ordering when dates match
			return dayjs(b.data.created_at).valueOf() - dayjs(a.data.created_at).valueOf();
		});
	}, [settlements, recoveryEvents]);

	// Count recovery events for a settlement (for archive warning)
	const getRecoveryCountForSettlement = (settlementId: number) => {
		return recoveryEvents.filter((r) => r.settlement_id === settlementId).length;
	};

	// Get settlement info for a recovery event
	const getSettlementForRecovery = (settlementId: number) => {
		return settlements.find((s) => s.id === settlementId);
	};

	// Handle clicking on a timeline item - expand/collapse the related group
	const handleItemClick = (settlementId: number) => {
		setActiveSettlementId((prev) => (prev === settlementId ? null : settlementId));
	};

	// Check if an item is in the active group
	const isItemActive = (item: TimelineItem) => {
		return activeSettlementId !== null && item.settlementId === activeSettlementId;
	};

	// Recovery Dialog handlers
	const handleOpenRecoveryDialog = (recovery?: any) => {
		if (recovery) {
			setEditingRecovery(recovery);
			setRecoveryForm({
				settlement_id: recovery.settlement_id,
				// Use UTC to avoid timezone shifting the date back a day
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
				// Manually invalidate queries since hook doesn't have claimId
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
				// Use UTC to avoid timezone shifting the date back a day
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
			await deleteSettlement.mutateAsync({
				settlementId: archivingSettlement.id,
				claimId,
			});
			showAlert('Settlement archived successfully', 'success');
			setArchivingSettlement(null);
		} catch (error: any) {
			showAlert(error?.message || 'Failed to archive settlement', 'error');
		}
	};

	const handleArchiveRecovery = async () => {
		if (!archivingRecovery) return;
		try {
			await deleteRecoveryEvent.mutateAsync({
				recoveryEventId: archivingRecovery.id,
				claimId,
			});
			showAlert('Recovery event archived successfully', 'success');
			setArchivingRecovery(null);
		} catch (error: any) {
			showAlert(error?.message || 'Failed to archive recovery event', 'error');
		}
	};

	const totalRecovered = recoveryEvents.reduce(
		(sum, event) => sum + (event.recovery_amount ? parseFloat(event.recovery_amount.toString()) : 0),
		0
	);

	const totalDemanded = settlements.reduce(
		(sum, s) => sum + (s.demand_amount ? parseFloat(s.demand_amount.toString()) : 0),
		0
	);

	const getStatusColor = (status: string) => {
		switch (status) {
			case SettlementStatus.SETTLED:
				return 'success';
			case SettlementStatus.CLOSED:
				return 'default';
			default:
				return 'warning';
		}
	};

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
						gridTemplateColumns={{
							xs: '1fr',
							sm: 'repeat(2, 1fr)',
							md: 'repeat(4, 1fr)',
						}}
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

				{/* Timeline */}
				<Paper elevation={0} sx={styles.beveledPaper}>
					{/* Header with legend and actions */}
					<Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={2}>
						<Box display="flex" alignItems="center" gap={3}>
							<Typography fontSize={13} color={BASE_COLOR_LIGHT}>
								Timeline ({timeline.length})
							</Typography>
							{/* Legend */}
							<Box display="flex" alignItems="center" gap={2}>
								<Box display="flex" alignItems="center" gap={0.5}>
									<Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'warning.main' }} />
									<Typography fontSize={11} color={BASE_COLOR_LIGHT}>
										Settlement
									</Typography>
								</Box>
								<Box display="flex" alignItems="center" gap={0.5}>
									<Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main' }} />
									<Typography fontSize={11} color={BASE_COLOR_LIGHT}>
										Recovery
									</Typography>
								</Box>
							</Box>
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
									sx={{
										bgcolor: isManageMode ? 'action.selected' : undefined,
									}}
								>
									<Settings fontSize="small" />
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

					{!isLoading && timeline.length === 0 && (
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

					{!isLoading && timeline.length > 0 && (
						<Box>
							{/* Custom timeline using flexbox for proper connector behavior */}
							{timeline.map((item, index) => {
								const isSettlement = item.type === 'settlement';
								const settlement = isSettlement ? item.data : null;
								const recovery = !isSettlement ? item.data : null;
								const relatedSettlement = !isSettlement
									? getSettlementForRecovery(item.settlementId)
									: null;
								const isActive = isItemActive(item);
								const isGrayedOut = activeSettlementId !== null && !isActive;
								const isLastItem = index === timeline.length - 1;

								return (
									<Box key={`${item.type}-${item.data.id}`} display="flex">
										{/* Left column: indicator and connector */}
										<Box
											display="flex"
											flexDirection="column"
											alignItems="center"
											sx={{ width: 24, flexShrink: 0 }}
										>
											{/* Indicator dot */}
											<Box
												sx={{
													width: 12,
													height: 12,
													borderRadius: '50%',
													bgcolor: isSettlement ? 'warning.main' : 'success.main',
													opacity: isGrayedOut ? 0.4 : 1,
													transition: 'opacity 0.3s ease',
													flexShrink: 0,
												}}
											/>
											{/* Connector line - extends with content */}
											{!isLastItem && (
												<Box
													sx={{
														width: 2,
														flex: 1,
														bgcolor: 'divider',
														minHeight: 16,
													}}
												/>
											)}
										</Box>

										{/* Right column: content */}
										<Box
											flex={1}
											sx={{
												pl: 2,
												pb: isLastItem ? 0 : 2,
												opacity: isGrayedOut ? 0.4 : 1,
												transition: 'opacity 0.3s ease',
											}}
										>
											{/* Summary row - clickable */}
											<Box display="flex" justifyContent="space-between" alignItems="flex-start">
												<Box
													onClick={() => handleItemClick(item.settlementId)}
													sx={{
														cursor: 'pointer',
														'&:hover': { bgcolor: 'action.hover' },
														borderRadius: 1,
														p: 1,
														ml: -1,
														flex: 1,
													}}
												>
													<Box
														display="flex"
														justifyContent="space-between"
														alignItems="center"
													>
														{/* Stacked info with text hierarchy */}
														<Box>
															{/* Date - prominent */}
															<Typography fontSize={14} fontWeight={600}>
																{dayjs(item.date).format('MMM D')}
															</Typography>
															{/* Secondary info - party/source */}
															{isSettlement ? (
																<Typography fontSize={12} color="text.secondary">
																	{settlement.party_name}
																	{settlement.coverage_type && (
																		<> · {capitalize(settlement.coverage_type)}</>
																	)}
																</Typography>
															) : (
																<Typography fontSize={12} color="text.secondary">
																	{recovery.recovery_source || 'No source'}
																	{relatedSettlement && (
																		<>
																			{' '}
																			· {relatedSettlement.party_name} ·{' '}
																			{capitalize(
																				relatedSettlement.coverage_type
																			)}
																		</>
																	)}
																</Typography>
															)}
															{/* Amount - colored */}
															<Typography
																fontSize={13}
																fontWeight={600}
																color={isSettlement ? 'warning.main' : 'success.main'}
															>
																{isSettlement
																	? formatCurrencyExact(
																			parseFloat(
																				settlement.demand_amount.toString()
																			)
																		)
																	: formatCurrencyExact(
																			parseFloat(
																				recovery.recovery_amount.toString()
																			)
																		)}
															</Typography>
														</Box>
														{/* Status chip for settlements */}
														{isSettlement && (
															<Chip
																label={settlement.status}
																size="small"
																color={getStatusColor(settlement.status)}
															/>
														)}
													</Box>
												</Box>
												{/* Edit/Archive buttons - visible in manage mode */}
												{isManageMode && (
													<Box display="flex" gap={0.5} ml={1}>
														<BasicButtonStyled
															buttonProps={{
																onClick: () =>
																	isSettlement
																		? handleOpenSettlementDialog(settlement)
																		: handleOpenRecoveryDialog(recovery),
															}}
															tooltipProps={{
																title: `Edit ${isSettlement ? 'settlement' : 'recovery'}`,
															}}
															icon={<Edit />}
															compact
														/>
														<BasicButtonStyled
															buttonProps={{
																onClick: () =>
																	isSettlement
																		? setArchivingSettlement(settlement)
																		: setArchivingRecovery(recovery),
															}}
															tooltipProps={{
																title: `Archive ${isSettlement ? 'settlement' : 'recovery'}`,
															}}
															icon={<Archive sx={{ color: 'error.main' }} />}
															compact
														/>
													</Box>
												)}
											</Box>

											{/* Expanded details with smooth transition */}
											<Collapse in={isActive} timeout={300}>
												<Box sx={{ mt: 1 }}>
													<Paper elevation={0} sx={styles.detailCard}>
														{isSettlement ? (
															<>
																<Typography
																	fontSize={12}
																	color={BASE_COLOR_LIGHT}
																	marginBottom={1}
																>
																	Settlement Details
																</Typography>
																<Box
																	display="grid"
																	gridTemplateColumns="1fr 1fr"
																	gap={2}
																>
																	<Box>
																		<Typography
																			fontSize={11}
																			color={BASE_COLOR_LIGHT}
																		>
																			Party
																		</Typography>
																		<Typography fontSize={13}>
																			<Highlight>
																				{settlement.party_name}
																			</Highlight>
																		</Typography>
																	</Box>
																	<Box>
																		<Typography
																			fontSize={11}
																			color={BASE_COLOR_LIGHT}
																		>
																			Coverage
																		</Typography>
																		<Typography fontSize={13}>
																			<Highlight>
																				{capitalize(settlement.coverage_type)}
																			</Highlight>
																		</Typography>
																	</Box>
																	<Box>
																		<Typography
																			fontSize={11}
																			color={BASE_COLOR_LIGHT}
																		>
																			Demand Amount
																		</Typography>
																		<Typography
																			fontSize={13}
																			fontWeight={600}
																			color="warning.main"
																		>
																			{formatCurrencyExact(
																				parseFloat(
																					settlement.demand_amount.toString()
																				)
																			)}
																		</Typography>
																	</Box>
																	<Box>
																		<Typography
																			fontSize={11}
																			color={BASE_COLOR_LIGHT}
																		>
																			Demand Date
																		</Typography>
																		<Typography fontSize={13}>
																			{dayjs(settlement.demand_date).format(
																				'MMM D, YYYY'
																			)}
																		</Typography>
																	</Box>
																	{settlement.settlement_amount && (
																		<Box>
																			<Typography
																				fontSize={11}
																				color={BASE_COLOR_LIGHT}
																			>
																				Settlement Amount
																			</Typography>
																			<Typography
																				fontSize={13}
																				fontWeight={600}
																				color="success.main"
																			>
																				{formatCurrencyExact(
																					parseFloat(
																						settlement.settlement_amount.toString()
																					)
																				)}
																			</Typography>
																		</Box>
																	)}
																	{settlement.agreed_liability_percentage && (
																		<Box>
																			<Typography
																				fontSize={11}
																				color={BASE_COLOR_LIGHT}
																			>
																				Agreed Liability
																			</Typography>
																			<Typography fontSize={13}>
																				{settlement.agreed_liability_percentage}
																				%
																			</Typography>
																		</Box>
																	)}
																	{settlement.settlement_date && (
																		<Box>
																			<Typography
																				fontSize={11}
																				color={BASE_COLOR_LIGHT}
																			>
																				Settlement Date
																			</Typography>
																			<Typography fontSize={13}>
																				{dayjs(
																					settlement.settlement_date
																				).format('MMM D, YYYY')}
																			</Typography>
																		</Box>
																	)}
																</Box>
																{settlement.notes && (
																	<Box mt={2}>
																		<Typography
																			fontSize={11}
																			color={BASE_COLOR_LIGHT}
																		>
																			Notes
																		</Typography>
																		<Typography
																			fontSize={13}
																			color="text.secondary"
																		>
																			{settlement.notes}
																		</Typography>
																	</Box>
																)}
															</>
														) : (
															<>
																<Typography
																	fontSize={12}
																	color={BASE_COLOR_LIGHT}
																	marginBottom={1}
																>
																	Recovery Details
																</Typography>
																<Box
																	display="grid"
																	gridTemplateColumns="1fr 1fr"
																	gap={2}
																>
																	<Box>
																		<Typography
																			fontSize={11}
																			color={BASE_COLOR_LIGHT}
																		>
																			Amount
																		</Typography>
																		<Typography
																			fontSize={13}
																			fontWeight={600}
																			color="success.main"
																		>
																			{formatCurrencyExact(
																				parseFloat(
																					recovery.recovery_amount.toString()
																				)
																			)}
																		</Typography>
																	</Box>
																	<Box>
																		<Typography
																			fontSize={11}
																			color={BASE_COLOR_LIGHT}
																		>
																			Date
																		</Typography>
																		<Typography fontSize={13}>
																			{dayjs(recovery.recovery_date).format(
																				'MMM D, YYYY'
																			)}
																		</Typography>
																	</Box>
																	{recovery.recovery_source && (
																		<Box>
																			<Typography
																				fontSize={11}
																				color={BASE_COLOR_LIGHT}
																			>
																				Source
																			</Typography>
																			<Typography fontSize={13}>
																				<Highlight>
																					{recovery.recovery_source}
																				</Highlight>
																			</Typography>
																		</Box>
																	)}
																	{relatedSettlement && (
																		<Box>
																			<Typography
																				fontSize={11}
																				color={BASE_COLOR_LIGHT}
																			>
																				Settlement
																			</Typography>
																			<Typography fontSize={13}>
																				{relatedSettlement.party_name} ·{' '}
																				{capitalize(
																					relatedSettlement.coverage_type
																				)}{' '}
																				·{' '}
																				{formatCurrencyExact(
																					parseFloat(
																						relatedSettlement.demand_amount.toString()
																					)
																				)}
																			</Typography>
																		</Box>
																	)}
																</Box>
																{recovery.notes && (
																	<Box mt={2}>
																		<Typography
																			fontSize={11}
																			color={BASE_COLOR_LIGHT}
																		>
																			Notes
																		</Typography>
																		<Typography
																			fontSize={13}
																			color="text.secondary"
																		>
																			{recovery.notes}
																		</Typography>
																	</Box>
																)}
															</>
														)}
													</Paper>
												</Box>
											</Collapse>
										</Box>
									</Box>
								);
							})}

							{/* Summary footer */}
							<Box mt={3} display="flex" gap={2}>
								<Box flex={1} padding={2} bgcolor="#fff8e1" borderRadius={1}>
									<Box display="flex" justifyContent="space-between" alignItems="center">
										<Typography fontSize={13} fontWeight={600}>
											Total Demanded
										</Typography>
										<Typography fontSize={14} fontWeight={700} color="warning.main">
											{formatCurrencyExact(totalDemanded)}
										</Typography>
									</Box>
								</Box>
								<Box flex={1} padding={2} bgcolor="#e8f5e9" borderRadius={1}>
									<Box display="flex" justifyContent="space-between" alignItems="center">
										<Typography fontSize={13} fontWeight={600}>
											Actual Recovery
										</Typography>
										<Typography fontSize={14} fontWeight={700} color="success.main">
											{formatCurrencyExact(totalRecovered)}
										</Typography>
									</Box>
								</Box>
							</Box>
						</Box>
					)}
				</Paper>
			</Stack>

			{/* Add/Edit Settlement Dialog */}
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

			{/* Add/Edit Recovery Event Dialog */}
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

			{/* Archive Settlement Confirmation Dialog */}
			{archivingSettlement && (
				<BasicDialog
					title="Archive Settlement"
					primaryAction={{
						label: deleteSettlement.isPending ? 'Archiving...' : 'Archive',
						onClick: handleArchiveSettlement,
						color: 'error',
						disabled: deleteSettlement.isPending,
					}}
					secondaryActions={[
						{
							label: 'Cancel',
							onClick: () => setArchivingSettlement(null),
						},
					]}
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
								{capitalize(archivingSettlement.coverage_type)} ·{' '}
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

			{/* Archive Recovery Confirmation Dialog */}
			{archivingRecovery && (
				<BasicDialog
					title="Archive Recovery Event"
					primaryAction={{
						label: deleteRecoveryEvent.isPending ? 'Archiving...' : 'Archive',
						onClick: handleArchiveRecovery,
						color: 'error',
						disabled: deleteRecoveryEvent.isPending,
					}}
					secondaryActions={[
						{
							label: 'Cancel',
							onClick: () => setArchivingRecovery(null),
						},
					]}
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
	detailCard: {
		...containerStyles.beveledCard,
		padding: '16px',
		backgroundColor: '#fafafa',
	},
};
