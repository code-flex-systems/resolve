'use client';

import { useState, useEffect } from 'react';
import { Box, TextField } from '@mui/material';
import { CoverageListItem } from '@/hooks/trpc/useCoverageTrpc';
import CoverageTypeSelect from '../common/CoverageTypeSelect';
import BasicDialog from '../common/BasicDialog';

interface CoverageFormData {
	coverage_type: string;
	coverage_amount: string;
}

interface CoverageFormDialogProps {
	open: boolean;
	onClose: () => void;
	onSubmit: (data: { coverage_type: string; coverage_amount: string | null }) => Promise<void>;
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
		coverage_type: '',
		coverage_amount: '',
	});

	// Update form when editingCoverage changes
	useEffect(() => {
		if (editingCoverage) {
			setFormData({
				coverage_type: editingCoverage.coverage_type,
				coverage_amount: editingCoverage.coverage_amount?.toString() || '',
			});
		} else {
			setFormData({
				coverage_type: '',
				coverage_amount: '',
			});
		}
	}, [editingCoverage, open]);

	const handleSubmit = async () => {
		const amount = formData.coverage_amount ? formData.coverage_amount : null;
		await onSubmit({
			coverage_type: formData.coverage_type,
			coverage_amount: amount,
		});
	};

	const isValidAmount =
		!formData.coverage_amount ||
		(!isNaN(parseFloat(formData.coverage_amount)) && parseFloat(formData.coverage_amount) > 0);

	if (!open) return null;

	return (
		<BasicDialog
			title={editingCoverage ? 'Edit Coverage' : 'Add Coverage'}
			primaryAction={{
				label: editingCoverage ? 'Update' : 'Create',
				onClick: handleSubmit,
				disabled: !formData.coverage_type || !isValidAmount || isSubmitting,
			}}
			secondaryActions={[
				{
					label: 'Cancel',
					onClick: onClose,
				},
			]}
			onClose={onClose}
			width={500}
		>
			<Box display="flex" flexDirection="column" gap={2} paddingTop={1}>
				<CoverageTypeSelect
					value={formData.coverage_type}
					onChange={(type) => setFormData({ ...formData, coverage_type: type })}
					fullWidth
				/>
				<TextField
					label="Coverage Amount"
					type="number"
					value={formData.coverage_amount}
					onChange={(e) => setFormData({ ...formData, coverage_amount: e.target.value })}
					fullWidth
					placeholder="Enter amount"
					inputProps={{ step: '0.01', min: '0' }}
				/>
			</Box>
		</BasicDialog>
	);
}
