'use client';
import { Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import Button from '@/components/ui/Button';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import DateField from '@/components/common/DateField';
import dayjs from 'dayjs';

const capitalize = (str: string | null | undefined) => {
	if (!str) return '';
	return str.charAt(0).toUpperCase() + str.slice(1);
};

export interface RecoveryFormData {
	settlement_id: number | '';
	recovery_date: string;
	recovery_amount: string;
	recovery_source: string;
	notes: string;
}

interface SettlementOption {
	id: number;
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
		formData.settlement_id !== '' && formData.recovery_amount && parseFloat(formData.recovery_amount) > 0;

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>{isEditing ? 'Edit Recovery Event' : 'Add Recovery Event'}</DialogTitle>
			<DialogContent>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
					<FormControl fullWidth required>
						<InputLabel>Settlement</InputLabel>
						<Select
							value={formData.settlement_id}
							label="Settlement"
							onChange={(e) => setFormData({ ...formData, settlement_id: Number(e.target.value) })}
						>
							{settlements.map((settlement) => (
								<MenuItem key={settlement.id} value={settlement.id}>
									{settlement.party_name} · {capitalize(settlement.loss_type)} -{' '}
									{formatCurrencyExact(Number(settlement.demand_amount))} (
									{dayjs(settlement.demand_date).format('MMM D')})
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<DateField
						label="Recovery Date"
						value={formData.recovery_date || null}
						onChange={(val) => setFormData({ ...formData, recovery_date: val ?? '' })}
						fullWidth
					/>
					<TextField
						label="Recovery Amount"
						type="number"
						value={formData.recovery_amount}
						onChange={(e) => setFormData({ ...formData, recovery_amount: e.target.value })}
						fullWidth
						required
						placeholder="0.00"
						slotProps={{
							htmlInput: { step: '0.01', min: '0' },
						}}
					/>
					<TextField
						label="Recovery Source"
						value={formData.recovery_source}
						onChange={(e) => setFormData({ ...formData, recovery_source: e.target.value })}
						fullWidth
						placeholder="e.g., Check, Wire Transfer, etc."
					/>
					<TextField
						label="Notes"
						value={formData.notes}
						onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
						fullWidth
						multiline
						rows={3}
						placeholder="Additional details about this recovery..."
					/>
				</div>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancel</Button>
				<Button onClick={onSubmit} variant="contained" disabled={!isValid || isSubmitting}>
					{isSubmitting ? 'Saving...' : isEditing ? 'Save' : 'Create'}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
