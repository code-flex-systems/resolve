'use client';
import Input, { Textarea } from '@/components/ui/Input';
import Dialog from '@/components/ui/Dialog';
import Dropdown from '@/components/ui/Dropdown';
import Button from '@/components/ui/Button';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import DateField from '@/components/common/DateField';
import dayjs from 'dayjs';

const capitalize = (str: string | null | undefined) => {
	if (!str) return '';
	return str.charAt(0).toUpperCase() + str.slice(1);
};

export interface RecoveryFormData {
	settlement_id: string | '';
	recovery_date: string;
	recovery_amount: string;
	recovery_source: string;
	notes: string;
}

interface SettlementOption {
	id: string;
	party_name: string;
	loss_type: string;
	demand_amount: number | string;
	demand_date: Date | string;
}

interface RecoveryFormDialogProps {
	open: boolean;
	onClose: () => void;
	onSubmit: () => void;
	formData: RecoveryFormData;
	setFormData: (data: RecoveryFormData) => void;
	settlements: SettlementOption[];
	isEditing: boolean;
	isSubmitting: boolean;
}

export default function RecoveryFormDialog({
	open,
	onClose,
	onSubmit,
	formData,
	setFormData,
	settlements,
	isEditing,
	isSubmitting,
}: RecoveryFormDialogProps) {
	const isValid =
		formData.settlement_id !== '' &&
		formData.recovery_amount &&
		parseFloat(formData.recovery_amount) > 0;

	return (
		<Dialog
			open={open}
			onClose={onClose}
			title={isEditing ? 'Edit Recovery Event' : 'Add Recovery Event'}
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
					label="Settlement"
					options={settlements.map((settlement) => ({
						value: settlement.id,
						label: `${settlement.party_name} · ${capitalize(settlement.loss_type)} - ${formatCurrencyExact(Number(settlement.demand_amount))} (${dayjs(settlement.demand_date).format('MMM D')})`,
					}))}
					value={formData.settlement_id}
					onChange={(v) => setFormData({ ...formData, settlement_id: String(v) })}
					required
					fullWidth
				/>
				<DateField
					label="Recovery Date"
					value={formData.recovery_date || null}
					onChange={(val) => setFormData({ ...formData, recovery_date: val ?? '' })}
					fullWidth
				/>
				<Input
					label="Recovery Amount"
					type="number"
					value={formData.recovery_amount}
					onChange={(e) => setFormData({ ...formData, recovery_amount: e.target.value })}
					fullWidth
					required
					placeholder="0.00"
					step="0.01"
					min="0"
				/>
				<Input
					label="Recovery Source"
					value={formData.recovery_source}
					onChange={(e) => setFormData({ ...formData, recovery_source: e.target.value })}
					fullWidth
					placeholder="e.g., Check, Wire Transfer, etc."
				/>
				<Textarea
					label="Notes"
					value={formData.notes}
					onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
					fullWidth
					rows={3}
					placeholder="Additional details about this recovery..."
				/>
			</div>
		</Dialog>
	);
}
