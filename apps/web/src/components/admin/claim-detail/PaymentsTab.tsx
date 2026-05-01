'use client';

import { IconArchive, IconCurrencyDollar, IconEdit, IconSettings } from '@tabler/icons-react';
import Tooltip from '@/components/ui/Tooltip';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import { useCallback, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import BasicDialog from '@/components/common/BasicDialog';
import PaymentFormDialog, { PaymentFormData } from './PaymentFormDialog';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { formatCoverageType } from '@/lib/utils/claimUtils';
import { dateSortComparator, numericSortComparator, stringSortComparator } from '@/lib/utils/utils';
import { useAlertStore } from '@/stores/useAlertStore';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';

dayjs.extend(utc);

interface PaymentsTabProps {
	claimId: string;
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
	id: string;
	coverage_id: string;
	payment_date: Date;
	payment_amount: string;
	is_subrogable: boolean;
	is_expense: boolean;
	loss_type: string;
	payee_claim_party_id: string | null;
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
	const { data: payments = [], isLoading } = trpc.payment.listPayments.useQuery(
		{ claimId },
		{ enabled: !!claimId }
	);
	const { data: claimParties = [] } = trpc.party.getClaimParties.useQuery(
		{ claimId },
		{ enabled: !!claimId }
	);
	const { data: coverages = [] } = trpc.coverage.getCoverages.useQuery(
		{ claimId },
		{ enabled: !!claimId }
	);

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
	const handleOpenPaymentDialog = useCallback(
		(payment?: any) => {
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
		},
		[coverages]
	);

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
				coverage_id: paymentForm.coverage_id,
				payment_date: paymentForm.payment_date,
				payment_amount: paymentForm.payment_amount,
				is_subrogable: paymentForm.is_subrogable,
				is_expense: paymentForm.is_expense,
				// Convert empty string to null for optional payee
				payee_claim_party_id:
					paymentForm.payee_claim_party_id === '' || paymentForm.payee_claim_party_id === null
						? null
						: paymentForm.payee_claim_party_id,
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
	const columns = useMemo<ColumnDef<PaymentRow, any>[]>(
		() => [
			{
				accessorKey: 'payment_date',
				header: 'Date',
				size: 100,
				cell: ({ getValue }) => {
					const value = getValue();
					return value ? dayjs(value).format('MMM D, YYYY') : '';
				},
			},
			{
				accessorKey: 'loss_type',
				header: 'Coverage',
				size: 120,
				cell: ({ getValue }) => {
					const value = getValue();
					return value ? formatCoverageType(value as string) : '';
				},
			},
			{
				accessorKey: 'payment_amount',
				header: 'Amount',
				size: 120,
				cell: (info: any) => {
					const params = { row: info.row.original, value: info.getValue() };
					const amount = parseFloat(params.value?.toString() || '0');
					return (
						<span style={{ fontSize: 13, color: amount < 0 ? 'error.main' : 'text.primary' }}>
							{formatCurrencyExact(amount)}
						</span>
					);
				},
			},
			{
				accessorKey: 'type',
				header: 'Type',
				size: 180,
				cell: (info: any) => {
					const params = { row: info.row.original, value: info.getValue() };
					const amount = parseFloat(params.row.payment_amount?.toString() || '0');
					return (
						<div style={{ display: 'flex', gap: 4 }}>
							{amount < 0 && (
								<Chip size="sm" color="error" variant="outlined">
									Credit
								</Chip>
							)}
							{params.row.is_subrogable && (
								<Chip size="sm" color="info" variant="outlined">
									Subrogable
								</Chip>
							)}
							{params.row.is_expense && (
								<Chip size="sm" color="warning" variant="outlined">
									Expense
								</Chip>
							)}
						</div>
					);
				},
			},
			{
				accessorKey: 'payee_name',
				header: 'Payee',
				size: 150,
				cell: ({ getValue }) => {
					const value = getValue();
					return value || '—';
				},
			},
			{
				accessorKey: 'description',
				header: 'Description',
				minSize: 150,
				cell: ({ getValue }) => {
					const value = getValue();
					return value || '—';
				},
			},
			{
				accessorKey: 'actions',
				header: '',
				size: 80,
				enableSorting: false,
				cell: (info: any) => {
					const params = { row: info.row.original, value: info.getValue() };
					if (!isManageMode) return null;
					return (
						<div style={{ display: 'flex', gap: 4 }}>
							<Tooltip content="Edit payment">
								<Button
									variant="icon"
									size="sm"
									color="neutral"
									onClick={() => handleOpenPaymentDialog(params.row)}
								>
									<IconEdit size={16} />
								</Button>
							</Tooltip>
							<Tooltip content="Archive payment">
								<Button
									variant="icon"
									size="sm"
									color="neutral"
									onClick={() => setArchivingPayment(params.row)}
								>
									<IconArchive style={{ color: 'var(--status-error)' }} />
								</Button>
							</Tooltip>
						</div>
					);
				},
			},
		],
		[isManageMode, handleOpenPaymentDialog]
	);

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
						Payments Summary
					</span>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
						<div style={{ display: 'flex', flexDirection: 'column' as const }}>
							<span style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
								Total Payments
							</span>
							<span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
								Sum of all payments
							</span>
							<span style={{ fontSize: 18 }}>
								{formatCurrencyExact(summaryValues.totalPayments)}
							</span>
						</div>
						<div style={{ display: 'flex', flexDirection: 'column' as const }}>
							<span style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
								Subrogable Amount
							</span>
							<span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
								Amount eligible for recovery
							</span>
							<span style={{ fontSize: 18, color: 'var(--text-accent)' }}>
								{formatCurrencyExact(summaryValues.subrogableAmount)}
							</span>
						</div>
						<div style={{ display: 'flex', flexDirection: 'column' as const }}>
							<span style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
								Expenses
							</span>
							<span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
								Adjustment & investigation
							</span>
							<span style={{ fontSize: 18, color: 'var(--status-warning)' }}>
								{formatCurrencyExact(summaryValues.expenseAmount)}
							</span>
						</div>
						<div style={{ display: 'flex', flexDirection: 'column' as const }}>
							<span style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
								Credits
							</span>
							<span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
								Salvage, refunds, reversals
							</span>
							<span style={{ fontSize: 18, color: 'var(--status-error)' }}>
								{formatCurrencyExact(summaryValues.creditAmount)}
							</span>
						</div>
					</div>
				</Card>

				{/* Payments List */}
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
						<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
							Payments ({payments.length})
						</span>
						<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
							<Button
								size="sm"
								startIcon={<IconCurrencyDollar size={20} />}
								variant="contained"
								onClick={() => handleOpenPaymentDialog()}
								disabled={coverages.length === 0}
								title={coverages.length === 0 ? 'Add coverage first' : ''}
							>
								Add Payment
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

					{!isLoading && payments.length === 0 && (
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								justifyContent: 'center',
								padding: 32,
							}}
						>
							<IconCurrencyDollar
								size={48}
								style={{ color: 'var(--text-muted)', marginBottom: 1 }}
							/>
							<span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
								No payments recorded yet
							</span>
						</div>
					)}

					{!isLoading && payments.length > 0 && (
						<DataTable
							rows={payments as PaymentRow[]}
							columns={columns}
							hideFooter
							pinnedRight={isManageMode ? ['actions'] : []}
						/>
					)}
				</Card>
			</div>

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
					<div>
						<span style={{ fontSize: 14, marginBottom: 16 }}>
							Are you sure you want to archive this payment?
						</span>
						<div
							style={{
								backgroundColor: 'info.lighter',
								padding: 16,
								borderRadius: 4,
								marginBottom: 16,
							}}
						>
							<span style={{ fontSize: 13, fontWeight: 600 }}>
								{formatCurrencyExact(
									parseFloat(archivingPayment.payment_amount?.toString() || '0')
								)}
							</span>
							<span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
								{dayjs(archivingPayment.payment_date).format('MMM D, YYYY')} ·{' '}
								{archivingPayment.loss_type ? formatCoverageType(archivingPayment.loss_type) : ''}
								{archivingPayment.payee_name && ` · ${archivingPayment.payee_name}`}
							</span>
						</div>
						<span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
							The payment will be archived and hidden from view, but the record will be preserved
							for historical purposes.
						</span>
					</div>
				</BasicDialog>
			)}
		</div>
	);
}
