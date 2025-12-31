'use client';

import { Box, Button, Chip, IconButton, Paper, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import AttachMoney from '@mui/icons-material/AttachMoney';
import Settings from '@mui/icons-material/Settings';
import { useCallback, useMemo, useState } from 'react';
import { DataGridPro, GridColDef, GridRenderCellParams } from '@mui/x-data-grid-pro';
import { trpc } from '@/lib/trpc';
import BasicDialog from '@/components/common/BasicDialog';
import PaymentFormDialog, { PaymentFormData } from './PaymentFormDialog';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { formatCoverageType } from '@/lib/utils/claimUtils';
import { dateSortComparator, numericSortComparator, stringSortComparator } from '@/lib/utils/utils';
import { BASE_COLOR_LIGHT, containerStyles } from '@/styles/theme';
import { useAlertStore } from '@/stores/useAlertStore';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import BasicIconButton from '@/components/common/BasicIconButton';
import Edit from '@mui/icons-material/Edit';
import Archive from '@mui/icons-material/Archive';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';

dayjs.extend(utc);

interface PaymentsTabProps {
	claimId: number;
}

const initialPaymentForm: PaymentFormData = {
	coverage_id: '',
	payment_date: dayjs().format('YYYY-MM-DD'),
	payment_amount: '',
	is_subrogable: true,
	is_expense: false,
	payee_claim_party_id: null,
	description: '',
};

interface PaymentRow {
	id: number;
	coverage_id: number;
	payment_date: Date;
	payment_amount: string;
	is_subrogable: boolean;
	is_expense: boolean;
	loss_type: string;
	payee_claim_party_id: number | null;
	payee_name: string | null;
	description: string | null;
}

export default function PaymentsTab({ claimId }: PaymentsTabProps) {
	const [showPaymentDialog, setShowPaymentDialog] = useState(false);
	const [paymentForm, setPaymentForm] = useState<PaymentFormData>(initialPaymentForm);
	const [isManageMode, setIsManageMode] = useState(false);
	const [editingPayment, setEditingPayment] = useState<PaymentRow | null>(null);
	const [archivingPayment, setArchivingPayment] = useState<PaymentRow | null>(null);

	const utils = trpc.useUtils();
	const showAlert = useAlertStore((state) => state.showAlert);

	// Data queries
	const { data: payments = [], isLoading } = trpc.payment.listPayments.useQuery({ claimId }, { enabled: !!claimId });
	const { data: claimParties = [] } = trpc.party.getClaimParties.useQuery({ claimId }, { enabled: !!claimId });
	const { data: coverages = [] } = trpc.coverage.getCoverages.useQuery({ claimId }, { enabled: !!claimId });

	// Mutations
	const createPayment = trpc.payment.createPayment.useMutation({
		onSuccess: () => {
			utils.payment.listPayments.invalidate({ claimId });
			utils.claim.getClaimDetail.invalidate({ claimId });
		},
	});
	const updatePayment = trpc.payment.updatePayment.useMutation({
		onSuccess: () => {
			utils.payment.listPayments.invalidate({ claimId });
			utils.claim.getClaimDetail.invalidate({ claimId });
		},
	});
	const archivePaymentMutation = trpc.payment.archivePayment.useMutation({
		onSuccess: () => {
			utils.payment.listPayments.invalidate({ claimId });
			utils.claim.getClaimDetail.invalidate({ claimId });
		},
	});

	// Calculate summary values
	const summaryValues = useMemo(() => {
		let totalPayments = 0;
		let subrogableAmount = 0;
		let expenseAmount = 0;
		let creditAmount = 0;

		payments.forEach((payment) => {
			const amount = parseFloat(payment.payment_amount?.toString() || '0');
			totalPayments += amount;

			if (amount < 0) {
				creditAmount += amount; // Keep negative
			} else if (payment.is_expense) {
				expenseAmount += amount;
			}

			if (payment.is_subrogable) {
				subrogableAmount += amount;
			}
		});

		return { totalPayments, subrogableAmount, expenseAmount, creditAmount };
	}, [payments]);

	// Dialog handlers
	const handleOpenPaymentDialog = useCallback((payment?: any) => {
		if (payment) {
			setEditingPayment(payment);
			setPaymentForm({
				coverage_id: payment.coverage_id,
				payment_date: dayjs.utc(payment.payment_date).format('YYYY-MM-DD'),
				payment_amount: payment.payment_amount?.toString() || '',
				is_subrogable: payment.is_subrogable,
				is_expense: payment.is_expense,
				payee_claim_party_id: payment.payee_claim_party_id,
				description: payment.description || '',
			});
		} else {
			setEditingPayment(null);
			setPaymentForm({
				...initialPaymentForm,
				coverage_id: coverages.length > 0 ? coverages[0].id : '',
				payment_date: dayjs().format('YYYY-MM-DD'),
			});
		}
		setShowPaymentDialog(true);
	}, [coverages]);

	const handleClosePaymentDialog = () => {
		setShowPaymentDialog(false);
		setPaymentForm(initialPaymentForm);
		setEditingPayment(null);
	};

	const handleSubmitPayment = async () => {
		if (paymentForm.coverage_id === '') return;
		try {
			// Build params object (shared between create and update)
			const params = {
				coverage_id: Number(paymentForm.coverage_id),
				payment_date: paymentForm.payment_date,
				payment_amount: paymentForm.payment_amount,
				is_subrogable: paymentForm.is_subrogable,
				is_expense: paymentForm.is_expense,
				// Convert empty string to null for optional payee, otherwise convert to number
				payee_claim_party_id: paymentForm.payee_claim_party_id === '' || paymentForm.payee_claim_party_id === null ? null : Number(paymentForm.payee_claim_party_id),
				description: paymentForm.description || undefined,
			};

			if (editingPayment) {
				await updatePayment.mutateAsync({ paymentId: editingPayment.id, params });
				showAlert('Payment updated successfully', 'success');
			} else {
				await createPayment.mutateAsync({ claimId, params });
				showAlert('Payment created successfully', 'success');
			}
			handleClosePaymentDialog();
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : 'Failed to save payment';
			showAlert(message, 'error');
		}
	};

	// Archive handler
	const handleArchivePayment = async () => {
		if (!archivingPayment) return;
		try {
			await archivePaymentMutation.mutateAsync({
				paymentId: archivingPayment.id,
				claimId,
			});
			showAlert('Payment archived successfully', 'success');
			setArchivingPayment(null);
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : 'Failed to archive payment';
			showAlert(message, 'error');
		}
	};

	// Table columns
	const columns = useMemo<GridColDef<PaymentRow>[]>(
		() => [
			{
				field: 'payment_date',
				headerName: 'Date',
				width: 100,
				valueFormatter: (value) => (value ? dayjs(value).format('MMM D, YYYY') : ''),
				sortComparator: dateSortComparator,
			},
			{
				field: 'loss_type',
				headerName: 'Coverage',
				width: 120,
				valueFormatter: (value) => (value ? formatCoverageType(value) : ''),
				sortComparator: (v1, v2) => {
					const a = v1 ? formatCoverageType(v1).toLowerCase() : '';
					const b = v2 ? formatCoverageType(v2).toLowerCase() : '';
					return a.localeCompare(b);
				},
			},
			{
				field: 'payment_amount',
				headerName: 'Amount',
				width: 120,
				renderCell: (params: GridRenderCellParams<PaymentRow>) => {
					const amount = parseFloat(params.value?.toString() || '0');
					return (
						<Typography fontSize={13} color={amount < 0 ? 'error.main' : 'text.primary'}>
							{formatCurrencyExact(amount)}
						</Typography>
					);
				},
				sortComparator: numericSortComparator,
			},
			{
				field: 'type',
				headerName: 'Type',
				width: 180,
				valueGetter: (value, row) => {
					const isCredit = parseFloat(row.payment_amount?.toString() || '0') < 0;
					// Create a consistent sortable key from the three boolean flags
					return `${isCredit ? '1' : '0'}-${row.is_subrogable ? '1' : '0'}-${row.is_expense ? '1' : '0'}`;
				},
				sortComparator: stringSortComparator,
				renderCell: (params: GridRenderCellParams<PaymentRow>) => {
					const amount = parseFloat(params.row.payment_amount?.toString() || '0');
					return (
						<Box display="flex" gap={0.5}>
							{amount < 0 && <Chip label="Credit" size="small" color="error" variant="outlined" />}
							{params.row.is_subrogable && (
								<Chip label="Subrogable" size="small" color="primary" variant="outlined" />
							)}
							{params.row.is_expense && (
								<Chip label="Expense" size="small" color="warning" variant="outlined" />
							)}
						</Box>
					);
				},
			},
			{
				field: 'payee_name',
				headerName: 'Payee',
				width: 150,
				valueFormatter: (value) => value || '—',
				sortComparator: stringSortComparator,
			},
			{
				field: 'description',
				headerName: 'Description',
				flex: 1,
				minWidth: 150,
				valueFormatter: (value) => value || '—',
				sortComparator: stringSortComparator,
			},
			{
				field: 'actions',
				headerName: '',
				width: 80,
				sortable: false,
				renderCell: (params: GridRenderCellParams<PaymentRow>) => {
					if (!isManageMode) return null;
					return (
						<Box display="flex" gap={0.5}>
							<BasicButtonStyled
								buttonProps={{
									onClick: () => handleOpenPaymentDialog(params.row),
									sx: { padding: '3px', '& .MuiSvgIcon-root': { fontSize: 16 } },
								}}
								tooltipProps={{ title: 'Edit payment' }}
								icon={<Edit />}
								compact
							/>
							<BasicButtonStyled
								buttonProps={{
									onClick: () => setArchivingPayment(params.row),
									sx: { padding: '3px', '& .MuiSvgIcon-root': { fontSize: 16 } },
								}}
								tooltipProps={{ title: 'Archive payment' }}
								icon={<Archive sx={{ color: 'error.main' }} />}
								compact
							/>
						</Box>
					);
				},
			},
		],
		[isManageMode, handleOpenPaymentDialog]
	);

	return (
		<Box p={3}>
			<Stack spacing={3} maxWidth={1000} mx="auto">
				{/* Summary */}
				<Paper elevation={0} sx={styles.gradientPaper}>
					<Typography fontSize={13} color={BASE_COLOR_LIGHT} marginBottom={2}>
						Payments Summary
					</Typography>
					<Box
						display="grid"
						gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }}
						gap={3}
					>
						<Box>
							<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={0.5}>
								Total Payments
							</Typography>
							<Typography variant="body2" fontSize={11} color="text.secondary" marginBottom={1}>
								Sum of all payments
							</Typography>
							<Typography variant="h6" fontSize={18}>
								{formatCurrencyExact(summaryValues.totalPayments)}
							</Typography>
						</Box>
						<Box>
							<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={0.5}>
								Subrogable Amount
							</Typography>
							<Typography variant="body2" fontSize={11} color="text.secondary" marginBottom={1}>
								Amount eligible for recovery
							</Typography>
							<Typography variant="h6" fontSize={18} color="primary.main">
								{formatCurrencyExact(summaryValues.subrogableAmount)}
							</Typography>
						</Box>
						<Box>
							<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={0.5}>
								Expenses
							</Typography>
							<Typography variant="body2" fontSize={11} color="text.secondary" marginBottom={1}>
								Adjustment & investigation
							</Typography>
							<Typography variant="h6" fontSize={18} color="warning.main">
								{formatCurrencyExact(summaryValues.expenseAmount)}
							</Typography>
						</Box>
						<Box>
							<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={0.5}>
								Credits
							</Typography>
							<Typography variant="body2" fontSize={11} color="text.secondary" marginBottom={1}>
								Salvage, refunds, reversals
							</Typography>
							<Typography variant="h6" fontSize={18} color="error.main">
								{formatCurrencyExact(summaryValues.creditAmount)}
							</Typography>
						</Box>
					</Box>
				</Paper>

				{/* Payments List */}
				<Paper elevation={0} sx={styles.beveledPaper}>
					{/* Header */}
					<Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={2}>
						<Typography fontSize={13} color={BASE_COLOR_LIGHT}>
							Payments ({payments.length})
						</Typography>
						<Box display="flex" gap={1} alignItems="center">
							<Button
								size="small"
								startIcon={<AttachMoney />}
								variant="contained"
								onClick={() => handleOpenPaymentDialog()}
								disabled={coverages.length === 0}
								title={coverages.length === 0 ? 'Add coverage first' : ''}
							>
								Add Payment
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

					{!isLoading && payments.length === 0 && (
						<Box
							display="flex"
							flexDirection="column"
							alignItems="center"
							justifyContent="center"
							padding={4}
						>
							<AttachMoney sx={{ fontSize: 48, color: BASE_COLOR_LIGHT, marginBottom: 1 }} />
							<Typography fontSize={13} color={BASE_COLOR_LIGHT} fontStyle="italic">
								No payments recorded yet
							</Typography>
						</Box>
					)}

					{!isLoading && payments.length > 0 && (
						<DataGridPro
							rows={payments as PaymentRow[]}
							columns={columns}
							autoHeight
							hideFooter
							disableRowSelectionOnClick
							sx={{
								border: 'none',
								'& .MuiDataGrid-cell': {
									display: 'flex',
									alignItems: 'center',
								},
								'& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within, & .MuiDataGrid-cell:focus-visible':
									{
										outline: 'none',
									},
								'& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
									outline: 'none',
								},
							}}
						/>
					)}
				</Paper>
			</Stack>

			{/* Dialogs */}
			<PaymentFormDialog
				open={showPaymentDialog}
				onClose={handleClosePaymentDialog}
				onSubmit={handleSubmitPayment}
				formData={paymentForm}
				setFormData={setPaymentForm}
				coverages={coverages}
				claimParties={claimParties}
				isEditing={!!editingPayment}
				isSubmitting={createPayment.isPending || updatePayment.isPending}
			/>

			{archivingPayment && (
				<BasicDialog
					title="Archive Payment"
					primaryAction={{
						label: archivePaymentMutation.isPending ? 'Archiving...' : 'Archive',
						onClick: handleArchivePayment,
						color: 'error',
						disabled: archivePaymentMutation.isPending,
					}}
					secondaryActions={[{ label: 'Cancel', onClick: () => setArchivingPayment(null) }]}
					onClose={() => setArchivingPayment(null)}
					width={450}
				>
					<Box>
						<Typography fontSize={14} marginBottom={2}>
							Are you sure you want to archive this payment?
						</Typography>
						<Box bgcolor="info.lighter" padding={2} borderRadius={1} marginBottom={2}>
							<Typography fontSize={13} fontWeight={600}>
								{formatCurrencyExact(parseFloat(archivingPayment.payment_amount?.toString() || '0'))}
							</Typography>
							<Typography fontSize={12} color="text.secondary">
								{dayjs(archivingPayment.payment_date).format('MMM D, YYYY')} ·{' '}
								{archivingPayment.loss_type ? formatCoverageType(archivingPayment.loss_type) : ''}
								{archivingPayment.payee_name && ` · ${archivingPayment.payee_name}`}
							</Typography>
						</Box>
						<Typography fontSize={12} color="text.secondary">
							The payment will be archived and hidden from view, but the record will be preserved for
							historical purposes.
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
