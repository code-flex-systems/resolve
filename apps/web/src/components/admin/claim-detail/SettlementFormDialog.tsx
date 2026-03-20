'use client';
import { TextField } from '@mui/material';
import Dialog from '@/components/ui/Dialog';
import Dropdown from '@/components/ui/Dropdown';
import Divider from '@/components/ui/Divider';
import Button from '@/components/ui/Button';
import { SettlementStatus, SettlementStructure, PaymentFrequency } from '@/config/enums';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import DateField from '@/components/common/DateField';

const capitalize = (str: string | null | undefined) => {
	if (!str) return '';
	return str.charAt(0).toUpperCase() + str.slice(1);
};

// Special value for "Drop Check" option in settled_by dropdown
const DROP_CHECK_VALUE = 'DROP_CHECK';

export interface SettlementFormData {
	claim_party_id: number | '';
	coverage_id: number | '';
	demand_amount: string;
	demand_date: string;
	status: string;
	agreed_liability_percentage: string;
	settlement_amount: string;
	settlement_date: string;
	notes: string;
	// New fields
	adverse_party_reference: string;
	settlement_structure: string;
	payment_amount: string;
	payment_frequency: string;
	settled_by: string; // User ID or 'DROP_CHECK'
}

interface AdverseParty {
	id: number;
	party?: { name?: string };
}

interface Coverage {
	id: number;
	loss_type: string;
	coverage_amount?: number | string | null;
}

interface AdminUser {
	id: string;
	first: string | null;
	last: string | null;
	email: string;
}

interface SettlementFormDialogProps {
	open: boolean;
	onClose: () => void;
	onSubmit: () => void;
	formData: SettlementFormData;
	setFormData: (data: SettlementFormData) => void;
	adverseParties: AdverseParty[];
	coverages: Coverage[];
	adminUsers: AdminUser[];
	isEditing: boolean;
	isSubmitting: boolean;
}

