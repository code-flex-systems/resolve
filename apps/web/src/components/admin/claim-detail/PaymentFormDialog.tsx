'use client';

import {
	Box,
	Button,
	Checkbox,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControl,
	FormControlLabel,
	InputAdornment,
	InputLabel,
	MenuItem,
	Select,
	TextField,
} from '@mui/material';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { capitalize } from '@/lib/utils/utils';

export interface PaymentFormData {
	coverage_id: number | '';
	payment_date: string;
	payment_amount: string;
	is_subrogable: boolean;
	is_expense: boolean;
	payee_claim_party_id: number | '' | null;
	description: string;
}

interface Coverage {
	id: number;
	loss_type: string;
	coverage_amount?: number | string | null;
}

interface ClaimParty {
	id: number;
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
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>{isEditing ? 'Edit Payment' : 'Add Payment'}</DialogTitle>
			<DialogContent>
				<Box display="flex" flexDirection="column" gap={2} paddingTop={1}>
					<FormControl fullWidth required>
						<InputLabel>Coverage</InputLabel>
						<Select
							value={formData.coverage_id}
							label="Coverage"
							onChange={(e) =>
								setFormData({ ...formData, coverage_id: e.target.value as number })
							}
						>
							{coverages.map((coverage) => (
								<MenuItem key={coverage.id} value={coverage.id}>
									{capitalize(coverage.loss_type)}
									{coverage.coverage_amount
										? ` - ${formatCurrencyExact(Number(coverage.coverage_amount))}`
										: ''}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<TextField
						label="Payment Date"
						type="date"
						value={formData.payment_date}
						onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
						fullWidth
						required
						slotProps={{
							inputLabel: { shrink: true },
						}}
					/>
					<TextField
						label="Payment Amount"
						type="number"
						value={formData.payment_amount}
						onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
						fullWidth
						required
						placeholder="0.00"
						helperText="Use negative values for credits or reversals"
						slotProps={{
							input: {
								startAdornment: <InputAdornment position="start">$</InputAdornment>,
							},
							htmlInput: { step: '0.01' },
						}}
					/>
					<Box display="flex" gap={2}>
						<FormControlLabel
							control={
								<Checkbox
									checked={formData.is_subrogable}
									onChange={(e) =>
										setFormData({ ...formData, is_subrogable: e.target.checked })
									}
								/>
							}
							label="Subrogable"
						/>
						<FormControlLabel
							control={
								<Checkbox
									checked={formData.is_expense}
									onChange={(e) =>
										setFormData({ ...formData, is_expense: e.target.checked })
									}
								/>
							}
							label="Expense"
						/>
					</Box>
					<FormControl fullWidth>
						<InputLabel>Payee (Optional)</InputLabel>
						<Select
							value={formData.payee_claim_party_id ?? ''}
							label="Payee (Optional)"
							onChange={(e) =>
								setFormData({
									...formData,
									payee_claim_party_id: e.target.value === '' ? null : (e.target.value as number),
								})
							}
						>
							<MenuItem value="">
								<em>None</em>
							</MenuItem>
							{claimParties.map((cp) => (
								<MenuItem key={cp.id} value={cp.id}>
									{cp.party?.name}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<TextField
						label="Description"
						value={formData.description}
						onChange={(e) => setFormData({ ...formData, description: e.target.value })}
						fullWidth
						multiline
						rows={3}
						placeholder="Optional details about this payment..."
					/>
				</Box>
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
