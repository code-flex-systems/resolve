'use client';

import {
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	TextField,
} from '@mui/material';
import { SettlementStatus } from '@/config/enums';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';

const capitalize = (str: string | null | undefined) => {
	if (!str) return '';
	return str.charAt(0).toUpperCase() + str.slice(1);
};

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

interface SettlementFormDialogProps {
	open: boolean;
	onClose: () => void;
	onSubmit: () => void;
	formData: SettlementFormData;
	setFormData: (data: SettlementFormData) => void;
	adverseParties: AdverseParty[];
	coverages: Coverage[];
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
	isEditing,
	isSubmitting,
}: SettlementFormDialogProps) {
	const isValid =
		formData.claim_party_id !== '' &&
		formData.coverage_id !== '' &&
		formData.demand_amount &&
		parseFloat(formData.demand_amount) > 0;

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