export default function SettlementFormDialog({
	open,
	onClose,
	onSubmit,
	formData,
	setFormData,
	adverseParties,
	coverages,
	adminUsers,
	isEditing,
	isSubmitting,
}: SettlementFormDialogProps) {
	const hasSettlementAmount = formData.settlement_amount && parseFloat(formData.settlement_amount) > 0;
	const isPaymentPlan = formData.settlement_structure === SettlementStructure.PAYMENT_PLAN;

	// Validation
	const isValid =
		formData.claim_party_id !== '' &&
		formData.coverage_id !== '' &&
		formData.demand_amount &&
		parseFloat(formData.demand_amount) > 0 &&
		// If settlement_amount is provided, settled_by is required
		(!hasSettlementAmount || formData.settled_by) &&
		// If payment plan, payment fields are required
		(!isPaymentPlan ||
			(formData.payment_amount &&
				parseFloat(formData.payment_amount) > 0 &&
				formData.payment_frequency));

	// Calculate estimated number of payments
	const estimatedPayments =
		isPaymentPlan &&
		formData.settlement_amount &&
		formData.payment_amount &&
		parseFloat(formData.payment_amount) > 0
			? Math.ceil(parseFloat(formData.settlement_amount) / parseFloat(formData.payment_amount))
			: null;

	return (
		<Dialog
			open={open}
			onClose={onClose}
			title={isEditing ? 'Edit Settlement' : 'Add Settlement'}
			size="sm"
			footer={
				<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
					<Button onClick={onClose}>Cancel</Button>
					<Button onClick={onSubmit} variant="contained" disabled={!isValid || isSubmitting}>
						{isSubmitting ? 'Saving...' : isEditing ? 'Save' : 'Create'}
					</Button>
				</div>
			}
		>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
				<Dropdown
						label="Adverse Party"
						options={adverseParties.map((cp) => ({
							value: cp.id,
							label: cp.party?.name || '',
						}))}
						value={formData.claim_party_id}
						onChange={(v) => setFormData({ ...formData, claim_party_id: Number(v) })}
						required
						fullWidth
					/>
					<Dropdown
						label="Coverage"
						options={coverages.map((coverage) => ({
							value: coverage.id,
							label: `${capitalize(coverage.loss_type)}${coverage.coverage_amount ? ` - ${formatCurrencyExact(Number(coverage.coverage_amount))}` : ''}`,
						}))}
						value={formData.coverage_id}
						onChange={(v) => setFormData({ ...formData, coverage_id: Number(v) })}
						required
						fullWidth
					/>

					{/* Adverse Party Reference */}
					<TextField
						label="Adverse Party Claim #"
						value={formData.adverse_party_reference}
						onChange={(e) => setFormData({ ...formData, adverse_party_reference: e.target.value })}
						fullWidth
						placeholder="External reference number"
					/>

					<TextField
						label="Demand Amount"
						type="number"
						value={formData.demand_amount}
						onChange={(e) => setFormData({ ...formData, demand_amount: e.target.value })}
						fullWidth
						required
						placeholder="0.00"
						slotProps={{
							htmlInput: { step: '0.01', min: '0' },
						}}
					/>
					<DateField
						label="Demand Date"
						value={formData.demand_date || null}
						onChange={(val) => setFormData({ ...formData, demand_date: val ?? '' })}
						fullWidth
					/>
					{/* Edit-only fields: Status, Agreed Liability, Settlement Amount, Settlement Date */}
					{isEditing && (
						<>
							<Dropdown
								label="Status"
								options={[
									{ value: SettlementStatus.SENT, label: 'Sent' },
									{ value: SettlementStatus.SETTLED, label: 'Settled' },
									{ value: SettlementStatus.CLOSED, label: 'Closed' },
								]}
								value={formData.status}
								onChange={(v) => setFormData({ ...formData, status: String(v) })}
								fullWidth
							/>
							<TextField
								label="Agreed Liability %"
								type="number"
								value={formData.agreed_liability_percentage}
								onChange={(e) =>
									setFormData({
										...formData,
										agreed_liability_percentage: e.target.value,
									})
								}
								fullWidth
								placeholder="0-100"
								slotProps={{
									htmlInput: { step: '0.01', min: '0', max: '100' },
								}}
							/>
							<TextField
								label="Settlement Amount"
								type="number"
								value={formData.settlement_amount}
								onChange={(e) => setFormData({ ...formData, settlement_amount: e.target.value })}
								fullWidth
								placeholder="0.00"
								slotProps={{
									htmlInput: { step: '0.01', min: '0' },
								}}
							/>
							<DateField
								label="Settlement Date"
								value={formData.settlement_date || null}
								onChange={(val) => setFormData({ ...formData, settlement_date: val ?? '' })}
								fullWidth
							/>
						</>
					)}

					{/* Settlement Structure - available on both create and edit */}
					<Dropdown
						label="Settlement Structure"
						options={[
							{ value: SettlementStructure.LUMP_SUM, label: 'Lump Sum' },
							{ value: SettlementStructure.PAYMENT_PLAN, label: 'Payment Plan' },
						]}
						value={formData.settlement_structure || SettlementStructure.LUMP_SUM}
						onChange={(v) =>
							setFormData({
								...formData,
								settlement_structure: String(v),
								// Clear payment fields if switching to lump sum
								...(String(v) === SettlementStructure.LUMP_SUM && {
									payment_amount: '',
									payment_frequency: '',
								}),
							})
						}
						fullWidth
					/>

					{/* Payment Plan Fields - available on both create and edit when payment plan is selected */}
					{isPaymentPlan && (
						<>
							<TextField
								label="Payment Amount (per installment)"
								type="number"
								value={formData.payment_amount}
								onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
								fullWidth
								required
								placeholder="0.00"
								slotProps={{
									htmlInput: { step: '0.01', min: '0' },
								}}
							/>
							<Dropdown
								label="Payment Frequency"
								options={[
									{ value: PaymentFrequency.WEEKLY, label: 'Weekly' },
									{ value: PaymentFrequency.BI_WEEKLY, label: 'Bi-Weekly' },
									{ value: PaymentFrequency.MONTHLY, label: 'Monthly' },
									{ value: PaymentFrequency.QUARTERLY, label: 'Quarterly' },
								]}
								value={formData.payment_frequency}
								onChange={(v) => setFormData({ ...formData, payment_frequency: String(v) })}
								required
								fullWidth
							/>
							{estimatedPayments && (
								<span style={{ color: 'var(--text-secondary)' }}>
									Estimated payments: {estimatedPayments} installments
								</span>
							)}
						</>
					)}

					{/* Settled By - required when settlement_amount is provided (edit mode only since settlement_amount is edit-only) */}
					{hasSettlementAmount && (
						<Dropdown
							label="Settled By"
							options={[
								{ value: DROP_CHECK_VALUE, label: 'Drop Check (No Direct Contact)' },
								...adminUsers.map((user) => ({
									value: user.id,
									label: `${user.first} ${user.last}`,
								})),
							]}
							value={formData.settled_by}
							onChange={(v) => setFormData({ ...formData, settled_by: String(v) })}
							required
							fullWidth
						/>
					)}
					<TextField
						label="Notes"
						value={formData.notes}
						onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
						fullWidth
						multiline
						rows={3}
						placeholder="Additional details about this settlement demand..."
					/>
				</div>
		</Dialog>
	);
}

// Export the DROP_CHECK value for use in parent component
export { DROP_CHECK_VALUE };
