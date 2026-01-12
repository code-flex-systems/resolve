'use client';

import {
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	TextField,
	Typography,
} from '@mui/material';
import { SettlementStatus, SettlementStructure, PaymentFrequency } from '@/config/enums';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';

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
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>{isEditing ? 'Edit Settlement' : 'Add Settlement'}</DialogTitle>
			<DialogContent>
				<Box display="flex" flexDirection="column" gap={2} paddingTop={1}>
					<FormControl fullWidth required>
						<InputLabel>Adverse Party</InputLabel>
						<Select
							value={formData.claim_party_id}
							label="Adverse Party"
							onChange={(e) => setFormData({ ...formData, claim_party_id: Number(e.target.value) })}
						>
							{adverseParties.map((cp) => (
								<MenuItem key={cp.id} value={cp.id}>
									{cp.party?.name}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<FormControl fullWidth required>
						<InputLabel>Coverage</InputLabel>
						<Select
							value={formData.coverage_id}
							label="Coverage"
							onChange={(e) => setFormData({ ...formData, coverage_id: Number(e.target.value) })}
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
					<TextField
						label="Demand Date"
						type="date"
						value={formData.demand_date}
						onChange={(e) => setFormData({ ...formData, demand_date: e.target.value })}
						fullWidth
						slotProps={{
							inputLabel: { shrink: true },
						}}
					/>
					{/* Edit-only fields: Status, Agreed Liability, Settlement Amount, Settlement Date */}
					{isEditing && (
						<>
							<FormControl fullWidth>
								<InputLabel>Status</InputLabel>
								<Select
									value={formData.status}
									label="Status"
									onChange={(e) => setFormData({ ...formData, status: e.target.value })}
								>
									<MenuItem value={SettlementStatus.SENT}>Sent</MenuItem>
									<MenuItem value={SettlementStatus.SETTLED}>Settled</MenuItem>
									<MenuItem value={SettlementStatus.CLOSED}>Closed</MenuItem>
								</Select>
							</FormControl>
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
							<TextField
								label="Settlement Date"
								type="date"
								value={formData.settlement_date}
								onChange={(e) => setFormData({ ...formData, settlement_date: e.target.value })}
								fullWidth
								slotProps={{
									inputLabel: { shrink: true },
								}}
							/>
						</>
					)}

					{/* Settlement Structure - available on both create and edit */}
					<FormControl fullWidth>
						<InputLabel>Settlement Structure</InputLabel>
						<Select
							value={formData.settlement_structure || SettlementStructure.LUMP_SUM}
							label="Settlement Structure"
							onChange={(e) =>
								setFormData({
									...formData,
									settlement_structure: e.target.value,
									// Clear payment fields if switching to lump sum
									...(e.target.value === SettlementStructure.LUMP_SUM && {
										payment_amount: '',
										payment_frequency: '',
									}),
								})
							}
						>
							<MenuItem value={SettlementStructure.LUMP_SUM}>Lump Sum</MenuItem>
							<MenuItem value={SettlementStructure.PAYMENT_PLAN}>Payment Plan</MenuItem>
						</Select>
					</FormControl>

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
							<FormControl fullWidth required>
								<InputLabel>Payment Frequency</InputLabel>
								<Select
									value={formData.payment_frequency}
									label="Payment Frequency"
									onChange={(e) =>
										setFormData({ ...formData, payment_frequency: e.target.value })
									}
								>
									<MenuItem value={PaymentFrequency.WEEKLY}>Weekly</MenuItem>
									<MenuItem value={PaymentFrequency.BI_WEEKLY}>Bi-Weekly</MenuItem>
									<MenuItem value={PaymentFrequency.MONTHLY}>Monthly</MenuItem>
									<MenuItem value={PaymentFrequency.QUARTERLY}>Quarterly</MenuItem>
								</Select>
							</FormControl>
							{estimatedPayments && (
								<Typography variant="body2" color="text.secondary">
									Estimated payments: {estimatedPayments} installments
								</Typography>
							)}
						</>
					)}

					{/* Settled By - required when settlement_amount is provided (edit mode only since settlement_amount is edit-only) */}
					{hasSettlementAmount && (
						<FormControl fullWidth required>
							<InputLabel>Settled By</InputLabel>
							<Select
								value={formData.settled_by}
								label="Settled By"
								onChange={(e) => setFormData({ ...formData, settled_by: e.target.value })}
							>
								<MenuItem value={DROP_CHECK_VALUE}>
									<em>Drop Check (No Direct Contact)</em>
								</MenuItem>
								<Divider />
								{adminUsers.map((user) => (
									<MenuItem key={user.id} value={user.id}>
										{user.first} {user.last}
									</MenuItem>
								))}
							</Select>
						</FormControl>
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

// Export the DROP_CHECK value for use in parent component
export { DROP_CHECK_VALUE };
