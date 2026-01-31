'use client';

import { useState, useEffect } from 'react';
import { Box, TextField, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel, InputAdornment } from '@mui/material';
import BasicDialog from '@/components/common/BasicDialog';
import { useWorkflowTrpc } from '@/hooks/trpc/useWorkflowTrpc';
import { WorkflowThresholdType } from '@/config/enums';
import { getThresholdUnit } from '@/lib/utils/workflowUtils';
import type { WorkflowThreshold } from '@/hooks/trpc/useWorkflowTrpc';

interface WorkflowThresholdDialogProps {
	onClose: () => void;
	workflowId: number;
	editingThreshold?: WorkflowThreshold | null;
}

export default function WorkflowThresholdDialog({
	onClose,
	workflowId,
	editingThreshold,
}: WorkflowThresholdDialogProps) {
	const [formData, setFormData] = useState({
		thresholdType: '' as WorkflowThresholdType | '',
		thresholdValue: '',
		isActive: true,
	});

	const { createThreshold, updateThreshold } = useWorkflowTrpc();

	// Initialize form when editing or when dialog opens
	useEffect(() => {
		if (editingThreshold) {
			setFormData({
				thresholdType: editingThreshold.threshold_type as any,
				thresholdValue: String(editingThreshold.threshold_value),
				isActive: editingThreshold.is_active,
			});
		} else {
			setFormData({
				thresholdType: '',
				thresholdValue: '',
				isActive: true,
			});
		}
	}, [editingThreshold]);

	const handleSubmit = async () => {
		try {
			const value = parseInt(formData.thresholdValue, 10);

			if (editingThreshold) {
				await updateThreshold.mutateAsync({
					id: editingThreshold.id,
					params: {
						thresholdValue: value,
						isActive: formData.isActive,
					},
				});
			} else {
				await createThreshold.mutateAsync({
					workflowDefinitionId: workflowId,
					thresholdType: formData.thresholdType as WorkflowThresholdType,
					thresholdValue: value,
				});
			}
			onClose();
		} catch (error) {
			console.error('Failed to save threshold:', error);
		}
	};

	const isFormValid = formData.thresholdType && formData.thresholdValue && parseInt(formData.thresholdValue, 10) > 0;

	return (
		<BasicDialog
			onClose={onClose}
			title={editingThreshold ? 'Edit Threshold' : 'Add Threshold'}
			primaryAction={{
				label: editingThreshold ? 'Update' : 'Create',
				onClick: handleSubmit,
				disabled: !isFormValid || createThreshold.isPending || updateThreshold.isPending,
			}}
			secondaryActions={[{ label: 'Cancel', onClick: onClose }]}
			width={500}
		>
			<Box display="flex" flexDirection="column" gap={2} pt={1}>
				<FormControl fullWidth required disabled={!!editingThreshold}>
					<InputLabel>Threshold Type</InputLabel>
					<Select
						value={formData.thresholdType}
						onChange={(e) => setFormData({ ...formData, thresholdType: e.target.value as WorkflowThresholdType })}
						label="Threshold Type"
					>
						<MenuItem value={WorkflowThresholdType.USER_CAPACITY}>User Capacity</MenuItem>
						<MenuItem value={WorkflowThresholdType.LOCATION_AGE}>Location Age (Hours)</MenuItem>
						<MenuItem value={WorkflowThresholdType.TASK_DUE}>Task Due Warning (Days)</MenuItem>
					</Select>
				</FormControl>

				<TextField
					label="Threshold Value"
					type="number"
					value={formData.thresholdValue}
					onChange={(e) => setFormData({ ...formData, thresholdValue: e.target.value })}
					fullWidth
					required
					placeholder="Enter threshold value"
					slotProps={{
						input: {
							inputProps: { min: 1 },
							endAdornment: formData.thresholdType ? (
								<InputAdornment position="end">
									{getThresholdUnit(formData.thresholdType as WorkflowThresholdType)}
								</InputAdornment>
							) : undefined,
						},
					}}
				/>

				{editingThreshold && (
					<FormControlLabel
						control={
							<Switch
								checked={formData.isActive}
								onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
							/>
						}
						label="Active"
					/>
				)}
			</Box>
		</BasicDialog>
	);
}
