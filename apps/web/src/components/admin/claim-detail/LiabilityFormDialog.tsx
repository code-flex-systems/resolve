'use client';

import { useState, useEffect } from 'react';
import { Box, TextField, Typography, InputAdornment } from '@mui/material';
import BasicDialog from '@/components/common/BasicDialog';
import { LineOfBusinessSelect, LossTypeSelect } from '@/components/common/ReferenceDataSelect';

interface LiabilityFormData {
	loss_type: string;
	coverage_amount: string;
	line_of_business: string;
	amount_paid: string;
	notes: string;
}

interface LiabilityFormDialogProps {
	open: boolean;
	onClose: () => void;
	onSubmit: (data: {
		claim_party_id: number;
		loss_type?: string | null;
		coverage_amount?: number | null;
		line_of_business?: string | null;
		amount_paid?: number | null;
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
		coverage_amount: '',
		line_of_business: '',
		amount_paid: '',
		notes: '',
	});

	// Update form when editingLiability changes
	useEffect(() => {
		if (editingLiability) {
			setFormData({
				loss_type: editingLiability.loss_type || '',
				coverage_amount: editingLiability.coverage_amount?.toString() || '',
				line_of_business: editingLiability.line_of_business || '',
				amount_paid: editingLiability.amount_paid?.toString() || '',
				notes: editingLiability.notes || '',
			});
		} else {
			// Reset form for new entry
			setFormData({
				loss_type: '',
				coverage_amount: '',
				line_of_business: '',
				amount_paid: '',
				notes: '',
			});
		}
	}, [editingLiability, open]);

	const handleSubmit = async () => {
		await onSubmit({
			claim_party_id: claimPartyId,
			loss_type: formData.loss_type || null,
			coverage_amount: formData.coverage_amount ? parseFloat(formData.coverage_amount) : null,
			line_of_business: formData.line_of_business || null,
			amount_paid: formData.amount_paid ? parseFloat(formData.amount_paid) : null,
			notes: formData.notes || null,
		});
	};

	const isValidCoverage =
		!formData.coverage_amount ||
		(!isNaN(parseFloat(formData.coverage_amount)) && parseFloat(formData.coverage_amount) > 0);

	const isValidAmountPaid =
		!formData.amount_paid ||
		(!isNaN(parseFloat(formData.amount_paid)) && parseFloat(formData.amount_paid) >= 0);

	if (!open) return null;

	return (
		<BasicDialog
			title={editingLiability ? 'Edit Liability' : 'Add Liability'}
			primaryAction={{
				label: editingLiability ? 'Update' : 'Add',
				onClick: handleSubmit,
				disabled: !isValidCoverage || !isValidAmountPaid || isSubmitting,
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
					<LineOfBusinessSelect
						lineOfBusiness={formData.line_of_business || null}
						setLineOfBusiness={(value) => setFormData({ ...formData, line_of_business: value || '' })}
						text="Select line of business..."
					/>
				</Box>

				{/* Loss Type */}
				<Box>
					<Typography fontSize={12} color="text.secondary" marginBottom={0.5}>
						Loss Type
					</Typography>
					<LossTypeSelect
						lossType={formData.loss_type || null}
						setLossType={(value) => setFormData({ ...formData, loss_type: value || '' })}
						text="Select loss type..."
					/>
				</Box>

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

				{/* Amount Paid */}
				<TextField
					label="Amount Paid"
					type="number"
					value={formData.amount_paid}
					onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
					fullWidth
					placeholder="Enter amount paid"
					inputProps={{ step: '0.01', min: '0' }}
					slotProps={{
						input: {
							startAdornment: <InputAdornment position="start">$</InputAdornment>,
						},
					}}
					error={!isValidAmountPaid}
					helperText={
						!isValidAmountPaid
							? 'Must be 0 or greater'
							: 'Amount already paid for this specific liability'
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
