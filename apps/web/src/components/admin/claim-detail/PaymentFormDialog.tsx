'use client';
import Input, { Textarea } from '@/components/ui/Input';
import Dialog from '@/components/ui/Dialog';
import Dropdown from '@/components/ui/Dropdown';
import Checkbox from '@/components/ui/Checkbox';
import Button from '@/components/ui/Button';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { capitalize } from '@/lib/utils/utils';
import DateField from '@/components/common/DateField';

export interface PaymentFormData {
	coverage_id: string | '';
	payment_date: string;
	payment_amount: string;
	is_subrogable: boolean;
	is_expense: boolean;
	payee_claim_party_id: string | '' | null;
	description: string;
}

interface Coverage {
	id: string;
	loss_type: string;
	coverage_amount?: number | string | null;
}

interface ClaimParty {
	id: string;
	party?: { name?: string };
}

interface PaymentFormDialogProps {
	open: boolean;
	onClose: () => void;
	onSubmit: () => void;
	formData: PaymentFormData;
	setFormData: (data: PaymentFormData) => void;
	coverages: Coverage[];
	claimParties: ClaimParty[];
	isEditing: boolean;
	isSubmitting: boolean;
}

export default function PaymentFormDialog({
	open,
	onClose,
	onSubmit,
	formData,
	setFormData,
	coverages,
	claimParties,
	isEditing,
	isSubmitting,
}: PaymentFormDialogProps) {
	const isValid =
		formData.coverage_id !== '' &&
		formData.payment_date &&
		formData.payment_amount &&
		formData.payment_amount !== '' &&
		!isNaN(parseFloat(formData.payment_amount));

	return (
		<Dialog
			open={open}
			onClose={onClose}
			title={isEditing ? 'Edit Payment' : 'Add Payment'}
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
					label="Coverage"
					options={coverages.map((coverage) => ({
						value: coverage.id,
						label: `${capitalize(coverage.loss_type)}${coverage.coverage_amount ? ` - ${formatCurrencyExact(Number(coverage.coverage_amount))}` : ''}`,
					}))}
					value={formData.coverage_id}
					onChange={(v) => setFormData({ ...formData, coverage_id: String(v) })}
					required
					fullWidth
				/>
				<DateField
					label="Payment Date"
					value={formData.payment_date || null}
					onChange={(val) => setFormData({ ...formData, payment_date: val ?? '' })}
					fullWidth
					required
				/>
				<Input
					label="Payment Amount"
					type="number"
					value={formData.payment_amount}
					onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
					fullWidth
					required
					placeholder="0.00"
					helperText="Use negative values for credits or reversals"
					startAdornment={<span style={{ color: 'var(--text-secondary)', marginRight: 4 }}>$</span>}
					step="0.01"
				/>
				<div style={{ display: 'flex', gap: 16 }}>
					<Checkbox
						checked={formData.is_subrogable}
						onChange={(checked) => setFormData({ ...formData, is_subrogable: checked })}
						label="Subrogable"
					/>
					<Checkbox
						checked={formData.is_expense}
						onChange={(checked) => setFormData({ ...formData, is_expense: checked })}
						label="Expense"
					/>
				</div>
				<Dropdown
					label="Payee (Optional)"
					options={[
						{ value: '', label: 'None' },
						...claimParties.map((cp) => ({
							value: cp.id,
							label: cp.party?.name || '',
						})),
					]}
					value={formData.payee_claim_party_id ?? ''}
					onChange={(v) =>
						setFormData({
							...formData,
							payee_claim_party_id: v === '' ? null : String(v),
						})
					}
					fullWidth
				/>
				<Textarea
					label="Description"
					value={formData.description}
					onChange={(e) => setFormData({ ...formData, description: e.target.value })}
					fullWidth
					rows={3}
					placeholder="Optional details about this payment..."
				/>
			</div>
		</Dialog>
	);
}
