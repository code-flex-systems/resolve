'use client';

import { useState, useEffect, useMemo } from 'react';
import { Box, TextField, Autocomplete, Typography, InputAdornment } from '@mui/material';
import BasicDialog from '@/components/common/BasicDialog';
import { LineOfBusiness, LossType } from '@/config/enums';
import { formatLineOfBusiness, formatLossType, LOSS_TYPE_ICONS, LOB_ICONS } from '@/lib/utils/claimUtils';

interface LiabilityFormData {
	loss_type: LossType | '';
	liability_percentage: string;
	coverage_amount: string;
	line_of_business: LineOfBusiness | '';
	paid_recovery: string;
	reserved_recovery: string;
	notes: string;
}

interface LiabilityFormDialogProps {
	open: boolean;
	onClose: () => void;
	onSubmit: (data: {
		claim_party_id: number;
		loss_type?: string | null;
		liability_percentage?: number | null;
		coverage_amount?: number | null;
		line_of_business?: string | null;
		paid_recovery?: number | null;
		reserved_recovery?: number | null;
		notes?: string | null;
	}) => Promise<void>;
	claimPartyId: number;
	editingLiability?: any | null;
	currentLiabilities?: any[];
	isSubmitting?: boolean;
}

export default function LiabilityFormDialog({
	open,
	onClose,
	onSubmit,
	claimPartyId,
	editingLiability,
	currentLiabilities = [],
	isSubmitting = false,
}: LiabilityFormDialogProps) {
	const [formData, setFormData] = useState<LiabilityFormData>({
		loss_type: '',
		liability_percentage: '',
		coverage_amount: '',
		line_of_business: '',
		paid_recovery: '',
		reserved_recovery: '',
		notes: '',
	});

	// Update form when editingLiability changes
	useEffect(() => {
		if (editingLiability) {
			setFormData({
				loss_type: editingLiability.loss_type || '',
				liability_percentage: editingLiability.liability_percentage?.toString() || '',
				coverage_amount: editingLiability.coverage_amount?.toString() || '',
				line_of_business: editingLiability.line_of_business || '',
				paid_recovery: editingLiability.paid_recovery?.toString() || '',
				reserved_recovery: editingLiability.reserved_recovery?.toString() || '',
				notes: editingLiability.notes || '',
			});
		} else {
			// Reset form for new entry
			setFormData({
				loss_type: '',
				liability_percentage: '',
				coverage_amount: '',
				line_of_business: '',
				paid_recovery: '',
				reserved_recovery: '',
				notes: '',
			});
		}
	}, [editingLiability, open]);

	const handleSubmit = async () => {
		await onSubmit({
			claim_party_id: claimPartyId,
			loss_type: formData.loss_type || null,
			liability_percentage: formData.liability_percentage ? parseFloat(formData.liability_percentage) : null,
			coverage_amount: formData.coverage_amount ? parseFloat(formData.coverage_amount) : null,
			line_of_business: formData.line_of_business || null,
			paid_recovery: formData.paid_recovery ? parseFloat(formData.paid_recovery) : null,
			reserved_recovery: formData.reserved_recovery ? parseFloat(formData.reserved_recovery) : null,
			notes: formData.notes || null,
		});
	};

	// Calculate total liability excluding the one being edited
	const otherLiabilitiesTotal = useMemo(() => {
		return currentLiabilities
			.filter((liability) => !editingLiability || liability.id !== editingLiability.id)
			.reduce(
				(sum, liability) =>
					sum + (liability.liability_percentage ? parseFloat(liability.liability_percentage.toString()) : 0),
				0
			);
	}, [currentLiabilities, editingLiability]);

	const maxAllowedLiability = 100 - otherLiabilitiesTotal;
	const enteredLiability = formData.liability_percentage ? parseFloat(formData.liability_percentage) : 0;

	const isValidLiability =
		!formData.liability_percentage ||
		(!isNaN(parseFloat(formData.liability_percentage)) &&
			parseFloat(formData.liability_percentage) >= 0 &&
			parseFloat(formData.liability_percentage) <= 100);

	const exceedsTotalLiability = enteredLiability > maxAllowedLiability;

	const isValidCoverage =
		!formData.coverage_amount ||
		(!isNaN(parseFloat(formData.coverage_amount)) && parseFloat(formData.coverage_amount) > 0);

	const isValidPaidRecovery =
		!formData.paid_recovery ||
		(!isNaN(parseFloat(formData.paid_recovery)) && parseFloat(formData.paid_recovery) >= 0);

	const isValidReservedRecovery =
		!formData.reserved_recovery ||
		(!isNaN(parseFloat(formData.reserved_recovery)) && parseFloat(formData.reserved_recovery) >= 0);

	if (!open) return null;

	return (
		<BasicDialog
			title={editingLiability ? 'Edit Liability' : 'Add Liability'}
			primaryAction={{
				label: editingLiability ? 'Update' : 'Add',
				onClick: handleSubmit,
				disabled:
					!isValidLiability ||
					exceedsTotalLiability ||
					!isValidCoverage ||
					!isValidPaidRecovery ||
					!isValidReservedRecovery ||
					isSubmitting,
			}}
			secondaryActions={[
				{
					label: 'Cancel',
					onClick: onClose,
				},
			]}
			onClose={onClose}
			width={600}
		>
			<Box display="flex" flexDirection="column" gap={2} paddingTop={1}>
				{/* Line of Business */}
				<Box>
					<Typography fontSize={12} color="text.secondary" marginBottom={0.5}>
						Line of Business
					</Typography>
					<Autocomplete
						options={Object.values(LineOfBusiness)}
						value={formData.line_of_business || null}
						onChange={(_, newValue) => setFormData({ ...formData, line_of_business: newValue || '' })}
						getOptionLabel={(option) => {
							const icon = LOB_ICONS[option as LineOfBusiness] || '';
							return `${icon} ${formatLineOfBusiness(option)}`;
						}}
						renderOption={(props, option) => {
							const icon = LOB_ICONS[option as LineOfBusiness] || '';
							return (
								<li {...props} key={option}>
									{icon} {formatLineOfBusiness(option)}
								</li>
							);
						}}
						fullWidth
						renderInput={(params) => <TextField {...params} placeholder="Select line of business..." />}
					/>
				</Box>

				{/* Loss Type */}
				<Box>
					<Typography fontSize={12} color="text.secondary" marginBottom={0.5}>
						Loss Type
					</Typography>
					<Autocomplete
						options={Object.values(LossType)}
						value={formData.loss_type || null}
						onChange={(_, newValue) => setFormData({ ...formData, loss_type: newValue || '' })}
						getOptionLabel={(option) => {
							const icon = LOSS_TYPE_ICONS[option as LossType] || '';
							return `${icon} ${formatLossType(option)}`;
						}}
						renderOption={(props, option) => {
							const icon = LOSS_TYPE_ICONS[option as LossType] || '';
							return (
								<li {...props} key={option}>
									{icon} {formatLossType(option)}
								</li>
							);
						}}
						fullWidth
						renderInput={(params) => <TextField {...params} placeholder="Select loss type..." />}
					/>
				</Box>

				{/* Liability Percentage */}
				<TextField
					label="Liability Percentage"
					type="number"
					value={formData.liability_percentage}
					onChange={(e) => setFormData({ ...formData, liability_percentage: e.target.value })}
					fullWidth
					placeholder="0-100"
					inputProps={{ step: '0.01', min: '0', max: maxAllowedLiability }}
					slotProps={{
						input: {
							endAdornment: <InputAdornment position="end">%</InputAdornment>,
						},
					}}
					error={!isValidLiability || exceedsTotalLiability}
					helperText={
						!isValidLiability
							? 'Must be between 0 and 100'
							: exceedsTotalLiability
								? `Total liability would exceed 100%. Maximum allowed: ${maxAllowedLiability.toFixed(2)}%`
								: maxAllowedLiability < 100
									? `Maximum allowed: ${maxAllowedLiability.toFixed(2)}% (${otherLiabilitiesTotal.toFixed(2)}% already allocated)`
									: ''
					}
				/>

				{/* Coverage Amount */}
				<TextField
					label="Coverage Amount"
					type="number"
					value={formData.coverage_amount}
					onChange={(e) => setFormData({ ...formData, coverage_amount: e.target.value })}
					fullWidth
					placeholder="Enter amount"
					inputProps={{ step: '0.01', min: '0' }}
					slotProps={{
						input: {
							startAdornment: <InputAdornment position="start">$</InputAdornment>,
						},
					}}
					error={!isValidCoverage}
					helperText={!isValidCoverage ? 'Must be greater than 0' : ''}
				/>

				{/* Paid Recovery */}
				<TextField
					label="Paid Recovery"
					type="number"
					value={formData.paid_recovery}
					onChange={(e) => setFormData({ ...formData, paid_recovery: e.target.value })}
					fullWidth
					placeholder="Enter paid recovery amount"
					inputProps={{ step: '0.01', min: '0' }}
					slotProps={{
						input: {
							startAdornment: <InputAdornment position="start">$</InputAdornment>,
						},
					}}
					error={!isValidPaidRecovery}
					helperText={
						!isValidPaidRecovery
							? 'Must be 0 or greater'
							: 'Amount already paid for this specific liability'
					}
				/>

				{/* Reserved Recovery */}
				<TextField
					label="Reserved Recovery"
					type="number"
					value={formData.reserved_recovery}
					onChange={(e) => setFormData({ ...formData, reserved_recovery: e.target.value })}
					fullWidth
					placeholder="Enter reserved recovery amount"
					inputProps={{ step: '0.01', min: '0' }}
					slotProps={{
						input: {
							startAdornment: <InputAdornment position="start">$</InputAdornment>,
						},
					}}
					error={!isValidReservedRecovery}
					helperText={
						!isValidReservedRecovery
							? 'Must be 0 or greater'
							: 'Expected recovery reserved for this specific liability'
					}
				/>

				{/* Notes */}
				<TextField
					label="Notes"
					value={formData.notes}
					onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
					fullWidth
					multiline
					rows={3}
					placeholder="Additional notes about this liability..."
				/>
			</Box>
		</BasicDialog>
	);
}
