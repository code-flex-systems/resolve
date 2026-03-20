'use client';

import { useState, useEffect } from 'react';
import { TextField, InputAdornment } from '@mui/material';
import Dropdown from '@/components/ui/Dropdown';
import { CoverageListItem } from '@/hooks/trpc/useCoverageTrpc';
import CoverageTypeSelect from '../common/CoverageTypeSelect';
import BasicDialog from '../common/BasicDialog';
import DeductibleStatusSelect from './DeductibleStatusSelect';
import { DeductibleStatus } from '@/config/enums';

interface CoverageFormData {
	loss_type: string;
	coverage_amount: string;
	amount_reserved: string;
	deductible_amount: string;
	deductible_status: DeductibleStatus;
	subro_applicable: boolean;
	statute_preserved: boolean;
}

interface CoverageFormDialogProps {
	open: boolean;
	onClose: () => void;
	onSubmit: (data: {
		loss_type: string;
		coverage_amount: string | null;
		amount_reserved: string | null;
		deductible_amount: string | null;
		deductible_status: DeductibleStatus;
		subro_applicable: boolean;
		statute_preserved: boolean;
	}) => Promise<void>;
	editingCoverage?: CoverageListItem | null;
	isSubmitting?: boolean;
}

export default function CoverageFormDialog({
	open,
	onClose,
	onSubmit,
	editingCoverage,
	isSubmitting = false,
}: CoverageFormDialogProps) {
	const [formData, setFormData] = useState<CoverageFormData>({
		loss_type: '',
		coverage_amount: '',
		amount_reserved: '',
		deductible_amount: '',
		deductible_status: DeductibleStatus.NOT_CONFIRMED,
		subro_applicable: false,
		statute_preserved: false,
	});

	// Update form when editingCoverage changes
	useEffect(() => {
		if (editingCoverage) {
			setFormData({
				loss_type: editingCoverage.loss_type,
				coverage_amount: editingCoverage.coverage_amount?.toString() || '',
				amount_reserved: editingCoverage.amount_reserved?.toString() || '',
				deductible_amount: editingCoverage.deductible_amount?.toString() || '',
				deductible_status: editingCoverage.deductible_status as DeductibleStatus,
				subro_applicable: editingCoverage.subro_applicable,
				statute_preserved: editingCoverage.statute_preserved,
			});
		} else {
			setFormData({
				loss_type: '',
				coverage_amount: '',
				amount_reserved: '',
				deductible_amount: '',
				deductible_status: DeductibleStatus.NOT_CONFIRMED,
				subro_applicable: false,
				statute_preserved: false,
			});
		}
	}, [editingCoverage, open]);

	// When deductible status changes to NO_DEDUCTIBLE, set amount to 0
	useEffect(() => {
		if (formData.deductible_status === DeductibleStatus.NO_DEDUCTIBLE) {
			setFormData((prev) => ({ ...prev, deductible_amount: '0' }));
		}
	}, [formData.deductible_status]);

	const handleSubmit = async () => {
		await onSubmit({
			loss_type: formData.loss_type,
			coverage_amount: formData.coverage_amount || null,
			amount_reserved: formData.amount_reserved || null,
			deductible_amount: formData.deductible_amount || null,
			deductible_status: formData.deductible_status,
			subro_applicable: formData.subro_applicable,
			statute_preserved: formData.statute_preserved,
		});
	};

	const isValidCoverageAmount =
		!formData.coverage_amount ||
		(!isNaN(parseFloat(formData.coverage_amount)) && parseFloat(formData.coverage_amount)> 0);

	const isValidReservedAmount =
		!formData.amount_reserved ||
		(!isNaN(parseFloat(formData.amount_reserved)) && parseFloat(formData.amount_reserved)>= 0);

	const isValidDeductibleAmount =
		!formData.deductible_amount ||
		(!isNaN(parseFloat(formData.deductible_amount)) && parseFloat(formData.deductible_amount)>= 0);

	if (!open) return null;

	return (
		<BasicDialog
			title={editingCoverage ? 'Edit Coverage' : 'Add Coverage'}
			primaryAction={{
				label: editingCoverage ? 'Update' : 'Create',
				onClick: handleSubmit,
				disabled:
					!formData.loss_type ||
					!isValidCoverageAmount ||
					!isValidReservedAmount ||
					!isValidDeductibleAmount ||
					isSubmitting,
			}}
			secondaryActions={[
				{
					label: 'Cancel',
					onClick: onClose,
				},
			]}
			onClose={onClose}
			width={600}>
			<div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16, paddingTop: 1 }}>
				<CoverageTypeSelect
					value={formData.loss_type}
					onChange={(type) => setFormData({ ...formData, loss_type: type })}
					fullWidth
				/>
				<TextField
					label="Coverage Amount"
					type="number"
					value={formData.coverage_amount}
					onChange={(e) => setFormData({ ...formData, coverage_amount: e.target.value })}
					fullWidth
					placeholder="Enter coverage limit"
					inputProps={{ step: '0.01', min: '0' }}
					slotProps={{
						input: {
							startAdornment: <InputAdornment position="start">$</InputAdornment>,
						},
					}}
					error={!isValidCoverageAmount}
					helperText={!isValidCoverageAmount ? 'Must be greater than 0' : 'Policy coverage limit'}
				/>
				<TextField
					label="Amount Reserved"
					type="number"
					value={formData.amount_reserved}
					onChange={(e) => setFormData({ ...formData, amount_reserved: e.target.value })}
					fullWidth
					placeholder="Enter reserved amount"
					inputProps={{ step: '0.01', min: '0' }}
					slotProps={{
						input: {
							startAdornment: <InputAdornment position="start">$</InputAdornment>,
						},
					}}
					error={!isValidReservedAmount}
					helperText={
						!isValidReservedAmount
							? 'Must be 0 or greater'
							: 'Amount reserved for potential claim payments'
					}
				/>

				{/* Deductible Section */}
				<span style={{ marginTop: 8, marginBottom: -8 }}>
					Deductible Information
				</span>

				<TextField
					label="Deductible Amount"
					type="number"
					value={formData.deductible_amount}
					onChange={(e) => setFormData({ ...formData, deductible_amount: e.target.value })}
					fullWidth
					placeholder="Enter deductible amount"
					inputProps={{ step: '0.01', min: '0' }}
					slotProps={{
						input: {
							startAdornment: <InputAdornment position="start">$</InputAdornment>,
						},
					}}
					disabled={formData.deductible_status === DeductibleStatus.NO_DEDUCTIBLE}
					error={!isValidDeductibleAmount}
					helperText={
						formData.deductible_status === DeductibleStatus.NO_DEDUCTIBLE
							? 'Amount locked at $0 for No Deductible status'
							: !isValidDeductibleAmount
								? 'Must be 0 or greater'
								: 'Optional - defaults to $0'
					}
				/>

				<DeductibleStatusSelect
					value={formData.deductible_status}
					onChange={(status) => setFormData({ ...formData, deductible_status: status })}
					required
				/>

				{/* Subrogation & Statute Section */}
				<span style={{ marginTop: 8, marginBottom: -8 }}>
					Subrogation & Statute Tracking
				</span>

				<Dropdown
					label="Subrogation Applicable"
					options={[
						{ value: 'yes', label: 'Yes' },
						{ value: 'no', label: 'No' },
					]}
					value={formData.subro_applicable ? 'yes' : 'no'}
					onChange={(v) => setFormData({ ...formData, subro_applicable: v === 'yes' })}
					fullWidth
				/>

				{/* Show statute_date read-only if editing existing coverage */}
				{editingCoverage?.statute_date && (
					<TextField
						label="Statute Date"
						value={new Date(editingCoverage.statute_date).toLocaleDateString()}
						fullWidth
						disabled
						helperText="Calculated based on date of loss and state"
					/>
				)}

				<Dropdown
					label="Statute Preserved"
					options={[
						{ value: 'yes', label: 'Yes' },
						{ value: 'no', label: 'No' },
					]}
					value={formData.statute_preserved ? 'yes' : 'no'}
					onChange={(v) => setFormData({ ...formData, statute_preserved: v === 'yes' })}
					fullWidth
				/>
			</div>
		</BasicDialog>
	);
}
