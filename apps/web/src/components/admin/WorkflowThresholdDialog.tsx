'use client';
import { FormControl, FormControlLabel, InputLabel, MenuItem, Select } from '@mui/material';
import Input from '@/components/ui/Input';
import Switch from '@/components/ui/Switch';
import { useState, useEffect } from 'react';
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
			<div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
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

				<Input
					label="Threshold Value"
					type="number"
					value={formData.thresholdValue}
					onChange={(e) => setFormData({ ...formData, thresholdValue: e.target.value })}
					fullWidth
					required
					placeholder="Enter threshold value"
					min={1}
					endAdornment={
						formData.thresholdType ? (
							<span>{getThresholdUnit(formData.thresholdType as WorkflowThresholdType)}</span>
						) : undefined
					}
				/>

				{editingThreshold && (
					<FormControlLabel
						control={
							<Switch
								checked={formData.isActive}
								onChange={(checked) => setFormData({ ...formData, isActive: checked })}
							/>
						}
						label="Active"
					/>
				)}
			</div>
		</BasicDialog>
	);
}
